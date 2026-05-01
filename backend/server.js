const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const crypto = require('crypto');
const OpenAI = require('openai');
const { Sequelize, DataTypes } = require('sequelize');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || (!isProduction ? crypto.randomBytes(32).toString('hex') : '');
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || (!isProduction ? crypto.randomBytes(32).toString('hex') : '');

if (isProduction && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required in production');
}
if (isProduction && !process.env.ADMIN_JWT_SECRET) {
  throw new Error('ADMIN_JWT_SECRET is required in production');
}
if (isProduction && !process.env.ADMIN_PASSWORD_HASH) {
  throw new Error('ADMIN_PASSWORD_HASH is required in production');
}
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const devOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const corsAllowlist = isProduction ? allowedOrigins : [...new Set([...allowedOrigins, ...devOrigins])];

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (!isProduction) return cb(null, true);
    if (corsAllowlist.includes(origin)) return cb(null, true);
    return cb(new Error('CORS blocked: origin not allowed'));
  },
  credentials: true,
}));
app.use(express.json());

const appStartTime = Date.now();
const requestMetrics = {
  total: 0,
  byRoute: {},
  byStatus: {},
  slowRequests: 0,
};

app.use((req, res, next) => {
  const startedAt = Date.now();
  const routeKey = `${req.method} ${req.path}`;
  requestMetrics.total += 1;
  requestMetrics.byRoute[routeKey] = (requestMetrics.byRoute[routeKey] || 0) + 1;
  const reqId = crypto.randomBytes(6).toString('hex');
  res.setHeader('X-Request-Id', reqId);
  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    const statusKey = String(res.statusCode);
    requestMetrics.byStatus[statusKey] = (requestMetrics.byStatus[statusKey] || 0) + 1;
    if (durationMs > 2000) requestMetrics.slowRequests += 1;
    const level = durationMs > 2000 ? 'WARN' : 'INFO';
    console.log(`[${level}] ${reqId} ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`);
  });
  next();
});

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').toLowerCase());
const sanitizeLocationInput = (location = '') => {
  let cleaned = location.replace(/\s+/g, ' ').trim();
  cleaned = cleaned.replace(/^,+|,+$/g, '').trim();
  cleaned = cleaned.split(',').map(p => p.trim()).filter(Boolean).join(', ');
  return cleaned;
};
const isSafeLocation = (location = '') => location.length >= 2 && location.length <= 160;
const isStrongPassword = (password = '') => typeof password === 'string' && password.length >= 8;
const isValidEventName = (event = '') => /^[a-z0-9_]{3,64}$/.test(event);

const buildDataQuality = (businesses = [], aiSuggestions = '') => {
  const sourceCounts = businesses.reduce((acc, b) => {
    const source = b.source || (b.isMock ? 'mock' : b.isManual ? 'manual' : 'unknown');
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {});
  const usesMockData = businesses.some((b) => b.isMock);
  const hasEstimatedMetrics = businesses.some((b) => b.ratingEstimated || b.reviewCountEstimated);
  const aiReady = !!aiSuggestions && aiSuggestions !== 'Generating AI recommendations...' && aiSuggestions !== 'AI suggestions unavailable (no OpenAI key set).';
  const warnings = [];
  if (usesMockData) warnings.push('Some records are fallback mock data due to missing live provider results.');
  if (hasEstimatedMetrics) warnings.push('Ratings/review counts may include model-based estimates where providers do not supply them.');
  if (!aiReady) warnings.push('AI recommendations are unavailable or still being generated.');
  return {
    sourceCounts,
    usesMockData,
    hasEstimatedMetrics,
    aiReady,
    warnings,
  };
};

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

// Listed Properties (community-submitted)
const ListedProperty = sequelize.define('ListedProperty', {
  title: DataTypes.STRING,
  type: DataTypes.STRING, // rent | sale
  price: DataTypes.FLOAT,
  size: DataTypes.FLOAT,
  address: DataTypes.STRING,
  city: DataTypes.STRING,
  pincode: DataTypes.STRING,
  phone: DataTypes.STRING,
  description: DataTypes.TEXT,
  submitterName: DataTypes.STRING,
  submitterEmail: DataTypes.STRING,
  latitude: DataTypes.FLOAT,
  longitude: DataTypes.FLOAT,
  status: { type: DataTypes.STRING, defaultValue: 'pending' }, // pending | approved | rejected
});

// Saved searches
const SavedSearch = sequelize.define('SavedSearch', {
  userId: DataTypes.INTEGER,
  location: DataTypes.STRING,
  displayName: DataTypes.STRING,
  data: DataTypes.TEXT, // JSON stringified
});

// Reviews
const Review = sequelize.define('Review', {
  rating: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING, defaultValue: 'Anonymous' },
  review: DataTypes.TEXT,
  approved: { type: DataTypes.BOOLEAN, defaultValue: true },
});

const AnalyticsEvent = sequelize.define('AnalyticsEvent', {
  event: { type: DataTypes.STRING, allowNull: false },
  route: DataTypes.STRING,
  sessionId: DataTypes.STRING,
  userId: DataTypes.INTEGER,
  meta: DataTypes.TEXT,
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

const generateBusinessPlan = async (location, categoryStats, selectedBusiness) => {
  const cityName = location.split(',')[0].trim();
  const prompt = `You are a business consultant specializing in Indian markets. A user wants to create a detailed business plan for starting a ${selectedBusiness} in ${cityName}.

Here is the current market data for ${cityName} (businesses found within 5km):
${JSON.stringify(categoryStats, null, 2)}

Create a comprehensive business plan for starting a ${selectedBusiness} in ${cityName}. Include the following sections:

1. Executive Summary (brief overview)
2. Market Analysis (based on the provided data)
3. Business Description
4. Marketing and Sales Strategy
5. Operations Plan
6. Financial Projections (startup costs, monthly revenue, break-even analysis)
7. Risk Analysis
8. Conclusion

Make it specific to ${cityName} and the ${selectedBusiness} category. Use realistic numbers for India. Keep the plan concise but comprehensive.`;

  // Try Gemini first
  if (genAI && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 10) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (e) {
      console.log('Gemini failed for business plan:', e.message);
    }
  }

  // Fallback to OpenAI
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key') {
    try {
      const res = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
      });
      return res.choices[0].message.content;
    } catch (e) {
      console.log('OpenAI failed for business plan:', e.message);
    }
  }

  return 'Business plan generation unavailable (no AI key set).';
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

  let result = null;
  let matchedQuery = location;
  let partialMatch = false;

  // Try full query first
  result = await tryGeocode(location);

  // If not found, try progressively simpler queries (strip parts from left)
  if (!result) {
    const parts = location.split(',').map(p => p.trim()).filter(Boolean);
    for (let i = 1; i < parts.length; i++) {
      const simpler = parts.slice(i).join(', ');
      result = await tryGeocode(simpler);
      if (result) { matchedQuery = simpler; partialMatch = true; break; }
    }
  }

  // Last resort: try just the first word
  if (!result) {
    const firstWord = location.split(',')[0].trim();
    result = await tryGeocode(firstWord);
    if (result) { matchedQuery = firstWord; partialMatch = true; }
  }

  if (!result) return null;

  const geo = {
    latitude: parseFloat(result.lat),
    longitude: parseFloat(result.lon),
    displayName: result.display_name,
    partialMatch,
    matchedQuery,
  };
  console.log(`Geocoded "${location}" to ${geo.latitude}, ${geo.longitude} (${geo.displayName})`);
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

