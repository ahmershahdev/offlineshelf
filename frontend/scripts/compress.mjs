// Precompresses static assets so nginx serves .gz (gzip_static) without spending CPU per
// request; .br files are ready for a brotli-enabled nginx. HTML is left alone on purpose: nginx
// rewrites the CSP nonce placeholder in HTML with sub_filter, which only works on plain bodies.
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { brotliCompressSync, constants, gzipSync } from 'node:zlib'

const dist = fileURLToPath(new URL('../dist', import.meta.url))
const COMPRESSIBLE = new Set([
  '.js',
  '.css',
  '.svg',
  '.json',
  '.webmanifest',
  '.txt',
  '.xml',
  '.frag',
  '.vert',
])
const MIN_BYTES = 1024

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(path)
    else yield path
  }
}

let saved = 0
for await (const file of walk(dist)) {
  if (!COMPRESSIBLE.has(extname(file))) continue
  if ((await stat(file)).size < MIN_BYTES) continue
  const body = await readFile(file)
  const gz = gzipSync(body, { level: 9 })
  const br = brotliCompressSync(body, {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: 11,
      [constants.BROTLI_PARAM_SIZE_HINT]: body.length,
    },
  })
  await writeFile(`${file}.gz`, gz)
  await writeFile(`${file}.br`, br)
  saved += body.length - br.length
}
console.log(`precompressed assets, ${(saved / 1024).toFixed(0)} KiB saved with brotli`)
