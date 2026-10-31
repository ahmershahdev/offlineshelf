// Generates every raster asset from source SVGs and code, so the repo holds no binary
// that can't be rebuilt. Run with `npm run images`; output is committed to public/.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pub = join(root, 'public')
const src = join(root, 'src', 'assets', 'source')

await mkdir(join(pub, 'img'), { recursive: true })
await mkdir(join(pub, 'og'), { recursive: true })

const favicon = await readFile(join(src, 'favicon.svg'))
await writeFile(join(pub, 'favicon.svg'), favicon)
for (const [name, size] of [
  ['favicon-32.png', 32],
  ['apple-touch-icon.png', 180],
  ['img/icon-192.png', 192],
  ['img/icon-512.png', 512],
]) {
  await sharp(favicon, { density: 600 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(join(pub, name))
}

// Seeded pseudo-random so the grain file is identical on every run (stable diffs).
let seed = 7
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647
const size = 256
const noise = Buffer.alloc(size * size)
for (let i = 0; i < noise.length; i++) noise[i] = Math.floor(rand() * 255)
await sharp(noise, { raw: { width: size, height: size, channels: 1 } })
  .webp({ quality: 60 })
  .toFile(join(pub, 'img', 'grain.webp'))

function spines() {
  let x = 70
  let out = ''
  let s = 3
  const r = () => (s = (s * 48271) % 2147483647) / 2147483647
  while (x < 1130) {
    const w = 8 + Math.floor(r() * 9)
    const h = 60 + Math.floor(r() * 110)
    const accent = r() > 0.975
    const tone = (0.35 + r() * 0.6).toFixed(2)
    out += `<rect x="${x}" y="${560 - h}" width="${w}" height="${h}" rx="2" fill="${accent ? '#ff5a1f' : '#ece6da'}" fill-opacity="${accent ? 1 : tone}"/>`
    x += w + 4
  }
  return out
}

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0b0b0a"/>
  <text x="70" y="120" fill="#8f897d" font-family="Consolas, 'DejaVu Sans Mono', monospace" font-size="20" letter-spacing="3">OFFLINESHELF.AHMERSHAH.DEV</text>
  <text x="66" y="230" fill="#ece6da" font-family="Georgia, 'DejaVu Serif', serif" font-size="88" letter-spacing="-2">Wikipedia reading lists</text>
  <text x="66" y="320" fill="#ff5a1f" font-family="Georgia, 'DejaVu Serif', serif" font-style="italic" font-size="88" letter-spacing="-2">for places without internet.</text>
  ${spines()}
  <rect x="60" y="560" width="1080" height="4" fill="#ece6da" fill-opacity=".5"/>
</svg>`
await writeFile(join(src, 'og-default.svg'), og)
// PNG, not WebP: several link-preview crawlers still ignore WebP og:images.
await sharp(Buffer.from(og))
  .png({ compressionLevel: 9, palette: true })
  .toFile(join(pub, 'og', 'og-default.png'))
await sharp(Buffer.from(og))
  .webp({ quality: 82 })
  .toFile(join(pub, 'og', 'og-default.webp'))

console.log('images written to public/')
