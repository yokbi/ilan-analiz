import { describe, it, expect } from 'vitest'
import { KOYU, ACIK, STIL, tema, type Palet } from '../src/ui/stil'
import { LISTE_STIL, ILERLEME_STIL } from '../src/ui/liste'

// WCAG 2.x göreli parlaklık ve kontrast oranı
function parlaklik(hex: string): number {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function kontrast(a: string, b: string): number {
  const [x, y] = [parlaklik(a), parlaklik(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

// Stilde gerçekten yan yana gelen metin/zemin çiftleri. Panelin yazıları 9–13px —
// hiçbiri WCAG'ın "büyük metin" sınıfına girmiyor, eşik her çift için 4.5.
const CIFTLER: [keyof Palet, keyof Palet][] = [
  ['metin', 'zemin'], ['metin', 'yuzey'], ['metin', 'yuzey2'], ['metin', 'kirmizi-zemin'],
  ['metin2', 'zemin'], ['metin2', 'yuzey'], ['metin2', 'yuzey2'],
  ['metin3', 'zemin'], ['metin3', 'yuzey'],
  ['yesil', 'zemin'], ['yesil', 'yuzey'], ['yesil', 'yesil-zemin'],
  ['sari', 'sari-zemin'],
  ['kirmizi', 'zemin'], ['kirmizi', 'kirmizi-zemin'],
  ['dugme-metin', 'yesil'],
]

describe('kontrast — WCAG AA', () => {
  for (const [ad, palet] of [['koyu', KOYU], ['açık', ACIK]] as const) {
    for (const [on, arka] of CIFTLER) {
      it(`${ad}: --${on} / --${arka} ≥ 4.5`, () => {
        expect(kontrast(palet[on], palet[arka])).toBeGreaterThanOrEqual(4.5)
      })
    }
  }

  it('sayfaya basılan liste rozetleri ≥ 4.5', () => {
    const yazi = LISTE_STIL.match(/\.aa-rozet \{[^}]*?color: (#[0-9a-f]{6})/)![1]
    const zeminler = [...LISTE_STIL.matchAll(/\.aa-rozet\.aa-r-\w+ \{ background: (#[0-9a-f]{6})/g)].map(m => m[1])
    expect(zeminler).toHaveLength(3)
    for (const z of zeminler) expect(kontrast(yazi, z)).toBeGreaterThanOrEqual(4.5)
  })
})

describe('tema', () => {
  it('varsayılan koyu, sistem açıksa açık palet', () => {
    const css = tema(':host')
    expect(css).toContain(`--zemin: ${KOYU.zemin}`)
    expect(css).toMatch(/@media \(prefers-color-scheme: light\) \{ :host \{ color-scheme: light;[^}]*--zemin: #fbf9f6/)
  })

  it('iki palet aynı değişkenleri tanımlıyor', () => {
    expect(Object.keys(ACIK).sort()).toEqual(Object.keys(KOYU).sort())
  })

  it('stilde kullanılan her değişken tanımlı', () => {
    const tanimli = new Set([...Object.keys(KOYU), 'sans', 'mono'])
    for (const css of [STIL, ILERLEME_STIL]) {
      for (const [, ad] of css.matchAll(/var\(--([\w-]+)\)/g)) expect(tanimli, ad).toContain(ad)
    }
  })
})
