import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, chromium, type BrowserContext, type Page, type Worker } from '@playwright/test'

/**
 * Uzantı yüklü Chromium bağlamı — uçtan uca testler ve mağaza ekran görüntüleri
 * aynı kurulumdan geçiyor. İkisinin ayrışması, ekran görüntüsünün testte hiç
 * sınanmamış bir paketten çekilmesi demek olurdu.
 */

export const KOK = join(import.meta.dirname, '..')
export const fixture = (ad: string) => readFileSync(join(KOK, 'test/fixtures', ad), 'utf8')

export const ILAN_URL = 'https://www.sahibinden.com/ilan/vasita-otomobil-fiat-egea-test-1234567890/detay'

export const AI_CEVAP = {
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

export interface UzantiBaglami {
  context: BrowserContext
  kapat(): Promise<void>
}

export async function uzantiBaglami(): Promise<UzantiBaglami> {
  // Sınanan şey DERLENMİŞ paket; kaynak değil.
  execFileSync('node', ['build.mjs'], { cwd: KOK, stdio: 'pipe' })

  const profil = mkdtempSync(join(tmpdir(), 'ilan-analiz-'))
  const dist = join(KOK, 'dist')
  const context = await chromium.launchPersistentContext(profil, {
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
  return {
    context,
    async kapat() {
      await context.close()
      rmSync(profil, { recursive: true, force: true })
    },
  }
}

export async function serviceWorker(context: BrowserContext): Promise<Worker> {
  const sw = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'))
  // Worker göründüğü anda `chrome.storage` henüz bağlanmamış olabiliyor; taze bir bağlamda ilk
  // yazma "reading 'local'" ile düşüyordu.
  await expect.poll(() => sw.evaluate(() => typeof chrome !== 'undefined' && !!chrome.storage)).toBe(true)
  return sw
}

/** Uzantının deposuna anahtar yazar — popup'ı sürmeden. */
export async function anahtarYaz(context: BrowserContext, deger: string): Promise<void> {
  const sw = await serviceWorker(context)
  await sw.evaluate(async (anahtar) => {
    await chrome.storage.local.set({ geminiAnahtar: anahtar })
  }, deger)
}

/**
 * Gemini isteği SERVICE WORKER'dan çıkıyor, sayfadan değil — bu yüzden
 * `sayfa.route` değil `context.route` gerekiyor. (Bu farkı bulmak testin
 * ilk koşusunu aldı: sayfa düzeyinde yakalamaya çalışınca istek sessizce
 * gerçek ağa gidiyordu.)
 */
export async function geminiYakala(context: BrowserContext, cevap: object = AI_CEVAP): Promise<void> {
  await context.route('https://generativelanguage.googleapis.com/**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        candidates: [
          { content: { parts: [{ text: JSON.stringify(cevap) }] }, finishReason: 'STOP' },
        ],
      }),
    }),
  )
}

/** Kaydedilmiş fixture'ı gerçek site adresinde sunar — içerik script'i eşleşme desenine göre enjekte ediliyor. */
export async function siteyiSun(sayfa: Page, html: string, desen = 'https://www.sahibinden.com/**'): Promise<void> {
  await sayfa.route(desen, (route) =>
    route.fulfill({ contentType: 'text/html; charset=utf-8', body: html }),
  )
}
