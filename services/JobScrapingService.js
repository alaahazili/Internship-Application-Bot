const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const Internship = require('../models/Internship');
const User = require('../models/User');

class JobScrapingService {
    constructor() {
        this.browser = null;
        this.isScraping = false;
        this.scrapingStats = {
            totalScraped: 0,
            newInternships: 0,
            errors: 0,
            lastScraped: null
        };
    }

    // Initialize browser
    async initBrowser() {
        if (!this.browser) {
            this.browser = await puppeteer.launch({
                headless: true,
                executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process',
                    '--disable-gpu'
                ]
            });
        }
        return this.browser;
    }

    // Close browser
    async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    // Scrape all sources
    async scrapeAllSources() {
        if (this.isScraping) {
            console.log('⚠️ Scraping already in progress');
            return;
        }

        this.isScraping = true;
        console.log('🚀 Starting job scraping...');

        try {
            await this.initBrowser();

            const results = await Promise.allSettled([
                this.scrapeLinkedIn(),
                this.scrapeIndeed(),
                this.scrapeGlassdoor(),
                this.scrapeInternshipsCom(),
                this.scrapeAngelList()
            ]);

            // Process results
            let totalNew = 0;
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    totalNew += result.value;
                    console.log(`✅ Source ${index + 1}: ${result.value} new internships`);
                } else {
                    console.error(`❌ Source ${index + 1} failed:`, result.reason);
                    this.scrapingStats.errors++;
                }
            });

            this.scrapingStats.totalScraped += totalNew;
            this.scrapingStats.newInternships = totalNew;
            this.scrapingStats.lastScraped = new Date();

            console.log(`🎉 Scraping completed: ${totalNew} new internships found`);

            // Notify users about new internships
            await this.notifyUsersOfNewInternships(totalNew);

        } catch (error) {
            console.error('❌ Scraping failed:', error);
            this.scrapingStats.errors++;
        } finally {
            this.isScraping = false;
            await this.closeBrowser();
        }
    }

    // Scrape LinkedIn
    async scrapeLinkedIn() {
        console.log('[LinkedIn] Starting LinkedIn scraping...');
        let newInternships = 0;
        const searchTerms = [
            'software development intern',
            'data science intern',
            'marketing intern',
            'design intern',
            'engineering intern'
        ];

        for (const term of searchTerms) {
            let page;
            try {
                page = await this.browser.newPage();
                console.log('[LinkedIn] Setting user agent...');
                await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
                const url = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(term)}&f_E=1&f_JT=I`;
                console.log(`[LinkedIn] Navigating to: ${url}`);
                await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
                console.log('[LinkedIn] Waiting for job listings to load...');
                await page.waitForSelector('.job-card-container', { timeout: 20000 });
                console.log('[LinkedIn] Job listings loaded. Extracting job data...');
                const jobs = await page.evaluate(() => {
                    return Array.from(document.querySelectorAll('.job-card-container')).map(card => ({
                        title: card.querySelector('.job-card-list__title, .job-card-container__link')?.textContent.trim(),
                        company: card.querySelector('.artdeco-entity-lockup__subtitle')?.textContent.trim(),
                        location: card.querySelector('.job-card-container__metadata-wrapper li')?.textContent.trim(),
                        url: card.querySelector('a.job-card-container__link')?.href,
                        logo: card.querySelector('img.ivm-view-attr__img--centered')?.src,
                        jobId: card.getAttribute('data-job-id')
                    })).filter(job => job.title && job.company);
                });
                console.log(`[LinkedIn] Found ${jobs.length} jobs for term: ${term}`);
                for (const job of jobs) {
                    console.log(`[LinkedIn] Processing job: ${job.title} at ${job.company}`);
                    let contactInfo = {};
                    if (job.url) {
                        try {
                            console.log(`[LinkedIn] Extracting contact info from: ${job.url}`);
                            contactInfo = await this.extractContactInfo(page, job.url);
                        } catch (error) {
                            console.log('[LinkedIn] Could not extract contact info for:', job.url, error);
                        }
                    }
                    const saved = await this.saveInternship({
                        title: job.title,
                        company: { name: job.company },
                        location: this.parseLocation(job.location),
                        workType: this.determineWorkType(job.location),
                        duration: '3-6 months',
                        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                        compensation: { type: 'paid' },
                        description: `Internship opportunity at ${job.company}`,
                        contact: contactInfo,
                        source: {
                            platform: 'linkedin',
                            originalUrl: job.url
                        },
                        categories: this.categorizeInternship(job.title),
                        logo: job.logo,
                        jobId: job.jobId
                    });
                    if (saved) {
                        newInternships++;
                        console.log(`[LinkedIn] Saved new internship: ${job.title} at ${job.company}`);
                    }
                }
            } catch (error) {
                console.error('[LinkedIn] Error for term:', term, error);
            }
            if (page) {
                await page.close();
                console.log('[LinkedIn] Closed page for term:', term);
            }
            console.log('[LinkedIn] Waiting 2 seconds before next search term...');
            await new Promise(res => setTimeout(res, 2000));
        }
        return newInternships;
    }

    // Scrape Indeed
    async scrapeIndeed() {
        const page = await this.browser.newPage();
        let newInternships = 0;

        try {
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

            const searchTerms = [
                'internship software development',
                'internship data science',
                'internship marketing',
                'internship design'
            ];

            for (const term of searchTerms) {
                await page.goto(`https://www.indeed.com/jobs?q=${encodeURIComponent(term)}&jt=internship`, {
                    waitUntil: 'networkidle2',
                    timeout: 30000
                });

                // Wait for job cards
                await page.waitForSelector('[data-testid="jobsearch-ResultsList"]', { timeout: 10000 });

                const jobs = await page.evaluate(() => {
                    const jobCards = document.querySelectorAll('[data-testid="jobsearch-ResultsList"] > div');
                    return Array.from(jobCards, card => {
                        const title = card.querySelector('h2')?.textContent?.trim();
                        const company = card.querySelector('[data-testid="company-name"]')?.textContent?.trim();
                        const location = card.querySelector('[data-testid="job-location"]')?.textContent?.trim();
                        const salary = card.querySelector('[data-testid="attribute_snippet_compensation"]')?.textContent?.trim();
                        const url = card.querySelector('a[data-jk]')?.href;

                        return { title, company, location, salary, url };
                    }).filter(job => job.title && job.company);
                });

                for (const job of jobs) {
                    // Extract contact information from job detail page
                    let contactInfo = {};
                    if (job.url) {
                        try {
                            contactInfo = await this.extractContactInfo(page, job.url);
                        } catch (error) {
                            console.log('Could not extract contact info for:', job.url);
                        }
                    }

                    const saved = await this.saveInternship({
                        title: job.title,
                        company: { name: job.company },
                        location: this.parseLocation(job.location),
                        workType: this.determineWorkType(job.location),
                        duration: '3-6 months',
                        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                        compensation: {
                            type: job.salary ? 'paid' : 'unpaid',
                            description: job.salary
                        },
                        description: `Internship opportunity at ${job.company}`,
                        contact: contactInfo,
                        source: { 
                            platform: 'indeed',
                            originalUrl: job.url
                        },
                        categories: this.categorizeInternship(job.title)
                    });

                    if (saved) newInternships++;
                }

                await page.waitForTimeout(2000);
            }

        } catch (error) {
            console.error('Indeed scraping error:', error);
        } finally {
            await page.close();
        }

        return newInternships;
    }

    // Scrape Glassdoor
    async scrapeGlassdoor() {
        const page = await this.browser.newPage();
        let newInternships = 0;

        try {
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

            const searchTerms = [
                'internship software',
                'internship data',
                'internship marketing'
            ];

            for (const term of searchTerms) {
                await page.goto(`https://www.glassdoor.com/Job/internship-${encodeURIComponent(term)}-jobs-SRCH_KO0,9_${encodeURIComponent(term)}.htm`, {
                    waitUntil: 'networkidle2',
                    timeout: 30000
                });

                await page.waitForSelector('.react-job-listing', { timeout: 10000 });

                const jobs = await page.evaluate(() => {
                    const jobCards = document.querySelectorAll('.react-job-listing');
                    return Array.from(jobCards, card => {
                        const title = card.querySelector('.jobLink')?.textContent?.trim();
                        const company = card.querySelector('.employerName')?.textContent?.trim();
                        const location = card.querySelector('.location')?.textContent?.trim();
                        const salary = card.querySelector('.salary-estimate')?.textContent?.trim();
                        const url = card.querySelector('.jobLink')?.href;

                        return { title, company, location, salary, url };
                    }).filter(job => job.title && job.company);
                });

                for (const job of jobs) {
                    // Extract contact information from job detail page
                    let contactInfo = {};
                    if (job.url) {
                        try {
                            contactInfo = await this.extractContactInfo(page, job.url);
                        } catch (error) {
                            console.log('Could not extract contact info for:', job.url);
                        }
                    }

                    const saved = await this.saveInternship({
                        title: job.title,
                        company: { name: job.company },
                        location: this.parseLocation(job.location),
                        workType: this.determineWorkType(job.location),
                        duration: '3-6 months',
                        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                        compensation: {
                            type: job.salary ? 'paid' : 'unpaid',
                            description: job.salary
                        },
                        description: `Internship opportunity at ${job.company}`,
                        contact: contactInfo,
                        source: { 
                            platform: 'glassdoor',
                            originalUrl: job.url
                        },
                        categories: this.categorizeInternship(job.title)
                    });

                    if (saved) newInternships++;
                }

                await page.waitForTimeout(2000);
            }

        } catch (error) {
            console.error('Glassdoor scraping error:', error);
        } finally {
            await page.close();
        }

        return newInternships;
    }

    // Scrape Internships.com
    async scrapeInternshipsCom() {
        try {
            const response = await axios.get('https://www.internships.com/api/v1/internships', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 10000
            });

            let newInternships = 0;
            const internships = response.data.internships || [];

            for (const internship of internships) {
                const saved = await this.saveInternship({
                    title: internship.title,
                    company: { name: internship.company },
                    location: this.parseLocation(internship.location),
                    workType: this.determineWorkType(internship.location),
                    duration: internship.duration || '3-6 months',
                    startDate: new Date(internship.startDate || Date.now() + 30 * 24 * 60 * 60 * 1000),
                    compensation: {
                        type: internship.paid ? 'paid' : 'unpaid',
                        amount: internship.salary,
                        description: internship.compensation
                    },
                    description: internship.description,
                    source: { platform: 'internships.com' },
                    categories: this.categorizeInternship(internship.title)
                });

                if (saved) newInternships++;
            }

            return newInternships;

        } catch (error) {
            console.error('Internships.com scraping error:', error);
            return 0;
        }
    }

    // Scrape AngelList
    async scrapeAngelList() {
        const page = await this.browser.newPage();
        let newInternships = 0;

        try {
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

            await page.goto('https://angel.co/jobs?role_types[]=intern', {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            await page.waitForSelector('.job_listing', { timeout: 10000 });

            const jobs = await page.evaluate(() => {
                const jobCards = document.querySelectorAll('.job_listing');
                return Array.from(jobCards, card => {
                    const title = card.querySelector('.job-title')?.textContent?.trim();
                    const company = card.querySelector('.company-name')?.textContent?.trim();
                    const location = card.querySelector('.job-location')?.textContent?.trim();
                    const url = card.querySelector('a')?.href;

                    return { title, company, location, url };
                }).filter(job => job.title && job.company);
            });

            for (const job of jobs) {
                // Extract contact information from job detail page
                let contactInfo = {};
                if (job.url) {
                    try {
                        contactInfo = await this.extractContactInfo(page, job.url);
                    } catch (error) {
                        console.log('Could not extract contact info for:', job.url);
                    }
                }

                const saved = await this.saveInternship({
                    title: job.title,
                    company: { name: job.company },
                    location: this.parseLocation(job.location),
                    workType: this.determineWorkType(job.location),
                    duration: '3-6 months',
                    startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    compensation: { type: 'paid' },
                    description: `Startup internship opportunity at ${job.company}`,
                    contact: contactInfo,
                    source: { 
                        platform: 'angel.co',
                        originalUrl: job.url
                    },
                    categories: ['startup', ...this.categorizeInternship(job.title)]
                });

                if (saved) newInternships++;
            }

        } catch (error) {
            console.error('AngelList scraping error:', error);
        } finally {
            await page.close();
        }

        return newInternships;
    }

    // Save internship to database
    async saveInternship(internshipData) {
        try {
            // Check if internship already exists
            const existing = await Internship.findOne({
                title: internshipData.title,
                'company.name': internshipData.company.name,
                'source.platform': internshipData.source.platform
            });

            if (existing) {
                return false; // Already exists
            }

            // Create new internship
            const internship = new Internship(internshipData);
            await internship.save();

            return true;

        } catch (error) {
            console.error('Error saving internship:', error);
            return false;
        }
    }

    // Parse location string
    parseLocation(locationStr) {
        if (!locationStr) return {};

        const parts = locationStr.split(',').map(part => part.trim());
        
        if (parts.length >= 3) {
            return {
                city: parts[0],
                state: parts[1],
                country: parts[2]
            };
        } else if (parts.length === 2) {
            return {
                city: parts[0],
                state: parts[1]
            };
        } else {
            return {
                city: parts[0]
            };
        }
    }

    // Determine work type from location
    determineWorkType(locationStr) {
        if (!locationStr) return 'remote';
        
        const lowerLocation = locationStr.toLowerCase();
        
        if (lowerLocation.includes('remote') || lowerLocation.includes('virtual')) {
            return 'remote';
        } else if (lowerLocation.includes('hybrid')) {
            return 'hybrid';
        } else {
            return 'onsite';
        }
    }

    // Categorize internship based on title
    categorizeInternship(title) {
        const lowerTitle = title.toLowerCase();
        const categories = [];

        if (lowerTitle.includes('software') || lowerTitle.includes('developer') || lowerTitle.includes('programming')) {
            categories.push('software-development');
        }
        if (lowerTitle.includes('data') || lowerTitle.includes('analytics') || lowerTitle.includes('science')) {
            categories.push('data-science');
        }
        if (lowerTitle.includes('marketing') || lowerTitle.includes('social media')) {
            categories.push('marketing');
        }
        if (lowerTitle.includes('design') || lowerTitle.includes('ui') || lowerTitle.includes('ux')) {
            categories.push('design');
        }
        if (lowerTitle.includes('finance') || lowerTitle.includes('accounting')) {
            categories.push('finance');
        }
        if (lowerTitle.includes('engineering') && !lowerTitle.includes('software')) {
            categories.push('engineering');
        }

        return categories.length > 0 ? categories : ['other'];
    }

    // Notify users about new internships
    async notifyUsersOfNewInternships(count) {
        try {
            const users = await User.find({
                'emailSettings.notifications.newJobs': true,
                isActive: true
            });

            const io = global.notificationService?.io;
            if (io) {
                users.forEach(user => {
                    io.to(`user-${user._id}`).emit('new-internships', {
                        count,
                        message: `${count} new internship opportunities found!`
                    });
                });
            }

            console.log(`📧 Notified ${users.length} users about ${count} new internships`);

        } catch (error) {
            console.error('Error notifying users:', error);
        }
    }

    // Get scraping statistics
    getStats() {
        return this.scrapingStats;
    }

    // Manual scraping trigger
    async manualScrape() {
        console.log('🔄 Manual scraping triggered');
        return this.scrapeAllSources();
    }

    // Extract contact information from job posting
    async extractContactInfo(page, jobUrl) {
        try {
            // Navigate to the job detail page
            await page.goto(jobUrl, { waitUntil: 'networkidle2', timeout: 15000 });
            
            // Wait for content to load
            await page.waitForTimeout(2000);
            
            const contactInfo = await page.evaluate(() => {
                const contact = {};
                
                // Try to find contact name
                const nameSelectors = [
                    '.job-details-jobs-unified-top-card__job-insight',
                    '.job-details-jobs-unified-top-card__company-name',
                    '[data-testid="job-details-jobs-unified-top-card__company-name"]',
                    '.job-details-jobs-unified-top-card__job-title'
                ];
                
                for (const selector of nameSelectors) {
                    const element = document.querySelector(selector);
                    if (element && element.textContent.trim()) {
                        contact.name = element.textContent.trim();
                        break;
                    }
                }
                
                // Try to find email addresses
                const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
                const pageText = document.body.textContent;
                const emails = pageText.match(emailRegex);
                if (emails && emails.length > 0) {
                    // Filter out common non-contact emails
                    const filteredEmails = emails.filter(email => 
                        !email.includes('noreply') && 
                        !email.includes('no-reply') && 
                        !email.includes('donotreply') &&
                        !email.includes('example.com') &&
                        !email.includes('test.com')
                    );
                    if (filteredEmails.length > 0) {
                        contact.email = filteredEmails[0];
                    }
                }
                
                // Try to find LinkedIn profiles
                const linkedinRegex = /https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?/g;
                const linkedinMatches = pageText.match(linkedinRegex);
                if (linkedinMatches && linkedinMatches.length > 0) {
                    contact.linkedin = linkedinMatches[0];
                }
                
                // Try to find phone numbers
                const phoneRegex = /(\+?[\d\s\-\(\)]{10,})/g;
                const phoneMatches = pageText.match(phoneRegex);
                if (phoneMatches && phoneMatches.length > 0) {
                    // Filter out common non-contact numbers
                    const filteredPhones = phoneMatches.filter(phone => 
                        phone.replace(/[\s\-\(\)]/g, '').length >= 10 &&
                        !phone.includes('000') &&
                        !phone.includes('999')
                    );
                    if (filteredPhones.length > 0) {
                        contact.phone = filteredPhones[0].trim();
                    }
                }
                
                return contact;
            });
            
            return contactInfo;
            
        } catch (error) {
            console.error('Error extracting contact info:', error);
            return {};
        }
    }
}

module.exports = JobScrapingService; 