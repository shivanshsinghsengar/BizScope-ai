const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const OpenAI = require('openai');
const { Sequelize, DataTypes } = require('sequelize');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'bizscope_secret_2026';

app.use(cors());
app.use(express.json());

// Rate limiting
const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { error: 'Too many requests, please try again later.' } });
const analysisLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: { error: 'Too many analysis requests. Wait a minute.' } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many auth attempts.' } });
const adminLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: { error: 'Too many admin login attempts. Try again later.' } });
app.use('/api/', generalLimiter);
app.use('/api/analyze-location', analysisLimiter);
app.use('/api/auth/', authLimiter);
app.use('/api/admin/login', adminLimiter);

// Database
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false }
  }
});

// Models
const Business = sequelize.define('Business', {
  name: DataTypes.STRING,
  category: DataTypes.STRING,
  rating: DataTypes.FLOAT,
  reviewCount: DataTypes.INTEGER,
  address: DataTypes.STRING,
  phone: DataTypes.STRING,
  website: DataTypes.STRING,
  latitude: DataTypes.FLOAT,
  longitude: DataTypes.FLOAT,
});

const Property = sequelize.define('Property', {
  type: DataTypes.STRING,
  price: DataTypes.FLOAT,
  size: DataTypes.FLOAT,
  address: DataTypes.STRING,
  latitude: DataTypes.FLOAT,
  longitude: DataTypes.FLOAT,
  footTraffic: DataTypes.INTEGER,
});

const User = sequelize.define('User', {
  name: DataTypes.STRING,
  email: { type: DataTypes.STRING, unique: true },
  password: DataTypes.STRING,
  businessName: DataTypes.STRING,
});

const ManualBusiness = sequelize.define('ManualBusiness', {
  name: DataTypes.STRING,
  category: DataTypes.STRING,
  address: DataTypes.STRING,
  city: DataTypes.STRING,
  pincode: DataTypes.STRING,
  phone: DataTypes.STRING,
  website: DataTypes.STRING,
  description: DataTypes.TEXT,
  latitude: DataTypes.FLOAT,
  longitude: DataTypes.FLOAT,
  ownerId: DataTypes.INTEGER,
  verified: { type: DataTypes.BOOLEAN, defaultValue: false },
});

// Public suggestions (no login required)
const PublicSuggestion = sequelize.define('PublicSuggestion', {
  name: DataTypes.STRING,
  category: DataTypes.STRING,
  address: DataTypes.STRING,
  city: DataTypes.STRING,
  pincode: DataTypes.STRING,
  phone: DataTypes.STRING,
  description: DataTypes.TEXT,
  submitterName: DataTypes.STRING,
  status: { type: DataTypes.STRING, defaultValue: 'pending' },
});

// Property Enquiries
const PropertyEnquiry = sequelize.define('PropertyEnquiry', {
  name: DataTypes.STRING,
  email: DataTypes.STRING,
  phone: DataTypes.STRING,
  message: DataTypes.TEXT,
  propertyAddress: DataTypes.STRING,
  propertyType: DataTypes.STRING,
  propertyPrice: DataTypes.FLOAT,
  status: { type: DataTypes.STRING, defaultValue: 'new' },
});

// Saved searches
const SavedSearch = sequelize.define('SavedSearch', {
  userId: DataTypes.INTEGER,
  location: DataTypes.STRING,
  displayName: DataTypes.STRING,
  data: DataTypes.TEXT, // JSON stringified
});

// AI Setup
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

const getAISuggestions = async (location, categoryStats) => {
  const cityName = location.split(',')[0].trim();
  const prompt = `You are a business consultant specializing in Indian markets. A user wants to start a business in ${cityName}.

Here is the current market data for ${cityName} (businesses found within 5km):
${JSON.stringify(categoryStats, null, 2)}

Based on this real data, suggest the 5 best businesses to start in ${cityName}. For each business provide:
1. Business type
2. Best area/locality in ${cityName} to open it (be specific — name a real neighbourhood, market, or street in ${cityName})
3. Why that area is ideal
4. Demand score (1-10)
5. Saturation level (Low/Medium/High)
6. Estimated monthly profit in INR
7. One key action to stand out

Be specific to ${cityName} — mention real areas, markets, and local context (e.g. for Agra mention areas near Taj Mahal, Sadar Bazaar, Fatehabad Road etc.).`;

  // Try Gemini first (free)
  if (genAI && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 10) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (e) {
      console.log('Gemini failed:', e.message);
    }
  } else {
    console.log('Gemini not configured, GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'set' : 'missing');
  }

  // Fallback to OpenAI
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_key') {
    try {
      const res = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
      });
      return res.choices[0].message.content;
    } catch (e) {
      console.log('OpenAI failed:', e.message);
    }
  }

  return 'AI suggestions unavailable (no OpenAI key set).';
};

