require('dotenv').config();
require('./server/console');
const path = require('path');
const cors = require("cors");
const { parseCockie } = require('./services/bot-loader');
const express = require('express');
const http = require('http');
const initBot = require('./server/telegram');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config/tik-tok.json', {encoding: 'utf-8'}));

//////////////////////////////////////////////////////
globalThis.CONFIG = {
    OPENAI_KEY: config.OPENAI_KEY,
    TELEGRAM_KEY: config.TELEGRAM_KEY,
    tk_login:  config.tk_login ?? process.env.tk_login,
    tk_password: config.tk_password ?? process.env.tk_password,
    textPrompt: config.textPrompt, 
    textCooper: config.textCooper,
    flickCooper: config.flickCooper,
    usernameTikTok: config.usernameTikTok
}
//////////////////////////////////////////////////////

const app = express();
const server = http.createServer(app);
var bot = initBot(CONFIG.TELEGRAM_KEY);
app.use(express.urlencoded({limit: '100mb'}));
app.use(express.json({limit: '1mb'}));

process.on('uncaughtException', (err)=> {
    fs.appendFileSync("dead.log", JSON.stringify({
        massage: err.message,
        stack: err.stack
    })+"\n", {encoding:"utf-8"});

    process.exit(1);
});
async function editGlobalConfig(newConfigData) {
    Object.keys(newConfigData).map((key)=> {
        globalThis.CONFIG[key] = newConfigData[key];
    });

    fs.writeFileSync('config/tik-tok.json', JSON.stringify(globalThis.CONFIG));

    if(newConfigData.TELEGRAM_KEY) {
        await bot.stopPolling();
        await bot.close();
        bot = initBot(newConfigData.TELEGRAM_KEY);
    }
    if(newConfigData.tk_login || newConfigData.tk_password) {
        parseCockie()
            .then((cockie)=> console.log('🤖 Установлены новые куки для загрузчика'))
            .catch((err)=> console.error('🤖 Что то пошло не так. Надо повторить попытку', err))
    }
}


app.get("/", (req, res)=> {
    res.sendFile(__dirname + '/dist/index.html');
});
app.get("/getConfig", (req, res)=> {
    res.send(globalThis.CONFIG);
});
app.post('/chek', (req, res)=> {
    res.send({
        sys: process.LOGS.toString()
    });
});
app.post('/botReload', async(req, res)=> {
    await bot.stopPolling();
    await bot.close();
    bot = initBot(newConfigData.TELEGRAM_KEY);
});
app.post('/editConfig', (req, res)=> {
    if(req.body) editGlobalConfig(req.body);
});




////////////////////////////////////////////////////////////
app.use('/', express.static(path.join(__dirname, '/src')));
app.use('/', express.static(path.join(__dirname, '/dist')));
server.listen(3000, ()=> {
    console.log("server start http://localhost:3000");
});