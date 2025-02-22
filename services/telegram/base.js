require('dotenv').config();
const axios = require('axios');
const { SocksProxyAgent } = require('socks-proxy-agent');
const fs = require('fs');
const { TelegramClient, Api } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input");


const apiId = +process.env.TG_API_ID;
const apiHash = process.env.TG_HASH;
const testMobailNum = process.env.TEST_NUM;


async function checkProxy(proxy) {
    const agent = new SocksProxyAgent({
        protocol: 'socks',
        hostname: proxy.ip,
        port: proxy.port,
        socksType: proxy.socksType
    });
    
    try {
        const response = await axios.get('https://httpbin.org/ip', { httpsAgent: agent });

        if(response.status === 200) {
            console.log('✅ Прокси работает:', response.data?.origin);
            return true;
        } 
        else {
            console.warn('⚠️ Прокси не доступен.');
            return false;
        }
    } 
    catch(error) {
        console.warn('⚠️ Прокси не доступен. Ошибка:', error.message);
        return false;
    }
}
// !?
async function testWatcher(params) {
    client.addEventHandler(async (event) => {
        if (event instanceof NewMessage) {
            const message = event.message;

            // Проверяем, что это комментарий (находится в обсуждении)
            if (message.isChannel && message.replyTo) {
                console.log(`Комментарий от ${message.senderId}: ${message.text}`);
                console.log(`Ответ на пост: ${message.replyTo.msgId}`);
            }
        }
    });
}


class BotInviterBase {
    constructor(phoneNumber) {
        this.phoneNumber = phoneNumber;
        this._sessionFile = `config/sessions/session_${phoneNumber}.json`;
        this.sessionString = '';

        if(fs.existsSync(this._sessionFile)) {
            this.sessionString = fs.readFileSync(this._sessionFile, 'utf-8');
        }
        
        this.session = new StringSession(this.sessionString);
    }
    /**
     * Вызываем после конструктора
     * @param {{ port: number, ip: string, socksType: 5}} proxy 
     */
    async login(proxy) {
        const config = { connectionRetries: 5 };
        if(proxy && await checkProxy(proxy)) config.proxy = proxy;
        this.client = new TelegramClient(this.session, apiId, apiHash, config);
    
        // Запуск авторизации
        await this.client.start({
            phoneNumber: async ()=> this.phoneNumber,
            phoneCode: async ()=> await input.text('Введите код из SMS: '),
            password: async ()=> await input.text('Введите пароль (если есть): '),
            onError: (err)=> console.error(err),
        });
    
        console.log(`✅ Аккаунт ${this.phoneNumber} авторизован!`);
    
        // Сохраняем сессию в файл, если она новая или обновленная
        const newSessionString = this.client.session.save();
        if(newSessionString !== this.sessionString) {
            fs.writeFileSync(this._sessionFile, newSessionString);
            this.sessionString = newSessionString;
            console.log(`💾 Сессия для ${this.phoneNumber} сохранена!`);
        }
    
        return this;
    }

    /**
     * Найти и получить обьект юзера телеграм
     * @param {string | number} userIdOrName не важно с @ или без
     * @returns {Promise<Api.User|undefined>}
     */
    async getUserFromIdOrName(userIdOrName) {
        try {
            const user = await this.client.getEntity(userIdOrName);
            return user;
        }
        catch(error) {
            console.warn('⚠️ юзер не найден: ', error.message);
        }
    }
    /**
     * получить все группы в которых пользователь не админ
     */
    async getAllGroups() {
        const notMyGroups = [];
        const client = this.client;
        const me = await client.getMe();
        const dialogs = await client.getDialogs(); // Получаем все чаты, группы, каналы
    
        // Фильтруем только группы
        const groups = dialogs.filter(dialog => dialog.isGroup || dialog.isChannel);
    
        for(let group of groups) {
            const groupEntity = group.entity;
            const groupId = groupEntity.id;
            
            if(!groupId) {
                console.warn('⚠️ Не удалось найти ID группы:', group);
                continue;
            }
            
            try {
                let isAdmin = false;
    
                if(groupEntity._ === "channel" || groupEntity.megagroup) {
                    // Для супергрупп и каналов
                    const participants = await client.invoke(
                        new Api.channels.GetParticipants({
                            channel: groupId,
                            filter: new Api.ChannelParticipantsAdmins(),
                            offset: 0,
                            limit: 10, // Достаточно, чтобы проверить себя
                        })
                    );
    
                    isAdmin = participants.users.some((user) => user.id.valueOf() === me.id.valueOf());
                } 
                else if (groupEntity._ === "chat") {
                    isAdmin = groupEntity.adminRights || groupEntity.creator;
                }
    
                // добавляем в массив результатов
                if(!isAdmin && groupEntity.username) {
                    notMyGroups.push({
                        id: groupId,
                        name: groupEntity.title || "Без названия",
                        groupName: '@' + groupEntity.username
                    });
                }
            }
            catch(error) {
                console.error(`❌ Ошибка при проверке группы ${groupEntity.title || groupId}:`, error);
            }
        }
    
        return notMyGroups;
    }
    /**
     * Получает всех юзеров с группы/канала
     * @param {string | number} groopName не важно с @ или без
     * @param {number} limit
     * @returns {Promise<Api.User[]>} только уникальные 
     */
    async getAllUsersFromGroup(groopName, limit=100) {
        const result = [];
        const group = await this.client.getEntity(groopName);
        const messages = await this.client.getMessages(group, { limit: limit });
        
        const chek =(user)=> {
            const find = result.find((elem)=> elem?.id?.valueOf() === user?.id?.valueOf());

            if(find) return true;
            else return false;
        }
        
        for (const message of messages) {
            const senderUser = message.sender;
            if(!chek(senderUser)) result.push(senderUser);
            //console.log(message.sender.username);
            
            // только для групп (блок на будуюшее)
            if(message.replyTo) {
                message.replyTo.replyToMsgId        // это id сообшения на которое message дал ответ
                //this.client.getMessages(message, {replyTo: message.replyTo.msgId});
            }
            // сообшение канала (с коментариями)
            if(message.replies) {
                if(message.replies && message.replies.replies > 0) {
                    const replies = await this.client.getMessages(group, {
                        limit: message.replies.replies,
                        replyTo: message.id
                    });
                    
                    for (const replyMessage of replies) {
                        // получили отправителя комента
                        const user = await this.getUserFromIdOrName(replyMessage.senderId);
                        if(user && !chek(user)) result.push(user);
                    }
                }
            }
        }
    
    
        return result;
    }
    /**
     * Добавляет в группу пользователя
     * @param {string} groopName 
     * @param {Api.User} user 
     * @returns {this}
     */
    async invite(groopName, user) {
        try {
            const groop = await this.client.getEntity(groopName);

            //! надо заносить в список добавленых
            const invite = new Api.channels.InviteToChannel({
                channel: groop,
                users: [user.id]        //?
            });
            
            await this.client.invoke(invite);
        }
        catch(error) {
            console.error('❌ Ошибка invite: ', error.message);
        }

        return this;
    }
}
module.exports = BotInviterBase;


/**
 * 
 // @nodejs_jobs, @stalkerappro
(async ()=> {
    const test = await new BotInviterBase(testMobailNum).login();
    console.log(await test.getAllGroups())
})()

*/
