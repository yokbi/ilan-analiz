import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

// npm run surum -- patch|minor|major|1.2.3
//
// Sürüm TEK yerde: public/manifest.json. Not TEK yerde: DEGISIKLIKLER.md. Bu komut
// ikisini birlikte ilerletir; build.mjs de paketlerken ikisinin eşleştiğini denetler.
// Chrome Web Store aynı ya da daha küçük sürümle yüklemeyi reddediyor; hangi sürümün
// mağazada olduğunu bu depo bilemez, o yüzden yalnız "geriye gitmiyor" denetleniyor.

const KOK = import.meta.dirname
export const MANIFEST = join(KOK, 'public/manifest.json')
export const NOTLAR = join(KOK, 'DEGISIKLIKLER.md')

// Chrome: 1–4 nokta ayrımlı tamsayı, her biri 0–65535, baştaki sıfır yok. Firefox da
// bu biçimi kabul ediyor. Biz üç parçalı semver kullanıyoruz.
const SURUM = /^(0|[1-9]\d{0,4})\.(0|[1-9]\d{0,4})\.(0|[1-9]\d{0,4})$/

export function surumGecerli(s) {
  const m = SURUM.exec(s)
  return !!m && m.slice(1).every(p => Number(p) <= 65535)
}

export function sonrakiSurum(simdiki, adim) {
  if (!surumGecerli(simdiki)) throw new Error(`manifest sürümü geçersiz: ${simdiki}`)
  const [maj, min, yama] = simdiki.split('.').map(Number)
  let yeni
  if (adim === 'patch') yeni = `${maj}.${min}.${yama + 1}`
  else if (adim === 'minor') yeni = `${maj}.${min + 1}.0`
  else if (adim === 'major') yeni = `${maj + 1}.0.0`
  else yeni = adim
  if (!surumGecerli(yeni)) throw new Error(`geçersiz sürüm: ${yeni} (patch|minor|major ya da 1.2.3)`)
  if (karsilastir(yeni, simdiki) <= 0) throw new Error(`${yeni}, ${simdiki} sürümünden büyük değil`)
  return yeni
}

export function karsilastir(a, b) {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i]
  return 0
}

/** `## 1.2.3` başlığının altındaki metin; başlık yoksa null. */
export function surumNotu(md, surum) {
  const satirlar = md.split('\n')
  const bas = satirlar.findIndex(l => new RegExp(`^## ${surum.replaceAll('.', '\\.')}(\\s|$)`).test(l))
  if (bas === -1) return null
  const son = satirlar.findIndex((l, i) => i > bas && l.startsWith('## '))
  return satirlar.slice(bas + 1, son === -1 ? undefined : son).join('\n').trim()
}

/** Yeni sürüm başlığını ilk `## ` başlığının önüne ekler. */
export function baslikEkle(md, surum, tarih) {
  const blok = `## ${surum} — ${tarih}\n\n`
  const i = md.search(/^## /m)
  return i === -1 ? `${md.trimEnd()}\n\n${blok}` : md.slice(0, i) + blok + md.slice(i)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const adim = process.argv[2]
  if (!adim) {
    console.error('kullanım: npm run surum -- patch|minor|major|1.2.3')
    process.exit(1)
  }
  const ham = readFileSync(MANIFEST, 'utf8')
  const manifest = JSON.parse(ham)
  const yeni = sonrakiSurum(manifest.version, adim)

  // Dosyayı yeniden biçimlemeden yalnız sürüm satırını değiştir: diff tek satır kalsın.
  writeFileSync(MANIFEST, ham.replace(`"version": "${manifest.version}"`, `"version": "${yeni}"`))
  const tarih = new Date().toISOString().slice(0, 10)
  writeFileSync(NOTLAR, baslikEkle(readFileSync(NOTLAR, 'utf8'), yeni, tarih))

  console.log(`${manifest.version} → ${yeni}`)
  console.log(`DEGISIKLIKLER.md'de "## ${yeni}" başlığının altını doldurun; boşken \`npm run paket\` zip üretmez.`)
}
