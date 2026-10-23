import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  anahtarGetir, anahtarKaydet, anahtarSil, anahtarDogrula, anahtarMaskele, VARSAYILAN_MODEL, ANAHTAR_HATA
} from '../src/anahtar'

const yanit = (status: number): any => ({ ok: status >= 200 && status < 300, status })

describe('anahtar saklama', () => {
  let kutu: Record<string, any>
  beforeEach(() => {
    kutu = {}
    ;(globalThis as any).chrome = {
      storage: { local: {
        get: async (k: string) => ({ [k]: kutu[k] }),
        set: async (o: Record<string, any>) => { Object.assign(kutu, o) },
        remove: async (k: string) => { delete kutu[k] }
      } }
    }
  })
  afterEach(() => { delete (globalThis as any).chrome })

  it('kaydedilen anahtar geri okunur, baştaki/sondaki boşluk kırpılır', async () => {
    await anahtarKaydet('  AIzaSyTestAnahtar123  ')
    expect(await anahtarGetir()).toBe('AIzaSyTestAnahtar123')
  })

  it('anahtar yokken null döner', async () => {
    expect(await anahtarGetir()).toBe(null)
  })

  it('silinince gerçekten gider', async () => {
    await anahtarKaydet('AIzaSyTest')
    await anahtarSil()
    expect(await anahtarGetir()).toBe(null)
  })
})

describe('anahtar doğrulama', () => {
  it('geçerli anahtar: TEK MODEL sorgusu yapılır, token harcanmaz', async () => {
    const cagrilar: any[] = []
    const fetcher: any = async (url: string, init: any) => { cagrilar.push({ url, init }); return yanit(200) }
    expect(await anahtarDogrula('AIzaSyGecerli', fetcher)).toEqual({ ok: true })
    expect(cagrilar).toHaveLength(1)
    // generateContent DEĞİL: o token yakar ve kullanıcıya boşuna para harcatır
    expect(cagrilar[0].url).toContain(`/models/${VARSAYILAN_MODEL}`)
    expect(cagrilar[0].url).not.toContain('generateContent')
    expect(cagrilar[0].init.headers['x-goog-api-key']).toBe('AIzaSyGecerli')
  })

  it('boş anahtar ağa hiç çıkmaz', async () => {
    let cagrildi = false
    const fetcher: any = async () => { cagrildi = true; return yanit(200) }
    expect(await anahtarDogrula('   ', fetcher)).toEqual({ ok: false, hata: 'bos' })
    expect(cagrildi).toBe(false)
  })

  it('HTTP durumları ayrı hatalara eşlenir', async () => {
    const ile = (s: number): any => async () => yanit(s)
    expect(await anahtarDogrula('k', ile(400))).toEqual({ ok: false, hata: 'gecersiz' })
    expect(await anahtarDogrula('k', ile(403))).toEqual({ ok: false, hata: 'yetki' })
    expect(await anahtarDogrula('k', ile(429))).toEqual({ ok: false, hata: 'kota' })
  })

  it('Google arızası (5xx) "anahtar geçersiz" sayılmaz — sağlam anahtar atılmasın', async () => {
    const ile = (s: number): any => async () => yanit(s)
    expect(await anahtarDogrula('k', ile(500))).toEqual({ ok: false, hata: 'sunucu' })
    expect(await anahtarDogrula('k', ile(503))).toEqual({ ok: false, hata: 'sunucu' })
  })

  it('her hata kodunun kullanıcıya gösterilecek bir metni var', () => {
    for (const k of ['bos', 'gecersiz', 'yetki', 'kota', 'ag', 'sunucu', 'depo', 'sil'])
      expect(ANAHTAR_HATA[k], k).toBeTruthy()
  })

  it('ağ hatası kota/geçersizden ayrı tutulur — teşhis için şart', async () => {
    const fetcher: any = async () => { throw new Error('offline') }
    expect(await anahtarDogrula('k', fetcher)).toEqual({ ok: false, hata: 'ag' })
  })
})

describe('anahtar maskeleme', () => {
  it('uzun anahtarda baş ve son görünür, ortası gizlenir', () => {
    const m = anahtarMaskele('AIzaSyABCDEFGHIJKLMNOP1234')
    expect(m.startsWith('AIzaSy')).toBe(true)
    expect(m.endsWith('1234')).toBe(true)
    expect(m).not.toContain('ABCDEFGHIJ')
  })
  it('kısa girdide hiçbir karakter sızmaz', () => {
    expect(anahtarMaskele('kisa')).toBe('••••')
  })
})

