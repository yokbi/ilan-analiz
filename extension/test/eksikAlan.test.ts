import { describe, it, expect } from 'vitest'
import { kmDurumu } from 'shared'
import { loadFixture } from './helpers'
import { sahibinden } from '../src/siteler/sahibinden'
import { arabam } from '../src/siteler/arabam'

// Tek bir alanın okunamadığı ara durum. Panelin 'okunamadi' durumu (hiçbir şey
// okunamadı) ayrıca test ediliyor; burada sorulan, site bir alanı kaldırdığında
// ya da sınıf adını değiştirdiğinde ne olduğu: o alan null'a düşmeli, kalan
// alanlar etkilenmemeli, ayrıştırıcı patlamamalı.
//
// Yeni fixture gerektirmez: mevcut tam dolu fixture'dan tek bir elemanı silerek
// bozuk sayfa türetiyoruz. Sözleşme iki adaptörde de aynı olmalı.

const SAHIBINDEN_URL = 'https://www.sahibinden.com/ilan/vasita-otomobil-fiat-egea-1-6-multijet-lounge-90000004/detay'
const ARABAM_URL = 'https://www.arabam.com/ilan/galeriden-satilik-volkswagen-polo-1-2-tsi-lounge/rcs/90000013'

function sahibindenLi(doc: Document, etiket: string): Element {
  const li = [...doc.querySelectorAll('ul.classifiedInfoList li')]
    .find(l => l.querySelector('strong')?.textContent?.replace(/:$/, '').trim() === etiket)
  if (!li) throw new Error(`fixture'da "${etiket}" satırı yok`)
  return li
}

function arabamOzellik(doc: Document, etiket: string): Element {
  const p = [...doc.querySelectorAll('.property-item')]
    .find(p => p.querySelector('.property-key')?.textContent?.trim() === etiket)
  if (!p) throw new Error(`fixture'da "${etiket}" alanı yok`)
  return p
}

function sil(el: Element | null) {
  if (!el) throw new Error('silinecek eleman fixture\'da yok')
  el.remove()
}

// Karşılaştırma için bozulmamış hâl
const sahTam = sahibinden.detayOku(loadFixture('detay-otomobil.html'), SAHIBINDEN_URL)!
const arbTam = arabam.detayOku(loadFixture('arabam-detay-otomobil.html'), ARABAM_URL)!

// Silinen alan dışındaki her şey bozulmamış hâlle aynı kalmalı
function yalnizDegisen(tam: object, bozuk: object, alan: string) {
  const a = { ...tam } as Record<string, unknown>
  const b = { ...bozuk } as Record<string, unknown>
  delete a[alan]; delete b[alan]
  expect(b).toEqual(a)
}

describe('sahibinden · tek alan okunamadı', () => {
  it('KM satırı yok → km null, kalan alanlar aynı', () => {
    const doc = loadFixture('detay-otomobil.html')
    sil(sahibindenLi(doc, 'KM'))
    const ilan = sahibinden.detayOku(doc, SAHIBINDEN_URL)!
    expect(ilan).not.toBe(null)
    expect(ilan.km).toBe(null)
    yalnizDegisen(sahTam, ilan, 'km')
  })

  it('KM değeri sayı değil ("Belirtilmemiş") → km null, uydurulmaz', () => {
    const doc = loadFixture('detay-otomobil.html')
    sahibindenLi(doc, 'KM').querySelector('span')!.textContent = 'Belirtilmemiş'
    const ilan = sahibinden.detayOku(doc, SAHIBINDEN_URL)!
    expect(ilan.km).toBe(null)
    yalnizDegisen(sahTam, ilan, 'km')
  })

  it('Yıl satırı yok → yil null, kalan alanlar aynı', () => {
    const doc = loadFixture('detay-otomobil.html')
    sil(sahibindenLi(doc, 'Yıl'))
    const ilan = sahibinden.detayOku(doc, SAHIBINDEN_URL)!
    expect(ilan.yil).toBe(null)
    yalnizDegisen(sahTam, ilan, 'yil')
  })

  it('açıklama yok → aciklamaText null, ilan yine okunur', () => {
    const doc = loadFixture('detay-otomobil.html')
    sil(doc.querySelector('#classifiedDescription'))
    const ilan = sahibinden.detayOku(doc, SAHIBINDEN_URL)!
    expect(ilan.aciklamaText).toBe(null)
    yalnizDegisen(sahTam, ilan, 'aciklamaText')
  })

  it('adres linkleri yok → il ve ilçe null', () => {
    const doc = loadFixture('detay-otomobil.html')
    for (const a of doc.querySelectorAll('.classifiedInfo h2 a')) a.remove()
    const ilan = sahibinden.detayOku(doc, SAHIBINDEN_URL)!
    expect(ilan.il).toBe(null)
    expect(ilan.ilce).toBe(null)
    expect(ilan.marka).toBe(sahTam.marka)
  })

  it('kırıntı yok → arama yolları ve kategori null, ilan yine okunur', () => {
    const doc = loadFixture('detay-otomobil.html')
    for (const a of doc.querySelectorAll('.bc-item')) a.remove()
    const ilan = sahibinden.detayOku(doc, SAHIBINDEN_URL)!
    expect(ilan.kategori).toBe(null)
    expect(ilan.modelAramaPath).toBe(null)
    expect(ilan.ustAramaPath).toBe(null)
    expect(ilan.km).toBe(sahTam.km)
  })

  it('fiyat yok → ilan hiç okunmaz (fiyatsız analiz anlamsız)', () => {
    const doc = loadFixture('detay-otomobil.html')
    sil(doc.querySelector('.classifiedInfo h3'))
    expect(sahibinden.detayOku(doc, SAHIBINDEN_URL)).toBe(null)
  })
})

