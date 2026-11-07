# PROGRESS — ilan-analiz

> **Tek giriş noktası.** Yeni oturum: bu dosyayı oku → "Sıradaki kod işi"nde ilk `[ ]` maddeyi yap →
> bitince `[x]` yap, "Son oturumlar"a **tek satır** ekle (en fazla 5 satır tut, eskisini sil).
> Ayrıntı `YAPILACAKLAR.md`'de (yalnız gerekirse). Kod işi kalmadıysa yeni iş uydurma;
> "kod sırası boş" de ve 👤 listesini göster.

## Ne
İkinci el araç ilanlarını değerlendiren tarayıcı uzantısı (sahibinden.com, arabam.com): km/yaş yorumu,
medyan fiyat karşılaştırması, pazarlık hedefi; kullanıcının kendi Gemini anahtarıyla. PII maskeleme.

## Durum (2026-11-07)
- Kod tarafı (ayrıştırıcı, arayüz, tema/zoom/kontrast, popup durumları, mağaza ekranları, sürüm akışı) tamam.
- Bu oturumda koşuldu: `pnpm -r test` → shared **107**, extension **286**, backend **3** — hepsi yeşil.
- Gerçek Gemini anahtarıyla ve canlı ilan sayfasında hiç denenmedi (ürünün çalıştığının tek kanıtı bu).

## Doğrulama
```bash
pnpm install --frozen-lockfile && pnpm -r test && pnpm -r exec tsc --noEmit
```

## Sıradaki kod işi (🤖)
1. [ ] **CI maliyeti** (1.5) — `ci.yml`'yi `pull_request` + `main` push'una daralt (her push'ta koşmasın).
2. [ ] **Üçüncü site adaptörü** (1.4, isteğe bağlı, ~130 satır) — önce kullanıcıdan hangi site olduğunu sor.
3. [ ] 👤 2.2'den gerçek eksik ilan HTML'i gelirse fixture olarak ekle (1.1).

## Senden beklenen (👤) — sırayla
1. 2.1 Kendi Gemini anahtarınla birkaç gerçek ilan (şema bozuluyor mu, kalite, token/gecikme, 429).
2. 2.2 Ayda bir canlı sayfa kontrolü (sessiz kırılma noktası).
3. 2.3 Firefox'ta `about:debugging` ile yükleme.
4. 2.4 Mağaza hesapları (Chrome 5 USD, AMO), gizlilik sayfası yayını · 2.5 KVKK / site kullanım şartları değerlendirmesi.

## Son oturumlar
- 2026-11-07 — PROGRESS.md oluşturuldu; 396 test yeşil (kod değişikliği yok).
