const fs = require('fs');
const path = require('path');

const RESULTS_FILE = '/home/node/.openclaw/wohnungen-results-v2.json';

function loadResults() {
    try {
        const data = fs.readFileSync(RESULTS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error('Fehler beim Laden der Ergebnisse:', e.message);
        return { apartments: [] };
    }
}

function filterApartments(apartments, criteria) {
    return apartments.filter(apt => {
        // Preis
        if (criteria.minPrice !== undefined && apt.price < criteria.minPrice) return false;
        if (criteria.maxPrice !== undefined && apt.price > criteria.maxPrice) return false;
        // Zimmer
        if (criteria.minRooms !== undefined && apt.rooms < criteria.minRooms) return false;
        if (criteria.maxRooms !== undefined && apt.rooms > criteria.maxRooms) return false;
        // Größe
        if (criteria.minSize !== undefined && apt.size < criteria.minSize) return false;
        if (criteria.maxSize !== undefined && apt.size > criteria.maxSize) return false;
        // Bezirke
        if (criteria.districts) {
            const district = (apt.district || '').toLowerCase();
            const match = criteria.districts.some(d => district.includes(d.toLowerCase()));
            if (!match) return false;
        }
        return true;
    });
}

function main() {
    const results = loadResults();
    const apartments = results.apartments || [];
    console.log(`Gesamt Wohnungen in Ergebnisdatei: ${apartments.length}`);

    // Reham: 2 Zimmer, Preis 400–700€, Bezirke: Marzahn, Köpenick, Lichtenberg, Treptow.
    const rehamCriteria = {
        minRooms: 2,
        maxRooms: 2,
        minPrice: 400,
        maxPrice: 700,
        districts: ['Marzahn', 'Köpenick', 'Lichtenberg', 'Treptow']
    };
    const rehamMatches = filterApartments(apartments, rehamCriteria);
    console.log(`Reham (2 Zi, 400-700€, bestimmte Bezirke): ${rehamMatches.length}`);

    // Budget: Preis < 500€
    const budgetCriteria = {
        maxPrice: 500
    };
    const budgetMatches = filterApartments(apartments, budgetCriteria);
    console.log(`Budget (Preis < 500€): ${budgetMatches.length}`);

    // Familie: 3+ Zimmer, Größe > 70 m² (falls Größe vorhanden)
    const familyCriteria = {
        minRooms: 3,
        minSize: 70
    };
    const familyMatches = filterApartments(apartments, familyCriteria);
    console.log(`Familie (3+ Zi, >70 m²): ${familyMatches.length}`);

    // Optional: Ausgabe der ersten paar Treffer
    if (rehamMatches.length > 0) {
        console.log('\n--- Reham Top 3 ---');
        rehamMatches.slice(0,3).forEach((apt, idx) => {
            console.log(`${idx+1}. ${apt.title} | ${apt.rooms} Zi, ${apt.size} m², ${apt.price} € | ${apt.district}`);
        });
    }
    if (budgetMatches.length > 0) {
        console.log('\n--- Budget Top 3 ---');
        budgetMatches.slice(0,3).forEach((apt, idx) => {
            console.log(`${idx+1}. ${apt.title} | ${apt.rooms} Zi, ${apt.size} m², ${apt.price} € | ${apt.district}`);
        });
    }
    if (familyMatches.length > 0) {
        console.log('\n--- Familie Top 3 ---');
        familyMatches.slice(0,3).forEach((apt, idx) => {
            console.log(`${idx+1}. ${apt.title} | ${apt.rooms} Zi, ${apt.size} m², ${apt.price} € | ${apt.district}`);
        });
    }
}

if (require.main === module) {
    main();
}