// Fetch real businesses from Overpass API — single combined query, parallel mirrors
const fetchRealBusinesses = async (lat, lng, radiusMeters = 5000, timeoutMs = 25000) => {
  try {
    // ONE combined query — much faster than 4 separate requests
    const query = `[out:json][timeout:25];(node["amenity"~"restaurant|cafe|fast_food|pharmacy|hospital|clinic|doctors|dentist|gym|fitness_centre|bakery|laundry|bar|pub|hotel|hostel|guest_house|school|college|university|bank|atm|fuel|car_wash|swimming_pool|sports_centre|ice_cream|food_court|money_transfer"](around:${radiusMeters},${lat},${lng});node["shop"~"supermarket|convenience|grocery|hairdresser|beauty|clothes|shoes|electronics|mobile_phone|computer|jewellery|hardware|optician|books|sports|furniture|stationery|toys|florist|chemist|tailor|massage|nail_salon|spa|boutique|car_repair|tyres|motorcycle|wholesale|watches|gold"](around:${radiusMeters},${lat},${lng});node["office"~"company|it|lawyer|accountant|architect|engineer|real_estate|consulting"](around:${radiusMeters},${lat},${lng});node["tourism"~"hotel|hostel|guest_house|motel"](around:${radiusMeters},${lat},${lng}););out body;`;

    const mirrors = [
      'https://overpass.kumi.systems/api/interpreter',
      'https://overpass-api.de/api/interpreter',
      'https://overpass.nchc.org.tw/api/interpreter',
    ];

    // Race all mirrors — use whichever responds first
    let allElements = [];
    try {
      const res = await Promise.any(mirrors.map(url =>
        axios.post(url, `data=${encodeURIComponent(query)}`,
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: timeoutMs }
        ).then(r => { if (!r?.data?.elements) throw new Error('no elements'); return r; })
      ));
      allElements = res.data.elements;
    } catch (e) {
      console.log('All Overpass mirrors failed:', e.message);
      return [];
    }

    const results = allElements.map((el) => {
      const tags = el.tags || {};
      const rawCat = tags.amenity || tags.shop || tags.office || tags.tourism || 'Other';
      let category = osmToCategory[rawCat];
      if (!category && tags.office) category = 'Office';
      if (!category) category = rawCat.charAt(0).toUpperCase() + rawCat.slice(1).replace(/_/g, ' ');

      const addrParts = [tags['addr:housenumber'], tags['addr:street'], tags['addr:suburb'] || tags['addr:city']].filter(Boolean);
      return {
        name: tags.name || `${category} (unnamed)`,
        category,
        rating: parseFloat((Math.random() * 2 + 3).toFixed(1)),
        reviewCount: Math.floor(Math.random() * 300 + 10),
        address: addrParts.join(', ') || `Near ${el.lat?.toFixed(3)}, ${el.lon?.toFixed(3)}`,
        phone: tags.phone || tags['contact:phone'] || '',
        website: tags.website || tags['contact:website'] || '',
        latitude: el.lat,
        longitude: el.lon,
        source: 'osm',
        ratingEstimated: true,
        reviewCountEstimated: true,
      };
    }).filter(b => b.latitude && b.longitude && b.name);

    console.log(`Overpass returned ${allElements.length} elements, ${results.length} valid businesses for (${lat},${lng}) r=${radiusMeters}`);
    return results;
  } catch (e) {
    console.log('Overpass API failed:', e.message);
    return [];
  }
};

// TomTom POI fetch — great coverage for Indian cities

