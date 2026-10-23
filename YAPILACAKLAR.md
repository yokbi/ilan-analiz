# İlan Analiz — Yapılacaklar

Son ölçüm: **2026-10-23** · Dal: `main` (`50f7590`) + panelin zoom/dar pencere denetimi

Bu dosya açık işlerin tek listesidir. Her madde ya **bende** (kod tarafı, bu
depoda yapılabilir) ya **sizde** (hesap, anahtar, para veya hukuki karar
gerektirir). Ayrıntılı gerekçeler
[`TEST-HAZIRLIGI-YAPABILECEKLERIM.md`](TEST-HAZIRLIGI-YAPABILECEKLERIM.md) ve
[`TEST-HAZIRLIGI-YAPAMAYACAKLARIM.md`](TEST-HAZIRLIGI-YAPAMAYACAKLARIM.md)
dosyalarındadır; burada yalnız **kalan iş** durur.

---

## 0. Bugünkü durum (ölçüldü, varsayılmadı)

| | |
|---|---|
| Test | **365 geçiyor / 0 kırık** — `shared` 99, `extension` 263, `backend` 3 |
| Test dosyası | 26 |
| Eksik/bozuk ilan | **Teste bağlı** — `extension/test/eksikAlan.test.ts` (tek alan) ve `fixtureEksik.test.ts` (4 elle kurulmuş fixture: eksik, fiyatsız, farklı düzen, arabam eksik) |
| Tip denetimi | Üç paket de temiz (`pnpm -r exec tsc --noEmit`) |
| CI | **Var** — `.github/workflows/ci.yml`; tip, test, iki hedefin paketi ve uçtan uca koşuyor |
| Uçtan uca | **Var** — `extension/e2e/uzanti.spec.ts`, uzantı yüklü gerçek Chromium (11 test; iki renk şeması ve beş görüntü alanı dahil) |
| Tema | **Koyu + açık** — panel, liste widget'ları ve popup sistem temasını izliyor (`prefers-color-scheme`). Metin/zemin çiftleri iki palette de WCAG AA ≥ 4.5 — `extension/test/kontrast.test.ts` |
| Zoom / dar pencere | Panel %100, %200, %300 zoom'da ve 360 / 300 px genişlikte ekranda kalıyor, yatay taşmıyor — `e2e/uzanti.spec.ts` "panel taşmıyor" |
| Popup durumları | Yükleniyor / boş / hata / kayıtlı — hiçbir yol popup'ı kilitli bırakmıyor (depo okuma, kaydetme, silme hataları ve Google 5xx ayrı mesajla). `extension/test/anahtar.test.tsx` |
| Desteklenen site | 2 (sahibinden.com, arabam.com) |

Ölçüm komutları:

```bash
pnpm install --frozen-lockfile
pnpm -r test
pnpm -r exec tsc --noEmit
```

---

## 1. Kod tarafı — bu depoda yapılabilir

### 1.1 Ayrıştırıcı dayanıklılığı · öncelik: yüksek

Kod tarafında açık madde kalmadı. Eksik/bozuk ilan fixture'ları diğerleri gibi
**elle kuruldu**; gerçek sitenin eksik ilanı nasıl gösterdiğini bilmiyoruz.
2.2'deki canlı kontrolde eksik alanlı bir ilan görürseniz HTML'ini kaydedip
verin, gerçek örnek olarak eklenir.

### 1.2 Arayüz · öncelik: orta

Kod tarafında açık madde kalmadı.

> Zoom / dar pencere denetiminde iki gerçek kusur bulunup düzeltildi: panel
> `top: 90px` + `max-height: 84vh` ile kuruluyordu; %200 zoom'da (640×360 CSS
> görüntü alanı) alt kenarı 32 px, %300'de 52 px ekran dışına taşıyor, panelin
> sonu kaydırılamıyordu. Sabit 344 px genişlik 376 px'ten dar pencerede sol
> kenarı dışarı itiyordu (300 px'te −60). Boyutlar artık görüntü alanına bağlı.
> Zoom, görüntü alanı küçültülerek ölçülüyor — tarayıcının kendi zoom'u CSS
> açısından aynı şey.

> Kontrast denetimi sırasında üç gerçek kusur bulunup düzeltildi: koyu temada
> `--metin3` (küçük etiketler, placeholder) 2.9–3.2:1'deydi; liste rozetlerinin
> beyaz yazısı renkli zeminde 2.4–3.6:1'deydi; skor kutusundaki "10 üzerinden"
> yarı saydamlıkla soluklaşıyordu. Açık tema fixture üzerinde gerçek Chromium'da
> çizilip bakıldı; canlı
> sahibinden sayfasının üstünde gözle bakılması 2.2'deki kontrole dahil.

> Popup gözden geçirmesinde dört gerçek kusur bulunup düzeltildi: depo okuması
> reddedilince popup sonsuza dek "Yükleniyor…"da kalıyordu; doğrulanan anahtar
> kaydedilemezse düğme "Doğrulanıyor…"da kilitleniyordu; silme hatası sessizce
> yutuluyordu; Google'ın 5xx arızası "anahtar geçerli değil" diye gösterilip
> kullanıcıya sağlam anahtarını attırıyordu.

> Stil sızıntısı bu listede **yok**: panel `attachShadow` ile Shadow DOM içine
> kuruluyor, sitenin CSS'i panele geçemiyor. Bakıldı, risk yok.

### 1.3 Mağaza için kod tarafı hazırlık · öncelik: orta

- [ ] Chrome Web Store'un istediği **izin gerekçesi** metinleri (`storage` ve
      iki host izni için).