// Popup arayüzü: kullanıcının gördüğü akış. Anahtar geçersizse KAYDEDİLMEMELİ —
// yoksa hata ilan sayfasında çıkar ve kullanıcı sebebini orada aramaya başlar.
describe('Anahtar arayüzü', () => {
  let kutu: Record<string, any>
  beforeEach(() => {
    kutu = {}
    ;(globalThis as any).chrome = {
      storage: { local: {
        get: async (k: string) => ({ [k]: kutu[k] }),
        set: async (o: Record<string, any>) => { Object.assign(kutu, o) },
        remove: async (k: string) => { delete kutu[k] }
      } }
    }
  })
  afterEach(() => { delete (globalThis as any).chrome; delete (globalThis as any).fetch })

  // Preact'in async render'ı sabit setTimeout ile bazen yetişmiyordu (test kâh geçip
  // kâh kalıyordu). Koşul sağlanana kadar bekle — deterministik.
  const bekle = () => new Promise(r => setTimeout(r, 0))
  async function bekleKadar(kosul: () => boolean, ad = 'koşul') {
    for (let i = 0; i < 50; i++) { if (kosul()) return; await bekle() }
    throw new Error(`bekleKadar: ${ad} 50 turda sağlanmadı`)
  }

  it('anahtar yokken form çıkar, kayıtlıyken maskeli görünür', async () => {
    const { render } = await import('preact')
    const { Anahtar } = await import('../src/ui/Anahtar')
    const kok = document.createElement('div')

    render(<Anahtar />, kok)
    await bekleKadar(() => !!kok.querySelector('#anahtar'), 'form göründü')
    expect(kok.textContent).toContain('kendi Google Gemini anahtarınla')

    kutu['geminiAnahtar'] = 'AIzaSyABCDEFGHIJKLMNOP1234'
    const kok2 = document.createElement('div')
    render(<Anahtar />, kok2)
    await bekleKadar(() => (kok2.textContent ?? '').includes('AIzaSy'), 'kayıtlı ekran')
    expect(kok2.querySelector('#anahtar')).toBe(null)
    expect(kok2.textContent).toContain('AIzaSy')
    expect(kok2.textContent).not.toContain('ABCDEFGHIJ')  // ortası gizli
  })

  it('geçersiz anahtar KAYDEDİLMEZ, hata gösterilir', async () => {
    ;(globalThis as any).fetch = async () => ({ ok: false, status: 400 })
    const { render } = await import('preact')
    const { Anahtar } = await import('../src/ui/Anahtar')
    const kok = document.createElement('div')
    render(<Anahtar />, kok)
    await bekleKadar(() => !!kok.querySelector('#anahtar'), 'form')

    ;(kok.querySelector('#anahtar') as HTMLInputElement).value = 'AIzaSyBozuk'
    kok.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await bekleKadar(() => (kok.textContent ?? '').includes('geçerli değil'), 'hata mesajı')
    expect(kutu['geminiAnahtar']).toBeUndefined()
  })

  it('geçerli anahtar kaydedilir ve ekran hazır durumuna geçer', async () => {
    ;(globalThis as any).fetch = async () => ({ ok: true, status: 200 })
    const { render } = await import('preact')
    const { Anahtar } = await import('../src/ui/Anahtar')
    const kok = document.createElement('div')
    render(<Anahtar />, kok)
    await bekleKadar(() => !!kok.querySelector('#anahtar'), 'form')

    ;(kok.querySelector('#anahtar') as HTMLInputElement).value = 'AIzaSyGecerliAnahtar12345'
    kok.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await bekleKadar(() => (kok.textContent ?? '').includes('Hazır'), 'hazır ekranı')
    expect(kutu['geminiAnahtar']).toBe('AIzaSyGecerliAnahtar12345')
  })

  // Boş / yükleniyor / hata durumları: hiçbir yol popup'ı kilitli bırakmamalı.
  it('yüklenirken durum duyurulur', async () => {
    let birak!: (v: any) => void
    ;(globalThis as any).chrome.storage.local.get = () => new Promise(r => { birak = r })
    const { render } = await import('preact')
    const { Anahtar } = await import('../src/ui/Anahtar')
    const kok = document.createElement('div')
    render(<Anahtar />, kok)
    await bekleKadar(() => !!kok.querySelector('[role=status]'), 'yükleniyor')
    expect(kok.textContent).toContain('Yükleniyor')
    await bekleKadar(() => typeof birak === 'function', 'depo okuması başladı')
    birak({})
    await bekleKadar(() => !!kok.querySelector('#anahtar'), 'form')
  })

  it('depo okunamazsa sonsuz "Yükleniyor…" yerine hata ve tekrar dene çıkar', async () => {
    const yerel = (globalThis as any).chrome.storage.local
    const asil = yerel.get
    yerel.get = async () => { throw new Error('depo kapalı') }
    const { render } = await import('preact')
    const { Anahtar } = await import('../src/ui/Anahtar')
    const kok = document.createElement('div')
    render(<Anahtar />, kok)
    await bekleKadar(() => !!kok.querySelector('[role=alert]'), 'okuma hatası')
    expect(kok.textContent).not.toContain('Yükleniyor')

    yerel.get = asil
    ;(kok.querySelector('button') as HTMLButtonElement).click()
    await bekleKadar(() => !!kok.querySelector('#anahtar'), 'tekrar denemede form')
  })

  it('doğrulanan anahtar kaydedilemezse düğme kilitli kalmaz, hata görünür', async () => {
    ;(globalThis as any).fetch = async () => ({ ok: true, status: 200 })
    ;(globalThis as any).chrome.storage.local.set = async () => { throw new Error('kota') }
    const { render } = await import('preact')
    const { Anahtar } = await import('../src/ui/Anahtar')
    const kok = document.createElement('div')
    render(<Anahtar />, kok)
    await bekleKadar(() => !!kok.querySelector('#anahtar'), 'form')

    ;(kok.querySelector('#anahtar') as HTMLInputElement).value = 'AIzaSyGecerliAnahtar12345'
    kok.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await bekleKadar(() => (kok.textContent ?? '').includes('kaydedilemedi'), 'kayıt hatası')
    const dugme = kok.querySelector('button[type=submit]') as HTMLButtonElement
    expect(dugme.disabled).toBe(false)
    expect(dugme.textContent).toContain('Kaydet')
  })

  it('yeni yazmaya başlayınca eski hata kalkar', async () => {
    ;(globalThis as any).fetch = async () => ({ ok: false, status: 400 })
    const { render } = await import('preact')
    const { Anahtar } = await import('../src/ui/Anahtar')
    const kok = document.createElement('div')
    render(<Anahtar />, kok)
    await bekleKadar(() => !!kok.querySelector('#anahtar'), 'form')

    const alan = kok.querySelector('#anahtar') as HTMLInputElement
    alan.value = 'AIzaSyBozuk'
    kok.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await bekleKadar(() => !!kok.querySelector('[role=alert]'), 'hata')
    alan.dispatchEvent(new Event('input', { bubbles: true }))
    await bekleKadar(() => !kok.querySelector('[role=alert]'), 'hata kalktı')
  })

  it('silme başarısızsa kayıtlı ekranda kalır ve hata gösterir', async () => {
    kutu['geminiAnahtar'] = 'AIzaSyABCDEFGHIJKLMNOP1234'
    ;(globalThis as any).chrome.storage.local.remove = async () => { throw new Error('kilitli') }
    const { render } = await import('preact')
    const { Anahtar } = await import('../src/ui/Anahtar')
    const kok = document.createElement('div')
    render(<Anahtar />, kok)
    await bekleKadar(() => (kok.textContent ?? '').includes('Hazır'), 'kayıtlı ekran')

    const dugmeBul = (m: string) =>
      [...kok.querySelectorAll('button')].find(b => b.textContent?.includes(m)) as HTMLButtonElement
    dugmeBul('Anahtarı sil').click()
    await bekleKadar(() => !!dugmeBul('Evet, sil'), 'onay')
    dugmeBul('Evet, sil').click()
    await bekleKadar(() => (kok.textContent ?? '').includes('silinemedi'), 'silme hatası')
    expect(kok.textContent).toContain('Hazır')
    expect(kutu['geminiAnahtar']).toBe('AIzaSyABCDEFGHIJKLMNOP1234')
  })
})
