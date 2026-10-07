import { openZip, ZipArchive } from './zip';

export interface DocxTextRun {
  kind: 'text';
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  /** External hyperlink target, if the run is inside a link. */
  link: string | null;
}

export interface DocxImageRun {
  kind: 'image';
  /** Relationship id; pass it to `DocxDocument.readImage`. */
  id: string;
}

export type DocxInline = DocxTextRun | DocxImageRun;

/** Automatic list numbering of a paragraph. */
export interface DocxListInfo {
  /** Same value for every paragraph of one list, even when its numbering is restarted. */
  list: string;
  level: number;
  /** `false` for bullets. */
  ordered: boolean;
}

export interface DocxParagraph {
  list: DocxListInfo | null;
  /** Split at manual line breaks (Shift+Enter); always at least one (maybe empty) line. */
  lines: DocxInline[][];
}

export interface DocxDocument {
  /** Body paragraphs in reading order (table cells included). Headers and footers are skipped. */
  paragraphs: DocxParagraph[];
  /** The embedded image file, or `null` if the relationship doesn't point to one. */
  readImage(id: string): Promise<File | null>;
}

export class DocxFormatError extends Error {
  override readonly name = 'DocxFormatError';
}

const DOCUMENT_PATH = 'word/document.xml';
const RELS_PATH = 'word/_rels/document.xml.rels';
const NUMBERING_PATH = 'word/numbering.xml';
const STYLES_PATH = 'word/styles.xml';
const IMAGE_REL_TYPE = /\/image$/;
const HYPERLINK_REL_TYPE = /\/hyperlink$/;
const UNORDERED_FORMATS = new Set(['bullet', 'none']);
const OFF_VALUES = new Set(['0', 'false', 'off', 'none']);
const IMAGE_TYPES: Readonly<Record<string, string>> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
};
/** Containers whose children are read as if they were in the parent. */
const TRANSPARENT_BLOCKS = new Set(['tbl', 'tr', 'tc', 'sdt', 'sdtContent', 'customXml']);
/** Paragraph children that never hold visible body text. */
const SKIPPED_INLINES = new Set(['pPr', 'del', 'moveFrom', 'commentRangeStart', 'bookmarkStart']);

interface Relationship {
  type: string;
  target: string;
  external: boolean;
}

interface NumberingRef {
  numId: string;
  level: number | null;
}

interface InlineContext {
  link: string | null;
}

/** Reads a Word `.docx` file. Throws `DocxFormatError` / `ZipFormatError` for other files. */
export async function readDocx(data: ArrayBuffer | Uint8Array): Promise<DocxDocument> {
  const zip = openZip(data);
  const documentXml = await readXml(zip, DOCUMENT_PATH);
  if (!documentXml) {
    throw new DocxFormatError('word/document.xml is missing');
  }
  const [relsXml, numberingXml, stylesXml] = await Promise.all([
    readXml(zip, RELS_PATH),
    readXml(zip, NUMBERING_PATH),
    readXml(zip, STYLES_PATH),
  ]);
  const rels = relsXml ? readRelationships(relsXml) : new Map<string, Relationship>();
  const reader = new BodyReader(
    rels,
    numberingXml ? readListFormats(numberingXml) : new Map(),
    stylesXml ? readStyleNumbering(stylesXml) : new Map(),
  );
  const body = childElements(documentXml.documentElement).find((el) => el.localName === 'body');
  return {
    paragraphs: body ? reader.readBlocks(body) : [],
    readImage: (id) => readImage(zip, rels, id),
  };
}

/** Plain text of a line (images are skipped). */
export function inlineText(line: readonly DocxInline[]): string {
  return line.map((inline) => (inline.kind === 'text' ? inline.text : '')).join('');
}

class BodyReader {
  constructor(
    private readonly rels: ReadonlyMap<string, Relationship>,
    /** `numId` → list key and per-level "ordered" flags. */
    private readonly lists: ReadonlyMap<string, { list: string; ordered: boolean[] }>,
    private readonly styleNumbering: ReadonlyMap<string, NumberingRef>,
  ) {}

  readBlocks(parent: Element): DocxParagraph[] {
    const paragraphs: DocxParagraph[] = [];
    for (const child of childElements(parent)) {
      if (child.localName === 'p') {
        paragraphs.push(this.readParagraph(child));
      } else if (TRANSPARENT_BLOCKS.has(child.localName)) {
        paragraphs.push(...this.readBlocks(child));
      }
    }
    return paragraphs;
  }

  private readParagraph(p: Element): DocxParagraph {
    const lines: DocxInline[][] = [[]];
    this.readInlines(p, { link: null }, lines);
    return { list: this.listInfo(p), lines };
  }

