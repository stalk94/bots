require('dotenv').config();
const fs = require('fs');
const { TelegramClient, Api } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input");
const { checkProxy } = require('../function');
const { sleep } = require("telegram/Helpers");


const apiId = +process.env.TG_API_ID;
const apiHash = process.env.TG_HASH;
const testMobailNum = process.env.TEST_NUM;



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
     * Получить группу
     * @param {string} groupName 
     * @returns { Promise<Api.Channel | undefined> }
     */
    async getGroup(groupName) {
        try {
            const group = await this.client.getEntity(groupName);
            return group;
        } 
        catch(error) {
            console.error(`❌ Ошибка: ${groupName} - приватная группа или недоступна`);
            return undefined;
        }
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
     * получить все группы в которых пользователь не админ (из списка чатов пользователя)
     */
    async getGroupsFromUserAllDialogs() {
        const notMyGroups = [];
        const client = this.client;
        const me = await client.getMe();
        const dialogs = await client.getDialogs(); // Получаем все чаты, группы, каналы
    
        // Фильтруем из диалогов только группы и каналы
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
                        groupName: groupEntity.username         //?
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
     * @param {string | number} groupName не важно с @ или без
     * @param {number} limit
     * @returns {Promise<Api.User[]>} только уникальные 
     */
    async getAllUsersFromGroup(groupName, limit=100) {
        let group, i=0;
        const result = [];

        try {
            group = await this.client.getEntity(groupName);
        } 
        catch(error) {
            console.error(`❌ Ошибка: ${groupName} - приватная группа или недоступна`);
            return result; // Возвращаем пустой массив, чтобы избежать краша
        }

        const messages = await this.client.getMessages(group, { limit: limit });
        const chek =(user)=> {
            const find = result.find((elem)=> elem?.id?.valueOf() === user?.id?.valueOf());

            if(find) return true;
            else return false;
        }
        
        for (const [index, message] of messages.entries()) {
            const senderUser = message.sender;
            if(!chek(senderUser)) result.push(senderUser);
            
            // только для групп (блок на будуюшее)
            if(message.replyTo) {
                message.replyTo.replyToMsgId        // это id сообшения на которое message дал ответ
                //this.client.getMessages(message, {replyTo: message.replyTo.msgId});
            }
            // сообшение канала (с коментариями)
            if(message.replies) {
                if(message.replies && message.replies.replies > 0) {
                    const delay = Math.floor(Math.random() * 100) + 250;
                    console.log('iteration: ', i++, ':', index);

                    await new Promise((resolve)=> {
                        setTimeout(async ()=> {
                            const replies = await this.client.getMessages(group, {
                                limit: 100,
                                replyTo: message.id
                            });
                            
                            for (const replyMessage of replies) {
                                const user = replyMessage.sender;
                                if(user && !chek(user)) result.push(user);
                            }

                            resolve();
                        }, delay);
                    });
                }
            }
        }

        return result;
    }
    
    /**
     * Добавляет в группу пользователя
     * @param {string} groopName 
     * @param {Api.User} user 
     */
    async invite(groopName , user) {
        try {
            const group = await this.client.getEntity(groopName);
            const invite = new Api.channels.InviteToChannel({
                channel: group,
                users: [user]        
            });
            
            await this.client.invoke(invite);
            return true;
        }
        catch(error) {
            const match = error.message.match(/A wait of (\d+) seconds is required/);

            if(match) {
                const waitTime = parseInt(match[1], 10);
                console.log(`⏳ FloodWait: ждем ${waitTime} секунд...`);
                
                return { waitTime: waitTime * 1000 };
            }
            else {
                console.error('❌ Ошибка invite: ', error.message);
            }
        }
    }
    async inviteLink(user, textInviteLink) {
        const result = await this.client.invoke(
            new Api.messages.ExportChatInvite({
                peer: '@' + this.inviteGroup
            })
        );

        try {
            await this.client.sendMessage(user, {
                message: `${textInviteLink ?? this.textInviteLink}: ${result.link}`
            });

            return true;
        }
        catch (error) {
            const match = error.message.match(/A wait of (\d+) seconds is required/);

            if(match) {
                const waitTime = parseInt(match[1], 10);
                console.log(`⏳ FloodWait: ждем ${waitTime} секунд...`);

                return { waitTime: waitTime * 1000 };
            }
            else {
                console.error("Ошибка invite link:", error);
            }
        }
    }
}
module.exports = BotInviterBase;


//////////////////////////////
const test =()=> {
    // @nodejs_jobs, @stalkerappro
    (async ()=> {
        const test = await new BotInviterBase(testMobailNum).login();
        //console.log(await test.getAllUsersFromGroup('@react_js', 10))
    })()
}
