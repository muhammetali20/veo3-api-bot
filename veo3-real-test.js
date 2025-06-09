const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class FlowVeo3Bot {
    constructor() {
        this.browser = null;
        this.page = null;
        this.log = console.log; // Varsayılan logger konsola yazar
    }

    // Dışarıdan bir logger fonksiyonu atamak için kullanılır
    setLogger(loggerFunction) {
        this.log = loggerFunction;
    }

    async init(headless = true) {
        this.log('🚀 Flow Veo3 Bot başlatılıyor...');
        
        const launchOptions = {
            headless: headless, // 👁️ API için true, test için false olabilir
            userDataDir: './chrome-user-data', // Kalıcı oturum için
            slowMo: 50, // Hızı biraz artırdık
            defaultViewport: null,
            args: [
                '--start-maximized',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage' // Render gibi paylaşımlı ortamlarda önemli
            ]
        };

        // Sadece yerel geliştirme ortamında executablePath kullanalım
        // Render üzerinde bu ayar olmamalı, sistemdeki Chrome kullanılmalı.
        if (process.env.NODE_ENV !== 'production') {
            launchOptions.executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
        }
        
        this.browser = await puppeteer.launch(launchOptions);
        
        // Browser crash handler
        this.browser.on('disconnected', () => {
            this.log('❌ Browser kapandı/crash oldu!');
        });
        
        this.log('📄 Mevcut sekme kullanılıyor...');
        const pages = await this.browser.pages();
        this.page = pages[0] || await this.browser.newPage();
        
        this.log('✅ Bot hazır ve çalışıyor.');
    }

    async goToProjectPage() {
        this.log('🌐 Direkt olarak proje sayfasına gidiliyor...');
        try {
            await this.page.goto('https://labs.google/fx/tr/tools/flow/project/6cec195e-b57e-4e22-9030-c7a2e4cfcda7', {
                waitUntil: 'networkidle2',
                timeout: 60000
            });
            this.log(`✅ Proje sayfası yüklendi: ${this.page.url()}`);
        } catch (error) {
            this.log('❌ Proje sayfası yüklenemedi:', error.message);
            throw error;
        }
    }
    
    async enterPrompt(promptText) {
        this.log(`📝 Prompt hızlıca giriliyor: "${promptText}"`);
        try {
            const promptInputSelector = 'textarea[placeholder="Metin içeren bir video üretin…"]';
            await this.page.waitForSelector(promptInputSelector, { timeout: 20000 });

            // Buton aktivasyonu için prompt'un sonuna boşluk ekle
            const fullPrompt = promptText + ' ';

            // Değeri anında ata ve değişikliği tetiklemek için olayları gönder
            await this.page.evaluate((selector, text) => {
                const textarea = document.querySelector(selector);
                if (textarea) {
                    // React gibi kütüphanelerin kullandığı 'value' setter'ını doğrudan çağır
                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
                    nativeInputValueSetter.call(textarea, text);
                    // Değişikliğin algılanması için input olayını tetikle
                    textarea.dispatchEvent(new Event('input', { bubbles: true }));
                } else {
                    throw new Error(`Prompt input alanı bulunamadı: ${selector}`);
                }
            }, promptInputSelector, fullPrompt);
            
            this.log('✅ Prompt hızlıca girildi.');
        } catch (error) {
            this.log('❌ Prompt girme hatası:', error.message);
            throw error;
        }
    }

    async clickGenerate() {
        this.log('🎬 "Gönder" (arrow) butonuna tıklanıyor...');
        try {
            // Sınıf adları dinamik olabileceğinden, sadece ikona göre arama yap (daha güvenilir)
            const generateButtonXPath = "//button[.//i[text()='arrow_forward']]";
            await this.page.waitForXPath(generateButtonXPath, { timeout: 10000 });
            const [generateButton] = await this.page.$x(generateButtonXPath);
            
            if (generateButton) {
                await generateButton.click();
                this.log('✅ Prompt gönderildi, video üretimi başlıyor...');
            } else {
                throw new Error('"Gönder" (arrow_forward) butonu bulunamadı.');
            }
        } catch (error) {
            this.log('❌ Gönder butonuna tıklama hatası:', error.message);
            throw error;
        }
    }

    async selectModel() {
        this.log('⚙️ Model seçimi yapılıyor: Veo 3 - Fast (Text to Video)...');
        try {
            // Adım 1: "Ayarlar" butonuna tıkla
            this.log('  -> 1/3: "Ayarlar" butonu aranıyor...');
            const settingsButtonXPath = "//button[.//span[text()='Ayarlar']]";
            const [settingsButton] = await this.page.$x(settingsButtonXPath);
            if (!settingsButton) throw new Error('"Ayarlar" butonu bulunamadı.');
            await settingsButton.click({ delay: 100 });
            this.log('  ✅ "Ayarlar" butonuna tıklandı.');

            await new Promise(r => setTimeout(r, 500)); // Menünün açılması için kısa bir bekleme

            // Adım 2: "Model" dropdown'ına tıkla
            this.log('  -> 2/3: "Model" dropdown menüsü aranıyor...');
            const modelDropdownXPath = "//button[@role='combobox' and .//span[text()='Model']]";
            const [modelDropdown] = await this.page.$x(modelDropdownXPath);
            if (!modelDropdown) throw new Error('"Model" dropdown menüsü bulunamadı.');
            await modelDropdown.click({ delay: 100 });
            this.log('  ✅ "Model" dropdown menüsüne tıklandı.');

            // Adım 3: "Veo 3 - Fast (Text to Video)" seçeneğine tıkla (DAHA GÜVENİLİR YÖNTEM)
            this.log('  -> 3/3: "Veo 3 - Fast" seçeneği aranıyor ve tıklanıyor...');
            try {
                // Önce seçeneğin görünür olmasını bekle
                const optionSelector = "//*[contains(text(), 'Veo 3 - Fast (Text to Video)')]";
                await this.page.waitForXPath(optionSelector, { visible: true, timeout: 5000 });
                
                // Sayfa içinde JS çalıştırarak elementi bul ve tıkla
                const clicked = await this.page.evaluate(() => {
                    const textToFind = 'Veo 3 - Fast (Text to Video)';
                    // Genellikle Radix UI bu `data-radix-collection-item` niteliğini kullanır.
                    const allItems = document.querySelectorAll('[data-radix-collection-item]');
                    
                    if (allItems.length > 0) {
                        for (const item of allItems) {
                            if (item.textContent.includes(textToFind)) {
                                item.click();
                                return true; // Başarılı
                            }
                        }
                    }
                    
                    // Fallback: Eğer üstteki seçici çalışmazsa, rol'e göre ara
                    const optionsByRole = Array.from(document.querySelectorAll('[role="menuitemradio"], [role="option"]'));
                    const target = optionsByRole.find(el => el.textContent.includes(textToFind));
                    if (target) {
                        target.click();
                        return true; // Başarılı
                    }

                    return false; // Hiçbiri çalışmazsa başarısız
                });

                if (!clicked) {
                    throw new Error('Model seçeneği DOM içinde bulundu ama tıklanamadı.');
                }
                
                this.log('  ✅ "Veo 3 - Fast (Text to Video)" seçildi.');

            } catch (error) {
                 throw new Error(`"Veo 3 - Fast (Text to Video)" seçeneği bulunamadı veya görünür değil. Hata: ${error.message}`);
            }
            
            await new Promise(r => setTimeout(r, 1000)); // Seçimin uygulanması ve menünün kapanması için bekleme süresini artırdım

            // Ayarlar menüsünü kapatmak için Escape tuşuna bas (gerekirse diye)
            await this.page.keyboard.press('Escape');
            this.log('  -> Ayarlar menüsünün kapalı olduğundan emin olmak için Escape tuşuna basıldı.');
        } catch (error) {
            this.log('❌ Model seçimi sırasında hata:', error.message);
            throw error;
        }
    }

    async waitForVideoAndDownload(promptText) {
        // 5 ile 8 dakika arasında rastgele bir süre bekleme
        const waitMinutes = 5 + Math.random() * 3;
        const waitTime = waitMinutes * 60 * 1000;
        this.log(`⏳ Video oluşturulması için ${waitMinutes.toFixed(1)} dakika bekleniyor...`);
        await new Promise(r => setTimeout(r, waitTime));

        this.log('👀 Video oluşumu ve indirme işlemi başlıyor...');
        try {
            // İndirme işlemini hazırlama
            const downloadPath = path.resolve('./downloads');
            if (!fs.existsSync(downloadPath)) {
                fs.mkdirSync(downloadPath, { recursive: true });
            }
            this.log(`📂 Videolar "${downloadPath}" klasörüne indirilecek.`);

            // Puppeteer'ı indirmelere izin verecek şekilde ayarla
            const client = await this.page.target().createCDPSession();
            await client.send('Page.setDownloadBehavior', {
                behavior: 'allow',
                downloadPath: downloadPath,
            });

            // YENİ ADIM: Video üretim hatası olup olmadığını kontrol et
            this.log('  -> Hata kontrolü: "Video Üretilemedi" mesajı aranıyor...');
            const errorElement = await this.page.evaluate(() => {
                const elements = Array.from(document.querySelectorAll('*'));
                return elements.some(el => el.textContent.includes('Video Üretilemedi'));
            });

            if (errorElement) {
                throw new Error('Video üretimi başarısız oldu. "Video Üretilemedi" mesajı bulundu.');
            }
            this.log('  ✅ Hata mesajı bulunmadı, devam ediliyor.');

            // Adım 1: Üretilen videonun altındaki prompt metnini bul ve doğrula
            this.log('  -> 1/3: Prompt metni doğrulanıyor...');
            const promptXPath = `//button[normalize-space() = "${promptText}"]`;
            await this.page.waitForXPath(promptXPath, { timeout: 30000 });
            const [promptElement] = await this.page.$x(promptXPath);
            
            if (!promptElement) {
                throw new Error('Video oluşturulduğuna dair prompt metni bulunamadı.');
            }
            this.log('  ✅ Prompt metni doğrulandı.');

            const filesBeforeDownload = new Set(fs.readdirSync(downloadPath));

            // Adım 2: İndirme butonuna tıkla
            this.log('  -> 2/3: İndirme butonu aranıyor ve tıklanıyor...');
            // En yeni video en üstte olduğu için, birden fazla sonuç varsa ilki hedeflenir.
            const downloadButtonXPath = `//button[.//i[text()='download']]`;
            await this.page.waitForXPath(downloadButtonXPath, { timeout: 10000 });
            const downloadButtons = await this.page.$x(downloadButtonXPath);
            
            if (downloadButtons.length === 0) {
                throw new Error('İndirme butonu bulunamadı.');
            }
    
            await downloadButtons[0].click({ delay: 200 });
            this.log('  ✅ İndirme menüsü açıldı.');

            await new Promise(r => setTimeout(r, 3000)); // Menünün açılması için bekleme süresini artırdım

            // Adım 3: Orijinal boyut (720p) seçeneğine tıkla (DAHA GÜVENİLİR YÖNTEM)
            this.log('  -> 3/3: Orijinal boyut (720p) indirme seçeneği aranıyor ve tıklanıyor...');
            
            const clicked = await this.page.evaluate(() => {
                const textToFind = 'Orijinal boyut (720p)';
                const menuItems = document.querySelectorAll('[role="menuitem"]');
                for (const item of menuItems) {
                    if (item.textContent.includes(textToFind)) {
                        item.click();
                        return true;
                    }
                }
                return false;
            });

            if (clicked) {
                this.log('  ✅ Orijinal boyut (720p) indirme seçeneğine tıklandı.');

                // İndirmenin tamamlanmasını bekleme
                this.log('📥 İndirmenin tamamlanması bekleniyor...');
                const maxWaitTime = 180 * 1000; // Maksimum 3 dakika bekle
                const pollInterval = 2000; // 2 saniyede bir kontrol et
                let waitedTime = 0;

                while (waitedTime < maxWaitTime) {
                    const filesAfterDownload = fs.readdirSync(downloadPath);
                    const newFileName = filesAfterDownload.find(f => !filesBeforeDownload.has(f) && !f.endsWith('.crdownload'));

                    if (newFileName) {
                        const downloadedFilePath = path.join(downloadPath, newFileName);
                        this.log(`✅ Video başarıyla indirildi: ${downloadedFilePath}`);
                        return downloadedFilePath; // İndirilen dosyanın yolunu döndür
                    }
                    
                    await new Promise(r => setTimeout(r, pollInterval));
                    waitedTime += pollInterval;
                }
                
                throw new Error('Video indirme işlemi zaman aşımına uğradı.');

            } else {
                throw new Error('Orijinal boyut (720p) indirme seçeneği bulunamadı veya tıklanamadı.');
            }
        } catch (error) {
            this.log('❌ Video kontrol veya indirme hatası:', error.message);
            throw error;
        } finally {
            this.log('✅ Tarayıcı kapatıldı.');
        }
    }
    
    async close() {
        if (this.browser) {
            this.log('👋 Tarayıcı kapatılıyor...');
            await this.browser.close();
        }
    }
}

module.exports = { FlowVeo3Bot }; 