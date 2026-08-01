const axios = require('axios');
const LAT = 27.4924, LNG = 77.6737, R = 5000;

const query = `[out:json][timeout:25];
(
  node["amenity"~"restaurant|cafe|pharmacy|hospital|bank|school|hotel|gym|bakery|clinic|fuel"](around:${R},${LAT},${LNG});
  way["amenity"~"restaurant|cafe|pharmacy|hospital|bank|school|hotel|gym|bakery|clinic|fuel"](around:${R},${LAT},${LNG});
  node["shop"](around:${R},${LAT},${LNG});
  way["shop"](around:${R},${LAT},${LNG});
);
out center qt;`;

const mirrors = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.nchc.org.tw/api/interpreter',
];

(async () => {
  for (const url of mirrors) {
    try {
      console.log('Trying:', url);
      const r = await axios.post(url, `data=${encodeURIComponent(query)}`,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 20000 });
      const elements = r.data?.elements || [];
      const named = elements.filter(e => e.tags?.name);
      const all = elements.length;
      console.log(`✅ SUCCESS: ${all} total elements, ${named.length} named businesses`);
      console.log('Sample:', named.slice(0, 5).map(e => e.tags.name).join(' | '));
      break;
    } catch (e) {
      console.log('FAIL:', e.message.slice(0, 80));
    }
  }
})();
