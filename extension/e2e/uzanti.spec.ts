import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { test, expect, chromium, type BrowserContext, type Worker } from '@playwright/test'

/**
 * Uzantının BÜTÜN olarak çalıştığını gösteren tek test.
 *
 * Birim testleri ayrıştırıcıyı, skoru ve service worker'ı ayrı ayrı
 * doğruluyor. Hiçbiri şunu söylemiyor: derlenmiş paket gerçek bir Chromium'a
 * yüklendiğinde, gerçek bir ilan sayfasında panel çiziliyor mu? Manifest'teki
 * bir yazım hatası, yanlış eşleşme deseni ya da içerik script'inin hiç
 * enjekte edilmemesi bütün birim testleri yeşilken uzantıyı sessizce ölü
 * bırakır.
 *
 * Sayfa ağdan çekilmiyor: kaydedilmiş fixture, isteği karşılayarak
 * (`route.fulfill`) gerçek adreste sunuluyor. Adres önemli — içerik script'i
 * manifest'teki eşleşme desenine göre enjekte ediliyor, yani `localhost`
 * üzerinden sunmak testi anlamsız kılardı.
 *
 * "Kendiliğinden istek yok" kırmızı çizgisi de burada ölçülüyor: sayfaya
 * giden her istek kaydediliyor ve uzantının kendi başına başka bir ilan
 * sayfası istemediği doğrulanıyor.
 */

const KOK = join(import.meta.dirname, '..')
const FIXTURE = readFileSync(join(KOK, 'test/fixtures/detay-otomobil.html'), 'utf8')
const ILAN_URL = 'https://www.sahibinden.com/ilan/vasita-otomobil-fiat-egea-test-1234567890/detay'

const AI_CEVAP = {
  skor: 7.5,
  durumEtiketi: 'Makul',
  chipler: ['Dizel', '2019'],
  bayraklar: [{ tip: 'sari', metin: 'Tramer bilgisi belirtilmemiş — satıcıya sorun' }],
  avantajlar: ['Yaşına göre düşük km'],
  dezavantajlar: ['Fiyat medyanın üstünde'],
  ozet: 'Alıcı gözünden makul bir ilan.',
  pazarlikHedefi: 745000,
  fiyatYorumu: 'Benzerlerine göre biraz yüksek.',
}

let context: BrowserContext
let profil: string

test.beforeAll(async () => {
  // Testin sınadığı şey DERLENMİŞ paket; kaynak değil.
  execFileSync('node', ['build.mjs'], { cwd: KOK, stdio: 'pipe' })

  profil = mkdtempSync(join(tmpdir(), 'ilan-analiz-'))
  const dist = join(KOK, 'dist')
  context = await chromium.launchPersistentContext(profil, {
    // Uzantılar yalnızca kalıcı bağlamda ve TAM Chromium derlemesinde
    // çalışıyor. Playwright'ın varsayılan headless'ı "headless shell" — o
    // uzantı yüklemiyor ve hata da vermiyor: service worker hiç doğmuyor,
    // test zaman aşımına düşüyor. `channel: 'chromium'` tam derlemeyi ve yeni
    // headless modunu seçiyor. (Bu, testin CI'daki ilk koşusunda öğrenildi:
    // yerelde tam ikili yolu verildiği için sorun görünmemişti.)
    ...(process.env.CHROMIUM_YOLU
      ? { executablePath: process.env.CHROMIUM_YOLU }
      : { channel: 'chromium' }),
    args: [
      `--disable-extensions-except=${dist}`,
      `--load-extension=${dist}`,
    ],
  })
})

test.afterAll(async () => {
  await context?.close()
  if (profil) rmSync(profil, { recursive: true, force: true })
})

async function serviceWorker(): Promise<Worker> {
  const mevcut = context.serviceWorkers()[0]
  return mevcut ?? (await context.waitForEvent('serviceworker'))
}

/** Uzantının deposuna anahtar yazar — popup'ı sürmeden. */
async function anahtarYaz(deger: string): Promise<void> {
  const sw = await serviceWorker()
  await sw.evaluate(async (anahtar) => {
    await chrome.storage.local.set({ geminiAnahtar: anahtar })
  }, deger)
}

test('uzantı gerçek Chromium\'a yükleniyor ve service worker\'ı koşuyor', async () => {
  const sw = await serviceWorker()
  expect(sw.url()).toContain('sw.js')
})

test('anahtar yokken panel çiziliyor ve kurulum yolu gösteriliyor', async () => {
  const sayfa = await context.newPage()
  await sayfa.route('https://www.sahibinden.com/**', (route) =>
    route.fulfill({ contentType: 'text/html; charset=utf-8', body: FIXTURE }),
  )
  await sayfa.goto(ILAN_URL)

  // Panel gölge DOM içinde; locator gölgeyi deliyor.
  await expect(sayfa.getByText('Anahtarı gir')).toBeVisible({ timeout: 20_000 })
  await sayfa.close()
})

test('anahtar varken analiz üretiliyor ve panelde skor görünüyor', async () => {
  await anahtarYaz('AIzaSyTestAnahtariUzunOlsunDiyeUzatildi')

  const sayfa = await context.newPage()
  const gidilenAdresler: string[] = []
  sayfa.on('request', (istek) => gidilenAdresler.push(istek.url()))

  await sayfa.route('https://www.sahibinden.com/**', (route) =>
    route.fulfill({ contentType: 'text/html; charset=utf-8', body: FIXTURE }),
  )
  // Gemini isteği SERVICE WORKER'dan çıkıyor, sayfadan değil — bu yüzden
  // `sayfa.route` değil `context.route` gerekiyor. (Bu farkı bulmak testin
  // ilk koşusunu aldı: sayfa düzeyinde yakalamaya çalışınca istek sessizce
  // gerçek ağa gidiyordu.)
  await context.route('https://generativelanguage.googleapis.com/**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        candidates: [
          { content: { parts: [{ text: JSON.stringify(AI_CEVAP) }] }, finishReason: 'STOP' },
        ],
      }),
    }),
  )

  await sayfa.goto(ILAN_URL)

  // Tam eşleşme: 'Makul' hem durum etiketinde hem özet metninde geçiyor.
  await expect(sayfa.getByText('Makul', { exact: true })).toBeVisible({ timeout: 30_000 })
  await expect(sayfa.getByText('Alıcı gözünden makul bir ilan.')).toBeVisible()
  await expect(sayfa.getByText('7.5')).toBeVisible()

  // Kırmızı çizgi: uzantı kendiliğinden başka bir ilan sayfası istemiyor.
  const kendiIstekleri = gidilenAdresler.filter(
    (u) => u.startsWith('https://www.sahibinden.com/') && u !== ILAN_URL,
  )
  expect(kendiIstekleri).toEqual([])

  await sayfa.close()
})

test('desteklenmeyen sitede panel HİÇ çizilmiyor', async () => {
  const sayfa = await context.newPage()
  await sayfa.route('https://example.com/**', (route) =>
    route.fulfill({ contentType: 'text/html; charset=utf-8', body: FIXTURE }),
  )
  await sayfa.goto('https://example.com/ilan/deneme')

  // Manifest bu adresi eşlemiyor; içerik script'i hiç enjekte edilmemeli.
  await expect(sayfa.getByText('Anahtarı gir')).toHaveCount(0)
  await expect(sayfa.getByText('Makul', { exact: true })).toHaveCount(0)
  await sayfa.close()
})
