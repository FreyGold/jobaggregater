const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();
    
    page.on('response', async response => {
        const url = response.url();
        if (url.includes('search') || url.includes('jsonrpc') || url.includes('algolia') || url.includes('meili')) {
            console.log('Intercepted:', url);
        }
    });

    await page.goto('https://remotive.com/remote-jobs', {waitUntil: 'networkidle2'});
    await browser.close();
})();
