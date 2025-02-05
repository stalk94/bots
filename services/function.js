require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const https = require('https');


//const TEMP_PATH = path.join(__dirname, '/temp/1.mp4');
const TEMP_PATH = './services/temp/1.mp4';


/**
 * Проверка, это url адресс или нет
 * @param {string} str url строка
 * @returns 
 */
exports.isValidUrl =(str)=> {
    const pattern = /^(https?:\/\/)?([\w\d-]+\.)+[a-z]{2,}(:\d+)?(\/[^\s]*)?$/i;
    return pattern.test(str);
}
/**
 * 
 * @param {number} timestamp 
 * @param {'TD'|'T'|'D'} format 
 * @returns 
 */
exports.convertTime =(timestamp, format)=> {
    const date = new Date(timestamp);

    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear(); 

    const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    const formattedDate = `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`;

    if(!format || format==='TD') return {time:formattedTime, date:formattedDate};
    else if(format==='T') return formattedTime;
    else return formattedDate;
}
/**
 * 
 * @param {*} obj 
 * @param {*} replacer 
 * @returns 
 */
exports.replaceCircular =(obj, replacer = "[Circular]")=> {
    const seen = new WeakMap();

    function recurse(value) {
        if(typeof value === "object" && value !== null) {
            if(seen.has(value)) return replacer;
            
            seen.set(value, true);

            // Обрабатываем массивы и объекты
            if(Array.isArray(value)) return value.map(recurse);
            else {
                return Object.fromEntries(
                    Object.entries(value).map(([key, val])=> [key, recurse(val)])
                );
            }
        }
        if(typeof value === 'function') {
            return '[Function]';
        }
        
        return value;
    }

    return recurse(obj);
}


/**
 * Выгребает в локальное пространство удаленный файл видео
 * @param {string} url ссылка на видео к примеру на tik-tok видео готовое к загрузке
 * @returns {Promise<null, {error:Error}>}
 */
exports.downloadFile =async(url)=> {
    async function checkRedirect() {
        try {
            const response = await axios.get(url, {
                maxRedirects: 0,                // Запрещаем следование за редиректами
                validateStatus: (status)=> status >= 200 && status < 400,
            });
    
            // Если код 3xx и есть заголовок Location, значит редирект есть
            if (response.status >= 300 && response.status < 400 && response.headers.location) {
                //console.log(`Redirect found: ${response.headers.location}`);
                return response.headers.location;
            } 
        } 
        catch(error) {
            console.error('Error checking redirect:', error.message);
            return 'error';
        }
    }

    const isRedirect = await checkRedirect();

    if(isRedirect !== 'error') return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(TEMP_PATH);

        https.get(isRedirect ? isRedirect : url, (res)=> {
            res.pipe(file);
            file.on('finish', ()=> file.close(resolve));
        })
        .on('error', (error) => {
            fs.unlink(TEMP_PATH, ()=> {});
            reject({error: error})
        });
    });
}

exports.delay = async(ms)=> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
exports.getHashtags =(text)=> {
    return text.match(/#[\p{L}0-9_]+/gu) || [];
}