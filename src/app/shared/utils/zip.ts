/** A read-only ZIP archive. Entries are decompressed on demand. */
export interface ZipArchive {
  /** Entry paths, e.g. `word/document.xml`. */
  readonly names: readonly string[];
  /** `null` when there is no such entry. */
  read(name: string): Promise<Uint8Array<ArrayBuffer> | null>;
}

export class ZipFormatError extends Error {
  override readonly name = 'ZipFormatError';
}

interface ZipEntry {
  method: number;
  compressedSize: number;
  localHeaderOffset: number;
}

const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const CENTRAL_DIRECTORY_HEADER = 0x02014b50;
const LOCAL_FILE_HEADER = 0x04034b50;
/** End-of-central-directory record (22 bytes) + the longest possible comment. */
const MAX_END_RECORD_SEARCH = 22 + 0xffff;
const METHOD_STORED = 0;
const METHOD_DEFLATE = 8;
const FLAG_ENCRYPTED = 0x1;

/**
 * Reads a ZIP file (`.docx`, `.xlsx`, …) with the browser's `DecompressionStream`.
 * Supports stored and deflated entries; ZIP64 and encrypted archives are rejected.
 */
export function openZip(data: ArrayBuffer | Uint8Array): ZipArchive {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entries = readCentralDirectory(bytes, view);
  return {
    names: [...entries.keys()],
    read: async (name) => {
      const entry = entries.get(name);
      return entry ? readEntry(bytes, view, entry) : null;
    },
  };
}

function readCentralDirectory(bytes: Uint8Array, view: DataView): Map<string, ZipEntry> {
  const end = findEndRecord(view);
  const count = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true);
  if (count === 0xffff || offset === 0xffffffff) {
    throw new ZipFormatError('ZIP64 archives are not supported');
  }
  const decoder = new TextDecoder();
  const entries = new Map<string, ZipEntry>();
  for (let i = 0; i < count; i++) {
    if (
      offset + 46 > view.byteLength ||
      view.getUint32(offset, true) !== CENTRAL_DIRECTORY_HEADER
    ) {
      throw new ZipFormatError('Corrupt central directory');
    }
    const flags = view.getUint16(offset + 8, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    if (flags & FLAG_ENCRYPTED) {
      throw new ZipFormatError('Encrypted archives are not supported');
    }
    entries.set(name, {
      method: view.getUint16(offset + 10, true),
      compressedSize: view.getUint32(offset + 20, true),
      localHeaderOffset: view.getUint32(offset + 42, true),
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function findEndRecord(view: DataView): number {
  const last = view.byteLength - 22;
  const first = Math.max(0, view.byteLength - MAX_END_RECORD_SEARCH);
  for (let offset = last; offset >= first; offset--) {
    if (view.getUint32(offset, true) === END_OF_CENTRAL_DIRECTORY) {
      return offset;
    }
  }
  throw new ZipFormatError('Not a ZIP archive');
}

async function readEntry(
  bytes: Uint8Array,
  view: DataView,
  entry: ZipEntry,
): Promise<Uint8Array<ArrayBuffer>> {
  const header = entry.localHeaderOffset;
  if (header + 30 > view.byteLength || view.getUint32(header, true) !== LOCAL_FILE_HEADER) {
    throw new ZipFormatError('Corrupt local file header');
  }
  const start = header + 30 + view.getUint16(header + 26, true) + view.getUint16(header + 28, true);
  const compressed = bytes.subarray(start, start + entry.compressedSize);
  if (entry.method === METHOD_STORED) {
    return compressed.slice();
  }
  if (entry.method === METHOD_DEFLATE) {
    return inflateRaw(compressed);
  }
  throw new ZipFormatError(`Unsupported compression method ${entry.method}`);
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(data);
      controller.close();
    },
  });
  const reader = source
    .pipeThrough(
      new DecompressionStream('deflate-raw') as ReadableWritablePair<Uint8Array, Uint8Array>,
    )
    .getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    chunks.push(value);
    length += value.length;
  }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
