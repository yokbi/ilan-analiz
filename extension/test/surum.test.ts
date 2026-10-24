import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
// @ts-expect-error — düz .mjs betiği, tip bildirimi yok
import { surumGecerli, sonrakiSurum, surumNotu, baslikEkle, MANIFEST, NOTLAR } from '../surum.mjs'

// Sürüm ve değişiklik notu akışı (surum.mjs). Buradaki hataların bedeli mağazada
// ödeniyor: geçersiz ya da geriye giden sürüm yüklemede reddediliyor, notsuz sürüm
// kullanıcıya "ne değişti" diye hiçbir şey söylemiyor.

describe('depodaki sürüm', () => {
  const surum: string = JSON.parse(readFileSync(MANIFEST, 'utf8')).version

  it('Chrome ve Firefox\'un kabul ettiği biçimde', () => {
    expect(surumGecerli(surum)).toBe(true)
  })

  it('DEGISIKLIKLER.md\'de dolu bir notu var — yoksa `npm run paket` zip üretmez', () => {
    expect(surumNotu(readFileSync(NOTLAR, 'utf8'), surum)).toBeTruthy()
  })
})

describe('surumGecerli', () => {
  it.each(['0.6.0', '1.0.0', '65535.0.1'])('%s geçerli', s => expect(surumGecerli(s)).toBe(true))
  it.each(['0.6', '01.0.0', '1.0.0-beta', '65536.0.0', 'v1.0.0', ''])('%s geçersiz', s =>
    expect(surumGecerli(s)).toBe(false))
})

describe('sonrakiSurum', () => {
  it('adımlar', () => {
    expect(sonrakiSurum('0.6.0', 'patch')).toBe('0.6.1')
    expect(sonrakiSurum('0.6.3', 'minor')).toBe('0.7.0')
    expect(sonrakiSurum('0.6.3', 'major')).toBe('1.0.0')
    expect(sonrakiSurum('0.6.3', '0.9.0')).toBe('0.9.0')
  })

  it('geriye ya da yerinde sayma reddedilir — mağaza da reddediyor', () => {
    expect(() => sonrakiSurum('0.6.0', '0.6.0')).toThrow()
    expect(() => sonrakiSurum('0.6.0', '0.5.9')).toThrow()
    // Sözlük sırası değil sayı sırası: 0.10.0 > 0.9.0
    expect(sonrakiSurum('0.9.0', '0.10.0')).toBe('0.10.0')
  })

  it('anlamsız adım reddedilir', () => {
    expect(() => sonrakiSurum('0.6.0', 'buyuk')).toThrow()
  })
})

describe('surumNotu / baslikEkle', () => {
  const md = '# Değişiklikler\n\nGiriş.\n\n## 0.6.0 — 2026-10-24\n\n- Panel.\n'

  it('yalnız istenen sürümün notunu döndürür', () => {
    const iki = baslikEkle(md, '0.7.0', '2026-11-01').replace('## 0.7.0 — 2026-11-01\n\n', '## 0.7.0 — 2026-11-01\n\n- Yeni.\n\n')
    expect(surumNotu(iki, '0.7.0')).toBe('- Yeni.')
    expect(surumNotu(iki, '0.6.0')).toBe('- Panel.')
  })

  it('yeni başlık en üste, boş gövdeyle eklenir — doldurulmadan paket çıkmaz', () => {
    const yeni = baslikEkle(md, '0.7.0', '2026-11-01')
    expect(yeni.indexOf('## 0.7.0')).toBeLessThan(yeni.indexOf('## 0.6.0'))
    expect(surumNotu(yeni, '0.7.0')).toBe('')
  })

  it('başlığı olmayan sürüm null; 0.6.0 notu 0.6.10\'a karışmaz', () => {
    expect(surumNotu(md, '0.8.0')).toBeNull()
    expect(surumNotu('## 0.6.10\n\n- x\n', '0.6.1')).toBeNull()
  })
})