- [ ] Mağaza listesi ekran görüntülerinin Playwright ile üretilmesi.
- [ ] Sürüm numarası ve değişiklik notu akışı (`npm run paket` zaten zip üretiyor).

### 1.4 Yeni site desteği · öncelik: düşük

- [ ] Üçüncü bir ilan sitesi adaptörü. Maliyeti yaklaşık 130 satır —
      yordamı [`CONTRIBUTING.md`](CONTRIBUTING.md)'de.

### 1.5 CI maliyeti · öncelik: düşük

- [ ] CI her `push`ta koşuyor. Actions dakikası fazla geliyorsa `on:` bloğundan
      `push` çıkarılıp yalnız `pull_request` bırakılabilir. Bu bir **karar**,
      teknik bir eksik değil.

---

## 2. Sizde — hesap, anahtar, para veya hukuki karar

### 2.1 Gerçek Gemini anahtarıyla deneme · öncelik: yüksek

Ürünün ana özelliği hiç canlı koşulmadı. Testler sahte yanıtlarla yeşil.

- [ ] Kendi anahtarınızla birkaç gerçek ilan analiz edin.
- [ ] Modelin döndürdüğü metin şemayı bozuyor mu?
- [ ] Analiz **kalitesi** makul mü (pazarlık hedefi, kilometre yorumu)?
- [ ] İlan başına gerçek token ve gecikme ne kadar?
- [ ] Gerçek 429 (kota) davranışı. Kod 429'u yakalıyor ve testi var; kotanın
      nerede bittiği bilinmiyor.

### 2.2 Canlı sayfa doğrulaması · öncelik: yüksek, tekrarlayan

- [ ] **Ayda bir** gerçek bir ilan sayfası açıp panelin doğru okuduğunu gözle
      kontrol edin. Site bir sınıf adını değiştirdiğinde uzantı sessizce yanlış
      okur ve hiçbir test bunu haber vermez.

### 2.3 Firefox'ta gerçek yükleme · öncelik: orta

`build.mjs` Firefox hedefini üretiyor ve CI paketi derliyor, ama paket **hiç
gerçek bir Firefox'ta açılmadı.**

- [ ] `about:debugging` üzerinden geçici yükleme.
- [ ] Event page'in uyku/uyanma döngüsünde veri kaybı var mı?
- [ ] `storage` davranış farkları ve panelin görünümü.

### 2.4 Mağaza yayını · öncelik: orta

- [ ] Chrome Web Store geliştirici hesabı (5 USD tek seferlik).
- [ ] Firefox AMO hesabı (ücretsiz).
- [ ] Gizlilik politikası sayfasının bir yere kurulması — `backend/` bunu
      sunmak için var, `package.json`'da `railway` betiği hazır.
- [ ] Mağaza incelemesi. Geniş host izni + harici API çağrısı yapan uzantılar
      elle inceleniyor; süreç günler sürebilir ve sorulara cevap veren bir insan
      ister.

### 2.5 Hukuk · öncelik: yayından önce zorunlu

- [ ] PII maskelemenin KVKK açısından yeterliliği. `shared/src/pii.ts` telefon,
      e-posta, IBAN, TC kimlik ve plaka maskeliyor ve testi var — ama bunun
      **yeterli olup olmadığı** teknik değil hukuki bir değerlendirme.
- [ ] Gizlilik politikası metninin kendisi.
- [ ] Üzerinde çalışılan sitelerin kullanım şartlarına uygunluk değerlendirmesi.

---

## 3. Kapsam dışı (eksik değil, karar)

| Konu | Neden listede yok |
|---|---|
| **iOS Safari uzantısı** | macOS + Xcode + Apple Developer hesabı (99 USD/yıl) ister. Ayrı bir proje kararı |
| **Android** | Chrome Android uzantı desteklemiyor — platform sınırı. Firefox Android hedeflenecekse bu bir ürün kararı |
| **Sunucu tarafı analiz** | Deponun kırmızı çizgisi: analiz kullanıcının tarayıcısında, kendi anahtarıyla üretilir |
| **Kendiliğinden sayfa çekme** | Kırmızı çizgi, teste bağlı (`extension/test/similar.test.ts`) |

---

## 4. Önerilen sıra

1. **2.1** — gerçek anahtarla deneme. Ürünün çalıştığının tek kanıtı bu.
2. **2.2** — canlı sayfa doğrulaması. En sessiz kırılma noktası burası.
3. **1.1** — 2.2'den çıkacak gerçek eksik ilan örneklerini fixture'a eklemek.
4. **2.3** — Firefox yüklemesi.
5. **1.2 / 1.3** — arayüz ve mağaza hazırlığı.
6. **2.4 / 2.5** — yayın ve hukuk.

---

## Bu dosyayı güncel tutma

Bir madde bitince kutusunu işaretlemek yerine **satırı silin** ve neyin
değiştiğini §0 tablosuna yazın. Ölçülmüş bir sayı (test adedi, site adedi)
değiştiyse ölçüm komutunu koşup güncelleyin — tahmin yazmayın.
