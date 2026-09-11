# İlan Analiz — Yapılacaklar

Son ölçüm: **2026-09-11** · Dal: `main` (`b0a8b8d`)

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
| Test | **293 geçiyor / 0 kırık** — `shared` 99, `extension` 191, `backend` 3 |
| Test dosyası | 23 |
| Tip denetimi | Üç paket de temiz (`pnpm -r exec tsc --noEmit`) |
| CI | **Var** — `.github/workflows/ci.yml`; tip, test, iki hedefin paketi ve uçtan uca koşuyor |
| Uçtan uca | **Var** — `extension/e2e/uzanti.spec.ts`, uzantı yüklü gerçek Chromium |
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

- [ ] Fixture'ları eksik/bozuk ilanlarla genişlet: fiyatı olmayan ilan, boş
      açıklama, kilometre alanı hiç yazılmamış ilan, farklı düzendeki detay
      sayfası. Bugünkü fixture'lar `extension/test/fixtures/` altında ve hepsi
      **tam dolu** ilanlardan çıkarılmış.
- [ ] Bir site adaptörü beklediği alanı bulamadığında ne olacağını teste bağla.
      Panelin `okunamadi` durumu var ve test ediliyor; eksik olan, **tek bir
      alanın** okunamadığı ara durum.

> Bu maddenin ön koşulu sizde: yeni fixture ancak gerçek bir ilan sayfasından
> çıkarılabilir, bu ortamdan ilan sitelerine çıkılmıyor (deponun kendi kırmızı
> çizgisi). Bir ilan sayfasının HTML'ini kaydedip verirseniz gerisi bende.

### 1.2 Arayüz · öncelik: orta

- [ ] Panelde **karanlık tema** desteği ve kontrast denetimi. Bugün tek tema var.
- [ ] Popup'ın (anahtar girişi) boş / yükleniyor / hata durumlarının gözden
      geçirilmesi.
- [ ] Panelin farklı zoom seviyelerinde ve dar pencerede taşıp taşmadığı.

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
3. **1.1** — fixture genişletme (2.2'den çıkacak örneklerle).
4. **2.3** — Firefox yüklemesi.
5. **1.2 / 1.3** — arayüz ve mağaza hazırlığı.
6. **2.4 / 2.5** — yayın ve hukuk.

---

## Bu dosyayı güncel tutma

Bir madde bitince kutusunu işaretlemek yerine **satırı silin** ve neyin
değiştiğini §0 tablosuna yazın. Ölçülmüş bir sayı (test adedi, site adedi)
değiştiyse ölçüm komutunu koşup güncelleyin — tahmin yazmayın.
