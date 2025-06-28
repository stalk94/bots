const { scrapeVideo } = require('../services/util/scraper');
const { botLoader } = require('../services/tik-tok/bot-loader');
const { getChatGPTResponse } = require('../services/util/gpt');
const { isValidUrl, downloadFile } = require('../services/function');
const TelegramBot = require('node-telegram-bot-api');
const { miror } = require('../services/video-act');




/**
 * Создать бот слушателей и вернуть обькт бота
 * @param {string} token 
 * @returns {TelegramBot}
 */
module.exports =(token)=> {
    const bot = new TelegramBot(token, {polling: true});
    console.log('🤖 bot create!');

    // Обработчик новых сообщений
    bot.on('message', async(msg)=> {
        const chatId = msg.chat.id;
        const text = msg.text;
        const registrator =(txt, error)=> {
            if(error) console.error(error);
            if(txt) {
                if(!error) console.log(txt);
                bot.sendMessage(chatId, txt);
            }
        }

        if(isValidUrl(text)) {
            registrator(`Принято в работу`);
            const resultScrape = await scrapeVideo(text);           // пиздим

            if(resultScrape !== 'TypeError' && resultScrape.url) {
                const resultDownload = await downloadFile(resultScrape.url);                    // Загрузка файла на локалку
                const resultMirror = await miror(CONFIG.textCooper, CONFIG.flickCooper);        // Обработка
                const responcesGptText = await getChatGPTResponse(CONFIG.textPrompt);
                
                registrator(`🎥 Видео извлечено. Передано боту`);
               

                if(typeof responcesGptText==='string' && typeof resultMirror==='string' && !resultDownload) {
                    await botLoader(resultMirror, responcesGptText, registrator);
                }
                else {
                    if(resultDownload.error) {
                        registrator('❌ Сбой загрузчика видео', {
                            label: 'error loader',
                            ...resultDownload.error
                        });
                    }
                    if(resultMirror.error) {
                        registrator('❌ Сбой редактира видео', {
                            label: 'error mirror',
                            ...resultMirror.error
                        });
                    }
                }
            }
            else registrator('❌ Сбой при попытке скачать видео с tik-tok', {
                name: 'Error tik-tok scraper',
                resultScrape: resultScrape
            });
        }
        else {
            registrator('❌ Не верный формат ссылки');
        }
    });


    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        bot.sendMessage(chatId, 'Жду ссылку!');
    });
    bot.onText(/\/play/, (msg) => {
        bot.sendMessage(msg.chat.id, 'Нажми "Играть", чтобы запустить игру!', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🎮 Играть', web_app: { url: 'https://last-exit.su' } }],
                ],
            },
        });
    });

    return bot;
}