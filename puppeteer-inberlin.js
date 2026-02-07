// Puppeteer scraper for inberlinwohnen.de
// Requires: puppeteer and system libraries (libnss3, libatk1.0-0, etc.)

const puppeteer = require('puppeteer');

async function scrapeInberlinwohnen() {
    let browser;
    try {
        console.log('Launching browser...');
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
        console.log('Page loaded, extracting apartments...');
        
        // Get all apartment elements
        const apartments = await page.evaluate(() => {
            const items = [];
            const elements = document.querySelectorAll('[aria-label*="Wohnungsangebot"]');
            
            elements.forEach((el, index) => {
                try {
                    const label = el.getAttribute('aria-label');
                    if (!label) return;
                    
                    // Parse the aria-label
                    // Format: "Wohnungsangebot - 2,0 Zimmer, 54,00 m², 675,00 € Kaltmiete | Flämingstraße 70, 12689 Marzahn-Hellersdorf"
                    const content = label.replace('Wohnungsangebot - ', '');
                    const parts = content.split('|').map(p => p.trim());
                    if (parts.length !== 2) return;
                    
                    const [specs, addressPart] = parts;
                    
                    // Extract values (raw strings with commas)
                    const roomsMatch = specs.match(/(\d+[\.,]\d+)\s*Zimmer/);
                    const sizeMatch = specs.match(/(\d+[\.,]\d+)\s*m²/);
                    const priceMatch = specs.match(/(\d+[\.,]\d+)\s*€/);
                    
                    // Get parent element for additional info
                    let parent = el.closest('div, article, section, li');
                    if (!parent) parent = el.parentElement;
                    
                    // Check for WBS
                    const hasWbs = parent.querySelector('[class*="wbs"], [class*="WBS"], [aria-label*="WBS"]') !== null;
                    
                    // Check availability
                    const parentText = parent.textContent.toLowerCase();
                    const available = !parentText.includes('vergeben') && !parentText.includes('reserviert');
                    
                    // Find link
                    const linkEl = parent.querySelector('a[href]');
                    const url = linkEl ? linkEl.href : null;
                    
                    // Extract ID from URL
                    let id = null;
                    if (url) {
                        const idMatch = url.match(/\/(\d+)(?:\.html|\/|$)/);
                        if (idMatch) id = idMatch[1];
                    }
                    
                    // Parse address
                    const addressParts = addressPart.split(',').map(p => p.trim());
                    const street = addressParts[0] || '';
                    const districtInfo = addressParts.length > 1 ? addressParts[1] : '';
                    
                    // Extract zip code (first 5 digits)
                    let zip = '';
                    const zipMatch = districtInfo.match(/\b(\d{5})\b/);
                    if (zipMatch) zip = zipMatch[1];
                    
                    // Extract district (remove zip)
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
                    console.error('Error parsing element:', error);
                }
            });
            
            return items;
        });
        
        console.log(`Found ${apartments.length} apartments on first page`);
        
        // Try to find pagination and click through pages
        let totalApartments = [...apartments];
        let pageNum = 1;
        const maxPages = 20; // Safety limit
        
        while (pageNum < maxPages) {
            // Look for next page button
            const hasNextPage = await page.evaluate(() => {
                const nextButtons = Array.from(document.querySelectorAll('button, a')).filter(el => {
                    const text = el.textContent.toLowerCase();
                    return text.includes('weiter') || text.includes('next') || text.includes('>');
                });
                return nextButtons.length > 0;
            });
            
            if (!hasNextPage) {
                console.log('No more pages found.');
                break;
            }
            
            // Try to click next page
            try {
                // Find and click next button using JavaScript
                const clicked = await page.evaluate(() => {
                    const buttons = Array.from(document.querySelectorAll('button, a'));
                    const nextButton = buttons.find(el => {
                        const text = el.textContent.toLowerCase().trim();
                        return text.includes('weiter') || text.includes('next') || text === '>' || text.includes('>');
                    });
                    
                    if (nextButton) {
                        nextButton.click();
                        return true;
                    }
                    return false;
                });
                
                if (!clicked) {
                    console.log('Could not find next button');
                    break;
                }
                
                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
                await page.waitForSelector('[aria-label*="Wohnungsangebot"]', { timeout: 10000 });
                
                // Extract apartments from new page
                const newApartments = await page.evaluate(() => {
                    const items = [];
                    const elements = document.querySelectorAll('[aria-label*="Wohnungsangebot"]');
                    
                    elements.forEach((el, index) => {
                        const label = el.getAttribute('aria-label');
                        if (!label) return;
                        
                        // Similar parsing as above (simplified)
                        const content = label.replace('Wohnungsangebot - ', '');
                        const parts = content.split('|').map(p => p.trim());
                        if (parts.length !== 2) return;
                        
                        const [specs, addressPart] = parts;
                        
                        const roomsMatch = specs.match(/(\d+[\.,]\d+)\s*Zimmer/);
                        const sizeMatch = specs.match(/(\d+[\.,]\d+)\s*m²/);
                        const priceMatch = specs.match(/(\d+[\.,]\d+)\s*€/);
                        
                        const parent = el.closest('div, article, section, li') || el.parentElement;
                        const linkEl = parent.querySelector('a[href]');
                        const url = linkEl ? linkEl.href : null;
                        
                        const addressParts = addressPart.split(',').map(p => p.trim());
                        const street = addressParts[0] || '';
                        const districtInfo = addressParts.length > 1 ? addressParts[1] : '';
                        
                        let zip = '';
                        const zipMatch = districtInfo.match(/\b(\d{5})\b/);
                        if (zipMatch) zip = zipMatch[1];
                        
                        const district = districtInfo.replace(/\b\d{5}\b/, '').trim();
                        
                        items.push({
                            source: 'inberlinwohnen.de',
                            roomsRaw: roomsMatch ? roomsMatch[1] : null,
                            sizeRaw: sizeMatch ? sizeMatch[1] : null,
                            priceRaw: priceMatch ? priceMatch[1] : null,
                            address: street,
                            district: district,
                            zip: zip,
                            link: url,
                            rawLabel: label
                        });
                    });
                    
                    return items;
                });
                
                console.log(`Page ${pageNum + 1}: Found ${newApartments.length} apartments`);
                totalApartments.push(...newApartments);
                pageNum++;
                
                // Small delay to be polite
                await new Promise(resolve => setTimeout(resolve, 2000));
                
            } catch (error) {
                console.log(`Error navigating to page ${pageNum + 1}:`, error.message);
                break;
            }
        }
        
        console.log(`Total apartments found: ${totalApartments.length}`);
        
        // Process raw values to numbers
        const processedApartments = totalApartments.map(apt => {
            const processNumber = (str) => {
                if (!str) return null;
                // Replace comma with dot, remove thousands separators
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
        
        // Remove duplicates by link
        const uniqueMap = new Map();
        processedApartments.forEach(apt => {
            if (apt.link) {
                uniqueMap.set(apt.link, apt);
            } else {
                uniqueMap.set(apt.rawLabel, apt);
            }
        });
        
        const uniqueApartments = Array.from(uniqueMap.values());
        console.log(`Unique apartments: ${uniqueApartments.length}`);
        
        // Save to file
        const fs = require('fs');
        const output = {
            timestamp: new Date().toISOString(),
            source: 'inberlinwohnen.de',
            totalFound: totalApartments.length,
            unique: uniqueApartments.length,
            apartments: uniqueApartments
        };
        
        fs.writeFileSync('inberlinwohnen-results.json', JSON.stringify(output, null, 2));
        console.log('Results saved to inberlinwohnen-results.json');
        
        return uniqueApartments;
        
    } catch (error) {
        console.error('Error scraping inberlinwohnen.de:', error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
            console.log('Browser closed.');
        }
    }
}

// If run directly
if (require.main === module) {
    scrapeInberlinwohnen()
        .then(apartments => {
            console.log(`Successfully scraped ${apartments.length} apartments.`);
            process.exit(0);
        })
        .catch(error => {
            console.error('Scraping failed:', error);
            process.exit(1);
        });
}

module.exports = scrapeInberlinwohnen;