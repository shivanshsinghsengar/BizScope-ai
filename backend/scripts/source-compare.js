// ── Source Comparison Test — Mathura 5km ──
// Shows exactly how many businesses each data source provides
const axios = require('axios');
require('dotenv').config();

const LAT = 27.4924;
const LNG = 77.6737;
const RADIUS = 5000;

const results = {};

// ── 1. OSM Overpass ──────────────────────────────────────────────────────────
async function testOSM() {
  const amenityVals = "restaurant|cafe|fast_food|pharmacy|hospital|clinic|gym|fitness_centre|bakery|laundry|bar|hotel|hostel|school|college|bank|atm|fuel|supermarket|convenience";
  const shopVals = "hairdresser|beauty|clothes|shoes|electronics|mobile_phone|jewellery|hardware|furniture|stationery|toys|chemist|tailor|cosmetics|grocery";
  const query = `[out:json][timeout:30];(`
    + `node["amenity"~"${amenityVals}"]["name"](around:${RADIUS},${LAT},${LNG});`
    + `way["amenity"~"${amenityVals}"]["name"](around:${RADIUS},${LAT},${LNG});`
    + `node["shop"~"${shopVals}"]["name"](around:${RADIUS},${LAT},${LNG});`
    + `way["shop"~"${shopVals}"]["name"](around:${RADIUS},${LAT},${LNG});`
    + `);out center qt;`;

  const mirrors = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];
  for (const url of mirrors) {
    try {
      const r = await axios.post(url, `data=${encodeURIComponent(query)}`,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 20000 });
      const elements = r.data?.elements || [];
      const named = elements.filter(e => e.tags?.name);
      return { count: named.length, sample: named.slice(0, 3).map(e => e.tags.name) };
    } catch (_) {}
  }
  return { count: 0, sample: [] };
}

// ── 2. TomTom ────────────────────────────────────────────────────────────────
async function testTomTom() {
  const key = process.env.TOMTOM_API_KEY;
  if (!key || key === 'your_tomtom_key_here') return { count: 0, sample: [], error: 'No key' };
  try {
    const r = await axios.get('https://api.tomtom.com/search/2/nearbySearch/.json', {
      params: { key, lat: LAT, lon: LNG, radius: RADIUS, limit: 100, language: 'en-GB' },
      timeout: 12000,
    });
    const results = r.data?.results || [];
    return { count: results.length, sample: results.slice(0, 3).map(p => p.poi?.name) };
  } catch (e) {
    return { count: 0, sample: [], error: e.response?.data?.message || e.message };
  }
}

// ── 3. Mappls ────────────────────────────────────────────────────────────────
async function testMappls() {
  const key = process.env.MAPPLS_API_KEY;
  if (!key || key === 'your_mappls_api_key') return { count: 0, sample: [], error: 'No key' };
  try {
    const r = await axios.get('https://atlas.mappls.com/api/places/nearby/json', {
      params: {
        keywords: 'shop;restaurant;hospital;school;hotel;bank;gym;salon;pharmacy;clothing;electronics',
        refLocation: `${LAT},${LNG}`,
        radius: RADIUS,
        sortBy: 'dist:asc',
        page: 1,
        token: key,
      },
      timeout: 8000,
    });
    const places = r.data?.suggestedLocations || r.data?.nearbyPlaces || r.data?.results || [];
    return { count: places.length, sample: places.slice(0, 3).map(p => p.placeName || p.name) };
  } catch (e) {
    return { count: 0, sample: [], error: e.response?.data?.message || e.message };
  }
}

// ── 4. Google Places (Nearby Search) ─────────────────────────────────────────
async function testGoogle() {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || key === 'your_google_places_key') return { count: 0, sample: [], error: 'No key' };
  try {
    const r = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
      params: { location: `${LAT},${LNG}`, radius: RADIUS, type: 'restaurant', key },
      timeout: 10000,
    });
    if (r.data.status !== 'OK') return { count: 0, sample: [], error: `Status: ${r.data.status} — ${r.data.error_message || ''}` };
    const places = r.data.results || [];
    return { count: places.length, sample: places.slice(0, 3).map(p => p.name) };
  } catch (e) {
    return { count: 0, sample: [], error: e.message };
  }
}

// ── 5. Foursquare ─────────────────────────────────────────────────────────────
async function testFoursquare() {
  const key = process.env.FOURSQUARE_API_KEY;
  if (!key || key.includes('fsq3')) {
    // Foursquare v3 deprecated June 2025
    return { count: 0, sample: [], error: 'FSQ v3 deprecated June 2025 — disabled' };
  }
  return { count: 0, sample: [], error: 'No key' };
}

// ── 6. Wikidata SPARQL ────────────────────────────────────────────────────────
async function testWikidata() {
  const query = `SELECT ?place ?placeLabel WHERE {
    SERVICE wikibase:around {
      ?place wdt:P625 ?location .
      bd:serviceParam wikibase:center "Point(${LNG} ${LAT})"^^geo:wktLiteral .
      bd:serviceParam wikibase:radius "${RADIUS / 1000}" .
    }
    ?place wdt:P31 ?type .
    VALUES ?type { wd:Q11707 wd:Q27686 wd:Q16917 wd:Q3918 wd:Q4830453 }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
  } LIMIT 50`;
  try {
    const r = await axios.get('https://query.wikidata.org/sparql', {
      params: { query, format: 'json' },
      headers: { 'User-Agent': 'BizScopeAI/1.0', Accept: 'application/sparql-results+json' },
      timeout: 12000,
    });
    const bindings = r.data?.results?.bindings || [];
    return { count: bindings.length, sample: bindings.slice(0, 3).map(b => b.placeLabel?.value) };
  } catch (e) {
    return { count: 0, sample: [], error: e.message };
  }
}

// ── Run all tests ─────────────────────────────────────────────────────────────
(async () => {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║   BizScope Data Source Comparison — Mathura 5km     ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  const sources = [
    { name: 'OSM Overpass', fn: testOSM },
    { name: 'TomTom', fn: testTomTom },
    { name: 'Mappls (MapmyIndia)', fn: testMappls },
    { name: 'Google Places', fn: testGoogle },
    { name: 'Foursquare', fn: testFoursquare },
    { name: 'Wikidata SPARQL', fn: testWikidata },
  ];

  let grandTotal = 0;
  for (const s of sources) {
    process.stdout.write(`Testing ${s.name}... `);
    const start = Date.now();
    const res = await s.fn().catch(e => ({ count: 0, sample: [], error: e.message }));
    const ms = Date.now() - start;
    grandTotal += res.count;

    const status = res.error ? '❌' : res.count > 0 ? '✅' : '⚠️';
    console.log(`${status} ${res.count} businesses (${ms}ms)`);
    if (res.error) console.log(`   Error: ${res.error}`);
    if (res.sample?.length) console.log(`   Sample: ${res.sample.filter(Boolean).join(' | ')}`);
  }

  console.log('\n──────────────────────────────────────────────────────');
  console.log(`📊 Total raw businesses across all sources: ${grandTotal}`);
  console.log(`📍 Location: Mathura (${LAT}, ${LNG}), radius: ${RADIUS}m`);
  console.log('──────────────────────────────────────────────────────\n');
})();