  private readInlines(parent: Element, context: InlineContext, lines: DocxInline[][]): void {
    for (const child of childElements(parent)) {
      const name = child.localName;
      if (SKIPPED_INLINES.has(name)) {
        continue;
      }
      if (name === 'r') {
        this.readRun(child, child, context, lines);
      } else if (name === 'hyperlink') {
        this.readInlines(child, { link: this.hyperlinkTarget(child) ?? context.link }, lines);
      } else {
        this.readInlines(child, context, lines);
      }
    }
  }

  /** `content` is the run itself or the chosen branch of `mc:AlternateContent` inside it. */
  private readRun(run: Element, content: Element, context: InlineContext, lines: DocxInline[][]) {
    const props = childElements(run).find((el) => el.localName === 'rPr');
    const format = {
      bold: isOn(props, 'b'),
      italic: isOn(props, 'i'),
      underline: isOn(props, 'u'),
      strike: isOn(props, 'strike') || isOn(props, 'dstrike'),
      link: context.link,
    };
    const pushText = (text: string): void => {
      const line = lines[lines.length - 1];
      const previous = line[line.length - 1];
      if (previous?.kind === 'text' && sameFormat(previous, format)) {
        previous.text += text;
      } else {
        line.push({ kind: 'text', text, ...format });
      }
    };
    for (const child of childElements(content)) {
      switch (child.localName) {
        case 't':
          pushText(child.textContent ?? '');
          break;
        case 'tab':
        case 'ptab':
          pushText(' ');
          break;
        case 'noBreakHyphen':
          pushText('-');
          break;
        case 'br':
        case 'cr':
          lines.push([]);
          break;
        case 'drawing':
        case 'pict':
        case 'object':
          for (const id of imageIds(child)) {
            lines[lines.length - 1].push({ kind: 'image', id });
          }
          break;
        case 'AlternateContent': {
          const choice = childElements(child).find((el) => el.localName === 'Choice');
          if (choice) {
            this.readRun(run, choice, context, lines);
          }
          break;
        }
      }
    }
  }

  private hyperlinkTarget(link: Element): string | null {
    const id = attr(link, 'id');
    const rel = id ? this.rels.get(id) : undefined;
    return rel && rel.external && HYPERLINK_REL_TYPE.test(rel.type) ? rel.target.trim() : null;
  }

  private listInfo(p: Element): DocxListInfo | null {
    const props = childElements(p).find((el) => el.localName === 'pPr');
    const style = props && childElements(props).find((el) => el.localName === 'pStyle');
    const fromStyle = style ? this.styleNumbering.get(attr(style, 'val') ?? '') : undefined;
    const numPr = props && childElements(props).find((el) => el.localName === 'numPr');
    const direct = numPr ? readNumberingRef(numPr) : null;
    const numId = direct?.numId || fromStyle?.numId;
    if (!numId || numId === '0') {
      return null;
    }
    const level = direct?.level ?? fromStyle?.level ?? 0;
    const list = this.lists.get(numId);
    return {
      list: list?.list ?? `num:${numId}`,
      level,
      ordered: list?.ordered[level] ?? true,
    };
  }
}

async function readXml(zip: ZipArchive, path: string): Promise<XMLDocument | null> {
  const bytes = await zip.read(path);
  if (!bytes) {
    return null;
  }
  const xml = new DOMParser().parseFromString(new TextDecoder().decode(bytes), 'application/xml');
  if (xml.getElementsByTagName('parsererror').length > 0) {
    throw new DocxFormatError(`${path} is not valid XML`);
  }
  return xml;
}

function readRelationships(xml: XMLDocument): Map<string, Relationship> {
  const rels = new Map<string, Relationship>();
  for (const el of descendants(xml.documentElement, 'Relationship')) {
    const id = el.getAttribute('Id');
    if (id) {
      rels.set(id, {
        type: el.getAttribute('Type') ?? '',
        target: el.getAttribute('Target') ?? '',
        external: el.getAttribute('TargetMode') === 'External',
      });
    }
  }
  return rels;
}

/** `numId` → its abstract list (shared by restarted copies) and which levels are numbered. */
function readListFormats(xml: XMLDocument): Map<string, { list: string; ordered: boolean[] }> {
  const abstractFormats = new Map<string, boolean[]>();
  for (const abstract of descendants(xml.documentElement, 'abstractNum')) {
    const ordered: boolean[] = [];
    for (const lvl of childElements(abstract).filter((el) => el.localName === 'lvl')) {
      const format = childElements(lvl).find((el) => el.localName === 'numFmt');
      ordered[Number(attr(lvl, 'ilvl') ?? 0)] = !UNORDERED_FORMATS.has(
        (format && attr(format, 'val')) ?? 'decimal',
      );
    }
    abstractFormats.set(attr(abstract, 'abstractNumId') ?? '', ordered);
  }
  const lists = new Map<string, { list: string; ordered: boolean[] }>();
  for (const num of descendants(xml.documentElement, 'num')) {
    const abstractRef = childElements(num).find((el) => el.localName === 'abstractNumId');
    const abstractId = abstractRef ? attr(abstractRef, 'val') : null;
    const numId = attr(num, 'numId');
    if (numId && abstractId !== null) {
      lists.set(numId, {
        list: `abstract:${abstractId}`,
        ordered: abstractFormats.get(abstractId) ?? [],
      });
    }
  }
  return lists;
}

