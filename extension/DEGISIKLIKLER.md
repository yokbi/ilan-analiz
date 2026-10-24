# Değişiklikler

Mağazaya yüklenen her sürümün notu. Yeni sürüm `npm run surum -- <patch|minor|major>`
ile açılır: komut `public/manifest.json`'daki sürümü artırır ve buraya boş bir başlık
ekler. `npm run paket`, manifest sürümünün burada **dolu** bir başlığı yoksa zip
üretmez — not yazılmadan paket çıkmasın.

Kullanıcıya dönük yazın: mağazadaki "Bu sürümde neler var" alanına olduğu gibi
yapıştırılabilmeli. İç düzenlemeler (test, CI) buraya girmez.

## 0.6.0 — 2026-10-24

İlk mağaza sürümü adayı.

- İkinci el araç ilanında kilometre, hasar kaydı ve fiyat konumunu değerlendiren panel
  (sahibinden.com, arabam.com).
- Liste sayfalarında her ilana yerel skor rozeti; ağ isteği ve anahtar gerektirmez.
- Analiz kendi Gemini anahtarınızla tarayıcınızda üretilir; üyelik yok, sunucu yok.
- Açık ve koyu tema; sistem ayarını izler.
- Panel yakınlaştırılmış ve dar pencerelerde ekranın içinde kalır.
- Popup: anahtar kaydedilemediğinde ya da Google geçici olarak yanıt vermediğinde
  doğru hata mesajı gösterilir.
