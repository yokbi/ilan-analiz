import { describe, it, expect } from 'vitest'
import { kmDurumu } from 'shared'
import { loadFixture } from './helpers'
import { sahibinden } from '../src/siteler/sahibinden'
import { arabam } from '../src/siteler/arabam'

// Eksik/bozuk ilan fixture'ları. Diğer detay fixture'ları gibi elle kuruldu
// (bkz. fixtures/selectors.md); hiçbiri gerçek bir ilandan değil. eksikAlan.test.ts
// tam dolu fixture'dan tek eleman silerek çalışır; buradakiler birden çok eksiği
// aynı sayfada ve sitede görülebilecek biçim farklarını bir arada dener.

describe('sahibinden · detay-eksik.html (km yok, yıl belirtilmemiş, açıklama boş)', () => {
  const url = 'https://www.sahibinden.com/ilan/vasita-otomobil-renault-clio-1-5-dci-joy-90000008/detay'
  const ilan = sahibinden.detayOku(loadFixture('detay-eksik.html'), url)!

  it('ilan yine okunur, fiyat ve kimlik tam', () => {
    expect(ilan).not.toBe(null)
    expect(ilan.ilanId).toBe('90000008') // "İlan No" satırı yok, URL'den
    expect(ilan.fiyat).toEqual({ tutar: 545000, paraBirimi: 'TL' })
    expect(ilan.baslik).toBe('Örnek Renault Clio 1.5 dCi Joy')
  })
  it('eksik alanlar null, uydurulmaz', () => {
    expect(ilan.km).toBe(null)
    expect(ilan.yil).toBe(null) // "Belirtilmemiş"
    expect(ilan.aciklamaText).toBe(null) // yalnız boşluk
    expect(ilan.ilce).toBe(null)
  })
  it('dolu alanlar etkilenmez', () => {
    expect(ilan.marka).toBe('Renault')
    expect(ilan.seri).toBe('Clio')
    expect(ilan.model).toBe('1.5 dCi Joy')
    expect(ilan.yakit).toBe('Dizel')
    expect(ilan.vites).toBe('Manuel')
    expect(ilan.agirHasarKayitli).toBe('Hayır')
    expect(ilan.kimden).toBe('Sahibinden')
    expect(ilan.il).toBe('Eskişehir')
    expect(ilan.kategori).toBe('Otomobil')
    expect(ilan.modelAramaPath).toBe('/renault-clio-1-5-dci')
  })
  it('değeri boş satır ekAlanlar’a boş değer olarak girmez', () => {
    expect(ilan.ekAlanlar).toEqual({})
  })
  it('kilometre yorumu üretilmez', () => {
    expect(kmDurumu(ilan.km, ilan.yil, ilan.kategori, ilan.yakit, 2026)).toBe(null)
  })
})

describe('sahibinden · detay-fiyatsiz.html', () => {
  it('fiyatta rakam yoksa ilan okunmaz (panel "okunamadı" der)', () => {
    const url = 'https://www.sahibinden.com/ilan/vasita-otomobil-toyota-corolla-1-6-dream-90000006/detay'
    expect(sahibinden.detayOku(loadFixture('detay-fiyatsiz.html'), url)).toBe(null)
  })
})

describe('sahibinden · detay-farkli-duzen.html', () => {
  // URL'de id yok: İlan No da DOM'dan, "İlan No :" biçimli etiketten okunmalı
  const url = 'https://www.sahibinden.com/ilan/vasita-otomobil-opel-astra-1-4-turbo-edition/detay'
  const ilan = sahibinden.detayOku(loadFixture('detay-farkli-duzen.html'), url)!

  it('"KM :" gibi boşluklu etiketler tanınır', () => {
    expect(ilan.km).toBe(143250)
    expect(ilan.yakit).toBe('Benzin & LPG')
    expect(ilan.vites).toBe('Yarı Otomatik')
    expect(ilan.agirHasarKayitli).toBe('Hayır')
    expect(ilan.ilanId).toBe('90000007')
  })
  it('iki noktasız etiketler ve iç içe değerler okunur', () => {
    expect(ilan.yil).toBe(2015)
    expect(ilan.kimden).toBe('Galeriden')
    expect(ilan.marka).toBe('Opel')
    expect(ilan.seri).toBe('Astra')
    expect(ilan.model).toBe('1.4 Turbo Edition')
  })
  it('fiyatın yanındaki rakamsız ek metin tutarı bozmaz', () => {
    expect(ilan.fiyat).toEqual({ tutar: 690000, paraBirimi: 'TL' })
  })
  it('başlık, adres ve açıklamadaki satır sonları ve boşluklar temizlenir', () => {
    expect(ilan.baslik).toBe('Örnek Opel Astra 1.4 Turbo Edition')
    expect(ilan.il).toBe('Adana')
    expect(ilan.ilce).toBe('Seyhan')
    expect(ilan.aciklamaText).toBe('Örnek test metni. Gerçek bir ilandan değil, yalnız ayrıştırıcı testleri için üretilmiştir.')
  })
  it('ekAlanlar’da sondaki boşluklu anahtar kalmaz, eşlenen alanlar oraya sızmaz', () => {
    expect(ilan.ekAlanlar).toEqual({ 'İlan No': '90000007', 'Renk': 'Gri' })
  })
})

describe('arabam · arabam-detay-eksik.html (fiyat yok, km "-", açıklama boş)', () => {
  const url = 'https://www.arabam.com/ilan/sahibinden-satilik-peugeot-301-1-6-bluehdi-active/rcs/90000009'
  const ilan = arabam.detayOku(loadFixture('arabam-detay-eksik.html'), url)!

  it('ilan okunur, fiyat null (content.tsx bunu "okunamadı"ya çevirir)', () => {
    expect(ilan).not.toBe(null)
    expect(ilan.fiyat).toBe(null)
  })
  it('eksik alanlar null, uydurulmaz', () => {
    expect(ilan.ilanId).toBe('90000009') // "İlan No" alanı yok, URL'den
    expect(ilan.km).toBe(null) // "-"
    expect(ilan.aciklamaText).toBe(null) // yalnız boşluk
    expect(ilan.agirHasarKayitli).toBe(null)
    expect(ilan.ekAlanlar['Tramer']).toBeUndefined() // tramer bölümü yok
  })
  it('dolu alanlar etkilenmez', () => {
    expect(ilan.marka).toBe('Peugeot')
    expect(ilan.seri).toBe('301')
    expect(ilan.model).toBe('1.6 BlueHDi Active')
    expect(ilan.yil).toBe(2018)
    expect(ilan.yakit).toBe('Dizel')
    expect(ilan.vites).toBe('Manuel')
    expect(ilan.kimden).toBe('Sahibinden')
    expect(ilan.kategori).toBe('Otomobil')
    expect(ilan.modelAramaPath).toBe('/ikinci-el/otomobil/peugeot-301')
    expect(ilan.ustAramaPath).toBe('/ikinci-el/otomobil/peugeot')
  })
  it('değeri boş alan ekAlanlar’a girmez', () => {
    expect(ilan.ekAlanlar).toEqual({})
  })
})
