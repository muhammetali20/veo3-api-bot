# 🎬 Flow Veo3 JavaScript Test Bot

Bu proje, Google'ın Flow (Veo3 AI video generation) platformunu JavaScript/Puppeteer ile otomatize etmek için hazırlanmış bir test botudur.

## 🚀 Kurulum

```bash
# Dependencies'leri kur
npm install

# Test'i çalıştır
npm test
```

## 📋 Test Süreci

Bot şu adımları gerçekleştirir:

1. **Puppeteer Browser'ı başlatır** (görünür mod)
2. **Flow sitesine gider** (https://labs.google/flow/)
3. **Sayfa yapısını analiz eder**
4. **"Create with Flow" butonuna tıklar**
5. **Google Sign In işlemini handle eder** (Manuel login gerekiyor)
6. **Video generation arayüzünü bulur**
7. **Test prompt'u girer**
8. **Her adımda ekran görüntüsü alır**

## 🎯 Test Sonuçları

Test sonunda şu dosyalar oluşur:
- `01-flow-homepage.png` - Flow ana sayfası
- `02-after-signin.png` - Google Sign In sonrası
- `03-final-interface.png` - Video generation arayüzü

Console'da detaylı loglar görürsün.

## ⚙️ Yapılandırma

`veo3-real-test.js` içindeki parametreleri değiştirebilirsin:
- `headless: false` → `true` (görünmez mod için)
- Test prompt'u değiştir
- Bekleme sürelerini ayarla

## 🎯 Sonraki Adım: n8n Entegrasyon

Bu test başarılı olursa, aynı kodu n8n'nin Code node'unda kullanacağız!

## 🐛 Sorun Giderme

- **Chrome/Chromium kurulu değilse**: `sudo apt install chromium-browser`
- **Permission hatası**: `chmod +x node_modules/.bin/puppeteer`
- **Network hatası**: VPN kullan veya network ayarlarını kontrol et

## 📝 Notlar

- Bot detection'dan kaçınmak için gerçek user agent kullanıyor
- Google AI Pro/Ultra aboneliği gerekiyor (Flow için)
- Manuel login gerekiyor (Google hesabı)
- Rate limiting var, fazla hızlı istek gönderme

## ⚠️ Önemli Bilgiler

- Flow sadece Google AI Pro ($19.99/ay) veya Ultra ($249.99/ay) aboneliği ile kullanılabilir
- Veo3 şu anda sadece ABD'de mevcut
- Test için geçerli bir Google hesabı ve abonelik gerekiyor # veo3-api-bot