// Geocode cache (in-memory, no expiry — city coords don't change)
const geocodeCache = new Map();

// Free geocoding via OpenStreetMap Nominatim — with typo fallback
const geocodeLocation = async (location) => {
  const key = location.toLowerCase().trim().replace(/\s+/g, ' ');
  if (geocodeCache.has(key)) return geocodeCache.get(key);

  const tryGeocode = async (query) => {
    const url = `https://nominatim.openstreetmap.org/search`;
    const res = await axios.get(url, {
      params: { q: query, format: 'json', limit: 1, countrycodes: 'in', addressdetails: 1 },
      headers: { 'User-Agent': 'BizScopeAI/1.0' },
      timeout: 6000,
    });
    return res.data && res.data.length > 0 ? res.data[0] : null;
  };

  // Try full query first
  let result = await tryGeocode(location);

  // If not found, try progressively simpler queries (strip parts from left)
  if (!result) {
    const parts = location.split(',').map(p => p.trim()).filter(Boolean);
    for (let i = 1; i < parts.length; i++) {
      result = await tryGeocode(parts.slice(i).join(', '));
      if (result) break;
    }
  }

  // Last resort: try just the first word (handles single typo'd city names)
  if (!result) {
    const firstWord = location.split(',')[0].trim();
    result = await tryGeocode(firstWord);
  }

  if (!result) return null;

  const geo = {
    latitude: parseFloat(result.lat),
    longitude: parseFloat(result.lon),
    displayName: result.display_name,
  };
  geocodeCache.set(key, geo);
  return geo;
};

// OSM category mapping — comprehensive
const osmToCategory = {
  // Food & Drink
  restaurant: 'Restaurant', fast_food: 'Restaurant', food_court: 'Restaurant',
  bar: 'Restaurant', pub: 'Restaurant', biergarten: 'Restaurant',
  sweet_shop: 'Restaurant', ice_cream: 'Cafe', juice_bar: 'Cafe',
  cafe: 'Cafe', coffee_shop: 'Cafe', tea: 'Cafe',
  bakery: 'Bakery', pastry: 'Bakery', confectionery: 'Bakery',
  // Grocery & Food Retail
  supermarket: 'Grocery', convenience: 'Grocery', grocery: 'Grocery',
  butcher: 'Grocery', greengrocer: 'Grocery', deli: 'Grocery',
  dairy: 'Grocery', farm: 'Grocery', spices: 'Grocery', nuts: 'Grocery',
  // Health & Medical
  pharmacy: 'Pharmacy', chemist: 'Pharmacy', medical_supply: 'Pharmacy',
  hospital: 'Hospital', clinic: 'Hospital', doctors: 'Hospital',
  dentist: 'Hospital', veterinary: 'Hospital', optician: 'Hospital',
  physiotherapist: 'Hospital', nursing_home: 'Hospital',
  // Fitness & Wellness
  gym: 'Gym', fitness_centre: 'Gym', sports_centre: 'Gym',
  yoga: 'Gym', pilates: 'Gym', martial_arts: 'Gym', swimming_pool: 'Gym',
  // Beauty & Personal Care
  hairdresser: 'Salon', beauty: 'Salon', tailor: 'Salon',
  massage: 'Salon', nail_salon: 'Salon', tattoo: 'Salon', spa: 'Salon',
  // Clothing & Fashion
  clothes: 'Clothing', shoes: 'Clothing', boutique: 'Clothing',
  fashion: 'Clothing', sports: 'Clothing', outdoor: 'Clothing',
  // Electronics & Mobile
  electronics: 'Electronics', mobile_phone: 'Electronics', computer: 'Electronics',
  hifi: 'Electronics', camera: 'Electronics', video_games: 'Electronics',
  // Hardware & Home
  hardware: 'Hardware', doityourself: 'Hardware', paint: 'Hardware',
  glaziery: 'Hardware', plumber: 'Hardware', electrical: 'Hardware',
  furniture: 'Furniture', interior_decoration: 'Furniture', carpet: 'Furniture',
  // Education
  school: 'Education', college: 'Education', university: 'Education',
  tutoring: 'Education', language_school: 'Education', driving_school: 'Education',
  music_school: 'Education', dance: 'Education', library: 'Education',
  // Finance & Banking
  bank: 'Finance', atm: 'Finance', money_transfer: 'Finance',
  bureau_de_change: 'Finance', insurance: 'Finance', financial_advisor: 'Finance',
  // Hotel (dedicated category)
  hotel: 'Hotel', hostel: 'Hotel', guest_house: 'Hotel', motel: 'Hotel', resort: 'Hotel',
  // Hospitality & Travel
  travel_agency: 'Hospitality', car_rental: 'Hospitality',
  // Laundry & Cleaning
  laundry: 'Laundry', dry_cleaning: 'Laundry', laundromat: 'Laundry',
  // Retail & General
  jewellery: 'Jewellery', gold: 'Jewellery', watches: 'Jewellery',
  stationery: 'Retail', books: 'Retail', toys: 'Retail',
  gift: 'Retail', florist: 'Retail', art: 'Retail', photo: 'Retail',
  // Automotive
  car: 'Automotive', car_repair: 'Automotive', car_parts: 'Automotive',
  tyres: 'Automotive', fuel: 'Automotive', motorcycle: 'Automotive',
  bicycle: 'Automotive', car_wash: 'Automotive',
  // Food Processing & Wholesale
  wholesale: 'Wholesale', warehouse: 'Wholesale',
};

