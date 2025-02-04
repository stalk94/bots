const { getTikTokPosts } = require('../services/bot-loader');
const { db } = require('./db');


const saveVideo = async (videoId)=> {
    await db.set(`PUBLIC.${videoId}`, true);
}
const isNewVideo = async (videoId)=> {
    const exists = await db.has(`PUBLIC.${videoId}`);
    return !exists;
}


const processVideos = async (videos)=> {
    for(const videoUrl of videos) {
        const videoId = videoUrl.split('/').pop();

        if(await isNewVideo(videoId)) {
            console.log("Новое видео найдено:", videoUrl);

            //! вызов логики постинга
            
            // сохраняем в бд как видео которое отрепостило уже
            await saveVideo(videoId);
        }
    }
}