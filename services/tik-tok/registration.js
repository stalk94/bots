const puppeteer = require('puppeteer');
//const puppeteer = require('puppeteer-extra');
const { plugin } = require('puppeteer-with-fingerprints');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { delay, getHashtags } = require('./function');
const Mailjs = require("@cemalgnlts/mailjs");
const net = require("net");
require('dotenv').config();

//puppeteer.use(StealthPlugin());
const device = require('puppeteer').KnownDevices['iPhone 15'];



async function changeTorIP() {
    return new Promise((resolve, reject)=> {
        const socket = net.connect(9051, "127.0.0.1", ()=> {
            socket.write('AUTHENTICATE ""\r\nSIGNAL NEWNYM\r\nQUIT\r\n', ()=> {
                socket.end();
                resolve();
            });
        });
        socket.on("error", reject);
    });
}
async function getTempEmail() {
    const mailjs = new Mailjs();

    const res = await mailjs.createOneAccount();
    //console.log(res)
    const tempEmail = res.data.username;
    const password = res.data.password;
    const authRes = await mailjs.login(tempEmail, password);
    
    const auth = await mailjs.loginWithToken(authRes.data.token);

    return {
        email: tempEmail,
        pass: password,
        token: authRes.data.token,
        getMessages: (clb)=> mailjs.getMessages().then(clb)
    }
}



/**
 * {
  status: true,
  message: 'ok',
  data: [
    {
      id: '67a2a868589f2d479f879d32',
      msgid: '<77fb1ce4-adcd-4fd9-83f2-68c0b72f6e2f.noreply@account.tiktok.com>',
      from: [Object],
      to: [Array],
      subject: '116611 - ваш код подтверждения',
      intro: 'Код подтверждения Для подтверждения аккаунта введите в приложении TikTok этот код: 116611 Срок действия кода подтверждения…',
      seen: false,
      isDeleted: false,
      hasAttachments: false,
      size: 8635,
      downloadUrl: '/messages/67a2a868589f2d479f879d32/download',
      sourceUrl: '/sources/67a2a868589f2d479f879d32',
      createdAt: '2025-02-04T23:53:11+00:00',
      updatedAt: '2025-02-04T23:53:12+00:00',
      accountId: '/accounts/67a2a852ffc794816c073105'
    }
  ]
}
 */
