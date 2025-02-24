const puppeteer = require('puppeteer');


const URL = 'https://spys.one/en/socks-proxy-list/';


exports.parseProxies = async ()=> {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    await page.goto(URL, { waitUntil: 'networkidle2' });

    const proxies = await page.evaluate(()=> {
        const rows = document.querySelectorAll('tr.spy1xx, tr.spy1x');
        const result = [];

        rows.forEach(row => {
            const columns = row.querySelectorAll('td');

            if (columns.length > 0) {
                const ipPort = columns[0].innerText.trim();
                const type = columns[1].innerText.trim();
                const country = columns[3].innerText.trim();

                if (ipPort && type.includes('SOCKS')) {
                    const [ip, port] = ipPort.split(':');
                    result.push({ ip, port: +port, type, country });
                }
            }
        });

        return result;
    });

    await browser.close();
    return proxies;
}