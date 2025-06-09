const express = require('express');
const { FlowVeo3Bot } = require('./veo3-real-test.js'); // Bot modülümüzü içe aktarıyoruz
const path = require('path');

const app = express();
const port = process.env.PORT || 10000; // Render portu environment variable olarak verir

app.use(express.json());

// Sunucuda paylaşılan (static) dosyalar için bir yol oluşturuyoruz. 
// Bu sayede indirilen videolara tarayıcıdan erişilebilir.
app.use('/videos', express.static(path.join(__dirname, 'downloads')));

// Bot'un durumunu ve örneğini yönetmek için global değişkenler
let botInstance = null;
let isBotRunning = false;

// Bot'u başlatan ve yeniden kullanan fonksiyon
async function initializeBot() {
    // Eğer bot zaten çalışıyorsa veya bir örnek varsa, yeniden başlatmaya gerek yok
    if (botInstance) {
        console.log("Mevcut bot örneği kullanılıyor.");
        return;
    }
    
    console.log("Yeni bot örneği oluşturuluyor ve başlatılıyor...");
    botInstance = new FlowVeo3Bot();
    
    try {
        // Tekrar headless (görünmez) moda geri dönüyoruz.
        await botInstance.init(process.env.NODE_ENV === 'production'); // Headless modda başlat
        await botInstance.goToProjectPage();
        console.log("... Sayfanın oturması için 5 saniye bekleniyor ...");
        await new Promise(r => setTimeout(r, 5000));
        await botInstance.selectModel();
        console.log("✅ Bot başlatıldı ve proje sayfasında hazır.");
    } catch (error) {
        console.error("❌ Bot başlatma sırasında kritik hata:", error.message);
        // Hata durumunda bot örneğini temizle ki tekrar denenebilsin
        if (botInstance) {
            await botInstance.close();
        }
        botInstance = null;
        throw error; // Hatayı yukarı taşı
    }
}

// Render'ın sağlık kontrolü (health check) için endpoint
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Video oluşturma endpoint'i
app.post('/generate-video', async (req, res) => {
    if (isBotRunning) {
        return res.status(429).json({ 
            error: 'Şu anda başka bir video oluşturuluyor. Lütfen mevcut işlemin bitmesini bekleyin.' 
        });
    }

    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
        return res.status(400).json({ error: 'Geçerli bir "prompt" metni gereklidir.' });
    }

    // İsteği hemen yanıtla, böylece Render timeout'a uğramaz.
    // Kullanıcıya işlemin başladığını bildiriyoruz.
    res.status(202).json({ message: 'Video oluşturma işlemi başladı.', prompt });

    // Asıl video üretme işlemini arka planda başlat (asenkron olarak)
    // Bu fonksiyonun içinde hata yönetimi kendi class'ında yapılmalı.
    runVideoGeneration(prompt).catch(err => {
        console.error(`[API] Video oluşturma sürecinde kritik bir hata oluştu: ${err.message}`);
        // Burada bir hata bildirim servisine (Sentry, LogRocket vb.) log gönderebilirsiniz.
    });
});

async function runVideoGeneration(promptText) {
    console.log(`[API] FlowVeo3Bot, "${promptText}" promptu ile başlatılıyor...`);
    const bot = new FlowVeo3Bot();
    
    // Bot loglarını konsolda daha belirgin hale getirelim
    bot.setLogger((message, ...args) => {
        console.log(`[Bot] ${message}`, ...args);
    });

    try {
        // process.env.NODE_ENV 'production' olduğunda (Render üzerinde) headless mod true olacak
        await bot.init(process.env.NODE_ENV === 'production');
        await bot.loadCookies();
        await bot.goToProjectPage();
        await bot.selectModel();
        await bot.enterPrompt(promptText);
        await bot.clickGenerate();
        await bot.waitForVideoAndDownload(promptText);
        console.log(`[API] "${promptText}" için video oluşturma başarıyla tamamlandı.`);
    } catch (error) {
        console.error(`[API] runVideoGeneration içinde hata: ${error.message}`);
        // Hata durumunda da tarayıcıyı kapatmayı denemek önemlidir.
    } finally {
        await bot.close();
        console.log('[API] Bot süreci sonlandırıldı.');
    }
}

app.listen(port, () => {
    console.log(`✅ Veo API sunucusu http://localhost:${port} adresinde çalışmaya başladı.`);
    console.log("💡 Video oluşturmak için HTTP POST isteği gönderin:");
    console.log(`   POST http://localhost:${port}/generate-video`);
    console.log(`   Body: { "prompt": "istediğiniz video açıklaması" }`);
    console.log('Render üzerinde çalışıyorsa, "production" modunda olmalı.');
    console.log(`Mevcut mod: ${process.env.NODE_ENV}`);
    
    // Sunucu başlarken bot'u hemen başlatmıyoruz, ilk istekte başlatacağız.
    // Bu, kaynakların sadece gerektiğinde kullanılmasını sağlar.
});

// Sunucu kapatıldığında (Ctrl+C) tarayıcıyı da kapat
process.on('SIGINT', async () => {
    console.log("\nSIGINT sinyali alındı. Sunucu ve tarayıcı kapatılıyor...");
    if (botInstance) {
        await botInstance.close();
    }
    process.exit(0);
}); 