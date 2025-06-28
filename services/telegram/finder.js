const puppeteer = require("puppeteer");

async function scrapeTGStatCatalog() {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124");
    await page.goto("https://tgstat.ru", { waitUntil: "networkidle2" });

    

    await browser.close();
}

(async () => {
    await scrapeTGStatCatalog();
})();