// Fetch real businesses from Overpass API — expanded query
const fetchRealBusinesses = async (lat, lng, radiusMeters = 5000, timeoutMs = 35000) => {
  try {
    const query = `
      [out:json][timeout:55];
      (
        node["amenity"~"restaurant|cafe|fast_food|pharmacy|hospital|clinic|doctors|dentist|gym|fitness_centre|bakery|laundry|bar|pub|hotel|hostel|guest_house|school|college|university|bank|atm|fuel|car_wash|car_rental|library|driving_school|language_school|music_school|veterinary|nursing_home|physiotherapist|swimming_pool|sports_centre|ice_cream|juice_bar|food_court|biergarten|bureau_de_change|money_transfer|insurance"](around:${radiusMeters},${lat},${lng});
        node["tourism"~"hotel|hostel|guest_house|motel|resort"](around:${radiusMeters},${lat},${lng});
        way["tourism"~"hotel|hostel|guest_house|motel|resort"](around:${radiusMeters},${lat},${lng});
        relation["tourism"~"hotel|hostel|guest_house|motel|resort"](around:${radiusMeters},${lat},${lng});
        node["shop"~"supermarket|convenience|grocery|hairdresser|beauty|clothes|shoes|electronics|mobile_phone|computer|jewellery|hardware|doityourself|bakery|optician|books|sports|furniture|stationery|toys|florist|gift|art|photo|butcher|greengrocer|deli|dairy|chemist|medical_supply|tailor|massage|nail_salon|tattoo|spa|boutique|fashion|outdoor|hifi|camera|video_games|paint|glaziery|electrical|interior_decoration|carpet|travel_agency|car|car_repair|car_parts|tyres|motorcycle|bicycle|wholesale|confectionery|pastry|nuts|spices|watches|gold"](around:${radiusMeters},${lat},${lng});
        node["office"~"company|it|lawyer|accountant|architect|engineer|real_estate|insurance|financial|consulting|government|ngo"](around:${radiusMeters},${lat},${lng});
        node["leisure"~"fitness_centre|sports_centre|swimming_pool|yoga|martial_arts"](around:${radiusMeters},${lat},${lng});
      );
      out center body;
    `;
    const res = await axios.post('https://overpass-api.de/api/interpreter',
      `data=${encodeURIComponent(query)}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: timeoutMs }
    );
    return res.data.elements.map((el) => {
      const tags = el.tags || {};
      const rawCat = tags.amenity || tags.shop || tags.office || tags.leisure || tags.tourism || 'Other';
      const elLat = el.lat ?? el.center?.lat;
      const elLon = el.lon ?? el.center?.lon;

      const addrParts = [
        tags['addr:housenumber'],
        tags['addr:street'],
        tags['addr:suburb'] || tags['addr:neighbourhood'] || tags['addr:quarter'],
        tags['addr:city'] || tags['addr:town'] || tags['addr:village'],
        tags['addr:state'],
      ].filter(Boolean);
      const address = tags['addr:full'] || (addrParts.length > 0 ? addrParts.join(', ') : null) || null;

      // Map office types to Office category
      let category = osmToCategory[rawCat];
      if (!category && tags.office) category = 'Office';
      if (!category) category = rawCat.charAt(0).toUpperCase() + rawCat.slice(1).replace(/_/g, ' ');

      return {
        name: tags.name || `${category} (unnamed)`,
        category,
        rating: parseFloat((Math.random() * 2 + 3).toFixed(1)),
        reviewCount: Math.floor(Math.random() * 300 + 10),
        address: address || `Near ${elLat?.toFixed(3)}, ${elLon?.toFixed(3)}`,
        phone: tags.phone || tags['contact:phone'] || '',
        website: tags.website || tags['contact:website'] || '',
        latitude: elLat,
        longitude: elLon,
      };
    }).filter(b => b.latitude && b.longitude && b.name);
  } catch (e) {
    console.log('Overpass API failed:', e.message);
    return [];
  }
};

// Foursquare category → our category mapping
const fsqCategoryMap = {
  'Restaurant': 'Restaurant', 'Fast Food': 'Restaurant', 'Café': 'Cafe', 'Coffee Shop': 'Cafe',
  'Bakery': 'Bakery', 'Grocery Store': 'Grocery', 'Supermarket': 'Grocery',
  'Pharmacy': 'Pharmacy', 'Hospital': 'Hospital', 'Clinic': 'Hospital', 'Doctor': 'Hospital',
  'Gym': 'Gym', 'Fitness Center': 'Gym', 'Yoga Studio': 'Gym',
  'Salon': 'Salon', 'Beauty Salon': 'Salon', 'Spa': 'Salon',
  'Clothing Store': 'Clothing', 'Electronics Store': 'Electronics',
  'Hotel': 'Hotel', 'Hostel': 'Hotel', 'Bank': 'Finance', 'ATM': 'Finance',
  'School': 'Education', 'College': 'Education',
};

const fetchFoursquareBusinesses = async (lat, lng, radiusMeters = 5000) => {
  if (!process.env.FOURSQUARE_API_KEY) return [];
  try {
    const res = await axios.get('https://api.foursquare.com/v3/places/search', {
      headers: {
        Authorization: process.env.FOURSQUARE_API_KEY,
        Accept: 'application/json',
      },
      params: {
        ll: `${lat},${lng}`,
        radius: radiusMeters,
        limit: 50,
        fields: 'name,categories,location,tel,website,rating,stats,geocodes',
      },
      timeout: 10000,
    });
    return (res.data.results || []).map(place => {
      const cat = place.categories?.[0]?.name || 'Other';
      const mapped = fsqCategoryMap[cat] || cat;
      const geo = place.geocodes?.main;
      return {
        name: place.name,
        category: mapped,
        rating: place.rating ? parseFloat((place.rating / 2).toFixed(1)) : parseFloat((Math.random() * 2 + 3).toFixed(1)),
        reviewCount: place.stats?.total_ratings || Math.floor(Math.random() * 200 + 10),
        address: [place.location?.address, place.location?.locality, place.location?.region].filter(Boolean).join(', ') || 'Unknown',
        phone: place.tel || '',
        website: place.website || '',
        latitude: geo?.latitude,
        longitude: geo?.longitude,
        source: 'foursquare',
      };
    }).filter(b => b.latitude && b.longitude);
  } catch (e) {
    console.log('Foursquare failed:', e.message);
    return [];
  }
};

// Wikidata SPARQL — fetch notable places near location
const fetchWikidataPlaces = async (lat, lng, radiusMeters = 5000) => {
  try {
    // Query for hotels, restaurants, landmarks, businesses near coordinates
    const query = `
      SELECT ?place ?placeLabel ?typeLabel ?lat ?lng ?website ?phone WHERE {
        SERVICE wikibase:around {
          ?place wdt:P625 ?location .
          bd:serviceParam wikibase:center "Point(${lng} ${lat})"^^geo:wktLiteral .
          bd:serviceParam wikibase:radius "${(radiusMeters / 1000).toFixed(1)}" .
          bd:serviceParam wikibase:distance ?dist .
        }
        ?place wdt:P31 ?type .
        ?type wdt:P279* wd:Q2221906 .
        OPTIONAL { ?place wdt:P856 ?website }
        OPTIONAL { ?place wdt:P1329 ?phone }
        BIND(geof:latitude(?location) AS ?lat)
        BIND(geof:longitude(?location) AS ?lng)
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en,hi" }
      } LIMIT 80
    `;

    const res = await axios.get('https://query.wikidata.org/sparql', {
      params: { query, format: 'json' },
      headers: { 'User-Agent': 'BizScopeAI/1.0 (https://bizscope.ai)', Accept: 'application/sparql-results+json' },
      timeout: 12000,
    });

    const bindings = res.data?.results?.bindings || [];
    return bindings.map(b => {
      const type = b.typeLabel?.value || 'Landmark';
      const mapped = wikidataCategoryMap[type] || 'Landmark';
      return {
        name: b.placeLabel?.value || 'Unknown Place',
        category: mapped,
        rating: parseFloat((Math.random() * 1.5 + 3.5).toFixed(1)),
        reviewCount: Math.floor(Math.random() * 150 + 20),
        address: '',
        phone: b.phone?.value || '',
        website: b.website?.value || '',
        latitude: parseFloat(b.lat?.value),
        longitude: parseFloat(b.lng?.value),
        source: 'wikidata',
      };
    }).filter(b => b.latitude && b.longitude && !isNaN(b.latitude));
  } catch (e) {
    console.log('Wikidata failed:', e.message);
    return [];
  }
};

const wikidataCategoryMap = {
  'hotel': 'Hotel', 'motel': 'Hotel', 'hostel': 'Hotel', 'resort': 'Hotel', 'guest house': 'Hotel',
  'restaurant': 'Restaurant', 'fast food restaurant': 'Restaurant', 'cafe': 'Cafe', 'coffee shop': 'Cafe',
  'hospital': 'Hospital', 'clinic': 'Hospital', 'pharmacy': 'Pharmacy',
  'school': 'Education', 'college': 'Education', 'university': 'Education',
  'bank': 'Finance', 'shopping mall': 'Retail', 'supermarket': 'Grocery',
  'temple': 'Landmark', 'mosque': 'Landmark', 'church': 'Landmark', 'monument': 'Landmark',
  'museum': 'Landmark', 'park': 'Landmark', 'tourist attraction': 'Landmark',
};

// In-memory cache (location -> result, TTL 30 mins)
const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

const getCached = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.time > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
};
const setCache = (key, data) => cache.set(key, { data, time: Date.now() });

// Auth middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
};

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, businessName } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    if (!email?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return res.status(400).json({ error: 'Valid email is required' });
    if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (await User.findOne({ where: { email: email.toLowerCase() } })) return res.status(400).json({ error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name: name.trim(), email: email.toLowerCase(), password: hashed, businessName: businessName?.trim() });
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, businessName: user.businessName } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(400).json({ error: 'Invalid email or password' });
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, businessName: user.businessName } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// List a business (requires login)
app.post('/api/businesses/manual', authMiddleware, async (req, res) => {
  try {
    const { name, category, address, city, pincode, phone, website, description, latitude, longitude } = req.body;
    const biz = await ManualBusiness.create({ name, category, address, city, pincode, phone, website, description, latitude: parseFloat(latitude) || 0, longitude: parseFloat(longitude) || 0, ownerId: req.user.id });
    res.json(biz);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get my listed businesses
app.get('/api/businesses/my', authMiddleware, async (req, res) => {
  res.json(await ManualBusiness.findAll({ where: { ownerId: req.user.id } }));
});

// Get manual businesses near location
app.get('/api/businesses/manual/:lat/:lng', async (req, res) => {
  const { lat, lng } = req.params;
  const all = await ManualBusiness.findAll();
  res.json(all.filter(b => b.latitude && b.longitude && Math.sqrt(Math.pow(b.latitude - parseFloat(lat), 2) + Math.pow(b.longitude - parseFloat(lng), 2)) < 0.08));
});

// Delete my business
app.delete('/api/businesses/manual/:id', authMiddleware, async (req, res) => {
  const biz = await ManualBusiness.findOne({ where: { id: req.params.id, ownerId: req.user.id } });
  if (!biz) return res.status(404).json({ error: 'Not found' });
  await biz.destroy();
  res.json({ success: true });
});

// Edit my business
app.put('/api/businesses/manual/:id', authMiddleware, async (req, res) => {
  try {
    const biz = await ManualBusiness.findOne({ where: { id: req.params.id, ownerId: req.user.id } });
    if (!biz) return res.status(404).json({ error: 'Not found' });
    const { name, category, address, city, pincode, phone, website, description, latitude, longitude } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Business name is required' });
    await biz.update({ name: name.trim(), category, address, city, pincode, phone, website, description, latitude: parseFloat(latitude) || biz.latitude, longitude: parseFloat(longitude) || biz.longitude });
    res.json(biz);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Saved searches
app.post('/api/searches/save', authMiddleware, async (req, res) => {
  try {
    const { location, displayName, data } = req.body;
    if (!location) return res.status(400).json({ error: 'Location required' });
    // Upsert — replace if same location for same user
    const existing = await SavedSearch.findOne({ where: { userId: req.user.id, location } });
    if (existing) { await existing.update({ displayName, data: JSON.stringify(data) }); return res.json(existing); }
    const s = await SavedSearch.create({ userId: req.user.id, location, displayName, data: JSON.stringify(data) });
    res.json(s);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/searches', authMiddleware, async (req, res) => {
  const searches = await SavedSearch.findAll({ where: { userId: req.user.id }, order: [['updatedAt', 'DESC']], limit: 10 });
  res.json(searches.map(s => ({ id: s.id, location: s.location, displayName: s.displayName, updatedAt: s.updatedAt })));
});

app.delete('/api/searches/:id', authMiddleware, async (req, res) => {
  const s = await SavedSearch.findOne({ where: { id: req.params.id, userId: req.user.id } });
  if (!s) return res.status(404).json({ error: 'Not found' });
  await s.destroy();
  res.json({ success: true });
});

app.get('/api/searches/:id', authMiddleware, async (req, res) => {
  const s = await SavedSearch.findOne({ where: { id: req.params.id, userId: req.user.id } });
  if (!s) return res.status(404).json({ error: 'Not found' });
  res.json({ ...s.toJSON(), data: JSON.parse(s.data) });
});

// Admin login (password-only, no username)
app.post('/api/admin/login', async (req, res) => {
  const { password } = req.body;
  const valid = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
  if (!valid) return res.status(401).json({ error: 'Wrong password' });
  const token = jwt.sign({ role: 'admin' }, process.env.ADMIN_JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
});

const adminAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try { const d = jwt.verify(token, process.env.ADMIN_JWT_SECRET); if (d.role !== 'admin') throw new Error(); next(); }
  catch { res.status(401).json({ error: 'Unauthorized' }); }
};

// Admin: get all suggestions
app.get('/api/admin/suggestions', adminAuth, async (req, res) => {
  res.json(await PublicSuggestion.findAll({ order: [['createdAt', 'DESC']] }));
});

// Admin: update suggestion status
app.patch('/api/admin/suggestions/:id', adminAuth, async (req, res) => {
  const s = await PublicSuggestion.findByPk(req.params.id);
  if (!s) return res.status(404).json({ error: 'Not found' });
  await s.update({ status: req.body.status });
  res.json(s);
});

// Admin: delete suggestion
app.delete('/api/admin/suggestions/:id', adminAuth, async (req, res) => {
  const s = await PublicSuggestion.findByPk(req.params.id);
  if (!s) return res.status(404).json({ error: 'Not found' });
  await s.destroy();
  res.json({ success: true });
});

// Admin: get all registered users
app.get('/api/admin/users', adminAuth, async (req, res) => {
  const users = await User.findAll({ attributes: ['id', 'name', 'email', 'businessName', 'createdAt'] });
  res.json(users);
});

// Submit property enquiry (public)
app.post('/api/enquiries', async (req, res) => {
  try {
    const { name, email, phone, message, propertyAddress, propertyType, propertyPrice } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });
    const enquiry = await PropertyEnquiry.create({ name, email, phone, message, propertyAddress, propertyType, propertyPrice });
    res.json({ success: true, id: enquiry.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin: get all enquiries
app.get('/api/admin/enquiries', adminAuth, async (req, res) => {
  res.json(await PropertyEnquiry.findAll({ order: [['createdAt', 'DESC']] }));
});

// Admin: update enquiry status
app.patch('/api/admin/enquiries/:id', adminAuth, async (req, res) => {
  const e = await PropertyEnquiry.findByPk(req.params.id);
  if (!e) return res.status(404).json({ error: 'Not found' });
  await e.update({ status: req.body.status });
  res.json(e);
});

// Admin: delete enquiry
app.delete('/api/admin/enquiries/:id', adminAuth, async (req, res) => {
  const e = await PropertyEnquiry.findByPk(req.params.id);
  if (!e) return res.status(404).json({ error: 'Not found' });
  await e.destroy();
  res.json({ success: true });
});

// Public: suggest a business (no login needed)
app.post('/api/suggestions', async (req, res) => {
  try {
    const { name, category, address, city, pincode, phone, description, submitterName } = req.body;
    if (!name || !city) return res.status(400).json({ error: 'Name and city are required' });
    const suggestion = await PublicSuggestion.create({ name, category: category || 'Other', address, city, pincode, phone, description, submitterName });
    res.json({ success: true, id: suggestion.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin: get all suggestions (protected)
app.get('/api/suggestions', authMiddleware, async (req, res) => {
  res.json(await PublicSuggestion.findAll({ order: [['createdAt', 'DESC']] }));
});

// 1. Location Analysis
app.post('/api/analyze-location', async (req, res) => {
  try {
    const { location, nocache } = req.body;
    const cacheKey = location.toLowerCase().trim();

    // Return cached result instantly (skip if nocache requested)
    if (!nocache) {
      const cached = getCached(cacheKey);
      if (cached) {
        console.log('Cache hit:', cacheKey);
        return res.json(cached);
      }
    } else {
      cache.delete(cacheKey);
    }

    // Geocode first
    const geo = await geocodeLocation(location);
    if (!geo) return res.status(400).json({ error: 'Location not found. Please check the spelling or try a nearby city name.' });
    const { latitude, longitude, displayName } = geo;

    // Fetch OSM businesses + Foursquare + Wikidata + manual businesses in parallel
    const [osmBusinesses, fsqBusinesses, wikiBusinesses, manualBusinesses] = await Promise.all([
      fetchRealBusinesses(latitude, longitude, 5000),
      fetchFoursquareBusinesses(latitude, longitude, 5000),
      fetchWikidataPlaces(latitude, longitude, 5000),
      ManualBusiness.findAll().then(all => all.filter(b =>
        b.latitude && b.longitude &&
        Math.sqrt(Math.pow(b.latitude - latitude, 2) + Math.pow(b.longitude - longitude, 2)) < 0.08
      )),
    ]);

    // Merge all sources, deduplicate by name+proximity
    const seen = new Set();
    let businesses = [...osmBusinesses, ...fsqBusinesses, ...wikiBusinesses,
      ...manualBusinesses.map(b => ({ name: b.name, category: b.category, rating: 4.0, reviewCount: 50, address: b.address, phone: b.phone, website: b.website, latitude: b.latitude, longitude: b.longitude, isManual: true })),
    ].filter(b => {
      const key = `${b.name?.toLowerCase().trim()}_${Math.round(b.latitude * 1000)}_${Math.round(b.longitude * 1000)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // If nothing found, retry once with longer timeout before giving up
    if (businesses.length === 0) {
      console.log('First OSM attempt returned empty, retrying with longer timeout...');
      const retryBusinesses = await fetchRealBusinesses(latitude, longitude, 5000, 60000);
      const retrySeen = new Set();
      businesses = [
        ...retryBusinesses,
        ...fsqBusinesses,
        ...wikiBusinesses,
        ...manualBusinesses.map(b => ({ name: b.name, category: b.category, rating: 4.0, reviewCount: 50, address: b.address, phone: b.phone, website: b.website, latitude: b.latitude, longitude: b.longitude, isManual: true })),
      ].filter(b => {
        const key = `${b.name?.toLowerCase().trim()}_${Math.round(b.latitude * 1000)}_${Math.round(b.longitude * 1000)}`;
        if (retrySeen.has(key)) return false;
        retrySeen.add(key);
        return true;
      });
    }

    if (businesses.length === 0) {
      return res.status(404).json({ error: 'No businesses found in this area. Try a more specific location or a nearby city center.' });
    }

    // Category stats
    const categoryStats = {};
    businesses.forEach(({ category, rating, reviewCount }) => {
      if (!categoryStats[category]) categoryStats[category] = { count: 0, totalRating: 0, totalReviews: 0 };
      categoryStats[category].count++;
      categoryStats[category].totalRating += parseFloat(rating);
      categoryStats[category].totalReviews += reviewCount;
    });
    Object.keys(categoryStats).forEach(cat => {
      const s = categoryStats[cat];
      s.avgRating = (s.totalRating / s.count).toFixed(1);
      s.popularityScore = Math.sqrt(s.totalReviews);
      // Weighted score: count (40%) + avg rating (30%) + popularity (30%)
      s.competitorScore = (s.count * 0.4) + (parseFloat(s.avgRating) * 0.3) + (s.popularityScore * 0.3);
    });

    // Normalize to 0-100 relative risk score
    const scores = Object.values(categoryStats).map(s => s.competitorScore);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    Object.keys(categoryStats).forEach(cat => {
      const s = categoryStats[cat];
      s.riskScore = maxScore === minScore ? 50 : Math.round(((s.competitorScore - minScore) / (maxScore - minScore)) * 100);
      s.riskLevel = s.riskScore >= 70 ? 'High' : s.riskScore >= 35 ? 'Medium' : 'Low';
      // Demand score: popularity per competitor (how much demand vs supply)
      s.demandScore = Math.min(10, parseFloat((s.popularityScore / (s.count || 1) * 2).toFixed(1)));
    });

    const sortedStats = Object.entries(categoryStats)
      .map(([category, stats]) => ({ category, ...stats }))
      .sort((a, b) => b.competitorScore - a.competitorScore);

    // AI runs async — don't block the response
    const result = {
      location: { displayName, latitude, longitude },
      businesses,
      categoryStats: sortedStats,
      aiSuggestions: 'Generating AI recommendations...',
      userLat: latitude,
      userLng: longitude,
    };

    // Send response immediately, then get AI in background
    setCache(cacheKey, result);
    res.json(result);

    // Update cache with AI result after response sent
    getAISuggestions(location, categoryStats).then(ai => {
      result.aiSuggestions = ai;
      setCache(cacheKey, result);
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

// 2. Get Properties — real commercial spaces from OSM
app.get('/api/properties/:lat/:lng', async (req, res) => {
  const lat = parseFloat(req.params.lat);
  const lng = parseFloat(req.params.lng);
  try {
    const query = `
      [out:json][timeout:15];
      (
        node["shop"="vacant"](around:5000,${lat},${lng});
        node["office"](around:5000,${lat},${lng});
        node["amenity"="marketplace"](around:5000,${lat},${lng});
        node["building"~"commercial|retail|office"](around:5000,${lat},${lng});
        node["commercial"](around:5000,${lat},${lng});
      );
      out body;
    `;
    const osmRes = await axios.post('https://overpass-api.de/api/interpreter',
      `data=${encodeURIComponent(query)}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 }
    );
    const osmProps = osmRes.data.elements.slice(0, 20).map((el, i) => {
      const tags = el.tags || {};
      const addrParts = [tags['addr:housenumber'], tags['addr:street'], tags['addr:suburb'] || tags['addr:city']].filter(Boolean);
      const sizeSqft = Math.floor(Math.random() * 800 + 200);
      const isRent = i % 3 !== 1;
      const price = isRent ? Math.floor((sizeSqft * 40) / 1000) * 1000 : Math.floor((sizeSqft * 8000) / 100000) * 100000;
      return {
        id: el.id, type: isRent ? 'rent' : 'sale',
        price, size: sizeSqft,
        address: addrParts.length > 0 ? addrParts.join(', ') : (tags.name || `Near ${el.lat?.toFixed(3)}, ${el.lon?.toFixed(3)}`),
        latitude: el.lat, longitude: el.lon,
        footTraffic: Math.floor(Math.random() * 40 + 55),
      };
    }).filter(p => p.latitude && p.longitude);

    if (osmProps.length > 0) return res.json(osmProps);
  } catch (e) { console.log('OSM properties failed:', e.message); }

  // Fallback: generate realistic properties around the location
  const types = ['rent', 'sale', 'rent', 'rent', 'sale', 'rent'];
  const areas = ['Main Market', 'Commercial Complex', 'High Street', 'Business Park', 'Shopping Lane', 'Trade Centre'];
  const props = Array.from({ length: 6 }, (_, i) => {
    const isRent = types[i] === 'rent';
    const size = [300, 450, 600, 250, 800, 500][i];
    return {
      id: i + 1, type: types[i],
      price: isRent ? [22000, 35000, 45000, 18000, 60000, 30000][i] : [3500000, 6000000, 4200000, 2800000, 9500000, 5000000][i],
      size, address: `${areas[i]}, Near Analyzed Location`,
      latitude: lat + (Math.random() - 0.5) * 0.02,
      longitude: lng + (Math.random() - 0.5) * 0.02,
      footTraffic: [85, 92, 78, 70, 95, 82][i],
    };
  });
  res.json(props);
});

// 3. Get Businesses for Map
app.get('/api/businesses/:lat/:lng', async (req, res) => {
  const { lat, lng } = req.params;
  const businesses = await Business.findAll({ limit: 50, order: [['reviewCount', 'DESC']] });
  if (businesses.length > 0) return res.json(businesses);
  // fallback mock
  const cats = ['Restaurant', 'Cafe', 'Grocery', 'Gym', 'Salon', 'Pharmacy', 'Bakery', 'Laundry'];
  const mock = Array.from({ length: 20 }, (_, i) => ({
    name: `Business ${i + 1}`,
    category: cats[i % cats.length],
    rating: parseFloat((Math.random() * 2 + 3).toFixed(1)),
    reviewCount: Math.floor(Math.random() * 300 + 10),
    address: `Address ${i + 1}`,
    latitude: parseFloat(lat) + (Math.random() - 0.5) * 0.01,
    longitude: parseFloat(lng) + (Math.random() - 0.5) * 0.01,
  }));
  res.json(mock);
});

// Cache bust endpoint (admin only)
app.post('/api/admin/clear-cache', adminAuth, (req, res) => {
  cache.clear();
  geocodeCache.clear();
  res.json({ success: true, message: 'Cache cleared' });
});

// Initialize DB and start
sequelize.sync({ force: false }).then(async () => {
  console.log('Database synced');
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
