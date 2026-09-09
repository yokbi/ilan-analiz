# İlan Analiz — Test hazırlığı: Claude'un yapabilecekleri

Tarih: 2026-09-04 · Dal: `claude/repo-test-readiness-audit-q5g3ia`

Bir oturumda, ek hesap/cihaz/ürün kararı olmadan bitirebileceğim işler.
Diğer yarısı: [`TEST-HAZIRLIGI-YAPAMAYACAKLARIM.md`](TEST-HAZIRLIGI-YAPAMAYACAKLARIM.md).

---

## Bu turda yapıldı (2026-09-09)

| İş | Durum |
|---|---|
| **2.1 CI yok** | ✅ `.github/workflows/ci.yml` eklendi: tip kontrolü (üç paket), `pnpm -r test`, ve **iki hedefin de** paketlenmesi. Her push ve PR'da. |
| **2.3 `sw.test.ts` 4,2 saniye sürüyor** | ✅ **4039 ms → 41 ms.** Sebep tahmin değildi: hız limitinde ikinci deneme `shared/src/analiz.ts:270`'te gerçekten 4 saniye bekliyor. Bekleme KALDIRILMADI — 429 almış bir isteği hemen tekrar sormak limiti daha da zorlar. Test artık sahte zamanlayıcıyla aynı yolu geziyor. |
| **2.3 Sürüm göçü testi yok** | ✅ `lokalCache.ts` artık kayıt sürümü yazıyor ve okurken hem sürümü hem **şemayı** doğruluyor; uymayan kayıt yok sayılıp analiz yeniden üretiliyor. 8 test. |
| **2.2 Firefox çıktısını doğrulamak** | ✅ Manifest şeması testle sabitlendi (`test/paket.test.ts`, 11 test): Firefox event page, Chrome service worker, gecko kimliği, veri toplama beyanı, izinlerin site kaydıyla birebirliği, ve derlenmiş çıktıda anahtara benzeyen dize olmaması. **"Firefox'ta çalışıyor" demek değil** — yüklenmesini engelleyen bilinen bir sorun kalmadı demek. |
| **2.3 Uzantı düzeyinde uçtan uca test** | ✅ Yazıldı: `extension/e2e/uzanti.spec.ts`, **4 test**, derlenmiş paket gerçek Chromium'a `--load-extension` ile yükleniyor. Kaydedilmiş ilan sayfası `route.fulfill` ile **gerçek adreste** sunuluyor — içerik script'i manifest desenine göre enjekte edildiği için `localhost` testi anlamsız kılardı. Maliyeti kabul edildi: `@playwright/test` devDependency ve CI'da ~20 sn tarayıcı indirmesi. |

Test sayısı **274 → 297** (293 birim + 4 uçtan uca) (`shared` 99, `extension` 191, `backend` 3).

---

## 0. Platform durumu (ölçüldü)

