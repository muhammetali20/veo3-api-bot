const puppeteer = require('puppeteer');

async function simpleTest() {
    console.log('🚀 Basit Chrome testi başlıyor...');
    
    let browser;
    try {
        console.log('🔧 Chrome başlatılıyor...');
        
        browser = await puppeteer.launch({
            headless: false,
            devtools: false,
            executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        console.log('✅ Chrome başlatıldı!');
        console.log('📄 Yeni sayfa açılıyor...');
        
        const page = await browser.newPage();
        console.log('✅ Sayfa açıldı!');
        
        console.log('🌐 Flow Türkçe sayfasına gidiliyor...');
        await page.goto('https://labs.google/fx/tr/tools/flow/project/6cec195e-b57e-4e22-9030-c7a2e4cfcda7', { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        console.log('✅ Flow TR yüklendi!');
        console.log('⏳ 10 saniye bekleniyor...');
        
        await new Promise(r => setTimeout(r, 10000));
        
        console.log('✅ Test başarılı!');
        
    } catch (error) {
        console.error('❌ Hata:', error.message);
        console.error('📋 Stack:', error.stack);
    } finally {
        if (browser) {
            console.log('🔚 Browser kapatılıyor...');
            await browser.close();
        }
    }
}

simpleTest(); 