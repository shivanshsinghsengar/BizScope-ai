const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const OpenAI = require('openai');
const { Sequelize, DataTypes } = require('sequelize');
const axios = require('axios');
const { Client } = require('pg');
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
app.use('/api/', generalLimiter);
app.use('/api/analyze-location', analysisLimiter);
app.use('/api/auth/', authLimiter);

// Auto-create database
const ensureDatabase = async () => {
  const client = new Client({
    host: 'localhost', user: 'postgres',
    password: process.env.DB_PASSWORD, database: 'postgres',
  });
  await client.connect();
  const res = await client.query("SELECT 1 FROM pg_database WHERE datname='bizscope'");
  if (res.rowCount === 0) {
    await client.query('CREATE DATABASE bizscope');
    console.log('Database bizscope created');
  }
  await client.end();
};

// Database
const sequelize = new Sequelize('bizscope', 'postgres', process.env.DB_PASSWORD, {
  host: 'localhost', dialect: 'postgres', logging: false,
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
  const prompt = `You are a business consultant. Analyze this market data for ${location}:
${JSON.stringify(categoryStats, null, 2)}
Suggest the 5 best businesses to start here. For each, provide:
- Business type
- Demand score (1-10)
- Saturation level (Low/Medium/High) — means how crowded the market is
- Estimated monthly profit in INR
- One key reason why it's a good opportunity
Keep it concise and practical.`;

  // Try Gemini first (free)
  if (genAI && process.env.GEMINI_API_KEY !== 'your_gemini_key_here') {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (e) {
      console.log('Gemini failed, trying OpenAI:', e.message);
    }
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

// Free geocoding via OpenStreetMap Nominatim
const geocodeLocation = async (location) => {
  const key = location.toLowerCase().trim().replace(/\s+/g, ' ');
  if (geocodeCache.has(key)) return geocodeCache.get(key);

  const url = `https://nominatim.openstreetmap.org/search`;
  const res = await axios.get(url, {
    params: { q: location, format: 'json', limit: 1 },
    headers: { 'User-Agent': 'BizScopeAI/1.0' },
    timeout: 6000,
  });
  if (!res.data || res.data.length === 0) return null;
  const result = { latitude: parseFloat(res.data[0].lat), longitude: parseFloat(res.data[0].lon), displayName: res.data[0].display_name };
  geocodeCache.set(key, result);
  return result;
};

// OSM category mapping
const osmToCategory = {
  restaurant: 'Restaurant', cafe: 'Cafe', fast_food: 'Restaurant', bar: 'Restaurant', pub: 'Restaurant',
  food_court: 'Restaurant', ice_cream: 'Cafe', juice_bar: 'Cafe', sweet_shop: 'Restaurant',
  supermarket: 'Grocery', convenience: 'Grocery', grocery: 'Grocery', butcher: 'Grocery', florist: 'Grocery',
  gym: 'Gym', fitness_centre: 'Gym', fitness: 'Gym', sports: 'Gym',
  hairdresser: 'Salon', beauty: 'Salon', tailor: 'Salon',
  pharmacy: 'Pharmacy', chemist: 'Pharmacy', hospital: 'Pharmacy', clinic: 'Pharmacy', medical_supply: 'Pharmacy',
  bakery: 'Bakery',
  laundry: 'Laundry', dry_cleaning: 'Laundry',
  clothes: 'Retail', shoes: 'Retail', electronics: 'Retail', mobile: 'Retail',
  jewellery: 'Retail', hardware: 'Retail', stationery: 'Retail', toys: 'Retail',
  books: 'Retail', furniture: 'Retail', optician: 'Retail',
  bank: 'Finance', atm: 'Finance',
  hotel: 'Hospitality', school: 'Education',
};

// Fetch real businesses from Overpass API (free, no key needed)
const fetchRealBusinesses = async (lat, lng, radiusMeters = 5000) => {
  try {
    // Only nodes (faster than ways), focused tag list
    const query = `
      [out:json][timeout:20];
      (
        node["amenity"~"restaurant|cafe|fast_food|pharmacy|gym|bakery|laundry|bar|pub|hotel|hospital|clinic|school|bank|atm"](around:${radiusMeters},${lat},${lng});
        node["shop"~"supermarket|convenience|grocery|hairdresser|beauty|clothes|shoes|electronics|mobile|jewellery|hardware|bakery|optician|books|sports|furniture"](around:${radiusMeters},${lat},${lng});
      );
      out body;
    `;
    const res = await axios.post('https://overpass-api.de/api/interpreter',
      `data=${encodeURIComponent(query)}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 25000 }
    );
    return res.data.elements.map((el) => {
      const tags = el.tags || {};
      const rawCat = tags.amenity || tags.shop || 'Other';
      const elLat = el.lat;
      const elLon = el.lon;

      const addrParts = [
        tags['addr:housenumber'],
        tags['addr:street'],
        tags['addr:suburb'] || tags['addr:neighbourhood'] || tags['addr:quarter'],
        tags['addr:city'] || tags['addr:town'] || tags['addr:village'],
        tags['addr:state'],
      ].filter(Boolean);
      const address = tags['addr:full'] || (addrParts.length > 0 ? addrParts.join(', ') : null) || null;

      return {
        name: tags.name || `Unnamed ${rawCat}`,
        category: osmToCategory[rawCat] || rawCat.charAt(0).toUpperCase() + rawCat.slice(1),
        rating: parseFloat((Math.random() * 2 + 3).toFixed(1)),
        reviewCount: Math.floor(Math.random() * 300 + 10),
        address: address || `Near ${elLat?.toFixed(3)}, ${elLon?.toFixed(3)}`,
        phone: tags.phone || tags['contact:phone'] || '',
        website: tags.website || tags['contact:website'] || '',
        latitude: elLat,
        longitude: elLon,
      };
    }).filter(b => b.latitude && b.longitude);
  } catch (e) {
    console.log('Overpass API failed:', e.message);
    return [];
  }
};

// In-memory cache (location -> result, TTL 30 mins)
const cache = new Map();
const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours

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
    const { location } = req.body;
    const cacheKey = location.toLowerCase().trim();

    // Return cached result instantly
    const cached = getCached(cacheKey);
    if (cached) {
      console.log('Cache hit:', cacheKey);
      return res.json(cached);
    }

    // Geocode first
    const geo = await geocodeLocation(location);
    if (!geo) return res.status(400).json({ error: 'Location not found' });
    const { latitude, longitude, displayName } = geo;

    // Fetch OSM businesses + manual businesses in parallel
    const [osmBusinesses, manualBusinesses] = await Promise.all([
      fetchRealBusinesses(latitude, longitude, 5000),
      ManualBusiness.findAll().then(all => all.filter(b =>
        b.latitude && b.longitude &&
        Math.sqrt(Math.pow(b.latitude - latitude, 2) + Math.pow(b.longitude - longitude, 2)) < 0.08
      )),
    ]);

    // Merge OSM + manual
    let businesses = [
      ...osmBusinesses,
      ...manualBusinesses.map(b => ({ name: b.name, category: b.category, rating: 4.0, reviewCount: 50, address: b.address, phone: b.phone, website: b.website, latitude: b.latitude, longitude: b.longitude, isManual: true })),
    ];

    // Fallback mock if nothing found
    if (businesses.length === 0) {
      const cats = ['Restaurant', 'Cafe', 'Grocery', 'Gym', 'Salon', 'Pharmacy', 'Bakery', 'Laundry'];
      businesses = Array.from({ length: 30 }, (_, i) => ({
        name: `Business ${i + 1}`, category: cats[Math.floor(Math.random() * cats.length)],
        rating: parseFloat((Math.random() * 2 + 3).toFixed(1)), reviewCount: Math.floor(Math.random() * 500),
        address: `Mock Address ${i + 1}`, phone: '', website: '',
        latitude: latitude + (Math.random() - 0.5) * 0.01, longitude: longitude + (Math.random() - 0.5) * 0.01,
      }));
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

// Initialize DB and start
ensureDatabase().then(() => {
  sequelize.sync({ force: false }).then(async () => {
    console.log('Database synced');
  });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
