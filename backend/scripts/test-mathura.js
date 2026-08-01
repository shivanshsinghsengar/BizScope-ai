// Quick test — Google Places business count for Mathura
const axios = require('axios');
require('dotenv').config();

const key = process.env.GOOGLE_PLACES_API_KEY;
const lat = 27.4924; // Mathura center
const lng = 77.6737;
const radiusMeters = 5000;

const seen = new Set();
let total = 0;

const addPlace = (place) => {
  if (!place.geometry?.location && !place.location) return;
  const loc = place.geometry?.location || place.location;
  const name = place.name || place.displayName?.text || '';
  const nameKey = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
  const posKey = `${Math.round((loc.lat || loc.latitude) * 2000)}_${Math.round((loc.lng || loc.longitude) * 2000)}`;
  const dk = nameKey.length > 2 ? `${nameKey}_${posKey}` : posKey;
  if (seen.has(dk)) return;
  seen.add(dk);
  total++;
};

async function fetchNearby(type) {
  let count = 0;
  const fetchPage = async (token = null) => {
    const params = { location: `${lat},${lng}`, radius: radiusMeters, key };
    if (token) params.pagetoken = token;
    else params.type = type;
    const r = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', { params, timeout: 10000 });
    return r.data || {};
  };
  const p1 = await fetchPage();
  (p1.results || []).forEach(p => { addPlace(p); count++; });
  if (p1.next_page_token) {
    await new Promise(r => setTimeout(r, 2100));
    const p2 = await fetchPage(p1.next_page_token);
    (p2.results || []).forEach(p => { addPlace(p); count++; });
    if (p2.next_page_token) {
      await new Promise(r => setTimeout(r, 2100));
      const p3 = await fetchPage(p2.next_page_token);
      (p3.results || []).forEach(p => { addPlace(p); count++; });
    }
  }
  return count;
}

async function fetchText(query) {
  let count = 0;
  const r = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
    params: { query, location: `${lat},${lng}`, radius: radiusMeters, key },
    timeout: 10000,
  });
  (r.data?.results || []).forEach(p => { addPlace(p); count++; });
  return count;
}

async function fetchNewApi(types) {
  let count = 0;
  const r = await axios.post('https://places.googleapis.com/v1/places:searchNearby', {
    includedTypes: types,
    maxResultCount: 20,
    locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius: radiusMeters } },
  }, {
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.types,places.rating,places.userRatingCount,places.nationalPhoneNumber,places.websiteUri',
    },
    timeout: 10000,
  });
  (r.data?.places || []).forEach(p => { addPlace({ location: p.location, name: p.displayName?.text }); count++; });
  return count;
}

(async () => {
  console.log(`\n🔍 Testing Google Places for Mathura (${lat}, ${lng}) r=${radiusMeters}m\n`);
  console.log(`API Key: ${key ? key.slice(0, 12) + '...' : 'MISSING'}\n`);

  const types = ['restaurant','cafe','store','clothing_store','electronics_store',
    'grocery_or_supermarket','pharmacy','gym','hair_care','bank',
    'school','hospital','lodging','jewelry_store','furniture_store','hardware_store','car_repair','bakery'];

  console.log('── Track 1: Nearby Search ──');
  for (const t of types) {
    const n = await fetchNearby(t).catch(() => 0);
    console.log(`  ${t}: ${n} raw | unique so far: ${seen.size}`);
  }

  console.log('\n── Track 2: Text Search ──');
  const queries = ['shops Mathura','restaurants Mathura','medical store Mathura',
    'clothing store Mathura','hotel Mathura','salon Mathura','kirana Mathura','school Mathura'];
  for (const q of queries) {
    const n = await fetchText(q).catch(() => 0);
    console.log(`  "${q}": ${n} raw | unique so far: ${seen.size}`);
  }

  console.log('\n── Track 3: New Places API ──');
  const newGroups = [
    ['restaurant','cafe','bakery'],
    ['clothing_store','jewelry_store','shoe_store'],
    ['grocery_or_supermarket','convenience_store'],
    ['pharmacy','hospital','doctor'],
    ['bank','atm'],
    ['school','university'],
    ['lodging'],
    ['gym','beauty_salon'],
    ['hardware_store','furniture_store'],
    ['car_repair','gas_station'],
  ];
  for (const g of newGroups) {
    const n = await fetchNewApi(g).catch(() => 0);
    console.log(`  [${g.join(',')}]: ${n} raw | unique so far: ${seen.size}`);
  }

  console.log(`\n✅ TOTAL UNIQUE BUSINESSES: ${seen.size}`);
  console.log(`📊 Total raw results (before dedup): ${total}`);
})();
