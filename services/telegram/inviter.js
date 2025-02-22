require('dotenv').config();
const { TelegramClient, Api } = require("telegram");
const BaseBot = require("./base");
const { db } = require('../../server/db');



class Inviter extends BaseBot {
    sucess = 0
    faileds = 0
    textInviteLink = `Присоединяйся к MMORPG Last-Exit – миру Чернобыльской зоны отчуждения! 🔥
        Игра уже в разработке и нуждается в активных игроках и тестерах.
        🎁 Бонус для самых активных! Разыгрываем лидерство группировок среди лучших сталкеров.
        Входи в зону, ты нам нужен! ⚡: 
    `

    constructor (inviteGroup, phoneNumber) {
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
    /**
     * 
     * @param {Array<Api.User>} users 
     */
    async #process(users, groupName) {
        function splitArrayIntoChunks(n=3) {
            const result = [];
            const chunkSize = Math.ceil(users.length / n);
        
            for (let i = 0; i < users.length; i += chunkSize) {
                result.push(users.slice(i, i + chunkSize));
            }
        
            return result;
        }
        const chanks = splitArrayIntoChunks();

        for (let [indexChank, usersChank] of chanks.entries()) {
            const delay = Math.floor(Math.random() * (480000 - 300000 + 1)) + 300000;

            await new Promise((resolve)=> {
                setTimeout(async ()=> {
                    for (let [index, user] of usersChank.entries()) {
                        if(user?.className === 'User' && !story.some(elem => elem.id === user.id.valueOf())) {
                            const delay = Math.floor(Math.random() * 1000) + 4000;      // 1-7 сек задержка

                            await new Promise((resolve) => {
                                setTimeout(async () => {
                                    this.sucess++;
                                    const result = await this.invite(this.inviteGroup, user);

                                    if (result) {
                                        this.#analitic(user, groupName);
                                        console.log(`+ добавлен ${user?.username}`);
                                    }
                                    else {
                                        this.faileds++;
                                        this.inviteLink(user);
                                    }

                                    if (index === usersChank.length - 1) {
                                        console.log(`✅ добавлено ${this.counter} новых!`);
                                        console.log(`⛔ отклонено ${this.failed}!`);
                                    }
                                    resolve();
                                }, delay);
                            });
                        }
                    }

                    console.log(`✅ Стадия ${indexChank} из ${chanks.length - 1} выполнена`);
                    resolve();
                }, indexChank === 0 ? 1000 : delay);
            });
        }
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
    async runOne(groupNameCustom, limit = 1000) {
        const groupToInvite = await this.getGroup(groupNameCustom);

        if(groupToInvite) {
            const story = await db.get(`invite.${this.phoneNumber}`) ?? [];
            const users = await this.getAllUsersFromGroup(groupNameCustom, limit);
            console.log('Итого: ', users.length);

            this.#process(users, groupNameCustom);
        }
    }
    async run(limit = 1000) {
        const groupToInvite = await this.getGroup(this.inviteGroup);

        if (groupToInvite) {
            const story = await db.get(`invite.${this.phoneNumber}`) ?? [];
            const allgroups = await this.getGroupsFromUserAllDialogs();

            for (let group of allgroups) {
                const users = await this.getAllUsersFromGroup(group.groupName, limit);
                console.log('итого: ', users.length);

                for (let [index, user] of users.entries()) {
                    if (user?.className === 'User' && !story.some(elem => elem.id === user.id.valueOf())) {
                        const delay = Math.floor(Math.random() * 1000) + 7000;      // 1-7 сек задержка

                        const fnProd = async()=> {
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
                        }
                        const fnDev = async()=> {
                            console.log({
                                username: user.username,
                                id: user.id.valueOf(),
                            });

                            if(index === users.length - 1) {
                                console.log(`✅ добавлено ${this.counter} новых!`);
                                console.log(`⛔ отклонено ${this.failed}!`);
                            }
                        }

                        await new Promise((resolve) => {
                            setTimeout(async () => {
                                this.sucess++;

                                await fnDev();

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



const test = () => {
    // @stalk9424 @kristinassergeevna testerBot2, tests1s, stalkerappro
    (async () => {
        await db.set('invite', {});

        const test = await new Inviter('tests1s').login();
        //console.log(await test.getGroup('testerBot2'))
        await test.runOne('stalkerappro', 700);
        //await test.inviteLink('@kristinassergeevna')
    })()
}
test()