const fs = require('fs');
const { convertTime, replaceCircular } = require('../services/function');


process.LOGS = [];
const logStream = fs.createWriteStream('console.log', { flags: 'a' });
globalThis.log = console.log;
globalThis.error = console.error;
globalThis.warn = console.warn;


// лог в файл
console.log =(...messages)=> {
    const time = convertTime(Date.now(), 'TD');
    const formatTime = `${time.date} [${time.time}]`;
    const formattedMessages = messages.map(a => replaceCircular(a));
    let format;
    if(Array.isArray(formattedMessages) && formattedMessages.length === 1) {
        format = `✔️ ${formatTime} : ${JSON.stringify(formattedMessages[0], null, 2)}\n`;
    }
    else format = `✔️ ${formatTime} : ${JSON.stringify(formattedMessages, null, 2)}\n`;

    process.LOGS.push(format);          // в shared log
    logStream.write(format);            // в файл
    globalThis.log(...messages);        // в базовый console.log
    //process.stdout.write(format);
}
console.error =(...messages)=> {
    const time = convertTime(Date.now(), 'TD');
    const formatTime = `${time.date} [${time.time}]`;
    const formattedMessages = messages.map(a => replaceCircular(a));
    let format;
    if(Array.isArray(formattedMessages) && formattedMessages.length === 1) {
        format = `❌ ${formatTime} : ${JSON.stringify(formattedMessages[0], null, 2)}\n`;
    }
    else format = `❌ ${formatTime} : ${JSON.stringify(formattedMessages, null, 2)}\n`;

    process.LOGS.push(format);          // в shared log
    logStream.write(format);            // в файл
    globalThis.error(...messages);        // в базовый console.log
}
console.warn =(...messages)=> {
    const time = convertTime(Date.now(), 'TD');
    const formatTime = `${time.date} [${time.time}]`;
    const formattedMessages = messages.map(a => replaceCircular(a));
    let format;
    if(Array.isArray(formattedMessages) && formattedMessages.length === 1) {
        format = `⚠️ ${formatTime} : ${JSON.stringify(formattedMessages[0], null, 2)}\n`;
    }
    else format = `⚠️ ${formatTime} : ${JSON.stringify(formattedMessages, null, 2)}\n`;

    process.LOGS.push(format);          // в shared log
    logStream.write(format);            // в файл
    globalThis.warn(...messages);        // в базовый console.log
}