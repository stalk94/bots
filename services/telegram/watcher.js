require('dotenv').config();
const axios = require('axios');
const { SocksProxyAgent } = require('socks-proxy-agent');
const fs = require('fs');
const { TelegramClient, Api } = require("telegram");
const { NewMessage } = require("telegram/events");
const { StringSession } = require("telegram/sessions");
const input = require("input");
const BaseBot = require("./base");

Api.UserStatusOnline

class Watcher extends BaseBot {
    constructor(phoneNumber) {
        const testMobailNum = process.env.TEST_NUM;
        super(phoneNumber ?? testMobailNum);
    }


}

const test =()=> {
    // @kristinassergeevna 
    (async ()=> {
        const test = await new Watcher().login();
        //const group = await test.getGroup('react_js');
        
       
        test.client.addEventHandler(async (event)=> {
            if(event) {
                // Новое сообшение
                if(event.originalUpdate.className === 'UpdateNewChannelMessage') {
                    console.log("📩 Новое сообщение:", event.message.text);
                    console.log(event.message.sender)
                }
            }
          }, new NewMessage({}));
    })()
}

test()