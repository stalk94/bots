require('dotenv').config();
const { TelegramClient, Api } = require("telegram");
const BaseBot = require("./base");
const { db } = require('../../server/db');



class Inviter extends BaseBot {
    sucess = 0
    faileds = 0
    textInviteLink = 'Присодиняйся, мы предлагаем инструмент для тех кто хочет эффективно раскручивать свою Telegram группу: '

    constructor(inviteGroup, phoneNumber) {
        const testMobailNum = process.env.TEST_NUM;
        super(phoneNumber ?? testMobailNum);
        this.inviteGroup = inviteGroup;
    }
    /**
     * Заносим в бд новый аккаунт
     * @param {Api.User} user 
     * @param {string} groupName
     */
    async #analitic(user, groupName) {
        const timeshtamp = Date.now();

        //todo: абстрагировать !
        await db.push(`invite.${this.phoneNumber}`, {
            timeshtamp,
            phone: user?.phone ?? undefined,
            username: user.username,
            id: user.id.valueOf(),
            fromGroupName: groupName
        });
    }

    async inviteLink(user, textInviteLink) {
        const result = await this.client.invoke(
            new Api.messages.ExportChatInvite({
                peer: '@' + this.inviteGroup
            })
        );
        console.log("🔗 Ссылка приглашения:", result.link);
        await this.client.sendMessage(user, { 
            message: `${textInviteLink ?? this.textInviteLink}: ${result.link}` 
        });
    }
    async runOne(groupNameCustom, limit=1000) {
        const groupToInvite = await this.getGroup(groupNameCustom);
       
        if(groupToInvite) {
            const story = await db.get(`invite.${this.phoneNumber}`) ?? [];
            const users = await this.getAllUsersFromGroup(groupNameCustom, limit);

            
            for (let [index, user] of users.entries()) {
                if(user?.className==='User' && !story.some(elem => elem.id === user.id.valueOf())) {
                    const delay = Math.floor(Math.random() * 3000) + 1000;      // 1-7 сек задержка
                    
                    await new Promise((resolve)=> {
                        setTimeout(async ()=> {
                            this.sucess++;
                            const result = await this.invite(this.inviteGroup, user);

                            if(result) {
                                this.#analitic(user, groupNameCustom);
                                console.log(`+ добавлен ${user?.username}`);
                            }
                            else {
                                this.faileds++;
                                this.inviteLink(user);
                            }

                            if(index === users.length - 1) {
                                console.log(`✅ добавлено ${this.counter} новых!`);
                                console.log(`⛔ отклонено ${this.failed}!`);
                            }
                            resolve();
                        }, delay);
                    });
                }
            }
        }
    }
    async run(limit=1000) {
        const groupToInvite = await this.getGroup(this.inviteGroup);

        if(groupToInvite) {
            const story = await db.get(`invite.${this.phoneNumber}`) ?? [];
            const allgroups = await this.getGroupsFromUserAllDialogs();
            
            for (let group of allgroups) {
                const users = await this.getAllUsersFromGroup(group.groupName, limit);

                for (let [index, user] of users.entries()) {
                    if(user?.className==='User' && !story.some(elem => elem.id === user.id.valueOf())) {
                        const delay = Math.floor(Math.random() * 3000) + 1000;      // 1-7 сек задержка
                        
                        await new Promise((resolve)=> {
                            setTimeout(async ()=> {
                                this.sucess++;
                                const result = await this.invite(this.inviteGroup, user);

                                if(result) {
                                    this.#analitic(user, group.groupName);
                                    console.log(`+ добавлен ${user?.username}`);
                                }
                                else {
                                    this.faileds++;
                                    this.inviteLink(user);
                                }

                                if(index === users.length - 1) {
                                    console.log(`✅ добавлено ${this.counter} новых!`);
                                    console.log(`⛔ отклонено ${this.failed}!`);
                                }
                                resolve();
                            }, delay);
                        });
                    }
                }
            }
        }
        else console.error('❗❌ Целевая группа не найдена!')
    }
}



const test =()=> {
    // @stalk9424 @kristinassergeevna testerBot2, tests1s
    (async ()=> {
        await db.set('invite', {});

        const test = await new Inviter('tests1s').login();
        //console.log(await test.getGroup('testerBot2'))
        await test.runOne('testerBot2', 100)
        //await test.inviteLink('@kristinassergeevna')
    })()
}
test()