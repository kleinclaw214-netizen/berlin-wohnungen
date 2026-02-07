const puppeteer = require('puppeteer');

async function getFirstCardText(page) {
    return page.evaluate(() => {
        const firstCard = document.querySelector('[aria-label*="Wohnungsangebot"]');
        if (!firstCard) return null;
        
        const label = firstCard.getAttribute('aria-label');
        if (!label) return null;
        
        // Return first 50 chars of label as fingerprint
        return label.substring(0, 100);
    });
}

async function waitForCardChange(page, previousText, { timeout = 15000 } = {}) {
    return page.waitForFunction(
        (expectedPrevious) => {
            const firstCard = document.querySelector('[aria-label*="Wohnungsangebot"]');
            if (!firstCard) return false;
            
            const currentLabel = firstCard.getAttribute('aria-label') || '';
            const currentText = currentLabel.substring(0, 100);
            
            // Return true when we have a card and it's different from previous
            return currentText && currentText !== expectedPrevious;
        },
        { timeout, polling: 500 },
        previousText
    ).catch(() => {
        console.log('Timeout waiting for card change, assuming page loaded');
        return false;
    });
}

async function clickNextButton(page) {
    return page.evaluate(() => {
        const candidates = Array.from(document.querySelectorAll('button, a')).filter(el => {
            const text = (el.textContent || '').toLowerCase().trim();
            const aria = (el.getAttribute('aria-label') || '').toLowerCase();
            return (
                text.includes('weiter') ||
                text.includes('next') ||
                text === '>' ||
                text.includes('>') ||
                aria.includes('weiter') ||
                aria.includes('next')
            );
        });
        
        const nextButton = candidates.find(el => !el.disabled && el.getAttribute('aria-disabled') !== 'true');
        if (!nextButton) return false;
        
        nextButton.scrollIntoView({ block: 'center' });
        nextButton.click();
        return true;
    });
}

async function paginateSimple(page, { maxPages = 10 } = {}) {
    let pageNum = 0;
    let allApartments = [];
    
    while (pageNum < maxPages) {
        // Get current apartments before clicking
        const apartmentsBefore = await extractApartments(page);
        console.log(`Page ${pageNum + 1}: Found ${apartmentsBefore.length} apartments`);
        
        // Store for later
        allApartments.push(...apartmentsBefore);
        
        // Check if we can go to next page
        const previousText = await getFirstCardText(page);
        if (!previousText) {
            console.log('No first card found, stopping pagination');
            break;
        }
        
        const clicked = await clickNextButton(page);
        if (!clicked) {
            console.log('No next button found, stopping pagination');
            break;
        }
        
        console.log(`Clicked next button, waiting for page ${pageNum + 2}...`);
        
        // Wait for card to change (new page loaded)
        try {
            await waitForCardChange(page, previousText, { timeout: 10000 });
            console.log(`Page ${pageNum + 2} loaded successfully`);
        } catch (error) {
            console.log(`Page ${pageNum + 2} may not have loaded: ${error.message}`);
            // Continue anyway, maybe we're at the end
        }
        
        // Small delay to be polite
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        pageNum++;
    }
    
    return { pagesNavigated: pageNum, apartments: allApartments };
}

