import { describe, it, expect, beforeAll } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// Paketin kendisini sınayan tek test.
//
// Buradaki hataların ortak özelliği SESSİZ olmaları: yanlış manifest'le uzantı
// yüklenir ama arka plan hiç çalışmaz, fazla izinle paket mağaza incelemesine
// takılır, eksik dosyayla panel hiç çizilmez. Hiçbiri birim testiyle
// yakalanmıyor, çünkü hepsi derleme çıktısının özelliği.
//
// build.mjs açıklaması Firefox/Chrome manifest karışmasının "canlıda yaşandı"
// dendiğini söylüyor — bu test tam olarak onun tekrarını engelliyor.

const KOK = join(import.meta.dirname, '..')

function derle(hedef: 'chrome' | 'firefox'): Record<string, any> {
  execFileSync('node', ['build.mjs'], {
    cwd: KOK,
    env: { ...process.env, HEDEF: hedef === 'firefox' ? 'firefox' : '' },
    stdio: 'pipe',
  })
  const dizin = hedef === 'firefox' ? 'dist-firefox' : 'dist'
  return { dizin, manifest: JSON.parse(readFileSync(join(KOK, dizin, 'manifest.json'), 'utf8')) }
}

let chrome: Record<string, any>
let firefox: Record<string, any>

beforeAll(() => {
  chrome = derle('chrome')
  firefox = derle('firefox')
}, 120_000)

describe('paket — Chrome', () => {
  it('arka plan SERVICE WORKER olarak tanımlı', () => {
    expect(chrome.manifest.background.service_worker).toBe('sw.js')
    expect(chrome.manifest.background.scripts).toBeUndefined()
  })

  it('yüklenmek için gereken her dosya çıktıda var', () => {
    for (const dosya of ['sw.js', 'content.js', 'popup.js', 'popup.html', 'manifest.json']) {
      expect(existsSync(join(KOK, chrome.dizin, dosya)), dosya).toBe(true)
    }
  })
})

describe('paket — Firefox', () => {
  it('arka plan EVENT PAGE olarak tanımlı — service_worker Firefox\'ta desteklenmiyor', () => {
    expect(firefox.manifest.background.scripts).toEqual(['sw.js'])
    expect(firefox.manifest.background.service_worker).toBeUndefined()
  })

  it('MV3 için zorunlu gecko kimliği ve asgari sürüm var', () => {
    const gecko = firefox.manifest.browser_specific_settings?.gecko
    expect(gecko?.id).toBeTruthy()
    expect(gecko?.strict_min_version).toBeTruthy()
  })

  it('veri toplama beyanı YALNIZCA ilan içeriği', () => {
    // required'a konan veriyi kullanıcı reddedemez. Fazladan beyan, reddedilemez
    // bir izin istemek demek — hesap sistemi olmadığı için gereği de yok.
    expect(firefox.manifest.browser_specific_settings.gecko.data_collection_permissions)
      .toEqual({ required: ['websiteContent'] })
  })

  it('Chrome ve Firefox AYRI klasöre derlenir', () => {
    // Tek klasöre yazsalardı ikinci derleme birincinin manifestini ezerdi ve
    // "paketlenmemiş yükle" yapan kişi yanlış manifesti yüklerdi.
    expect(chrome.dizin).not.toBe(firefox.dizin)
    expect(chrome.manifest.background).not.toEqual(firefox.manifest.background)
  })
})

describe('paket — izinler ve sızıntı', () => {
  it('yalnız `storage` izni isteniyor', () => {
    // Yeni bir izin buraya sessizce girmesin: her ek izin mağaza incelemesinde
    // gerekçe ister ve kullanıcıya daha korkutucu bir kurulum ekranı gösterir.
    expect(chrome.manifest.permissions).toEqual(['storage'])
    expect(chrome.manifest.optional_permissions ?? []).toEqual([])
  })

  it('host izinleri site kaydı + Gemini ile birebir', () => {
    const siteler = JSON.parse(readFileSync(join(KOK, 'src/siteler/kayit.json'), 'utf8'))
    const beklenen = [
      ...siteler.flatMap((s: any) => s.eslesenler),
      'https://generativelanguage.googleapis.com/*',
    ]
    expect([...chrome.manifest.host_permissions].sort()).toEqual([...beklenen].sort())
    expect([...firefox.manifest.host_permissions].sort()).toEqual([...beklenen].sort())
  })

  it('içerik script\'i yalnızca desteklenen sitelerde koşuyor', () => {
    const siteler = JSON.parse(readFileSync(join(KOK, 'src/siteler/kayit.json'), 'utf8'))
    const eslesenler = siteler.flatMap((s: any) => s.eslesenler)
    for (const cs of chrome.manifest.content_scripts) {
      expect([...cs.matches].sort()).toEqual([...eslesenler].sort())
      // `<all_urls>` bir gün buraya girerse uzantı her sayfayı okumaya başlar.
      expect(cs.matches).not.toContain('<all_urls>')
    }
  })

  it('derlenmiş çıktıda API anahtarına benzeyen bir dize YOK', () => {
    // Anahtar kullanıcının ve yalnız depoda durur; pakete gömülmüş bir anahtar
    // herkese dağıtılmış bir anahtardır.
    for (const dizin of [chrome.dizin, firefox.dizin]) {
      for (const dosya of ['sw.js', 'content.js', 'popup.js']) {
        const icerik = readFileSync(join(KOK, dizin, dosya), 'utf8')
        expect(icerik, `${dizin}/${dosya}`).not.toMatch(/AIza[0-9A-Za-z_-]{30,}/)
        expect(icerik, `${dizin}/${dosya}`).not.toMatch(/sk-ant-[0-9A-Za-z_-]{20,}/)
      }
    }
  })

  it('paket bir arka uca değil, doğrudan Google\'a gidiyor', () => {
    const sw = readFileSync(join(KOK, chrome.dizin, 'sw.js'), 'utf8')
    expect(sw).toContain('generativelanguage.googleapis.com')
    // README'nin "biz aracı değiliz" cümlesi paketle uyumlu kalsın.
    expect(sw).not.toMatch(/railway\.app|supabase\.co/)
  })
})
