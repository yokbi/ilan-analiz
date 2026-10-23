import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Mağaza gizlilik sekmesi metinleri (magaza/izin-gerekceleri.md) manifest'le
// AYRIŞMASIN. Ayrışma sessiz: paket yüklenir, testler yeşildir, ama inceleme
// gerekçesi yazılmamış bir izni ya da metinde anılmayan bir hostu görünce
// paketi reddeder — ve bunu günler sonra öğreniriz.
//
// Manifest derlenmeden okunuyor: izinler public/manifest.json'dan, hostlar
// build.mjs'in kullandığı kaynaktan (kayit.json + manifest'teki site dışı
// hostlar). Derlenmiş manifest'in bu ikisiyle birebir olduğunu paket.test.ts
// zaten sınıyor.

const KOK = join(import.meta.dirname, '..')
const METIN = readFileSync(join(KOK, 'magaza/izin-gerekceleri.md'), 'utf8')
const MANIFEST = JSON.parse(readFileSync(join(KOK, 'public/manifest.json'), 'utf8'))
const SITELER: { eslesenler: string[] }[] =
  JSON.parse(readFileSync(join(KOK, 'src/siteler/kayit.json'), 'utf8'))

const HOSTLAR = [
  ...SITELER.flatMap(s => s.eslesenler),
  ...MANIFEST.host_permissions.filter((h: string) => !h.includes('sahibinden')),
].filter((h, i, d) => d.indexOf(h) === i)

// Başlık → başlığın altındaki ilk ```text bloğu
function bolumler(): Map<string, string> {
  const sonuc = new Map<string, string>()
  // Ara metin başka bir başlığı geçemez: bloksuz bir başlık bir sonrakinin
  // bloğunu sahiplenmesin.
  const desen = /^#{2,3} (.+)\n(?:(?!^#{1,3} )[\s\S])*?^```text\n([\s\S]*?)^```$/gm
  for (const [, baslik, govde] of METIN.matchAll(desen)) sonuc.set(baslik.trim(), govde.trim())
  return sonuc
}

describe('mağaza metni — manifest ile ayrışmaz', () => {
  const b = bolumler()

  it('manifest\'teki her iznin gerekçesi var', () => {
    for (const izin of MANIFEST.permissions) {
      expect(b.get(`\`${izin}\``), `'${izin}' için gerekçe yok`).toBeTruthy()
    }
  })

  it('manifest\'te olmayan bir iznin gerekçesi yok', () => {
    // Gerekçesi duran ama artık istenmeyen bir izin, inceleyene "bu nerede?"
    // diye sorduran bir tutarsızlık.
    const yazilanlar = [...b.keys()].filter(k => /^`.+`$/.test(k)).map(k => k.slice(1, -1))
    expect(yazilanlar.sort()).toEqual([...MANIFEST.permissions].sort())
  })

  it('host gerekçesi her hostu adıyla anıyor', () => {
    const host = b.get('Host permissions')
    expect(host).toBeTruthy()
    for (const h of HOSTLAR) expect(host, `'${h}' host gerekçesinde yok`).toContain(h)
  })

  it('tek amaç metni desteklenen her siteyi anıyor', () => {
    const amac = b.get('Single purpose')!
    for (const s of SITELER) {
      const alan = new URL(s.eslesenler[0].replace('/*', '/')).host.replace(/^www\./, '')
      expect(amac, `'${alan}' tek amaç metninde yok`).toContain(alan)
    }
  })

  it('her metin mağazanın 1000 karakter sınırında', () => {
    expect(b.size).toBeGreaterThanOrEqual(4)
    for (const [baslik, govde] of b) {
      expect(govde.length, `'${baslik}' ${govde.length} karakter`).toBeLessThanOrEqual(1000)
    }
  })
})
