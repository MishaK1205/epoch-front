import { DocxFormatError, DocxTextRun, inlineText, readDocx } from './docx';
import { createStoredZip } from './zip-testing';

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const R = 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const A = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

function documentXml(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><w:document ${W} ${R} ${A}><w:body>${body}</w:body></w:document>`;
}

const RELS = `<?xml version="1.0"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="${REL}/numbering" Target="numbering.xml"/>
  <Relationship Id="rId2" Type="${REL}/image" Target="media/image1.png"/>
  <Relationship Id="rId3" Type="${REL}/hyperlink" Target="https://example.com/a" TargetMode="External"/>
  <Relationship Id="rId4" Type="${REL}/image" Target="media/image2.emf"/>
</Relationships>`;

const NUMBERING = `<?xml version="1.0"?>
<w:numbering ${W}>
  <w:abstractNum w:abstractNumId="0">
    <w:lvl w:ilvl="0"><w:numFmt w:val="decimal"/></w:lvl>
    <w:lvl w:ilvl="1"><w:numFmt w:val="bullet"/></w:lvl>
  </w:abstractNum>
  <w:num w:numId="5"><w:abstractNumId w:val="0"/></w:num>
  <w:num w:numId="6"><w:abstractNumId w:val="0"/></w:num>
</w:numbering>`;

const STYLES = `<?xml version="1.0"?>
<w:styles ${W}>
  <w:style w:type="paragraph" w:styleId="Question"><w:pPr><w:numPr><w:numId w:val="6"/></w:numPr></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="BigQuestion"><w:basedOn w:val="Question"/></w:style>
</w:styles>`;

async function docx(body: string, extra: Record<string, string | Uint8Array> = {}) {
  return readDocx(
    createStoredZip({
      'word/document.xml': documentXml(body),
      'word/_rels/document.xml.rels': RELS,
      'word/numbering.xml': NUMBERING,
      'word/styles.xml': STYLES,
      ...extra,
    }),
  );
}

describe('readDocx', () => {
  it('reads text, formatting and manual line breaks', async () => {
    const doc = await docx(`
      <w:p>
        <w:r><w:rPr><w:b/></w:rPr><w:t>პასუხი</w:t></w:r>
        <w:r><w:t xml:space="preserve">: ერთი</w:t><w:br/><w:t>კომენტარი: ორი</w:t></w:r>
        <w:r><w:rPr><w:i/><w:u w:val="none"/></w:rPr><w:tab/><w:t>დახრილი</w:t></w:r>
        <w:del><w:r><w:delText>წაშლილი</w:delText></w:r></w:del>
      </w:p>`);

    const [paragraph] = doc.paragraphs;
    expect(paragraph.list).toBeNull();
    expect(paragraph.lines.map(inlineText)).toEqual(['პასუხი: ერთი', 'კომენტარი: ორი დახრილი']);
    const [bold] = paragraph.lines[0] as DocxTextRun[];
    expect(bold).toEqual(expect.objectContaining({ text: 'პასუხი', bold: true, italic: false }));
    const italic = paragraph.lines[1][1] as DocxTextRun;
    expect(italic).toEqual(
      expect.objectContaining({ text: ' დახრილი', italic: true, underline: false }),
    );
  });

  it('resolves list numbering from the paragraph and from its style', async () => {
    const doc = await docx(`
      <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="5"/></w:numPr></w:pPr><w:r><w:t>a</w:t></w:r></w:p>
      <w:p><w:pPr><w:pStyle w:val="BigQuestion"/></w:pPr><w:r><w:t>b</w:t></w:r></w:p>
      <w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="5"/></w:numPr></w:pPr><w:r><w:t>c</w:t></w:r></w:p>
      <w:p><w:pPr><w:pStyle w:val="Question"/><w:numPr><w:numId w:val="0"/></w:numPr></w:pPr></w:p>`);

    expect(doc.paragraphs.map((p) => p.list)).toEqual([
      { list: 'abstract:0', level: 0, ordered: true },
      { list: 'abstract:0', level: 0, ordered: true },
      { list: 'abstract:0', level: 1, ordered: false },
      null,
    ]);
  });

  it('reads hyperlinks, table cells and images', async () => {
    const png = new Uint8Array([137, 80, 78, 71]);
    const doc = await docx(
      `<w:p><w:hyperlink r:id="rId3"><w:r><w:t>ბმული</w:t></w:r></w:hyperlink></w:p>
       <w:tbl><w:tr><w:tc><w:p><w:r><w:t>უჯრა</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
       <w:p><w:r><w:drawing><a:graphic><a:blip r:embed="rId2"/></a:graphic></w:drawing></w:r></w:p>`,
      { 'word/media/image1.png': png },
    );

    expect((doc.paragraphs[0].lines[0][0] as DocxTextRun).link).toBe('https://example.com/a');
    expect(inlineText(doc.paragraphs[1].lines[0])).toBe('უჯრა');
    expect(doc.paragraphs[2].lines[0]).toEqual([{ kind: 'image', id: 'rId2' }]);

    const image = await doc.readImage('rId2');
    expect(image?.name).toBe('image1.png');
    expect(image?.type).toBe('image/png');
    expect(image?.size).toBe(4);
    expect(await doc.readImage('rId3')).toBeNull();
    expect(await doc.readImage('rId4')).toBeNull();
  });

  it('rejects archives without a Word document', async () => {
    await expect(readDocx(createStoredZip({ 'Index/Document.iwa': 'pages' }))).rejects.toThrow(
      DocxFormatError,
    );
  });
});
