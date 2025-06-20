const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.goto('https://www.linkedin.com/jobs/search/?keywords=software%20development%20intern&f_E=1&f_JT=I', { waitUntil: 'networkidle2', timeout: 30000 });
    const title = await page.title();
    console.log('LinkedIn Jobs Page title:', title);
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('LinkedIn Puppeteer test failed:', err);
    process.exit(1);
  }
})(); 