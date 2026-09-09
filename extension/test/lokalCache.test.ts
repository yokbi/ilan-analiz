import { describe, it, expect, afterEach } from 'vitest'
import { lokalSonucGet, lokalSonucSet, KAYIT_SURUMU } from '../src/lokalCache'
import type { AnalysisResult } from 'shared'

// Depo kayıtları 24 saat yaşıyor, yani her sürüm yükseltmesinde uzantı DÜNKÜ
// biçimi okumak zorunda kalıyor. Buradaki soru "kayıt duruyor mu" değil:
// okunamayan bir kaydın panele verilip verilmediği. Verilirse kullanıcı
// çöken ya da eksik çizilen bir panel görür ve sebebini anlayamaz.

const SONUC: AnalysisResult = {
  skor: 7, durumEtiketi: 'Makul', chipler: ['Dizel'], bayraklar: [],
  avantajlar: ['a'], dezavantajlar: ['b'], ozet: 'özet',
  pazarlikHedefi: 700000, fiyatYorumu: 'yorum',
  fiyatIstatistik: null, kmDurum: null, kronikSorunlar: []
}

function depoKur(baslangic: Record<string, any> = {}) {
  const kutu: Record<string, any> = { ...baslangic }
  ;(globalThis as any).chrome = {
    storage: { local: {
      get: async (k: string | null) => (k === null ? kutu : { [k]: kutu[k] }),
      set: async (o: Record<string, any>) => { Object.assign(kutu, o) },
      remove: async (ks: string | string[]) => { for (const k of ([] as string[]).concat(ks)) delete kutu[k] }
    } },
    runtime: {}
  }
  return kutu
}

afterEach(() => { delete (globalThis as any).chrome })

const K = 'analiz:1:800000'

describe('yerel analiz önbelleği', () => {
  it('yazılan sonuç aynen geri okunur', async () => {
    depoKur()
    await lokalSonucSet('1', 800000, SONUC)
    expect(await lokalSonucGet('1', 800000)).toEqual(SONUC)
  })

  it('kayıt sürümüyle birlikte yazılır', async () => {
    const kutu = depoKur()
    await lokalSonucSet('1', 800000, SONUC)
    expect(kutu[K].surum).toBe(KAYIT_SURUMU)
  })

  it('BAŞKA SÜRÜMDEN kalan kayıt kullanılmaz — yeniden üretilir', async () => {
    depoKur({ [K]: { sonuc: SONUC, ts: Date.now(), surum: KAYIT_SURUMU + 1 } })
    expect(await lokalSonucGet('1', 800000)).toBeNull()
  })

  it('SÜRÜMSÜZ eski kayıt kullanılmaz', async () => {
    // Bu alan eklenmeden önce yazılmış kayıtlar. Bugün depolarda duruyorlar.
    depoKur({ [K]: { sonuc: SONUC, ts: Date.now() } })
    expect(await lokalSonucGet('1', 800000)).toBeNull()
  })

  it('ŞEMAYA UYMAYAN gövde panele verilmez', async () => {
    // Sürüm doğru ama gövde eksik: elle düzenlenmiş ya da yarım yazılmış kayıt.
    const { ozet: _cikar, ...eksik } = SONUC as any
    depoKur({ [K]: { sonuc: eksik, ts: Date.now(), surum: KAYIT_SURUMU } })
    expect(await lokalSonucGet('1', 800000)).toBeNull()
  })

  it('süresi dolan kayıt kullanılmaz', async () => {
    depoKur({ [K]: { sonuc: SONUC, ts: Date.now() - 25 * 3600_000, surum: KAYIT_SURUMU } })
    expect(await lokalSonucGet('1', 800000)).toBeNull()
  })

  it('bozuk kayıt çökmeye değil, boş dönüşe sebep olur', async () => {
    depoKur({ [K]: 'bu bir nesne bile değil' })
    expect(await lokalSonucGet('1', 800000)).toBeNull()
  })

  it('fiyat değişince kayıt eşleşmez — eski fiyata göre analiz gösterilmez', async () => {
    depoKur()
    await lokalSonucSet('1', 800000, SONUC)
    expect(await lokalSonucGet('1', 750000)).toBeNull()
  })
})
