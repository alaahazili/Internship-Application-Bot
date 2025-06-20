const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.goto('https://example.com');
    const title = await page.title();
    console.log('Page title:', title);
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Puppeteer test failed:', err);
    process.exit(1);
  }
})(); 