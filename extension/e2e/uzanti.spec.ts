import { test, expect, type BrowserContext } from '@playwright/test'

import { anahtarYaz as anahtarYazBaglam, fixture, geminiYakala, ILAN_URL, serviceWorker, siteyiSun, uzantiBaglami, type UzantiBaglami } from './baglam'

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

const FIXTURE = fixture('detay-otomobil.html')

let uzanti: UzantiBaglami
let context: BrowserContext

test.beforeAll(async () => {
  uzanti = await uzantiBaglami()
  context = uzanti.context
})

test.afterAll(async () => {
  await uzanti?.kapat()
})

const anahtarYaz = (deger: string) => anahtarYazBaglam(context, deger)

test('uzantı gerçek Chromium\'a yükleniyor ve service worker\'ı koşuyor', async () => {
  const sw = await serviceWorker(context)
  expect(sw.url()).toContain('sw.js')
})

test('anahtar yokken panel çiziliyor ve kurulum yolu gösteriliyor', async () => {
  const sayfa = await context.newPage()
  await siteyiSun(sayfa, FIXTURE)
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

  await siteyiSun(sayfa, FIXTURE)
  await geminiYakala(context)

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

// Bir önceki testin anahtarı ve Gemini yakalaması bağlamda duruyor; panel dolu çiziliyor.
for (const [sema, zemin] of [['dark', 'rgb(25, 22, 20)'], ['light', 'rgb(251, 249, 246)']] as const) {
  test(`panel sistem temasını izliyor: ${sema}`, async () => {
    const sayfa = await context.newPage()
    await sayfa.emulateMedia({ colorScheme: sema })
    await siteyiSun(sayfa, FIXTURE)
    await sayfa.goto(ILAN_URL)

    const panel = sayfa.locator('.panel')
    await expect(sayfa.getByText('Makul', { exact: true })).toBeVisible({ timeout: 30_000 })
    await expect(panel).toHaveCSS('background-color', zemin)
    await panel.screenshot({ path: test.info().outputPath(`panel-${sema}.png`) })
    await sayfa.close()
  })
}

test('desteklenmeyen sitede panel HİÇ çizilmiyor', async () => {
  const sayfa = await context.newPage()
  await siteyiSun(sayfa, FIXTURE, 'https://example.com/**')
  await sayfa.goto('https://example.com/ilan/deneme')

  // Manifest bu adresi eşlemiyor; içerik script'i hiç enjekte edilmemeli.
  await expect(sayfa.getByText('Anahtarı gir')).toHaveCount(0)
  await expect(sayfa.getByText('Makul', { exact: true })).toHaveCount(0)
  await sayfa.close()
})

// Tarayıcı zoom'u CSS görüntü alanını küçültür: 1280×720 pencerede %200 zoom, 640×360'lık bir
// CSS görüntü alanıdır (deviceScaleFactor 2). Bu yüzden zoom seviyeleri görüntü alanı olarak
// sınanıyor. Panelin her köşesi ekranda kalmalı ve içeriği yatay kaydırma istememeli; gövde
// dikeyde kaydırılabilir — ama yalnız panelin kendi içinde, kesilmeden.
for (const [ad, genislik, yukseklik, olcek] of [
  ['%100', 1280, 720, 1], ['%200', 640, 360, 2], ['%300', 427, 240, 3],
  ['dar pencere', 360, 640, 1], ['çok dar pencere', 300, 520, 1],
] as const) {
  test(`panel taşmıyor: ${ad} (${genislik}×${yukseklik})`, async () => {
    // Önceki bir test düşerse Playwright işçiyi yeniden başlatıp bağlamı sıfırdan kurar; bu
    // yüzden anahtar ve Gemini yakalaması burada yeniden veriliyor.
    await anahtarYaz('AIzaSyTestAnahtariUzunOlsunDiyeUzatildi')
    await geminiYakala(context)
    const sayfa = await context.newPage()
    await sayfa.setViewportSize({ width: genislik, height: yukseklik })
    await siteyiSun(sayfa, FIXTURE)
    await sayfa.goto(ILAN_URL)
    await expect(sayfa.getByText('Makul', { exact: true })).toBeVisible({ timeout: 30_000 })

    const olcu = await sayfa.locator('.panel').evaluate((p) => {
      const r = p.getBoundingClientRect()
      return {
        sol: r.left, ust: r.top, sag: r.right, alt: r.bottom,
        yatayTasma: p.scrollWidth - p.clientWidth,
        // İçerideki herhangi bir öğe panelin sağ kenarını geçiyor mu?
        tasanlar: [...p.querySelectorAll('*')]
          .filter((e) => e.getBoundingClientRect().right > r.right + 0.5)
          .map((e) => e.className || e.tagName),
      }
    })
    expect(olcu.sol).toBeGreaterThanOrEqual(0)
    expect(olcu.ust).toBeGreaterThanOrEqual(0)
    expect(olcu.sag).toBeLessThanOrEqual(genislik)
    expect(olcu.alt).toBeLessThanOrEqual(yukseklik)
    expect(olcu.yatayTasma).toBe(0)
    expect(olcu.tasanlar).toEqual([])

    await sayfa.screenshot({ path: test.info().outputPath(`zoom-${genislik}x${yukseklik}@${olcek}.png`) })
    await sayfa.close()
  })
}