describe('arabam · tek alan okunamadı', () => {
  it('Kilometre alanı yok → km null, kalan alanlar aynı', () => {
    const doc = loadFixture('arabam-detay-otomobil.html')
    sil(arabamOzellik(doc, 'Kilometre'))
    const ilan = arabam.detayOku(doc, ARABAM_URL)!
    expect(ilan.km).toBe(null)
    yalnizDegisen(arbTam, ilan, 'km')
  })

  it('Yıl alanı yok → yil null, kalan alanlar aynı', () => {
    const doc = loadFixture('arabam-detay-otomobil.html')
    sil(arabamOzellik(doc, 'Yıl'))
    const ilan = arabam.detayOku(doc, ARABAM_URL)!
    expect(ilan.yil).toBe(null)
    yalnizDegisen(arbTam, ilan, 'yil')
  })

  it('açıklama yok → aciklamaText null', () => {
    const doc = loadFixture('arabam-detay-otomobil.html')
    sil(doc.querySelector('.tab-description'))
    const ilan = arabam.detayOku(doc, ARABAM_URL)!
    expect(ilan.aciklamaText).toBe(null)
    yalnizDegisen(arbTam, ilan, 'aciklamaText')
  })

  it('İlan No alanı yok → id URL sonundan alınır', () => {
    const doc = loadFixture('arabam-detay-otomobil.html')
    sil(arabamOzellik(doc, 'İlan No'))
    const ilan = arabam.detayOku(doc, ARABAM_URL)!
    expect(ilan.ilanId).toBe('90000013')
    expect(ilan.marka).toBe(arbTam.marka)
  })

  it('fiyat yok → ilan okunur ama fiyat null', () => {
    // sahibinden'den farklı: arabam adaptörü fiyatsız ilanı da döndürüyor.
    // content.tsx `!ilan.fiyat` durumunu 'okunamadi'ya çevirdiği için kullanıcı
    // iki sitede de aynı şeyi görür; bu test o farkı belgeli tutar.
    const doc = loadFixture('arabam-detay-otomobil.html')
    sil(doc.querySelector('.desktop-information-price'))
    const ilan = arabam.detayOku(doc, ARABAM_URL)!
    expect(ilan.fiyat).toBe(null)
    yalnizDegisen(arbTam, ilan, 'fiyat')
  })
})

describe('eksik alan aşağı akışta', () => {
  it('km okunamazsa kilometre yorumu üretilmez (panelde bölüm çıkmaz)', () => {
    expect(kmDurumu(null, sahTam.yil, sahTam.kategori, sahTam.yakit, 2026)).toBe(null)
  })
  it('yıl okunamazsa kilometre yorumu üretilmez', () => {
    expect(kmDurumu(sahTam.km, null, sahTam.kategori, sahTam.yakit, 2026)).toBe(null)
  })
})
