import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

import { test, expect, type BrowserContext, type Page } from '@playwright/test'

import { anahtarYaz, fixture, geminiYakala, ILAN_URL, serviceWorker, siteyiSun, uzantiBaglami, type UzantiBaglami } from '../e2e/baglam'

/**
 * Chrome Web Store listesinin ekran görüntüleri: `npm run magaza:ekran`.
 *
 * Mağaza 1280×800 (ya da 640×400) PNG/JPEG istiyor, en fazla beş tane. Ölçü
 * tutmazsa yükleme reddediliyor; bu yüzden görüntü alanı tam bu ölçüde ve
 * ölçek 1. Görüntüler elle değil buradan üretiliyor: arayüz değiştiğinde
 * mağazadaki görüntü eskimesin, tek komutla yenilensin.
 *
 * Uçtan uca testlerle AYNI kurulum (`e2e/baglam.ts`): derlenmiş paket, gerçek
 * Chromium, kaydedilmiş fixture, yakalanmış Gemini cevabı. Ağa hiçbir istek
 * gitmiyor; görüntüdeki analiz sahte cevaptan çiziliyor.
 *
 * Çıktı `magaza/ekranlar/` — depoya girmiyor, yüklemeden önce üretilir.
 */

const GENISLIK = 1280
const YUKSEKLIK = 800
const CIKTI = join(import.meta.dirname, 'ekranlar')

// Mağazada görünen tek analiz bu; e2e cevabından daha dolu. Fixture'la çelişmesin
// (detay-otomobil.html: 2019, dizel, manuel, 112.000 km, ağır hasar kaydı yok).
const VITRIN_CEVAP = {
  skor: 7.4,
  durumEtiketi: 'Makul',
  chipler: ['Dizel', 'Manuel', '2019', '112.000 km'],
  bayraklar: [
    { tip: 'sari', metin: 'Ekspertiz raporu ilanda yok — satıcıdan isteyin' },
    { tip: 'kirmizi', metin: 'Sol arka çamurlukta lokal boya — ekspertizde baktırın' },
  ],
  avantajlar: ['Ağır hasar kaydı yok', 'Bakımları yetkili serviste', 'Yakıt tüketimi düşük motor'],
  dezavantajlar: ['Fiyat benzer ilanların medyanının üstünde'],
  ozet: 'Kilometresi yaşına göre normal, bakım geçmişi iyi; fiyatı benzerlerine göre biraz yüksek. Ekspertizden sonra pazarlıkla alınabilir.',
  pazarlikHedefi: 745000,
  fiyatYorumu: 'Benzer ilanların medyanından yaklaşık %4 yüksek.',
}

let uzanti: UzantiBaglami
let context: BrowserContext

test.beforeAll(async () => {
  mkdirSync(CIKTI, { recursive: true })
  uzanti = await uzantiBaglami()
  context = uzanti.context
  await anahtarYaz(context, 'AIzaSyTestAnahtariUzunOlsunDiyeUzatildi')
  await geminiYakala(context, VITRIN_CEVAP)
})

test.afterAll(async () => {
  await uzanti?.kapat()
})

async function yeniSayfa(sema: 'dark' | 'light' = 'dark'): Promise<Page> {
  const sayfa = await context.newPage()
  await sayfa.setViewportSize({ width: GENISLIK, height: YUKSEKLIK })
  await sayfa.emulateMedia({ colorScheme: sema })
  return sayfa
}

async function kaydet(sayfa: Page, ad: string): Promise<void> {
  const yol = join(CIKTI, `${ad}.png`)
  await sayfa.screenshot({ path: yol })
  // Ölçü mağazanın şartı; bir gün biri görüntü alanını değiştirirse burada patlasın, yüklemede değil.
  expect(sayfa.viewportSize()).toEqual({ width: GENISLIK, height: YUKSEKLIK })
  await sayfa.close()
}

for (const sema of ['dark', 'light'] as const) {
  test(`1 · ilan detayı — ${sema}`, async () => {
    const sayfa = await yeniSayfa(sema)
    await siteyiSun(sayfa, fixture('detay-otomobil.html'))
    await sayfa.goto(ILAN_URL)
    await expect(sayfa.getByText('Makul', { exact: true })).toBeVisible({ timeout: 30_000 })
    await kaydet(sayfa, `1-detay-${sema === 'dark' ? 'koyu' : 'acik'}`)
  })
}

test('2 · liste sayfası — rozetler ve açık kart', async () => {
  const sayfa = await yeniSayfa()
  await siteyiSun(sayfa, fixture('liste-otomobil.html'))
  await sayfa.goto('https://www.sahibinden.com/otomobil')

  // Liste skorları yerel ve deterministik; Gemini'ye gitmiyor.
  const rozet = sayfa.locator('.aa-rozet').first()
  await expect(rozet).toBeVisible({ timeout: 30_000 })
  await rozet.click()
  await expect(sayfa.locator('.kart')).toBeVisible()
  await kaydet(sayfa, '2-liste')
})

test('3 · popup — anahtar kaydedilmiş', async () => {
  const id = new URL((await serviceWorker(context)).url()).host
  const sayfa = await yeniSayfa()
  await sayfa.goto(`chrome-extension://${id}/popup.html`)
  await expect(sayfa.getByText('İlan Analiz').first()).toBeVisible()
  // Popup 320 px'lik bir belge; mağaza görüntüsünde araç çubuğundan açılmış gibi sağ üstte dursun.
  await sayfa.addStyleTag({
    content: `html { background: #2a2623; min-height: 100vh }
      body { position: absolute; top: 24px; right: 32px; border-radius: 8px;
        box-shadow: 0 12px 40px rgba(0,0,0,.45) }`,
  })
  await kaydet(sayfa, '3-popup')
})
