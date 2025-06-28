const puppeteer = require('puppeteer');
const { delay, getHashtags } = require('./function');
const fs = require('fs');
const path = require('path');

///////////////////////////////////////////////////////////////////////
const COOCKIE_PATH = path.join(__dirname, '/temp/cookies.json');
///////////////////////////////////////////////////////////////////////


/**
 * 
 * @param {puppeteer.Page} page 
 * @param {puppeteer.Browser} browser 
 * @returns 
 */
exports.parseCockie = async function() {
    const browser = await puppeteer.launch({
        headless: false,                                     // Включаем видимый режим для дебага
        args: [
            '--no-sandbox',                                  // Для избежания ошибок при запуске в некоторых средах
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',  // Избегаем автоматизации для предотвращения блокировки
            '--disable-features=IsolateOrigins,SitePerProcess'
        ]
    });

    try{
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
        await page.setExtraHTTPHeaders({'Accept-Language': 'ru-RU,ru;q=0.9'});
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.goto('https://www.tiktok.com/login/phone-or-email/email', { waitUntil: 'networkidle2' });
        
        
        if(globalThis.CONFIG) {
            // Вводим учетные данные
            await page.type('input[name="username"]', CONFIG.tk_login);
            await page.type('input[type="password"]', CONFIG.tk_password);
        }
        else {
            await page.type('input[name="username"]', 'intimalive@gmail.com');
            await page.type('input[type="password"]', 'Polina2015_');
        }

        // убираем говно банер
        await page.evaluate(()=> {
            const banner = document.querySelector('tiktok-cookie-banner');
            if(banner && banner.shadowRoot) {
                const acceptButton = banner.shadowRoot.querySelector('button:last-child');
                if(acceptButton) acceptButton.click();
            }
        });

        // Нажимаем кнопку входа
        await page.waitForSelector('[data-e2e="login-button"]');
        await page.click('[data-e2e="login-button"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        // Получаем и сохраняем куки
        const cookies = await browser.cookies();
        browser.close();
        //console.log('COCKIES: ', cookies);
        fs.writeFileSync(COOCKIE_PATH, JSON.stringify(cookies));

        return cookies;
    }
    catch {
        browser.close();
        console.error('authorize error');
    }
}
async function typeTextWithHashtags(page, descriptionField, text) { 
    const hashtags = getHashtags(text);  // Получаем все хештеги из текста
    let position = 0;

    for(let hashtag of hashtags) {
        const hashtagIndex = text.indexOf(hashtag, position); // Ищем хештег в тексте с текущей позиции

        // Вставляем текст перед хештегом
        if(hashtagIndex > position) {
            await descriptionField.type(text.slice(position, hashtagIndex), { delay: 40 });
        }

        // Вставляем сам хештег
        await descriptionField.type(hashtag, { delay: 40 });

        // Ждем, пока появится выпадающий список
        try {
            await page.waitForSelector('.hashtag-suggestion-item', { visible: true, timeout: 2000 });
            console.log('Hash tag suggestion visible');

            // Выбираем первый хештег из выпадающего списка
            const firstHashtag = await page.$('.hashtag-suggestion-item');
            if(firstHashtag) {
                await firstHashtag.click();
                await delay(400);
            }
        } 
        catch(error) {
            console.warn(`Не удалось выбрать хештег ${hashtag}: ${error.message}`);
        }

        // Обновляем позицию для следующего хештега
        position = hashtagIndex + hashtag.length;

        // Добавляем пробел после хештега (если в тексте он был)
        if(text[position] === ' ') {
            await descriptionField.type(' ', { delay: 40 });
            position++;
        }

        await delay(200);  // Небольшая задержка перед следующим хештегом
    }

    // Вставляем оставшийся текст после последнего хештега
    if (position < text.length) {
        await descriptionField.type(text.slice(position), { delay: 40 });
    }
}


/**
 * Рабочий ботяра загрузчик в тики таки видео с машинным описанием и спизженным видео
 * @param {string} videoPath путь на загрузку видео (удаленный)
 * @param {string} label копирайт на видео
 * @param {string} textGpt Описание для видео, от GPT
 * @param {(txt:string, error:any)=> void} caller регистратор
 */
exports.botLoader = async function(resultMirror, textGpt, caller) {
    var cookies = JSON.parse(fs.readFileSync(COOCKIE_PATH, 'utf-8'));
    if(!cookies || cookies.length === 0) cookies = await exports.parseCockie();
    
    
    if(cookies && cookies.length > 0) {
        try {
            const browser = await puppeteer.launch({
                headless: false,  // Включаем видимый режим для дебага
                args: [
                    '--no-sandbox',  // Для избежания ошибок при запуске в некоторых средах
                    '--disable-setuid-sandbox',
                    '--disable-blink-features=AutomationControlled'  // Избегаем автоматизации для предотвращения блокировки
                ],
            });
            await browser.setCookie(...cookies);
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 720 });
            await page.setExtraHTTPHeaders({'Accept-Language': 'ru-RU,ru;q=0.9'});
            //await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            // Переходим на страницу загрузки видео
            await page.goto('https://www.tiktok.com/upload', { waitUntil: 'networkidle2' });

            // Проверка на случай, если попали на страницу логина
            const isLoginPage = await page.evaluate(()=> !!document.querySelector('h2[data-e2e="login-title"]'));
            if(isLoginPage) {
                await browser.close();
                cookies = await parseCookie();          // Авторизуем заново
                if(!cookies) {
                    caller('❌ Не удалось получить новые куки. Авторизация не удалась.');
                    return;
                }

                // Перезапускаем процесс загрузки с новыми куками
                return exports.botLoader(resultMirror, textGpt, caller);
            }

            
            if(typeof resultMirror === 'string') {
                // убираем говно банер
                await page.evaluate(() => {
                    const banner = document.querySelector('tiktok-cookie-banner');
                    if(banner && banner.shadowRoot) {
                        const acceptButton = banner.shadowRoot.querySelector('button:last-child');
                        if(acceptButton) acceptButton.click();
                    }
                });

                // Загрузить видео
                await page.waitForSelector('input[type="file"]');
                const fileInput = await page.$('input[type="file"]');

                if(fileInput) await fileInput.uploadFile(resultMirror);
                else caller('❌💀 Cбой!!!', 'Сбой. Не найден инпут загрузки видео.');

                // Ждем появления поля для ввода описания
                await page.waitForSelector('div[contenteditable="true"]', { visible: true });
                const descriptionField = await page.$('div[contenteditable="true"]');
                await descriptionField.click();             // Фокусируемся на поле
                await delay(200);
                await page.keyboard.press('Control'); 
                await page.keyboard.press('A');             // Выделяем весь текст
                await delay(200);
                await page.keyboard.press('Backspace');     // Удаляем выделенный текст
                await delay(100);
                await page.keyboard.press('Backspace');
                await delay(100);
                await typeTextWithHashtags(page, descriptionField, textGpt.replace(/"/g, ''));

                await Promise.race([
                    page.waitForSelector('.info-status.success', { visible: true }),
                    page.waitForSelector('.info-status-item.success-info', { visible: true })
                ]);
                
                // Ожидаем кнопку для публикации
                await page.waitForSelector('[data-e2e="post_video_button"]', {visible: true});
                await page.evaluate(()=> {
                    document.querySelector('[data-e2e="post_video_button"]')
                        .scrollIntoView({ behavior: "smooth", block: "center" });
                });
                

                // Нажимаем кнопку публикации
                await page.evaluate(()=> {
                    document.querySelector('[data-e2e="post_video_button"]').click();
                });
                //await page.click('[data-e2e="post_video_button"]', { delay: 100 });
                caller('🎉 Видео опубликовано. И обрабатывается tik-tok.(3 min bot panding)')

                // ? нужна логика для закрытия puppeter
                setTimeout(()=> {browser?.close(); caller('🤖 Browser bot close');}, 3 * (60*1000));
            } 
        } 
        catch (error) {
            caller('❌💀 Cбой автоматизатора!!!', {
                label: 'Error',
                text: '❌💀 Бот словил какое то исключение',
                error: error
            });
            await browser?.close();
        } 
    } 
    else {
        // Ошибка с куки
        caller('❌ Cбой авторизации. Надо пройти авторизацию.', {
            label: 'Coockie error',
            text: 'Нет куки в хранилище!!!'
        });
        await browser?.close();
    }
}


/**
 * Получает все url видео аккаунта username tik-tok
 * @param {string} username 
 * @returns {Promise<string[]>}
 */
exports.getTikTokPosts = async (username)=> {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(`https://www.tiktok.com/@${username}`);
  
    const videos = await page.evaluate(()=> {
        return Array.from(document.querySelectorAll('a[href*="/video/"]')).map((a)=> a.href);
    });


    await browser.close();
    return videos;
}


// тут годные решения
async function test() {
    const browser = await puppeteer.launch({
        headless: false,  // Включаем видимый режим для дебага
        args: [
            '--no-sandbox',  // Для избежания ошибок при запуске в некоторых средах
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled'  // Избегаем автоматизации для предотвращения блокировки
        ]
    });

    // Создаем новый контекст и страницу
    const [page] = await browser.pages();

    // Загрузка куки
    const cookies = JSON.parse(fs.readFileSync(COOCKIE_PATH, 'utf-8'));
    browser.setCookie(...cookies);
    //await page.setCookie(...cookies);

    // Устанавливаем User-Agent и другие параметры
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setViewport({ width: 1280, height: 720 });
    await page.setGeolocation({ latitude: 54.0063, longitude: 13.0112 });

    // Открываем страницу загрузки видео на TikTok
    await page.goto('https://www.tiktok.com/upload');

    // Ожидаем загрузки и появления элемента для загрузки файла
    await page.waitForSelector('input[type="file"]');
    const fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(path.join(__dirname, '/temp/1.mp4'));

    // Ждем появления поля для ввода описания
    await page.waitForSelector('div[contenteditable="true"]');
    const descriptionField = await page.$('div[contenteditable="true"]');
    await descriptionField.type('teststsst #video', { delay: 100 });  // Типируем текст с задержкой, имитируя поведение человека

    // Ждем появления кнопки "Опубликовать"
    await page.waitForSelector('button[data-e2e="publish-button"]:visible');

    // Нажимаем на кнопку "Опубликовать"
    await page.click('button[data-e2e="publish-button"]');

    // Подождем некоторое время, чтобы увидеть результат
    setTimeout(()=> browser.close(), 3 * (60*1000))
}
