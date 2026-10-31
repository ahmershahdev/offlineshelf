// Generates every raster asset from the brand sources in src/assets/source, so each one can be
// rebuilt. Run with `npm run images`; output is committed to public/.
import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pub = join(root, 'public')
const brand = join(root, 'src', 'assets', 'source', 'brand')
const emblem = join(brand, 'emblem.png')
const PAPER = '#ece6da'
const INK = '#0b0b0a'

await mkdir(join(pub, 'img'), { recursive: true })
await mkdir(join(pub, 'og'), { recursive: true })

await copyFile(join(brand, 'favicon.ico'), join(pub, 'favicon.ico'))

// The emblem is black and orange; on the dark site it sits on a paper tile so the black half
// stays visible. App icons need a solid background anyway (iOS fills transparency with black).
async function tile(size, pad) {
  const inner = Math.round(size * (1 - pad * 2))
  const art = await sharp(emblem).resize(inner, inner, { fit: 'contain' }).toBuffer()
  return sharp({ create: { width: size, height: size, channels: 4, background: PAPER } })
    .composite([{ input: art, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toBuffer()
}

await writeFile(join(pub, 'favicon-32.png'), await tile(32, 0.04))
await writeFile(join(pub, 'apple-touch-icon.png'), await tile(180, 0.12))
await writeFile(join(pub, 'img', 'icon-192.png'), await tile(192, 0.12))
await writeFile(join(pub, 'img', 'icon-512.png'), await tile(512, 0.12))
// Android crops maskable icons to a circle; the safe zone is the inner 80%.
await writeFile(join(pub, 'img', 'icon-maskable-512.png'), await tile(512, 0.2))

for (const size of [64, 128]) {
  await sharp(emblem)
    .resize(size, size)
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(join(pub, 'img', `emblem-${size}.webp`))
}
await sharp(join(brand, 'logo-full.png'))
  .resize(640, 640)
  .webp({ quality: 88, alphaQuality: 100 })
  .toFile(join(pub, 'img', 'logo-full.webp'))

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
    out += `<rect x="${x}" y="${560 - h}" width="${w}" height="${h}" rx="2" fill="${accent ? '#ff5a1f' : PAPER}" fill-opacity="${accent ? 1 : tone}"/>`
    x += w + 4
  }
  return out
}

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${INK}"/>
  <rect x="70" y="58" width="64" height="64" rx="14" fill="${PAPER}"/>
  <text x="154" y="100" fill="#8f897d" font-family="Consolas, 'DejaVu Sans Mono', monospace" font-size="20" letter-spacing="3">OFFLINESHELF.AHMERSHAH.DEV</text>
  <text x="66" y="236" fill="${PAPER}" font-family="Georgia, 'DejaVu Serif', serif" font-size="88" letter-spacing="-2">Wikipedia reading lists</text>
  <text x="66" y="326" fill="#ff5a1f" font-family="Georgia, 'DejaVu Serif', serif" font-style="italic" font-size="88" letter-spacing="-2">for places without internet.</text>
  ${spines()}
  <rect x="60" y="560" width="1080" height="4" fill="${PAPER}" fill-opacity=".5"/>
</svg>`
await writeFile(join(root, 'src', 'assets', 'source', 'og-default.svg'), og)
const ogEmblem = await sharp(emblem).resize(52, 52).toBuffer()
const ogBase = await sharp(Buffer.from(og)).png().toBuffer()
const ogFinal = sharp(ogBase).composite([{ input: ogEmblem, left: 76, top: 64 }])
// PNG, not WebP: several link-preview crawlers still ignore WebP og:images.
await ogFinal
  .clone()
  .png({ compressionLevel: 9, palette: true })
  .toFile(join(pub, 'og', 'og-default.png'))
await ogFinal.clone().webp({ quality: 82 }).toFile(join(pub, 'og', 'og-default.webp'))

console.log('images written to public/')
