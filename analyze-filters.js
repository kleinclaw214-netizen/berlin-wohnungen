const fs = require('fs');

const resultsFile = '/home/node/.openclaw/wohnungen-results-v2.json';
const criteriaFile = '/home/node/openclaw/filter-criteria.json';

const data = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
const criteria = JSON.parse(fs.readFileSync(criteriaFile, 'utf8'));

const apartments = data.apartments || [];

function safeNum(v) {
  if (v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function matchesCriteria(apartment, criteria) {
  const price = safeNum(apartment.price);
  const size = safeNum(apartment.size);
  const rooms = safeNum(apartment.rooms);

  if (criteria.maxPrice != null && price != null && price > criteria.maxPrice) return false;
  if (criteria.minPrice != null && price != null && price < criteria.minPrice) return false;

  if (criteria.minSize != null && size != null && size < criteria.minSize) return false;
  if (criteria.maxSize != null && size != null && size > criteria.maxSize) return false;

  if (criteria.minRooms != null && rooms != null && rooms < criteria.minRooms) return false;
  if (criteria.maxRooms != null && rooms != null && rooms > criteria.maxRooms) return false;

  const district = (apartment.district || '').toLowerCase();

  if (Array.isArray(criteria.excludeDistricts) && criteria.excludeDistricts.length > 0) {
    const excluded = criteria.excludeDistricts.some(d => district.includes(String(d).toLowerCase()));
    if (excluded) return false;
  }

  if (Array.isArray(criteria.includeDistricts) && criteria.includeDistricts.length > 0) {
    const included = criteria.includeDistricts.some(d => district.includes(String(d).toLowerCase()));
    if (!included) return false;
  }

  return true;
}

console.log(`📊 Analysiere ${apartments.length} Wohnungen gegen aktuelle Filter...\n`);

for (const [profileId, profile] of Object.entries(criteria.profiles)) {
  if (!profile.enabled) continue;
  const matches = apartments.filter(a => matchesCriteria(a, profile.criteria || {}));
  console.log(`**${profile.name}** (${profileId})`);
  console.log(`  Treffer: ${matches.length}`);
  console.log(`  Kriterien:`);
  const c = profile.criteria;
  if (c.maxPrice != null) console.log(`    maxPrice: ${c.maxPrice}`);
  if (c.minPrice != null) console.log(`    minPrice: ${c.minPrice}`);
  if (c.minSize != null) console.log(`    minSize: ${c.minSize}`);
  if (c.maxSize != null) console.log(`    maxSize: ${c.maxSize}`);
  if (c.minRooms != null) console.log(`    minRooms: ${c.minRooms}`);
  if (c.maxRooms != null) console.log(`    maxRooms: ${c.maxRooms}`);
  if (c.excludeDistricts?.length) console.log(`    excludeDistricts: ${c.excludeDistricts.join(', ')}`);
  if (c.includeDistricts?.length) console.log(`    includeDistricts: ${c.includeDistricts.join(', ')}`);
  console.log('');
}

// Zusätzlich: Verteilung von Preis, Zimmer, Bezirk
console.log('--- Verteilung ---');
const priceStats = apartments.map(a => safeNum(a.price)).filter(p => p != null);
const roomStats = apartments.map(a => safeNum(a.rooms)).filter(r => r != null);
const sizeStats = apartments.map(a => safeNum(a.size)).filter(s => s != null);

console.log(`Preise: min ${Math.min(...priceStats)} €, max ${Math.max(...priceStats)} €, avg ${(priceStats.reduce((a,b)=>a+b,0)/priceStats.length).toFixed(0)} €`);
console.log(`Zimmer: min ${Math.min(...roomStats)}, max ${Math.max(...roomStats)}, avg ${(roomStats.reduce((a,b)=>a+b,0)/roomStats.length).toFixed(1)}`);
if (sizeStats.length > 0) {
  console.log(`Größe: min ${Math.min(...sizeStats)} m², max ${Math.max(...sizeStats)} m², avg ${(sizeStats.reduce((a,b)=>a+b,0)/sizeStats.length).toFixed(0)} m²`);
}

// Bezirke
const districtCounts = {};
apartments.forEach(a => {
  const d = a.district || 'Unbekannt';
  districtCounts[d] = (districtCounts[d] || 0) + 1;
});
console.log('\nTop Bezirke:');
Object.entries(districtCounts).sort((a,b)=>b[1]-a[1]).slice(0,10).forEach(([d,c]) => console.log(`  ${d}: ${c}`));