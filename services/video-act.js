const ffmpeg = require('fluent-ffmpeg');


/**
 * Получить мета данные из видео
 * @param {string} videoPath 
 * @returns {Promise<ffmpeg.FfprobeFormat, null>}
 */
async function getMeta(videoPath) {
    return await new Promise((resolve, reject)=> {
        ffmpeg.ffprobe(videoPath, (err, metadata)=> {
            if(err) {
                console.error('Ошибка при анализе видео:', err);
                reject();
            }
            else resolve(metadata);
        });
    });
}
/**
 * Обрезчик видео
 * @param {string} path путь к видео
 * @param {number} startTime в секундах время начала
 * @param {number} duration в секундах длительность
 * @returns {Promise<string, Error>}
 */
async function trimVideo(path, startTime, duration) {
    const metaFormatData = await getMeta(path);
    const pathOut = path.join(__dirname, '/temp/trim.mp4');

    return await new Promise((resolve, reject)=> {
        if(!metaFormatData) reject(new Error('video not meta data'));
        else ffmpeg(path)
            .setStartTime(startTime)
            .duration(duration)
            .output(pathOut)
            .on('end', ()=> {
                console.log('Обрезка завершена.');
                resolve(pathOut);
            })
            .on('error', (err)=> {
                console.error('Ошибка при обрезке видео:', err);
                reject(err);
            })
            .run();
    });
}
/**
 * Накладывает коперайт(можно с миганием)
 * @param {string} copyrightText 
 * @param {boolean} flick 
 * @returns {Promise<string, {error: Error}>}
 */
async function miror(copyrightText, flick) {
    //const videoTemp = path.join(__dirname, '/temp/1.mp4');
    //const pathOut = path.join(__dirname, '/temp/2.mp4');
    const videoTemp = './services/temp/1.mp4';
    const pathOut = './services/temp/2.mp4';
    const metaData = await getMeta(videoTemp);

    const filter = {
        filter: 'drawtext',
        options: {
            text: copyrightText,
            fontsize: 40,
            fontcolor: 'red',
            x: '(w-text_w)/2',          // По центру по горизонтали
            y: 30,                      // Расположить текст вверху
            //box: 1,                     // Включить фон
            //boxcolor: 'black@0.05',      // Черный фон с прозрачностью (0.7)
            //boxborderw: 7              // Толщина границы фона
        }
    }
    if(flick) filter.enable = 'lt(mod(t,2),1)';

    const duration = metaData.format.duration;
    const newDuration = Math.max(0, duration - 4);


    return await new Promise((resolve, reject)=> {
        if(!metaData) reject(new Error('video not meta data'));
        else ffmpeg(videoTemp)
            .setStartTime(2)                                        // Пропускаем первые 2 секунды
            .setDuration(newDuration)                               // Урезаем последние 4 секунды
            .videoFilters([
                'hflip',                                            // Отзеркалить видео по горизонтали
                'setpts=1.03*PTS',                                  // Ускорение видео на 3%
                'fps=29',                                           // Изменение FPS
                'noise=alls=10:allf=t+u',                           // Добавление шума
                'eq=brightness=0.02:saturation=1.1:contrast=1.05',  // Лёгкая цветокоррекция
                'crop=iw-10:ih-10,scale=iw:ih',                     // Обрезка и восстановление размера
                filter
            ])
            .audioFilters([
                'asetrate=44100*0.98,atempo=1.03',                  // Смена темпа без искажения голоса
                'afftdn=nr=20',                                     // Легкий шумодав
                'adelay=500|500'                                    // Сдвиг звука
            ])
            .output(pathOut)
            .on('end', ()=> {
                console.log('Процесс обработки видео завершен');
                resolve(pathOut);
            })
            .on('error', (err)=> {
                console.error('Ошибка при обработке видео miror:', err);
                reject({error: err});
            })
            .run();
        });
}



module.exports = {
    trimVideo: trimVideo,
    miror: miror
}