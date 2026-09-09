# İlan Analiz — Test hazırlığı: Claude'un yapamayacakları

Tarih: 2026-09-04 · Dal: `claude/repo-test-readiness-audit-q5g3ia`

Hesap, anahtar, para veya bir yargı gerektiren işler. Diğer yarısı:
[`TEST-HAZIRLIGI-YAPABILECEKLERIM.md`](TEST-HAZIRLIGI-YAPABILECEKLERIM.md).

---

## 1. Gerçek Gemini anahtarıyla analiz — ürünün ana özelliği, bende yok

Uzantının tek işi ilanı Gemini'ye gönderip yorum almak. **Bende API anahtarı
yok, ve bir anahtarı okumam, yazmam ya da kullanmam kurallarım gereği yasak.**

Bu yüzden doğrulayamadıklarım:

| Ne | Neden önemli |
|---|---|
| Gerçek modelin döndürdüğü metnin şemayı bozup bozmadığı | Testler sahte yanıtlarla koşuyor. Model beklenmedik biçimde cevap verirse ne olur — ancak canlıda görülür |
| Analiz **kalitesi** | "Pazarlık hedefi 285.000 TL" makul mü? Bunu bir test söyleyemez |
| Gerçek hız limiti (429) davranışı | Kod 429'u yakalıyor ve testi var, ama gerçek kotanın nerede bittiği bilinmiyor |
| Maliyet | İlan başına kaç token, kullanıcıya aylık ne tutar |
| Gecikme | Kullanıcı kaç saniye bekliyor — gerçek ağda ölçülmedi |

**Bu maddeler için kendi anahtarınızla birkaç gerçek ilan denemeniz gerekiyor.**

---

## 2. Gerçek ilan sayfalarında ayrıştırma

`extension/src/siteler/` iki sitenin DOM'unu okuyor. Testler
`extension/test/fixtures/` altındaki **kaydedilmiş** HTML'lerle koşuyor.

Doğrulayamadığım: **bugünkü canlı sayfaların hâlâ o yapıda olup olmadığı.**
Site bir sınıf adını değiştirdiğinde uzantı sessizce yanlış okur ve hiçbir test
bunu haber vermez. Fixture'lar ne kadar iyi olursa olsun, canlı sayfa değişince
eskir.

Ayrıca bunu ben **canlı olarak kontrol edemem**: projenin kendi kırmızı çizgisi
"uzantı hiçbir koşulda kendiliğinden sayfa istemez" ve ben de bu depoyu
kullanarak siteye istek atmam. Kontrol, bir ilan sayfasını **sizin** açmanızla
olur.

Öneri: ayda bir gerçek bir ilan sayfası açıp panelin doğru okuduğunu gözle
kontrol edin, bozuksa yeni bir fixture kaydedip bana verin.

---

## 3. Firefox'ta gerçek yükleme

`build.mjs` Firefox hedefini destekliyor ama üretilen paket **hiçbir zaman
gerçek bir Firefox'ta açılmadı**. Manifest'i doğrulayabilirim (diğer dosya);
ama şunları ancak siz görürsünüz:

- `about:debugging` üzerinden geçici olarak yüklenip yüklenmediği
- Event page'in Chrome'un service worker'ından farklı yaşam döngüsünde
  (uyku/uyanma) veriyi kaybedip kaybetmediği
- Firefox'un `storage` davranış farkları
- Panelin Firefox'un render motorunda düzgün görünüp görünmediği

Bu ortamda Firefox kurulu değil ve uzantı yükleme akışı başsız bir tarayıcıda
Chrome'daki kadar güvenilir taklit edilemez.

---

## 4. iOS ve Android

- **iOS:** Safari uzantısı, Xcode ile paketlenmiş native bir sarmalayıcı ister.
  Bunun için macOS, Xcode ve **Apple Developer hesabı (99 USD/yıl)** gerekir.
  Depoda böyle bir yapı yok; olması **ayrı bir proje** kararıdır, "kalan iş"
  değil.
- **Android:** Chrome'un Android sürümü uzantı desteklemez — bu bir eksik değil,
  platform sınırı. Firefox Android sınırlı destek verir; hedeflenmek isteniyorsa
  bu da bir ürün kararı.

---

## 5. Mağaza yayını

| Ne | Neden sizde |
|---|---|
| **Chrome Web Store geliştirici hesabı** | 5 USD tek seferlik kayıt ücreti; hesap sizin adınıza açılır |
| **Firefox AMO hesabı** | Ücretsiz ama yine sizin hesabınız |
| **Mağaza incelemesi** | Google, geniş host izni ve harici API çağrısı yapan uzantıları elle inceler. Süreç günler sürebilir ve sorularına cevap veren bir insan ister |
| **Gizlilik politikası sayfası** | `backend/` bunu sunmak için var — ama **bir yere kurulması** gerekiyor (`package.json`'da `railway` betiği var, hesap sizde) |
| **Ekran görüntüleri, açıklama, kategori, ikonlar** | Ben üretebilirim, ama son hâline siz karar verirsiniz |

---

## 6. Hukuk ve politika

- **PII maskeleme yeterli mi?** `shared/src/pii.ts` telefon, e-posta, IBAN, TC
  kimlik ve plaka maskeliyor ve bunun testi var. Ama bu maskelemenin **KVKK
  açısından yeterli olup olmadığı** hukuki bir değerlendirme. İlan metnini yazan
  kişi verisinin bir üçüncü tarafa (Google) gitmesi söz konusu; bu, teknik değil
  hukuki bir sorudur.
- **Gizlilik politikası metninin kendisi** — hukukçu işi.
- **Sitelerin kullanım şartları.** Uzantı yalnızca kullanıcının kendi açtığı
  sayfanın DOM'unu okuyor ve kendiliğinden istek atmıyor (bu kural teste bağlı).
  Yine de sitenin şartlarına uygunluğu bir hukuk değerlendirmesi.

---

## 7. ~~CI dosyasını uygulamak~~ — 2026-09-09'da yapıldı

Depoda CI yoktu. Bu madde "Actions dakikası sizin" gerekçesiyle sizde
bırakılmıştı; açık izinle uygulandı: `.github/workflows/ci.yml`.

Geriye kalan tek şey **maliyet kararı**: iş bir dakikanın altında ama her
push'ta koşuyor. Fazla geldiyse `on:` bloğundan `push` çıkarılıp yalnız
`pull_request` bırakılabilir.

---

## 8. Özet

| Konu | Kimde |
|---|---|
| Masaüstü Chrome'da teste hazırlık | ✅ **Hazır** — `dist/` bugün yüklenebilir, 274 test yeşil |
| CI diff'i, uçtan uca uzantı testi, fixture genişletme, tasarım | **Bende** |
| Gemini anahtarı, gerçek analiz denemesi, maliyet ölçümü | **Sizde** |
| Canlı ilan sayfalarında ayrıştırmanın doğruluğunu gözle kontrol | **Sizde** |
| Firefox'ta gerçek yükleme denemesi | **Sizde** |
| Chrome Web Store / AMO hesapları ve inceleme süreci | **Sizde** |
| Gizlilik politikası sunucusunun kurulması (Railway vb.) | **Sizde** |
| KVKK değerlendirmesi ve politika metni | **Sizde** |
| iOS Safari uzantısı istenip istenmediği | **Sizde** (yeni proje kararı) |
