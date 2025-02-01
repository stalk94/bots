const puppeteer = require('puppeteer');
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
            '--disable-blink-features=AutomationControlled'  // Избегаем автоматизации для предотвращения блокировки
        ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.setExtraHTTPHeaders({'Accept-Language': 'ru-RU,ru;q=0.9'});
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto('https://www.tiktok.com/login/phone-or-email/email', { waitUntil: 'networkidle2' });

    // Вводим учетные данные
    await page.type('input[name="username"]', CONFIG.tk_login, { delay: 100 });
    await page.type('input[type="password"]', CONFIG.tk_password, { delay: 100 });

    // Нажимаем кнопку входа
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // Получаем и сохраняем куки
    const cookies = await browser.cookies();
    browser.close();
    fs.writeFileSync(COOCKIE_PATH, JSON.stringify(cookies));

    console.log('COCKIES: ', cookies);
    return cookies;
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
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            // Переходим на страницу загрузки видео
            await page.goto('https://www.tiktok.com/upload', { waitUntil: 'networkidle2' });
            await page.waitForSelector('input[type="file"]');


            if(typeof resultMirror === 'string') {
                // Загрузить видео
                const fileInput = await page.$('input[type="file"]');
                if(fileInput) await fileInput.uploadFile(resultMirror);
                else caller('❌💀 Cбой!!!', 'Сбой. Не найден инпут загрузки видео.');

                // Ждем появления поля для ввода описания
                await page.waitForSelector('div[contenteditable="true"]');
                const descriptionField = await page.$('div[contenteditable="true"]');
                await descriptionField.click();             // Фокусируемся на поле
                await page.keyboard.down('Control'); 
                await page.keyboard.press('A');             // Выделяем весь текст
                await page.keyboard.press('Backspace');     // Удаляем выделенный текст
                await page.keyboard.up('Control');
                await descriptionField.type(textGpt, { delay: 20 }); 

                // Ожидаем прогресса загрузки
                await page.waitForSelector('.info-progress.success', { visible: true });

                // Ожидаем кнопку для публикации
                await page.waitForSelector('[data-e2e="post_video_button"]');
                const postButton = await page.$('[data-e2e="post_video_button"]');

                // Нажимаем кнопку публикации
                await postButton.click({ delay: 120 });
                caller('🎉 Видео опубликовано. И обрабатывается tik-tok.(3 min bot panding)')

                // ? нужна логика для закрытия puppeter
                setTimeout(()=> {browser.close(); caller('🤖 Browser bot close');}, 3 * (60*1000));
            } 
        } 
        catch (error) {
            caller('❌💀 Cбой автоматизатора!!!', {
                label: 'Error',
                text: '❌💀 Бот словил какое то исключение',
                error: error
            });
            await browser.close();
        } 
    } 
    else {
        // Ошибка с куки
        caller('❌ Cбой авторизации. Надо пройти авторизацию.', {
            label: 'Coockie error',
            text: 'Нет куки в хранилище!!!'
        });
        await browser.close();
    }
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