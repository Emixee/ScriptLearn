// Assemble une toolchain Rust EMBARQUÉE minimale pour la cible windows-gnu
// (réutilise le linker MinGW déjà embarqué). On télécharge les composants rustc
// et rust-std, puis on les fusionne dans resources/rust de façon que rustc trouve
// la lib standard (lib/rustlib/<target>).
import { existsSync, mkdirSync, rmSync, createWriteStream, cpSync } from 'fs'
import { execFileSync } from 'child_process'
import { join, resolve } from 'path'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'

const VER = '1.83.0'
const TARGET = 'x86_64-pc-windows-gnu'
const ROOT = resolve('resources')
const DL = join(ROOT, '_dl')
const OUT = join(ROOT, 'rust')
const BSDTAR = 'C:\\Windows\\System32\\tar.exe'
mkdirSync(DL, { recursive: true })

if (existsSync(join(OUT, 'bin', 'rustc.exe'))) { console.log('✓ rust déjà assemblé'); process.exit(0) }

async function dl(url, dest) {
  if (existsSync(dest)) { console.log('  (déjà téléchargé)', dest); return }
  console.log('  télécharge', url)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest))
}
function untar(archive, outDir) { mkdirSync(outDir, { recursive: true }); execFileSync(BSDTAR, ['-xf', archive, '-C', outDir], { stdio: 'inherit' }) }

const rustcUrl = `https://static.rust-lang.org/dist/rustc-${VER}-${TARGET}.tar.gz`
const stdUrl = `https://static.rust-lang.org/dist/rust-std-${VER}-${TARGET}.tar.gz`
const rustcTar = join(DL, 'rustc.tar.gz')
const stdTar = join(DL, 'ruststd.tar.gz')
await dl(rustcUrl, rustcTar)
await dl(stdUrl, stdTar)

const tmpR = join(DL, 'x_rustc'); const tmpS = join(DL, 'x_std')
rmSync(tmpR, { recursive: true, force: true }); rmSync(tmpS, { recursive: true, force: true })
console.log('  extraction rustc…'); untar(rustcTar, tmpR)
console.log('  extraction std…'); untar(stdTar, tmpS)

// Assemblage : rustc/* → resources/rust ; std rustlib/<target> → resources/rust/lib/rustlib/<target>
rmSync(OUT, { recursive: true, force: true })
const rustcInner = join(tmpR, `rustc-${VER}-${TARGET}`, 'rustc')
const stdInner = join(tmpS, `rust-std-${VER}-${TARGET}`, `rust-std-${TARGET}`, 'lib', 'rustlib', TARGET)
console.log('  copie rustc…'); cpSync(rustcInner, OUT, { recursive: true })
console.log('  copie std…'); cpSync(stdInner, join(OUT, 'lib', 'rustlib', TARGET), { recursive: true })

if (!existsSync(join(OUT, 'bin', 'rustc.exe'))) throw new Error('rustc.exe introuvable après assemblage')
console.log('✓ rust assemblé dans resources/rust')