async function proces() {
    const browser = await puppeteer.launch({
        headless: false,  // Включаем видимый режим для дебага
        args: [
            '--no-sandbox',  // Для избежания ошибок при запуске в некоторых средах
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',  // Избегаем автоматизации для предотвращения блокировки
            '--proxy-server=socks5://127.0.0.1:9050'
        ],
    });
    await browser.deleteCookie();
    await browser.createBrowserContext();
    await changeTorIP();
    const page = await browser.newPage();
    await page.emulate(device);
    //await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36');
    //await page.setViewport({ width: 375, height: 812 });
    //await page.setExtraHTTPHeaders({'Accept-Language': 'en-EN,en;q=0.9'});
    await page.goto('https://www.tiktok.com/signup/phone-or-email/email', { waitUntil: 'networkidle2' });
    
    await page.evaluate(()=> {
        const banner = document.querySelector('tiktok-cookie-banner');
        if(banner && banner.shadowRoot) {
            const acceptButton = banner.shadowRoot.querySelector('button:last-child');
            if(acceptButton) acceptButton.click();
        }
    });

    
    await page.click('[aria-label="Month. Double-tap for more options"]');
    await page.waitForSelector('#Month-options-item-0');  // Январь
    await page.click('#Month-options-item-0');

    // Открываем дропдаун дня и выбираем "1"
    await page.click('[aria-label="Day. Double-tap for more options"]');
    await page.waitForSelector('#Day-options-item-3');    // 3
    await page.click('#Day-options-item-0');

    // Открываем дропдаун года и выбираем "2000"
    await page.click('[aria-label="Year. Double-tap for more options"]');
    await page.waitForSelector('#Year-options-item-24');  // 2000
    await page.click('#Year-options-item-24');

    // Временная почта
    const resTempMail = await getTempEmail();

    await page.type('input[name="email"]', resTempMail.email);
    await page.type('input[type="password"]', 'qwerty1!');
    await delay(500);

    await page.waitForSelector('button[data-e2e="send-code-button"]', {visible: true});
    await page.evaluate(()=> {
        document.querySelector('button[data-e2e="send-code-button"]')
            .scrollIntoView({ behavior: "smooth", block: "center" });
        document.querySelector('button[data-e2e="send-code-button"]').click();
    });

    try {
        await page.waitForSelector('.TUXModal.captcha-verify-container', { visible: true, timeout: 6000 });
        await page.waitForSelector('.TUXModal.captcha-verify-container', { hidden: true });
    }
    catch (error) {
        console.log('капча не появилась')
    }

    
    // Проверка почты на наличие письма с подтверждением
    let emailConfirmed = false;
    while(!emailConfirmed) {
        await resTempMail.getMessages(async (messages)=> {
            const verifiMassage = messages.data.find((msg)=> 
                msg.subject.includes('ваш код подтверждения') ||
                msg.subject.includes('is your verification code')
            );

            if(verifiMassage) {
                emailConfirmed = true;
                const match = verifiMassage.subject.match(/\d+/);

                if(match) {
                    const code = match[0];
                    console.log(`Извлеченный код: ${code}`);
                    console.log('email: ', resTempMail.email);

                    const descriptionFieldRu = await page.$('input[placeholder="Введите 6-значный код"]');
                    const descriptionFieldEn = await page.$('input[placeholder="Enter 6-digit code"]');
                    
                    if(descriptionFieldRu?.click) {
                        await descriptionFieldRu.click();
                        await delay(200);
                        await descriptionFieldRu.type(code, { delay: 40 });
                        await delay(700);
                    }
                    else {
                        await descriptionFieldEn.click();
                        await delay(200);
                        await descriptionFieldEn.type(code, { delay: 40 });
                        await delay(700);
                    }

                    await page.evaluate(()=> {
                        const buttons = Array.from(document.querySelectorAll('button'));
                        const nextButton = buttons.find((button)=> 
                            button.textContent.trim() === 'Далее' ||
                            button.textContent.trim() === 'Next'
                    );
                        if(nextButton) nextButton.click();
                    });
                } 
                else {
                    console.log("Код не найден");
                }
            }
        });
 
        // Ожидаем несколько секунд перед новой проверкой
        await delay(5000);
    }
}
async function procesMobail() {
    const browser = await puppeteer.launch({
        headless: false,  // Включаем видимый режим для дебага
        args: [
            '--no-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--proxy-server=socks5://127.0.0.1:9050',
            '--user-agent=NEW_USER_AGENT',
            '--enable-webgl',
            '--disable-features=PermissionsAPI'
        ],
    });

    
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
        const originalGetParameter = WebGLRenderingContext.prototype.getParameter; // Сохраняем оригинальный метод
    
        Object.defineProperty(WebGLRenderingContext.prototype, 'getParameter', {
            value: function(param) {
                if (param === 37445) return 'Intel OpenGL';
                if (param === 37446) return 'Google Inc.';
                return originalGetParameter.call(this, param); // ✅ Вызываем оригинальный метод
            }
        });
    });
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(Intl.DateTimeFormat.prototype, 'resolvedOptions', {
            value: () => ({ timeZone: 'Europe/Berlin' }) // Подмена часового пояса
        });
    
        Object.defineProperty(navigator, 'language', { value: 'en-US' });
        Object.defineProperty(navigator, 'languages', { value: ['en-US', 'en'] });
    });
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'mediaDevices', { value: {} });
        Object.defineProperty(navigator, 'getUserMedia', { value: null });
        window.RTCPeerConnection = null;
        window.RTCDataChannel = null;
    });
    await page.setBypassCSP(true);
    await page.setRequestInterception(true);
    await page.emulate(device);
    const cookies = await browser.cookies();
    await browser.deleteCookie(...cookies);
    //await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Mobile Safari/537.36');
    //await page.setViewport({ width: 420, height: 812 });
    page.on('request', (request)=> {
        // Изменяем заголовки запроса
        const headers = {
            ...request.headers(),
            'User-Agent': device.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'max-age=0',
        };
        // Пропускаем запрос с новыми заголовками
        request.continue({ headers });
    });
    await page.goto('https://www.tiktok.com/signup/phone-or-email/email', { waitUntil: 'networkidle2' });
    await page.evaluate(() => {
        function getIp(clb) {
            fetch("https://ipinfo.io/json?token=1e6873fa773047").then(
                (response)=> response.json()
            ).then(
                (jsonResponse)=> clb(jsonResponse)
            );
        }
        getIp(console.log)
    });
    
    await page.evaluate(()=> {
        const banner = document.querySelector('tiktok-cookie-banner');
        if(banner && banner.shadowRoot) {
            const acceptButton = banner.shadowRoot.querySelector('button:last-child');
            if(acceptButton) acceptButton.click();
        }
    });


    // Временная почта
    const resTempMail = await getTempEmail();

    await page.type('input[name="email"]', resTempMail.email, { delay: 100 });
    //await page.type('input[type="password"]', 'qwerty1!');
    await delay(500);

    await page.evaluate(()=> {
        document.querySelector('[data-e2e="next-button"]')
            .scrollIntoView({ behavior: "smooth", block: "center" });
            document.querySelector('[data-e2e="next-button"]').click({ delay: 200 });
    });
    

    // Проверка почты на наличие письма с подтверждением
    let emailConfirmed = false;
    while(emailConfirmed) {
        await resTempMail.getMessages(async (messages)=> {
            const verifiMassage = messages.data.find((msg)=> msg.subject.includes('ваш код подтверждения'));

            if(verifiMassage) {
                emailConfirmed = true;
                const match = verifiMassage.subject.match(/\d+/);

                if(match) {
                    const code = match[0];
                    console.log(`Извлеченный код: ${code}`);
                    console.log('email: ', resTempMail.email);

                    const descriptionField = await page.$('input[placeholder="Введите 6-значный код"]');
                    await descriptionField.click();
                    await delay(200);
                    await descriptionField.type(code, { delay: 40 });
                    await delay(700);

                    await page.evaluate(()=> {
                        const buttons = Array.from(document.querySelectorAll('button'));
                        const nextButton = buttons.find(button => button.textContent.trim() === 'Далее');
                        if(nextButton) nextButton.click();
                    });
                } 
                else {
                    console.log("Код не найден");
                }
            }
        });
 
        // Ожидаем несколько секунд перед новой проверкой
        await delay(5000);
    }
}


procesMobail()