/** Paragraph style id → numbering it applies (following `basedOn`). */
function readStyleNumbering(xml: XMLDocument): Map<string, NumberingRef> {
  const own = new Map<string, { numbering: NumberingRef | null; basedOn: string | null }>();
  for (const style of descendants(xml.documentElement, 'style')) {
    if (attr(style, 'type') !== 'paragraph') {
      continue;
    }
    const children = childElements(style);
    const props = children.find((el) => el.localName === 'pPr');
    const numPr = props && childElements(props).find((el) => el.localName === 'numPr');
    const basedOn = children.find((el) => el.localName === 'basedOn');
    own.set(attr(style, 'styleId') ?? '', {
      numbering: numPr ? readNumberingRef(numPr) : null,
      basedOn: basedOn ? attr(basedOn, 'val') : null,
    });
  }
  const resolved = new Map<string, NumberingRef>();
  for (const id of own.keys()) {
    const seen = new Set<string>();
    let current: string | null = id;
    while (current && !seen.has(current)) {
      seen.add(current);
      const style = own.get(current);
      if (style?.numbering?.numId) {
        resolved.set(id, style.numbering);
        break;
      }
      current = style?.basedOn ?? null;
    }
  }
  return resolved;
}

function readNumberingRef(numPr: Element): NumberingRef {
  const children = childElements(numPr);
  const numId = children.find((el) => el.localName === 'numId');
  const ilvl = children.find((el) => el.localName === 'ilvl');
  const level = ilvl ? Number(attr(ilvl, 'val')) : NaN;
  return {
    numId: (numId && attr(numId, 'val')) ?? '',
    level: Number.isInteger(level) ? level : null,
  };
}

async function readImage(
  zip: ZipArchive,
  rels: ReadonlyMap<string, Relationship>,
  id: string,
): Promise<File | null> {
  const rel = rels.get(id);
  if (!rel || rel.external || !IMAGE_REL_TYPE.test(rel.type)) {
    return null;
  }
  const path = resolvePath('word', rel.target);
  const bytes = await zip.read(path);
  if (!bytes) {
    return null;
  }
  const name = path.split('/').pop() ?? 'image';
  const extension = name.split('.').pop()?.toLowerCase() ?? '';
  return new File([bytes], name, { type: IMAGE_TYPES[extension] ?? 'application/octet-stream' });
}

function resolvePath(base: string, target: string): string {
  const parts = target.startsWith('/') ? [] : base.split('/');
  for (const part of target.split('/')) {
    if (part === '..') {
      parts.pop();
    } else if (part && part !== '.') {
      parts.push(part);
    }
  }
  return parts.join('/');
}

function imageIds(container: Element): string[] {
  const ids: string[] = [];
  for (const el of descendants(container)) {
    if (el.localName === 'blip' || el.localName === 'imagedata') {
      const id = attr(el, el.localName === 'blip' ? 'embed' : 'id');
      if (id) {
        ids.push(id);
      }
    }
  }
  return ids;
}

function isOn(props: Element | undefined, name: string): boolean {
  const el = props && childElements(props).find((child) => child.localName === name);
  if (!el) {
    return false;
  }
  const value = attr(el, 'val');
  return value === null || !OFF_VALUES.has(value.toLowerCase());
}

function sameFormat(run: DocxTextRun, format: Omit<DocxTextRun, 'kind' | 'text'>): boolean {
  return (
    run.bold === format.bold &&
    run.italic === format.italic &&
    run.underline === format.underline &&
    run.strike === format.strike &&
    run.link === format.link
  );
}

/** Attribute by local name, whatever its namespace prefix (`w:val`, `r:id`, …). */
function attr(el: Element, localName: string): string | null {
  for (const attribute of Array.from(el.attributes)) {
    if (attribute.localName === localName) {
      return attribute.value;
    }
  }
  return null;
}

function childElements(el: Element): Element[] {
  return Array.from(el.children);
}

function descendants(root: Element, localName?: string): Element[] {
  return Array.from(root.getElementsByTagName('*')).filter(
    (el) => localName === undefined || el.localName === localName,
  );
}
