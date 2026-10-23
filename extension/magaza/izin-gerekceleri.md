# Chrome Web Store — gizlilik sekmesi metinleri

Geliştirici panelinde **Privacy practices** sekmesindeki alanlar için. Her
bölümdeki `text` bloğu olduğu gibi ilgili kutuya yapıştırılır.

Metinler İngilizce: incelemeyi yapan ekip İngilizce okuyor ve bu alanlar
kullanıcıya gösterilmiyor. Her alanın sınırı 1000 karakter.

Bu dosya manifest'e bağlı — `extension/test/magazaMetni.test.ts`:

- manifest'te gerekçesi yazılmamış bir izin varsa test patlar,
- burada gerekçesi olup manifest'te artık olmayan bir izin varsa test patlar,
- host gerekçesi manifest'teki her hostu adıyla anmıyorsa test patlar,
- bir metin 1000 karakteri aşarsa test patlar.

Yeni site eklendiğinde (`src/siteler/kayit.json`) host gerekçesine o site de
yazılmalı; test bunu hatırlatır.

Metinler [gizlilik politikasıyla](../../backend/src/gizlilik.ts) aynı şeyi
söylemeli. İnceleme üçünü (manifest, bu beyanlar, politika) karşılaştırıyor;
tutmazlarsa paket reddediliyor.

---

## Single purpose

```text
İlan Analiz evaluates the used-car listing the user is currently viewing on a supported classifieds site (sahibinden.com, arabam.com). On a listing page it shows a panel with the mileage relative to the car's age, the price relative to similar listings the user has already seen, and a short buyer-oriented summary written by Google Gemini using the user's own API key. On search result pages it adds a small deterministic score badge to each row. It does nothing else and does not run on any other site.
```

## Permission justification

### `storage`

```text
Used only for chrome.storage.local, on the user's device: (1) the user's own Google Gemini API key, entered in the popup, so analysis can run without asking for it on every page; (2) the year/mileage/price of rows from search result pages the user opened, kept at most 24 hours, so a listing can be compared with similar listings without the extension ever requesting a page itself; (3) finished analyses, kept at most 24 hours, so reopening the same listing does not spend the user's API quota again. Nothing in storage is sent to the developer; the developer runs no server that the extension contacts.
```

### Host permissions

```text
https://www.sahibinden.com/* and https://www.arabam.com/* — the content script reads the listing or search result page the user has opened and draws the panel and score badges on it. The extension never requests pages from these sites on its own: no background fetching, crawling or scheduled requests. These are the only sites the content script runs on.

https://generativelanguage.googleapis.com/* — the Google Gemini API. When the user opens a listing, the service worker sends that listing's text to Gemini with the user's own API key and shows the answer in the panel. The popup also calls this host once to verify a newly entered key. Phone numbers, e-mail addresses, IBANs, national ID numbers and licence plates are masked before sending. The request goes directly from the user's browser to Google; it does not pass through any developer server.
```

## Remote code

Seçim: **No, I am not using remote code.**

```text
All JavaScript is bundled in the package. The Gemini API returns JSON data, which is validated against a schema and rendered as text; it is never evaluated as code.
```

## Data usage

Kutucuklar (gerekçe: yukarıdaki metinler ve gizlilik politikası):

- [x] **Website content** — ilan metni analiz için Google'a gidiyor. Firefox
      manifest'indeki tek beyanla (`websiteContent`) aynı.
- [x] **Authentication information** — kullanıcının API anahtarı Google'a
      kimlik doğrulama için gidiyor. Bize ulaşmıyor, ama cihazdan çıkan bir
      kimlik bilgisi; beyan etmemek eksik beyan olur.
- [ ] Diğerlerinin hiçbiri: hesap, konum, geçmiş, kullanım istatistiği yok.

Üç onay kutusunun üçü de işaretlenir (veri satılmıyor, tek amaç dışında
kullanılmıyor, kredi değerlendirmesi için kullanılmıyor).