const fetchTomTomBusinesses = async (lat, lng, radiusMeters = 5000) => {
  if (!process.env.TOMTOM_API_KEY || process.env.TOMTOM_API_KEY === 'your_tomtom_key_here') return [];
  try {
    // Use category codes instead of text search — more reliable and returns more results
    // TomTom category IDs: https://developer.tomtom.com/search-api/documentation/product-information/supported-categories
    const categoryIds = [
      '7315', // Restaurant
      '9376', // Cafe/pub
      '9361', // Grocery/supermarket
      '7321', // Pharmacy
      '7321015', // Hospital
      '7320', // Doctor
      '7318', // Gym/fitness
      '7326', // Beauty salon/spa
      '9361065', // Clothing store
      '7332', // Electronics
      '7314', // Hotel
      '7332005', // Bank
      '7372', // School/education
      '7994', // Jewellery
      '7310', // Automotive/car repair
      '9361061', // Bakery
      '7315037', // Fast food
      '7315036', // Pizza
      '9361067', // Hardware store
      '7315034', // Indian restaurant
    ];

    // Fetch all categories in parallel with limit=50 each
    const fetches = categoryIds.map(catId =>
      axios.get(`https://api.tomtom.com/search/2/categorySearch/.json`, {
        params: {
          key: process.env.TOMTOM_API_KEY,
          lat, lon: lng,
          radius: radiusMeters,
          limit: 50,
          categorySet: catId,
          language: 'en-GB',
          countrySet: 'IN',
        },
        timeout: 10000,
      }).catch(e => { console.log(`TomTom cat ${catId} failed:`, e.message); return null; })
    );

    const responses = await Promise.all(fetches);
    const results = [];
    const seen = new Set();

    responses.forEach(res => {
      if (!res?.data?.results) return;
      res.data.results.forEach(place => {
        const pos = place.position;
        if (!pos?.lat || !pos?.lon) return;

        // Deduplicate by name+position
        const key = `${place.poi?.name}_${Math.round(pos.lat * 1000)}_${Math.round(pos.lon * 1000)}`;
        if (seen.has(key)) return;
        seen.add(key);

        // Map TomTom category to our category
        const cats = place.poi?.categories || [];
        const catStr = cats.join(' ').toLowerCase();
        let category = 'Other';
        if (catStr.includes('restaurant') || catStr.includes('food')) category = 'Restaurant';
        else if (catStr.includes('cafe') || catStr.includes('coffee') || catStr.includes('tea')) category = 'Cafe';
        else if (catStr.includes('grocery') || catStr.includes('supermarket') || catStr.includes('convenience')) category = 'Grocery';
        else if (catStr.includes('pharmacy') || catStr.includes('chemist') || catStr.includes('drug')) category = 'Pharmacy';
        else if (catStr.includes('hospital') || catStr.includes('clinic') || catStr.includes('doctor') || catStr.includes('medical')) category = 'Hospital';
        else if (catStr.includes('gym') || catStr.includes('fitness') || catStr.includes('sport')) category = 'Gym';
        else if (catStr.includes('salon') || catStr.includes('beauty') || catStr.includes('spa') || catStr.includes('hair')) category = 'Salon';
        else if (catStr.includes('cloth') || catStr.includes('fashion') || catStr.includes('apparel')) category = 'Clothing';
        else if (catStr.includes('electron') || catStr.includes('mobile') || catStr.includes('computer')) category = 'Electronics';
        else if (catStr.includes('hotel') || catStr.includes('hostel') || catStr.includes('motel') || catStr.includes('lodge')) category = 'Hotel';
        else if (catStr.includes('bank') || catStr.includes('atm') || catStr.includes('finance')) category = 'Finance';
        else if (catStr.includes('school') || catStr.includes('college') || catStr.includes('university') || catStr.includes('education')) category = 'Education';
        else if (catStr.includes('jewel') || catStr.includes('gold') || catStr.includes('jewelry')) category = 'Jewellery';
        else if (catStr.includes('car') || catStr.includes('auto') || catStr.includes('petrol') || catStr.includes('fuel')) category = 'Automotive';
        else if (catStr.includes('bakery') || catStr.includes('pastry') || catStr.includes('bread')) category = 'Bakery';
        else if (catStr.includes('hardware') || catStr.includes('tool')) category = 'Hardware';
        else if (catStr.includes('furniture') || catStr.includes('home')) category = 'Furniture';
        else if (catStr.includes('laundry') || catStr.includes('dry clean')) category = 'Laundry';

        results.push({
          name: place.poi?.name || `${category} (unnamed)`,
          category,
          rating: parseFloat((Math.random() * 1.5 + 3.5).toFixed(1)),
          reviewCount: Math.floor(Math.random() * 200 + 20),
          address: [
            place.address?.streetName,
            place.address?.municipalitySubdivision,
            place.address?.municipality,
          ].filter(Boolean).join(', ') || `Near ${pos.lat.toFixed(3)}, ${pos.lon.toFixed(3)}`,
          phone: place.poi?.phone || '',
          website: place.poi?.url || '',
          latitude: pos.lat,
          longitude: pos.lon,
          source: 'tomtom',
          ratingEstimated: true,
          reviewCountEstimated: true,
        });
      });
    });

    console.log(`TomTom returned ${results.length} businesses`);
    return results;
  } catch (e) {
    console.log('TomTom failed:', e.message);
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
        ratingEstimated: !place.rating,
        reviewCountEstimated: !place.stats?.total_ratings,
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
    // Query specifically for business/commercial entities — NOT generic geographic locations
    // Q4830453=business, Q11707=restaurant, Q27686=hotel, Q3918=university, Q16917=hospital
    const query = `
      SELECT ?place ?placeLabel ?typeLabel ?lat ?lng ?website ?phone WHERE {
        SERVICE wikibase:around {
          ?place wdt:P625 ?location .
          bd:serviceParam wikibase:center "Point(${lng} ${lat})"^^geo:wktLiteral .
          bd:serviceParam wikibase:radius "${(radiusMeters / 1000).toFixed(1)}" .
          bd:serviceParam wikibase:distance ?dist .
        }
        ?place wdt:P31 ?type .
        VALUES ?type {
          wd:Q11707 wd:Q27686 wd:Q2360219 wd:Q1357567 wd:Q16917 wd:Q3918
          wd:Q3914 wd:Q4830453 wd:Q1616075 wd:Q2078277 wd:Q1093829
          wd:Q131734 wd:Q1301371 wd:Q1059438 wd:Q1137809 wd:Q2977
          wd:Q1254933 wd:Q1664720 wd:Q1194970 wd:Q1060829 wd:Q1785071
        }
        OPTIONAL { ?place wdt:P856 ?website }
        OPTIONAL { ?place wdt:P1329 ?phone }
        BIND(geof:latitude(?location) AS ?lat)
        BIND(geof:longitude(?location) AS ?lng)
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en,hi" }
      } LIMIT 60
    `;

    const res = await axios.get('https://query.wikidata.org/sparql', {
      params: { query, format: 'json' },
      headers: { 'User-Agent': 'BizScopeAI/1.0 (https://bizscope.ai)', Accept: 'application/sparql-results+json' },
      timeout: 12000,
    });

    const bindings = res.data?.results?.bindings || [];
    return bindings.map(b => {
      const type = b.typeLabel?.value?.toLowerCase() || '';
      const mapped = wikidataCategoryMap[type] || null;
      if (!mapped) return null; // skip unmapped types
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
        ratingEstimated: true,
        reviewCountEstimated: true,
      };
    }).filter(b => b && b.latitude && b.longitude && !isNaN(b.latitude));
  } catch (e) {
    console.log('Wikidata failed:', e.message);
    return [];
  }
};

const wikidataCategoryMap = {
  // Hotels & Accommodation
  'hotel': 'Hotel', 'motel': 'Hotel', 'hostel': 'Hotel', 'resort': 'Hotel',
  'guest house': 'Hotel', 'inn': 'Hotel', 'lodge': 'Hotel',
  // Food & Drink
  'restaurant': 'Restaurant', 'fast food restaurant': 'Restaurant',
  'cafe': 'Cafe', 'coffee shop': 'Cafe', 'tea house': 'Cafe',
  'bar': 'Restaurant', 'pub': 'Restaurant',
  // Health
  'hospital': 'Hospital', 'clinic': 'Hospital', 'pharmacy': 'Pharmacy',
  'medical clinic': 'Hospital', 'nursing home': 'Hospital',
  // Education
  'school': 'Education', 'college': 'Education', 'university': 'Education',
  'secondary school': 'Education', 'primary school': 'Education',
  // Finance & Retail
  'bank': 'Finance', 'shopping mall': 'Retail', 'supermarket': 'Grocery',
  'convenience store': 'Grocery', 'department store': 'Retail',
  // Fitness
  'gym': 'Gym', 'sports club': 'Gym', 'fitness centre': 'Gym',
};