async function extractApartments(page) {
    return page.evaluate(() => {
        const items = [];
        const elements = document.querySelectorAll('[aria-label*="Wohnungsangebot"]');
        
        elements.forEach((el, index) => {
            try {
                const label = el.getAttribute('aria-label');
                if (!label) return;
                
                const content = label.replace('Wohnungsangebot - ', '');
                const parts = content.split('|').map(p => p.trim());
                if (parts.length !== 2) return;
                
                const [specs, addressPart] = parts;
                
                const roomsMatch = specs.match(/(\d+[\.,]\d+)\s*Zimmer/);
                const sizeMatch = specs.match(/(\d+[\.,]\d+)\s*m²/);
                const priceMatch = specs.match(/(\d+[\.,]\d+)\s*€/);
                
                let parent = el.closest('div, article, section, li');
                if (!parent) parent = el.parentElement;
                
                const hasWbs = parent.querySelector('[class*="wbs"], [class*="WBS"], [aria-label*="WBS"]') !== null;
                
                const parentText = parent.textContent.toLowerCase();
                const available = !parentText.includes('vergeben') && !parentText.includes('reserviert');
                
                const linkEl = parent.querySelector('a[href]');
                const url = linkEl ? linkEl.href : null;
                
                let id = null;
                if (url) {
                    const idMatch = url.match(/\/(\d+)(?:\.html|\/|$)/);
                    if (idMatch) id = idMatch[1];
                }
                
                const addressParts = addressPart.split(',').map(p => p.trim());
                const street = addressParts[0] || '';
                const districtInfo = addressParts.length > 1 ? addressParts[1] : '';
                
                let zip = '';
                const zipMatch = districtInfo.match(/\b(\d{5})\b/);
                if (zipMatch) zip = zipMatch[1];
                
                const district = districtInfo.replace(/\b\d{5}\b/, '').trim();
                
                items.push({
                    id: id || `inberlin-${index}`,
                    source: 'inberlinwohnen.de',
                    title: `Wohnung in ${district}`,
                    roomsRaw: roomsMatch ? roomsMatch[1] : null,
                    sizeRaw: sizeMatch ? sizeMatch[1] : null,
                    priceRaw: priceMatch ? priceMatch[1] : null,
                    address: street,
                    district: district,
                    zip: zip,
                    wbs: hasWbs,
                    available: available,
                    link: url,
                    rawLabel: label,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                // Silently skip
            }
        });
        
        return items;
    });
}

async function scrapeInberlinwohnenSimple() {
    let browser;
    try {
        console.log('Launching browser with simplified pagination...');
        browser = await puppeteer.launch({
            headless: 'new',
            executablePath: '/usr/bin/chromium',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        
        // Set headers to mimic real browser
        await page.setExtraHTTPHeaders({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
            'Referer': 'https://www.google.com/'
        });
        
        console.log('Navigating to inberlinwohnen.de...');
        await page.goto('https://www.inberlinwohnen.de/wohnungsfinder/', { 
            waitUntil: 'networkidle2', 
            timeout: 30000 
        });
        
        // Wait for content to load
        await page.waitForSelector('[aria-label*="Wohnungsangebot"]', { timeout: 10000 });
        console.log('Page loaded, starting simplified pagination...');
        
        // Run simplified pagination
        const { pagesNavigated, apartments } = await paginateSimple(page, { maxPages: 15 });
        
        console.log(`Pagination complete: ${pagesNavigated} pages navigated`);
        console.log(`Total apartments collected: ${apartments.length}`);
        
        // Remove duplicates by link
        const uniqueMap = new Map();
        apartments.forEach(apt => {
            if (apt.link) {
                uniqueMap.set(apt.link, apt);
            } else {
                uniqueMap.set(apt.rawLabel, apt);
            }
        });
        
        const uniqueApartments = Array.from(uniqueMap.values());
        console.log(`Unique apartments: ${uniqueApartments.length}`);
        
        // Process numbers
        const processedApartments = uniqueApartments.map(apt => {
            const processNumber = (str) => {
                if (!str) return null;
                const cleaned = str.replace(/\./g, '').replace(',', '.');
                const num = parseFloat(cleaned);
                return isNaN(num) ? null : num;
            };
            
            return {
                ...apt,
                rooms: processNumber(apt.roomsRaw),
                size: processNumber(apt.sizeRaw),
                price: processNumber(apt.priceRaw)
            };
        });
        
        // Save results
        const fs = require('fs');
        const output = {
            timestamp: new Date().toISOString(),
            source: 'inberlinwohnen.de',
            totalCollected: apartments.length,
            unique: processedApartments.length,
            pagesNavigated: pagesNavigated,
            apartments: processedApartments
        };
        
        fs.writeFileSync('simple-pagination-results.json', JSON.stringify(output, null, 2));
        console.log('Results saved to simple-pagination-results.json');
        
        return processedApartments;
        
    } catch (error) {
        console.error('Error during simplified scraping:', error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
            console.log('Browser closed.');
        }
    }
}

// Run if called directly
if (require.main === module) {
    scrapeInberlinwohnenSimple()
        .then(apartments => {
            console.log(`\n✅ SUCCESS!`);
            console.log(`Total unique apartments: ${apartments.length}`);
            console.log(`Pages navigated: ${require('./simple-pagination-results.json').pagesNavigated}`);
            console.log(`Results saved to simple-pagination-results.json`);
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ FAILED:', error.message);
            console.error('Full error:', error);
            process.exit(1);
        });
}

module.exports = { scrapeInberlinwohnenSimple, paginateSimple };