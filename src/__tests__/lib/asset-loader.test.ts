import { afterEach, describe, expect, it, vi } from 'vitest';
import { gzipSync } from 'node:zlib';
import { Blob as NodeBlob } from 'node:buffer';
import { fetchAssembledBlob } from '@/lib/utils/asset-loader';

const asset = '/libreoffice-wasm/soffice.wasm.bin';
const url = asset + '?v=test';
const sample = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]);

afterEach(() => vi.unstubAllGlobals());

function stubParts(bytes: Uint8Array, encoding?: 'gzip', totalSize = bytes.length) {
  vi.stubGlobal('Blob', NodeBlob);
  const offset = Math.ceil(bytes.length / 2);
  vi.stubGlobal('fetch', vi.fn(async (request: string) => {
    if (request === asset + '.manifest.json?v=test') {
      return Response.json({ filename: 'soffice.wasm.bin', chunks: 2, chunkSize: offset, totalSize, encoding });
    }
    if (request === asset + '.part_0?v=test') return new Response(bytes.slice(0, offset) as Uint8Array<ArrayBuffer>);
    if (request === asset + '.part_1?v=test') return new Response(bytes.slice(offset) as Uint8Array<ArrayBuffer>);
    return new Response(null, { status: 404 });
  }));
}

describe('chunked engine assets', () => {
  it('reassembles and decompresses gzip parts as WebAssembly', async () => {
    stubParts(gzipSync(sample), 'gzip');
    const wasm = await fetchAssembledBlob(url, undefined, true);
    expect(wasm.type).toBe('application/wasm');
    await expect(WebAssembly.compile(await wasm.arrayBuffer())).resolves.toBeInstanceOf(WebAssembly.Module);
  });

  it('still supports the existing uncompressed chunks', async () => {
    stubParts(sample);
    const wasm = await fetchAssembledBlob(url);
    await expect(WebAssembly.compile(await wasm.arrayBuffer())).resolves.toBeInstanceOf(WebAssembly.Module);
  });

  it('rejects truncated payloads and missing manifests', async () => {
    stubParts(sample, undefined, sample.length + 1);
    await expect(fetchAssembledBlob(url, undefined, true)).rejects.toThrow('Incomplete asset');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 404 })));
    await expect(fetchAssembledBlob(url, undefined, true)).rejects.toThrow('Missing asset manifest');
  });
});