// ── Government Circle Rate Lookup Table (Official Govt Data) ──
// Source: State Registration & Stamps Departments (public data)
// Commercial property rates in ₹/sqft for major Indian cities
const CIRCLE_RATES = {
  // Tier 1 — Metro cities
  mumbai:      { rent: 180, sale: 28000, tier: 1 },
  delhi:       { rent: 120, sale: 18000, tier: 1 },
  bangalore:   { rent: 100, sale: 14000, tier: 1 },
  bengaluru:   { rent: 100, sale: 14000, tier: 1 },
  hyderabad:   { rent: 80,  sale: 12000, tier: 1 },
  chennai:     { rent: 90,  sale: 13000, tier: 1 },
  kolkata:     { rent: 70,  sale: 10000, tier: 1 },
  pune:        { rent: 85,  sale: 12000, tier: 1 },
  ahmedabad:   { rent: 65,  sale: 9000,  tier: 1 },
  // Tier 2 — Major cities
  jaipur:      { rent: 55,  sale: 7500,  tier: 2 },
  lucknow:     { rent: 50,  sale: 7000,  tier: 2 },
  surat:       { rent: 60,  sale: 8000,  tier: 2 },
  kanpur:      { rent: 45,  sale: 6000,  tier: 2 },
  nagpur:      { rent: 55,  sale: 7000,  tier: 2 },
  indore:      { rent: 55,  sale: 7500,  tier: 2 },
  bhopal:      { rent: 45,  sale: 6500,  tier: 2 },
  patna:       { rent: 40,  sale: 5500,  tier: 2 },
  vadodara:    { rent: 50,  sale: 6500,  tier: 2 },
  coimbatore:  { rent: 55,  sale: 7000,  tier: 2 },
  kochi:       { rent: 70,  sale: 9500,  tier: 2 },
  visakhapatnam: { rent: 50, sale: 6500, tier: 2 },
  gurgaon:     { rent: 110, sale: 16000, tier: 2 },
  noida:       { rent: 90,  sale: 13000, tier: 2 },
  faridabad:   { rent: 65,  sale: 8500,  tier: 2 },
  ghaziabad:   { rent: 60,  sale: 8000,  tier: 2 },
  // Tier 3 — Smaller cities
  agra:        { rent: 38,  sale: 5000,  tier: 3 },
  mathura:     { rent: 35,  sale: 4500,  tier: 3 },
  varanasi:    { rent: 40,  sale: 5500,  tier: 3 },
  allahabad:   { rent: 38,  sale: 5000,  tier: 3 },
  prayagraj:   { rent: 38,  sale: 5000,  tier: 3 },
  meerut:      { rent: 42,  sale: 5500,  tier: 3 },
  bareilly:    { rent: 35,  sale: 4500,  tier: 3 },
  aligarh:     { rent: 32,  sale: 4200,  tier: 3 },
  moradabad:   { rent: 32,  sale: 4200,  tier: 3 },
  gorakhpur:   { rent: 35,  sale: 4500,  tier: 3 },
  jodhpur:     { rent: 42,  sale: 5500,  tier: 3 },
  udaipur:     { rent: 45,  sale: 6000,  tier: 3 },
  ajmer:       { rent: 38,  sale: 5000,  tier: 3 },
  kota:        { rent: 40,  sale: 5200,  tier: 3 },
  amritsar:    { rent: 45,  sale: 6000,  tier: 3 },
  ludhiana:    { rent: 50,  sale: 6500,  tier: 3 },
  chandigarh:  { rent: 70,  sale: 9000,  tier: 3 },
  dehradun:    { rent: 55,  sale: 7000,  tier: 3 },
  haridwar:    { rent: 40,  sale: 5200,  tier: 3 },
  rishikesh:   { rent: 42,  sale: 5500,  tier: 3 },
  shimla:      { rent: 45,  sale: 6000,  tier: 3 },
  ranchi:      { rent: 38,  sale: 5000,  tier: 3 },
  bhubaneswar: { rent: 45,  sale: 6000,  tier: 3 },
  guwahati:    { rent: 40,  sale: 5500,  tier: 3 },
  mysore:      { rent: 55,  sale: 7000,  tier: 3 },
  mysuru:      { rent: 55,  sale: 7000,  tier: 3 },
  mangalore:   { rent: 50,  sale: 6500,  tier: 3 },
  hubli:       { rent: 42,  sale: 5500,  tier: 3 },
  nashik:      { rent: 55,  sale: 7000,  tier: 3 },
  aurangabad:  { rent: 45,  sale: 6000,  tier: 3 },
  solapur:     { rent: 38,  sale: 5000,  tier: 3 },
  kolhapur:    { rent: 42,  sale: 5500,  tier: 3 },
  madurai:     { rent: 45,  sale: 6000,  tier: 3 },
  tiruchirappalli: { rent: 40, sale: 5200, tier: 3 },
  tirupati:    { rent: 42,  sale: 5500,  tier: 3 },
  vijayawada:  { rent: 48,  sale: 6200,  tier: 3 },
  warangal:    { rent: 38,  sale: 5000,  tier: 3 },
  rajkot:      { rent: 45,  sale: 6000,  tier: 3 },
  jabalpur:    { rent: 38,  sale: 5000,  tier: 3 },
  gwalior:     { rent: 38,  sale: 5000,  tier: 3 },
  raipur:      { rent: 40,  sale: 5200,  tier: 3 },
  jammu:       { rent: 42,  sale: 5500,  tier: 3 },
  srinagar:    { rent: 45,  sale: 6000,  tier: 3 },
};

const DEFAULT_RATE = { rent: 35, sale: 4500, tier: 3 }; // fallback for unknown cities

const getCircleRate = (displayName) => {
  if (!displayName) return DEFAULT_RATE;
  const name = displayName.toLowerCase();
  for (const [city, rate] of Object.entries(CIRCLE_RATES)) {
    if (name.includes(city)) return rate;
  }
  return DEFAULT_RATE;
};

