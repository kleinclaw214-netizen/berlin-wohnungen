const https = require('https');
const fs = require('fs');

const url = 'https://vhsit.berlin.de/VHSKURSE/OpenData/Kurse.json';
const filePath = 'vhs_kurse.json';

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

async function main() {
    try {
        console.log('Downloading JSON...');
        await downloadFile(url, filePath);
        console.log('Download completed.');
        
        const raw = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(raw);
        const courses = data.veranstaltungen.veranstaltung;
        
        console.log(`Total courses: ${courses.length}`);
        
        // Filter for Qigong related courses
        const qigongCourses = courses.filter(course => {
            const name = course.name?.toLowerCase() || '';
            const schlagwort = course.schlagwort || [];
            const schlagwortStr = Array.isArray(schlagwort) ? schlagwort.join(' ').toLowerCase() : schlagwort.toLowerCase();
            return name.includes('qigong') || name.includes('qi gong') || schlagwortStr.includes('qigong') || schlagwortStr.includes('qi gong');
        });
        
        console.log(`Qigong courses found: ${qigongCourses.length}`);
        
        // Group by district
        const byDistrict = {};
        qigongCourses.forEach(course => {
            const district = course.bezirk || 'Unknown';
            if (!byDistrict[district]) byDistrict[district] = [];
            byDistrict[district].push(course);
        });
        
        console.log('\nDistribution by district:');
        Object.keys(byDistrict).sort().forEach(district => {
            console.log(`  ${district}: ${byDistrict[district].length}`);
        });
        
        // Extract details: price, dates, etc.
        const details = qigongCourses.map(c => ({
            nummer: c.nummer,
            name: c.name,
            bezirk: c.bezirk,
            preis: c.preis?.betrag,
            rabatt: c.preis?.rabatt_moeglich,
            zusatz: c.preis?.zusatz,
            termine: c.ortetermine?.termin?.length || 0,
            min_teilnehmer: c.minimale_teilnehmerzahl,
            max_teilnehmer: c.maximale_teilnehmerzahl,
            aktuelle_teilnehmer: c.aktuelle_teilnehmerzahl,
            beginn: c.beginn_datum,
            ende: c.ende_datum,
            schlagworte: c.schlagwort
        }));
        
        fs.writeFileSync('qigong_courses_details.json', JSON.stringify(details, null, 2));
        console.log('\nDetails saved to qigong_courses_details.json');
        
        // Calculate average price
        const prices = details.filter(d => d.preis).map(d => parseFloat(d.preis));
        const avgPrice = prices.length ? prices.reduce((a,b) => a+b, 0) / prices.length : 0;
        console.log(`Average price: ${avgPrice.toFixed(2)} EUR`);
        
        // Output some examples
        console.log('\nSample courses:');
        details.slice(0, 5).forEach(d => {
            console.log(`  ${d.nummer}: ${d.name} (${d.bezirk}) - ${d.preis} EUR`);
        });
        
    } catch (err) {
        console.error('Error:', err.message);
    }
}

main();