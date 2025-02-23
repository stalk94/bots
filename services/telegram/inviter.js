require('dotenv').config();
const { TelegramClient, Api } = require("telegram");
const BaseBot = require("./base");
const { db } = require('../../server/db');
const { sleep } = require("telegram/Helpers");


function splitArrayIntoChunks(users, n=3) {
    const result = [];
    const chunkSize = Math.ceil(users.length / n);

    for (let i = 0; i < users.length; i += chunkSize) {
        result.push(users.slice(i, i + chunkSize));
    }

    return result;
}


class Inviter extends BaseBot {
    sucess = 0
    faileds = 0
    textInviteLink = `Присоединяйся к MMORPG Last-Exit – миру Чернобыльской зоны отчуждения! 
        🔥 Игра уже прошла бета тестирование, и нуждается в активных игроках, тестерах, первопроходцах.
        🎁 Бонус для самых активных! Разыгрываем лидерство группировок среди самых активных игроков.
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
     * @param {any} custom 
     */
    async #analitic(user, groupName, custom) {
        const timeshtamp = Date.now();

        //todo: абстрагировать !
        await db.push(`invite.${this.phoneNumber}`, {
            timeshtamp,
            phone: user?.phone ?? undefined,
            username: user.username,
            id: user.id.valueOf(),
            fromGroupName: groupName,
            ...custom
        });
    }
    /**
     * 
     * @param {Array<Api.User>} users 
     * @param {string} groupName 
     */
    async #process(users, groupName) {
        const chanks = splitArrayIntoChunks(users);
        const story = await db.get(`invite.${this.phoneNumber}`) ?? [];

        for (let [indexChank, usersChank] of chanks.entries()) {
            const delay = Math.floor(Math.random() * (480000 - 300000 + 1)) + 300000;

            await new Promise((resolve)=> {
                setTimeout(async ()=> {
                    for (let [index, user] of usersChank.entries()) {
                        if(user?.className === 'User' && !story.some(elem => elem.id === user.id.valueOf())) {
                            const delay = Math.floor(Math.random() * 1000) + 4000;      // 1-7 сек задержка

                            await new Promise((resolve) => {
                                setTimeout(async ()=> {
                                    const result = await this.invite(this.inviteGroup, user);

                                    if (result === true) {
                                        this.sucess++;
                                        this.#analitic(user, groupName, {type:'add'});
                                        console.log(`+ добавлен ${user?.username}`);
                                        resolve();
                                    }
                                    else if(result === undefined) {
                                        const resultInvite = await this.inviteLink(user);

                                        if (resultInvite === true) {
                                            this.faileds++;
                                            this.#analitic(user, groupName, {type:'invite'});
                                            console.log(`+ пришлашен ${user?.username}`);
                                            resolve();
                                        }
                                        else if(resultInvite.waitTime) {
                                            sleep(resultInvite.waitTime);
                                            resolve();
                                        }
                                        else resolve();
                                    }
                                    else if(result.waitTime) {
                                        sleep(result.waitTime);
                                        resolve();
                                    }
                                    else resolve();


                                    if (index === usersChank.length - 1) {
                                        console.log(`✅ добавлено ${this.counter} новых!`);
                                        console.log(`⛔ отклонено ${this.failed}!`);
                                    }
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
    
    async runOne(groupNameCustom, limit = 1000) {
        const groupToInvite = await this.getGroup(groupNameCustom);

        if(groupToInvite) {
            const users = await this.getAllUsersFromGroup(groupNameCustom, limit);
            console.log('Итого: ', users.length);

            this.#process(users, groupNameCustom);
        }
    }
    async run(limit = 1000) {
        const groupToInvite = await this.getGroup(this.inviteGroup);

        if (groupToInvite) {
            const allgroups = await this.getGroupsFromUserAllDialogs();

            for (let group of allgroups) {
                await this.runOne(group.groupName, limit);
                console.log('Группа: ', group.groupName, 'Итого: ', users.length);
            }
        }
        else console.error('❗❌ Целевая группа не найдена!')
    }
}



const test = () => {
    // @stalk9424 @kristinassergeevna testerBot2, tests1s, stalkerappro
    (async () => {
        //await db.set('invite', {});

        const test = await new Inviter('last_exit_game').login();
        //console.log(await test.getGroup('testerBot2'))
        await test.runOne('stalkerappro', 700);
        //await test.inviteLink('@kristinassergeevna')
    })()
}
test()