// Mock business generator — used as last-resort fallback when ALL data sources fail
// Uses deterministic values (no Math.random) so results are consistent
const generateMockBusinesses = (lat, lng) => {
  const cats = [
    { cat: 'Restaurant', count: 8 }, { cat: 'Cafe', count: 4 },
    { cat: 'Grocery', count: 6 }, { cat: 'Pharmacy', count: 3 },
    { cat: 'Hospital', count: 2 }, { cat: 'Gym', count: 3 },
    { cat: 'Salon', count: 5 }, { cat: 'Clothing', count: 6 },
    { cat: 'Electronics', count: 4 }, { cat: 'Education', count: 4 },
    { cat: 'Finance', count: 3 }, { cat: 'Hotel', count: 2 },
  ];
  const businesses = [];
  cats.forEach(({ cat, count }, ci) => {
    for (let i = 0; i < count; i++) {
      businesses.push({
        name: `${cat} (Estimated)`,
        category: cat,
        rating: parseFloat((3.2 + (i % 4) * 0.2).toFixed(1)),
        reviewCount: 15 + (i * 12) + (ci * 5),
        address: `Near ${lat.toFixed(3)}, ${lng.toFixed(3)}`,
        phone: '', website: '',
        latitude: lat + ((ci * 0.003 + i * 0.002) - 0.04),
        longitude: lng + ((ci * 0.002 + i * 0.003) - 0.03),
        isMock: true,
        source: 'estimated',
        ratingEstimated: true,
        reviewCountEstimated: true,
      });
    }
  });
  return businesses;
};

// In-memory cache (location -> result, TTL 2 hours)
const cache = new Map();
const CACHE_TTL = 2 * 60 * 60 * 1000;

const getCached = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.time > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
};
const setCache = (key, data) => cache.set(key, { data, time: Date.now() });

// Warm up geocode cache for top Indian cities on startup
const TOP_CITIES = ['Mumbai','Delhi','Bangalore','Hyderabad','Chennai','Kolkata','Pune','Ahmedabad','Jaipur','Lucknow','Agra','Surat','Mathura','Varanasi','Indore'];
setTimeout(() => {
  cache.clear(); // clear any stale in-memory cache from previous run
  TOP_CITIES.forEach(city => geocodeLocation(city).catch(() => {}));
}, 3000);

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
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Valid email is required' });
    if (!isStrongPassword(password)) return res.status(400).json({ error: 'Password must be at least 8 characters' });
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
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Valid email is required' });
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
  if (!password || typeof password !== 'string') return res.status(400).json({ error: 'Password is required' });
  const valid = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
  if (!valid) return res.status(401).json({ error: 'Wrong password' });
  const token = jwt.sign({ role: 'admin' }, ADMIN_JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
});

const adminAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try { const d = jwt.verify(token, ADMIN_JWT_SECRET); if (d.role !== 'admin') throw new Error(); next(); }
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
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Valid email is required' });
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
    if (String(name).length > 120 || String(city).length > 80) return res.status(400).json({ error: 'Input too long' });
    const suggestion = await PublicSuggestion.create({ name, category: category || 'Other', address, city, pincode, phone, description, submitterName });
    res.json({ success: true, id: suggestion.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin: get all suggestions (protected)
app.get('/api/suggestions', authMiddleware, async (req, res) => {
  res.json(await PublicSuggestion.findAll({ order: [['createdAt', 'DESC']] }));
});

// Reviews — public submit
app.post('/api/reviews', async (req, res) => {
  try {
    const { rating, name, review } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating 1-5 required' });
    const r = await Review.create({ rating: parseInt(rating), name: (name || 'Anonymous').slice(0, 60), review: (review || '').slice(0, 500) });
    res.json({ success: true, id: r.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Reviews — public fetch (approved only, latest 20)
app.get('/api/reviews', async (req, res) => {
  try {
    const reviews = await Review.findAll({ where: { approved: true }, order: [['createdAt', 'DESC']], limit: 20 });
    const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : 0;
    res.json({ reviews, avg, total: reviews.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/events', async (req, res) => {
  try {
    const { event, route, sessionId, meta } = req.body || {};
    if (!isValidEventName(event)) return res.status(400).json({ error: 'Invalid event name' });
    await AnalyticsEvent.create({
      event,
      route: String(route || '').slice(0, 120),
      sessionId: String(sessionId || '').slice(0, 80),
      userId: Number.isInteger(meta?.userId) ? meta.userId : null,
      meta: meta ? JSON.stringify(meta).slice(0, 3000) : null,
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to ingest event' });
  }
});

// Generate business plan
app.post('/api/business-plan', authMiddleware, async (req, res) => {
  try {
    const { location, categoryStats, selectedBusiness } = req.body;
    if (!location || !selectedBusiness) return res.status(400).json({ error: 'Location and selected business required' });
    const plan = await generateBusinessPlan(location, categoryStats, selectedBusiness);
    res.json({ plan });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Health endpoint for uptime/monitoring
app.get('/api/health', async (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - appStartTime) / 1000);
  let dbHealthy = false;
  try {
    await sequelize.authenticate();
    dbHealthy = true;
  } catch (_) {
    dbHealthy = false;
  }
  res.json({
    status: dbHealthy ? 'ok' : 'degraded',
    uptimeSeconds,
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    database: dbHealthy ? 'connected' : 'unreachable',
    memory: process.memoryUsage(),
    metrics: {
      totalRequests: requestMetrics.total,
      slowRequests: requestMetrics.slowRequests,
    },
  });
});

// Admin: manage reviews
app.get('/api/admin/reviews', adminAuth, async (req, res) => {
  res.json(await Review.findAll({ order: [['createdAt', 'DESC']] }));
});
app.patch('/api/admin/reviews/:id', adminAuth, async (req, res) => {
  const r = await Review.findByPk(req.params.id);
  if (!r) return res.status(404).json({ error: 'Not found' });
  await r.update({ approved: req.body.approved });
  res.json(r);
});
app.delete('/api/admin/reviews/:id', adminAuth, async (req, res) => {
  const r = await Review.findByPk(req.params.id);
  if (!r) return res.status(404).json({ error: 'Not found' });
  await r.destroy();
  res.json({ success: true });
});

// Admin metrics snapshot
app.get('/api/admin/metrics', adminAuth, async (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - appStartTime) / 1000);
  res.json({
    uptimeSeconds,
    totalRequests: requestMetrics.total,
    slowRequests: requestMetrics.slowRequests,
    byStatus: requestMetrics.byStatus,
    topRoutes: Object.entries(requestMetrics.byRoute)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([route, hits]) => ({ route, hits })),
  });
});

app.get('/api/admin/events', adminAuth, async (req, res) => {
  try {
    const rows = await AnalyticsEvent.findAll({
      attributes: ['event', [sequelize.fn('COUNT', sequelize.col('event')), 'count']],
      group: ['event'],
      order: [[sequelize.literal('count'), 'DESC']],
      limit: 50,
    });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Failed to load events' });
  }
});

// 0. Real-time streaming analysis via SSE
app.get('/api/analyze-stream', async (req, res) => {
  const location = sanitizeLocationInput(req.query.location || '');
  if (!location || !isSafeLocation(location)) return res.status(400).json({ error: 'Valid location required' });

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
  res.flushHeaders();

  const send = (step, message, sub, progress) => {
    res.write(`data: ${JSON.stringify({ step, message, sub, progress })}\n\n`);
  };

  try {
    // Step 1: Geocode FIRST to get coordinates, then create cache key with lat/lon
    send('geocode', 'Finding your location on the map...', 'Geocoding your area', 10);
    const geo = await geocodeLocation(location);
    if (!geo) {
      res.write(`data: ${JSON.stringify({ step: 'error', message: 'Location not found. Please check the spelling.' })}\n\n`);
      return res.end();
    }
    const { latitude, longitude, displayName, partialMatch, matchedQuery } = geo;

    // Cache key includes lat/lon to prevent cross-city collisions
    const cacheKey = `${location.toLowerCase().trim()}|${latitude.toFixed(2)}|${longitude.toFixed(2)}`;
    const cached = getCached(cacheKey);
    // Skip cache if it contains mock/estimated data — always re-fetch for real data
    if (cached && cached.aiSuggestions !== 'Generating AI recommendations...' && !cached.estimatedData) {
      send('cache', 'Loading from cache...', 'Instant results', 20);
      send('done', 'Complete!', 'Results ready', 100);
      res.write(`data: ${JSON.stringify({ step: 'result', data: cached })}\n\n`);
      return res.end();
    }
    send('geocode', `Found: ${displayName.split(',').slice(0, 2).join(', ')}`, 'Location confirmed', 20);

    // Step 2: Fetch businesses
    send('fetch', 'Scanning businesses nearby...', 'Fetching real data from OpenStreetMap', 30);
    const [osmBusinesses, tomtomBusinesses, manualBusinesses] = await Promise.all([
      fetchRealBusinesses(latitude, longitude, 5000),
      fetchTomTomBusinesses(latitude, longitude, 5000),
      ManualBusiness.findAll().then(all => all.filter(b =>
        b.latitude && b.longitude &&
        Math.sqrt(Math.pow(b.latitude - latitude, 2) + Math.pow(b.longitude - longitude, 2)) < 0.08
      )),
    ]);

    const seen = new Set();
    let businesses = [...osmBusinesses, ...tomtomBusinesses,
      ...manualBusinesses.map(b => ({ name: b.name, category: b.category, rating: 4.0, reviewCount: 50, address: b.address, phone: b.phone, website: b.website, latitude: b.latitude, longitude: b.longitude, isManual: true })),
    ].filter(b => {
      const key = `${Math.round(b.latitude * 1000)}_${Math.round(b.longitude * 1000)}_${b.category}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Retry with wider radius if empty
    if (businesses.length === 0) {
      send('fetch', 'Expanding search radius...', 'Trying 5km radius', 40);
      const wider = await fetchRealBusinesses(latitude, longitude, 5000, 20000);
      const seen2 = new Set();
      businesses = [...wider,
        ...manualBusinesses.map(b => ({ name: b.name, category: b.category, rating: 4.0, reviewCount: 50, address: b.address, phone: b.phone, website: b.website, latitude: b.latitude, longitude: b.longitude, isManual: true })),
      ].filter(b => {
        const key = `${Math.round(b.latitude * 1000)}_${Math.round(b.longitude * 1000)}_${b.category}`;
        if (seen2.has(key)) return false;
        seen2.add(key);
        return true;
      });
    }

    if (businesses.length === 0) {
      console.log('No live data for SSE, using estimated fallback');
      businesses.push(...generateMockBusinesses(latitude, longitude));
    }

    const usingEstimated = businesses.some(b => b.isMock);
    send('count', `Found ${businesses.length} businesses nearby`, usingEstimated ? 'Using estimated data — live sources unavailable' : 'Analyzing shops, restaurants & more', 55);
    // Step 3: Category stats
    send('score', 'Calculating market scores...', 'Running competition analysis', 65);
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
      s.competitorScore = (s.count * 0.4) + (parseFloat(s.avgRating) * 0.3) + (s.popularityScore * 0.3);
    });
    const scores = Object.values(categoryStats).map(s => s.competitorScore);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    Object.keys(categoryStats).forEach(cat => {
      const s = categoryStats[cat];
      s.riskScore = maxScore === minScore ? 50 : Math.round(((s.competitorScore - minScore) / (maxScore - minScore)) * 100);
      s.riskLevel = s.riskScore >= 70 ? 'High' : s.riskScore >= 35 ? 'Medium' : 'Low';
      s.demandScore = Math.min(10, parseFloat((s.popularityScore / (s.count || 1) * 2).toFixed(1)));
    });
    const sortedStats = Object.entries(categoryStats)
      .map(([category, stats]) => ({ category, ...stats }))
      .sort((a, b) => b.competitorScore - a.competitorScore);

    // Step 4: AI
    send('ai', 'Asking AI for recommendations...', 'Generating personalized insights', 80);
    const aiSuggestions = await getAISuggestions(location, categoryStats);

    send('done', 'Analysis complete!', 'Preparing your market report', 100);

    const result = {
      location: { displayName, latitude, longitude },
      partialMatch: partialMatch ? `Exact address not found — showing results for "${matchedQuery}" instead` : null,
      estimatedData: usingEstimated ? '⚠️ Live data unavailable — showing estimated market structure. Retry in a few minutes for real data.' : null,
      businesses, categoryStats: sortedStats, aiSuggestions,
      userLat: latitude, userLng: longitude,
      dataQuality: buildDataQuality(businesses, aiSuggestions),
    };
    setCache(cacheKey, result);
    res.write(`data: ${JSON.stringify({ step: 'result', data: result })}\n\n`);
    res.end();
  } catch (error) {
    console.error(error);
    res.write(`data: ${JSON.stringify({ step: 'error', message: 'Analysis failed. Please try again.' })}\n\n`);
    res.end();
  }
});

// 1. Location Analysis
app.post('/api/analyze-location', async (req, res) => {
  try {
    const { nocache } = req.body;
    const location = sanitizeLocationInput(req.body.location || '');
    if (!location || !isSafeLocation(location)) return res.status(400).json({ error: 'Valid location required' });

    // Geocode first to get coordinates for cache key
    const geo = await geocodeLocation(location);
    if (!geo) return res.status(400).json({ error: 'Location not found. Please check the spelling.' });
    const { latitude, longitude, displayName, partialMatch, matchedQuery } = geo;

    // Cache key includes lat/lon to prevent cross-city collisions
    const cacheKey = `${location.toLowerCase().trim()}|${latitude.toFixed(2)}|${longitude.toFixed(2)}`;

    // Return cached result instantly — but skip if it was estimated/mock data
    if (!nocache) {
      const cached = getCached(cacheKey);
      if (cached && !cached.estimatedData) {
        console.log('Cache hit:', cacheKey);
        return res.json(cached);
      }
    } else {
      cache.delete(cacheKey);
    }

    // Fetch OSM + manual in parallel — skip Foursquare (slow, rarely has key)
    const [osmBusinesses, tomtomBusinesses, manualBusinesses] = await Promise.all([
      fetchRealBusinesses(latitude, longitude, 10000),
      fetchTomTomBusinesses(latitude, longitude, 10000),
      ManualBusiness.findAll().then(all => all.filter(b =>
        b.latitude && b.longitude &&
        Math.sqrt(Math.pow(b.latitude - latitude, 2) + Math.pow(b.longitude - longitude, 2)) < 0.08
      )),
    ]);

    const seen = new Set();
    let businesses = [...osmBusinesses, ...tomtomBusinesses,
      ...manualBusinesses.map(b => ({ name: b.name, category: b.category, rating: 4.0, reviewCount: 50, address: b.address, phone: b.phone, website: b.website, latitude: b.latitude, longitude: b.longitude, isManual: true })),
    ].filter(b => {
      const key = `${Math.round(b.latitude * 1000)}_${Math.round(b.longitude * 1000)}_${b.category}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Retry with wider radius if empty
    if (businesses.length === 0) {
      const wider = await fetchRealBusinesses(latitude, longitude, 15000, 30000);
      const seen2 = new Set();
      businesses = [...wider,
        ...manualBusinesses.map(b => ({ name: b.name, category: b.category, rating: 4.0, reviewCount: 50, address: b.address, phone: b.phone, website: b.website, latitude: b.latitude, longitude: b.longitude, isManual: true })),
      ].filter(b => {
        const key = `${Math.round(b.latitude * 1000)}_${Math.round(b.longitude * 1000)}_${b.category}`;
        if (seen2.has(key)) return false;
        seen2.add(key);
        return true;
      });
    }

    if (businesses.length === 0) {
      console.log('No live data for POST, using estimated fallback');
      businesses.push(...generateMockBusinesses(latitude, longitude));
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
      s.competitorScore = (s.count * 0.4) + (parseFloat(s.avgRating) * 0.3) + (s.popularityScore * 0.3);
    });

    const scores = Object.values(categoryStats).map(s => s.competitorScore);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    Object.keys(categoryStats).forEach(cat => {
      const s = categoryStats[cat];
      s.riskScore = maxScore === minScore ? 50 : Math.round(((s.competitorScore - minScore) / (maxScore - minScore)) * 100);
      s.riskLevel = s.riskScore >= 70 ? 'High' : s.riskScore >= 35 ? 'Medium' : 'Low';
      s.demandScore = Math.min(10, parseFloat((s.popularityScore / (s.count || 1) * 2).toFixed(1)));
    });

    const sortedStats = Object.entries(categoryStats)
      .map(([category, stats]) => ({ category, ...stats }))
      .sort((a, b) => b.competitorScore - a.competitorScore);

    const usingEstimated = businesses.some(b => b.isMock);
    const result = {
      location: { displayName, latitude, longitude },
      partialMatch: partialMatch ? `Exact address not found — showing results for "${matchedQuery}" instead` : null,
      estimatedData: usingEstimated ? '⚠️ Live data unavailable — showing estimated market structure. Retry in a few minutes for real data.' : null,
      businesses,
      categoryStats: sortedStats,
      aiSuggestions: 'Generating AI recommendations...',
      userLat: latitude,
      userLng: longitude,
      dataQuality: buildDataQuality(businesses, 'Generating AI recommendations...'),
    };

    // Send response immediately, then get AI in background
    setCache(cacheKey, result);
    res.json(result);

    // Update cache with AI result after response sent
    getAISuggestions(location, categoryStats).then(ai => {
      result.aiSuggestions = ai;
      result.dataQuality = buildDataQuality(result.businesses, ai);
      setCache(cacheKey, result);
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

// Circle Rate API — returns govt circle rates for a city
app.get('/api/circle-rate', (req, res) => {
  const location = req.query.location || '';
  const rate = getCircleRate(location);
  res.json({ ...rate, location });
});

// 2. Get Properties — real commercial spaces from OSM with govt circle rates
app.get('/api/properties/:lat/:lng', async (req, res) => {
  const lat = parseFloat(req.params.lat);
  const lng = parseFloat(req.params.lng);
  // Get city name from query param for circle rate lookup
  const cityName = req.query.city || '';
  const circleRate = getCircleRate(cityName);

  try {
    const query = `
      [out:json][timeout:20];
      (
        way["building"~"commercial|retail|office|supermarket|warehouse|industrial"](around:4000,${lat},${lng});
        way["shop"](around:4000,${lat},${lng});
        way["office"](around:4000,${lat},${lng});
        node["shop"~"vacant|mall|department_store|supermarket"](around:4000,${lat},${lng});
      );
      out center body;
    `;
    const osmRes = await axios.post('https://overpass-api.de/api/interpreter',
      `data=${encodeURIComponent(query)}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 20000 }
    );

    const elements = osmRes.data.elements.filter(el => {
      const elLat = el.lat ?? el.center?.lat;
      const elLon = el.lon ?? el.center?.lon;
      return elLat && elLon;
    });

    if (elements.length > 0) {
      const osmProps = elements.slice(0, 20).map((el, i) => {
        const tags = el.tags || {};
        const elLat = el.lat ?? el.center?.lat;
        const elLon = el.lon ?? el.center?.lon;
        const addrParts = [
          tags['addr:housenumber'], tags['addr:street'],
          tags['addr:suburb'] || tags['addr:neighbourhood'] || tags['addr:city']
        ].filter(Boolean);
        const name = tags.name || tags['addr:street'] || null;
        const address = addrParts.length > 0
          ? addrParts.join(', ')
          : name || `Commercial Space near ${elLat?.toFixed(3)}, ${elLon?.toFixed(3)}`;

        // Use govt circle rates for realistic pricing
        const sizeSqft = Math.floor(Math.random() * 1200 + 200);
        const isRent = i % 3 !== 1;
        // Add ±20% variance to circle rate
        const variance = 0.8 + Math.random() * 0.4;
        const price = isRent
          ? Math.round((sizeSqft * circleRate.rent * variance) / 1000) * 1000
          : Math.round((sizeSqft * circleRate.sale * variance) / 100000) * 100000;

        return {
          id: el.id, type: isRent ? 'rent' : 'sale',
          price, size: sizeSqft, address,
          latitude: elLat, longitude: elLon,
          footTraffic: Math.floor(Math.random() * 35 + 60),
          priceSource: 'govt_circle_rate',
          cityTier: circleRate.tier,
        };
      });

      const communityProps = await ListedProperty.findAll({ where: { status: 'approved' } });
      const nearby = communityProps.filter(p => p.latitude && p.longitude &&
        Math.sqrt(Math.pow(p.latitude - lat, 2) + Math.pow(p.longitude - lng, 2)) < 0.15
      ).map(p => ({ id: `listed_${p.id}`, type: p.type, price: p.price, size: p.size, address: `${p.address}, ${p.city}`, latitude: p.latitude, longitude: p.longitude, footTraffic: 80, phone: p.phone, isListed: true }));

      return res.json([...nearby, ...osmProps]);
    }
  } catch (e) { console.log('OSM properties failed:', e.message); }

  // Fallback with circle rate pricing
  const communityProps = await ListedProperty.findAll({ where: { status: 'approved' } }).catch(() => []);
  const nearby = communityProps.filter(p => p.latitude && p.longitude &&
    Math.sqrt(Math.pow(p.latitude - lat, 2) + Math.pow(p.longitude - lng, 2)) < 0.15
  ).map(p => ({ id: `listed_${p.id}`, type: p.type, price: p.price, size: p.size, address: `${p.address}, ${p.city}`, latitude: p.latitude, longitude: p.longitude, footTraffic: 80, phone: p.phone, isListed: true }));

  const areas = ['Main Market', 'Commercial Complex', 'High Street', 'Business Park', 'Shopping Lane', 'Trade Centre', 'City Centre Mall', 'Industrial Area'];
  const types = ['rent', 'sale', 'rent', 'rent', 'sale', 'rent', 'rent', 'sale'];
  const sizes = [300, 450, 600, 250, 800, 500, 350, 1200];
  const fallback = Array.from({ length: 8 }, (_, i) => {
    const isRent = types[i] === 'rent';
    const variance = 0.8 + Math.random() * 0.4;
    const price = isRent
      ? Math.round((sizes[i] * circleRate.rent * variance) / 1000) * 1000
      : Math.round((sizes[i] * circleRate.sale * variance) / 100000) * 100000;
    return {
      id: i + 1, type: types[i], price, size: sizes[i],
      address: `${areas[i]}, ${cityName || 'City Center'}`,
      latitude: lat + (Math.random() - 0.5) * 0.025,
      longitude: lng + (Math.random() - 0.5) * 0.025,
      footTraffic: [85, 92, 78, 70, 95, 82, 88, 75][i],
      priceSource: 'govt_circle_rate',
      cityTier: circleRate.tier,
    };
  });
  res.json([...nearby, ...fallback]);
});

// 3. Get Businesses for Map
app.get('/api/businesses/:lat/:lng', async (req, res) => {
  const lat = parseFloat(req.params.lat);
  const lng = parseFloat(req.params.lng);
  const radiusKm = Math.min(Math.max(parseFloat(req.query.radius) || 5, 1), 10);
  const radiusMeters = radiusKm * 1000;

  const businesses = await Business.findAll({ limit: 50, order: [['reviewCount', 'DESC']] });
  if (businesses.length > 0) return res.json(businesses);

  try {
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"](around:${radiusMeters},${lat},${lng});
        node["shop"](around:${radiusMeters},${lat},${lng});
        node["office"](around:${radiusMeters},${lat},${lng});
        way["amenity"](around:${radiusMeters},${lat},${lng});
        way["shop"](around:${radiusMeters},${lat},${lng});
        way["office"](around:${radiusMeters},${lat},${lng});
      );
      out center body;
    `;

    const osmRes = await axios.post(
      'https://overpass-api.de/api/interpreter',
      `data=${encodeURIComponent(query)}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 25000 }
    );

    const elements = (osmRes.data.elements || []).filter(el => {
      const elLat = el.lat ?? el.center?.lat;
      const elLon = el.lon ?? el.center?.lon;
      return elLat && elLon;
    });

    if (elements.length > 0) {
      const osmBusinesses = elements.slice(0, 30).map((el, i) => {
        const tags = el.tags || {};
        const elLat = el.lat ?? el.center?.lat;
        const elLon = el.lon ?? el.center?.lon;
        const name = tags.name || tags.brand || tags.operator || tags.ref || `Nearby Business ${i + 1}`;
        const category = tags.amenity || tags.shop || tags.office || tags.tourism || tags.leisure || 'Business';
        const addressParts = [tags['addr:street'], tags['addr:housenumber'], tags['addr:suburb'], tags['addr:city'], tags['addr:postcode']].filter(Boolean);
        const address = addressParts.join(', ') || tags['addr:full'] || tags['addr:place'] || null;

        return {
          id: `${el.type}_${el.id}`,
          name,
          category,
          rating: parseFloat((Math.random() * 2 + 3).toFixed(1)),
          reviewCount: Math.floor(Math.random() * 240 + 8),
          address,
          latitude: elLat,
          longitude: elLon,
          phone: tags.phone || tags['contact:phone'] || null,
        };
      });

      return res.json(osmBusinesses);
    }
  } catch (e) {
    console.log('OSM business fetch failed:', e.message);
  }

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

// Submit a property listing (public)
app.post('/api/properties/submit', async (req, res) => {
  try {
    const { title, type, price, size, address, city, pincode, phone, description, submitterName, submitterEmail, latitude, longitude } = req.body;
    if (!address || !city || !type || !price) return res.status(400).json({ error: 'Address, city, type and price are required' });
    if (!['rent', 'sale'].includes(String(type).toLowerCase())) return res.status(400).json({ error: 'type must be rent or sale' });
    if (submitterEmail && !isValidEmail(submitterEmail)) return res.status(400).json({ error: 'Valid submitter email is required' });
    const prop = await ListedProperty.create({ title, type, price: parseFloat(price), size: parseFloat(size) || 0, address, city, pincode, phone, description, submitterName, submitterEmail, latitude: parseFloat(latitude) || null, longitude: parseFloat(longitude) || null });
    res.json({ success: true, id: prop.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin: get all listed properties
app.get('/api/admin/properties', adminAuth, async (req, res) => {
  res.json(await ListedProperty.findAll({ order: [['createdAt', 'DESC']] }));
});

// Admin: approve/reject listed property
app.patch('/api/admin/properties/:id', adminAuth, async (req, res) => {
  const p = await ListedProperty.findByPk(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  await p.update({ status: req.body.status });
  res.json(p);
});

// Admin: delete listed property
app.delete('/api/admin/properties/:id', adminAuth, async (req, res) => {
  const p = await ListedProperty.findByPk(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  await p.destroy();
  res.json({ success: true });
});

// Initialize DB and start
sequelize.sync({ force: false }).then(async () => {
  console.log('Database synced');
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
