import { openZip, ZipFormatError } from './zip';
import { createStoredZip } from './zip-testing';

describe('openZip', () => {
  it('lists and reads stored entries', async () => {
    const zip = openZip(createStoredZip({ 'a.txt': 'hello', 'dir/b.txt': 'გამარჯობა' }));

    expect(zip.names).toEqual(['a.txt', 'dir/b.txt']);
    expect(new TextDecoder().decode((await zip.read('dir/b.txt')) ?? undefined)).toBe('გამარჯობა');
    expect(await zip.read('missing.txt')).toBeNull();
  });

  it('inflates deflated entries', async () => {
    const text = 'deflate me '.repeat(50);
    const compressed = await deflateRaw(new TextEncoder().encode(text));
    const archive = createStoredZip({ 'c.txt': compressed });
    // Mark the entry as deflated (method 8) in the local and central headers.
    const view = new DataView(archive.buffer);
    view.setUint16(8, 8, true);
    view.setUint16(30 + 'c.txt'.length + compressed.length + 10, 8, true);

    const data = await openZip(archive).read('c.txt');

    expect(new TextDecoder().decode(data ?? undefined)).toBe(text);
  });

  it('rejects files that are not ZIP archives', () => {
    expect(() => openZip(new TextEncoder().encode('not a zip at all, sorry'))).toThrow(
      ZipFormatError,
    );
  });
});

async function deflateRaw(data: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(data);
      controller.close();
    },
  });
  const stream = source.pipeThrough(
    new CompressionStream('deflate-raw') as ReadableWritablePair<Uint8Array, Uint8Array>,
  );
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
