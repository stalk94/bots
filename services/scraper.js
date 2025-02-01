const tik = require('rahad-media-downloader');


/**
 * 
 * @param {string} url 
 * @returns {Promise<{
 *             url: string
 *              audioInfo: string
 *              info: {
 *              play_count: string
 *              react_count: number
 *             comment_count: number
 *             share_count: number
 *              author_avatar:  string
 *             images:  string
 *          }
 *   }>}
 */
exports.scrapeVideo = async(url)=> {
    try {
        const result = await tik.rahadtikdl(url);
        const data = {
            url: result.data.noWatermarkMp4,
            audioInfo: result.data.musicInfo,
            info: {
                play_count: result.data.play_count,
                react_count: result.data.react_count,
                comment_count: result.data.comment_count,
                share_count: result.data.share_count,
                author_avatar: result.data.avatar,
                images: result.data.images
            }
        }
        return data;
    } 
    catch(error) {
        return error.name;
    }
}