| Platform | Durum | Gerekçe |
|---|---|---|
| **Masaüstü Chrome / Edge** | ✅ **Teste hazır** | `npm run build` çalışıyor, `dist/` MV3 uzantısı üretiyor; "paketlenmemiş yükle" ile bugün denenebilir |
| **Firefox** | ⚠️ **Kod var, hiç denenmedi** | `build.mjs:12` `HEDEF=firefox` ile ayrı bir manifest üretiyor (MV3'te event page, service worker değil). Bu çıktı **hiçbir zaman gerçek Firefox'ta açılmadı** |
| **Android** | ➖ **Kapsam dışı** | Chrome'un Android sürümü uzantı desteklemez. Firefox Android teknik olarak destekler ama bu proje onu hedeflemiyor |
| **iOS** | ❌ **Mümkün değil** | iOS Safari uzantıları Xcode ile paketlenmiş native bir sarmalayıcı ister; bu depoda öyle bir şey yok ve olması ayrı bir proje olurdu |

Bu bir **tarayıcı uzantısı** projesidir. "Android/iOS'ta teste hazır mı"
sorusu bu ürün için büyük ölçüde tanımsız.

## 1. Bu oturumda gerçekten çalıştırdıklarım

Temiz clone, `pnpm install`, node 22.22.2:

| Komut | Sonuç |
|---|---|
| `pnpm install` | ✅ hatasız |
| `pnpm -r test` | ✅ **274 test geçti** — `shared` 99, `extension` 172, `backend` 3 |
| `extension: npm run build` | ✅ `dist/` üretildi — chrome hedefi, 2 site |

Üretilen paket: `manifest.json` (MV3, v0.6.0), `sw.js` (150 KB),
`content.js` (63 KB), `popup.js` (41 KB), ikonlar. Chrome'da
"paketlenmemiş yükle" ile **bugün yüklenebilir durumda**.

**Sonuç: masaüstü Chrome için teste hazır.** Testlerin kapsamı da ciddi:
PII maskeleme, km/yaş yorumu, fiyat medyanı, ilan tarihi, özellik ayrıştırma,
iki farklı site için DOM ayrıştırma, hata kodları, ve "karşılaştırma yoluna
`fetch` girerse patlar" kuralını zorlayan `similar.test.ts` bloğu.

---

## 2. Yapabileceğim işler

### 2.1 ✅ CI eklendi

*(Bu madde 2026-09-09'da kapandı; aşağıdaki metin özgün hâli.)*

Depoda `.github/` klasörü **hiç yok**. 274 test var ama hiçbiri otomatik
koşmuyor. Workflow'u **diff olarak hazırlayabilirim** (uygulamak sizde).

**Yapıldı:** `.github/workflows/ci.yml` — tek iş, üç paketin tip kontrolü,
bütün testler ve iki hedefin paketi. Toplamı bir dakikanın altında. Actions
dakikası harcıyor; sık koşan bir depoda bu bilinçli bir maliyet.

### 2.2 Firefox çıktısını doğrulamak

`build.mjs` Firefox için ayrı bir manifest üretiyor ama üretilen paketin
gerçekten yüklenip yüklenmediği bilinmiyor. Yapabileceklerim:

- `HEDEF=firefox npm run build` çıktısını üretip **manifest'i şemaya göre
  doğrulamak** (event page / service worker farkı doğru mu, izinler doğru mu).
- Firefox'un `browser.*` ile Chrome'un `chrome.*` API farklarının kodda
  gerçekten soyutlanıp soyutlanmadığını taramak.
- Bu, "Firefox'ta çalışıyor" demek değil — "Firefox'ta yüklenmesini engelleyen
  bilinen bir sorun kalmadı" demek. Gerisi diğer dosyada.

### 2.3 Test kapsamındaki gerçek boşluklar

- **Uzantının bütün olarak yüklenip çalıştığını gösteren tek bir test yok.**
  172 test var ama hepsi birim/DOM düzeyinde. Playwright, Chromium'u
  `--load-extension` ile açabilir; kaydedilmiş bir ilan sayfası HTML'i üzerinde
  content script'in gerçekten paneli bastığını uçtan uca test edebilirim.
- **`sw.test.ts` 4.2 saniye sürüyor** — testlerin geri kalanının toplamından
  uzun. Muhtemelen gerçek zaman aşımı bekliyor; sahte zamanlayıcıya çevirebilirim.
- **Sürüm göçü (migration) testi yok.** Depolanan analizler 24 saat yaşıyor;
  şema değişirse eski kayıtlarla ne olduğu test edilmiyor.

### 2.4 Site ayrıştırıcılarının dayanıklılığı

`extension/src/siteler/` iki siteyi ayrıştırıyor. Bu kodun doğası gereği
**site HTML'i değişince sessizce bozulur**. Yapabileceğim:

- `extension/test/fixtures/` altındaki örnekleri genişletmek (eksik alan, boş
  ilan, farklı düzen).
- Ayrıştırma başarısız olduğunda **sessiz kalmak yerine** kullanıcıya "bu sayfayı
  okuyamadım" demesini sağlayan bir yol varsa doğrulamak, yoksa eklemek.

### 2.5 Tasarım işleri

- Panel Preact ile yazılmış. **Karanlık tema** var mı, kontrast yeterli mi —
  denetleyip düzeltebilirim.
- Panelin ilan sayfasının içine girerken sitenin kendi CSS'iyle çakışıp
  çakışmadığı (stil sızıntısı) — Shadow DOM kullanılmıyorsa gerçek bir risk.
- Popup (anahtar girişi) ekranının boş/hata/yükleniyor durumları.
- Farklı zoom seviyelerinde ve dar pencerede panelin taşması.

### 2.6 Mağaza için hazırlık — kod tarafı

- `manifest.json` şu an sadece `storage` izni ve iki host izni istiyor; bu iyi.
  **İzin gerekçelerini** (Chrome Web Store'un istediği metin) hazırlayabilirim.
- Mağaza listesi için gereken ekran görüntülerini Playwright ile üretebilirim.
- `npm run paket` zaten zip üretiyor; sürüm numarası ve değişiklik notu akışını
  düzenleyebilirim.

---

## 3. Önerdiğim sıra

1. **CI workflow diff'i** — 274 test var, hiçbiri otomatik koşmuyor.
2. **Uzantı düzeyinde uçtan uca test** — bugün hiç yok.
3. **Firefox manifest doğrulaması.**
4. **Ayrıştırıcı dayanıklılığı + fixture genişletme.**
5. Tasarım/stil sızıntısı denetimi.
