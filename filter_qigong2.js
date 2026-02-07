const fs = require('fs');

const filePath = 'vhs_kurse.json';

try {
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
    
    // Extract details
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
        schlagworte: c.schlagwort,
        veranstaltungsart: c.veranstaltungsart,
        dvv_kategorie: c.dvv_kategorie?.['#text']
    }));
    
    fs.writeFileSync('qigong_courses_details.json', JSON.stringify(details, null, 2));
    console.log('\nDetails saved to qigong_courses_details.json');
    
    // Calculate average price
    const prices = details.filter(d => d.preis).map(d => parseFloat(d.preis));
    const avgPrice = prices.length ? prices.reduce((a,b) => a+b, 0) / prices.length : 0;
    console.log(`Average price: ${avgPrice.toFixed(2)} EUR`);
    
    // Count courses per month (seasonality)
    const monthCount = {};
    details.forEach(d => {
        if (d.beginn) {
            const month = d.beginn.substring(5,7); // YYYY-MM
            monthCount[month] = (monthCount[month] || 0) + 1;
        }
    });
    console.log('\nCourses per start month:');
    Object.keys(monthCount).sort().forEach(m => {
        console.log(`  ${m}: ${monthCount[m]}`);
    });
    
    // Output some examples
    console.log('\nSample courses (first 10):');
    details.slice(0, 10).forEach(d => {
        console.log(`  ${d.nummer}: ${d.name} (${d.bezirk}) - ${d.preis} EUR, ${d.termine} dates`);
    });
    
} catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
}