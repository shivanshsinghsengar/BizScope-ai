const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const crypto = require('crypto');
const { Sequelize, DataTypes } = require('sequelize');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { scorecardHandler, competitorAlertHandler, revenueEstimateHandler, compareCitiesHandler } = require('./routes_new_features');

dotenv.config();

// Prevent crashes from unhandled errors
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || 'bizscope_secret_2026';
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'bizscope_admin_secret_2026';

if (isProduction && !process.env.JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET not set in production — using fallback');
}
if (isProduction && !process.env.ADMIN_JWT_SECRET) {
  console.warn('WARNING: ADMIN_JWT_SECRET not set in production — using fallback');
}
if (isProduction && !process.env.ADMIN_PASSWORD_HASH) {
  console.warn('WARNING: ADMIN_PASSWORD_HASH not set in production');
}
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const devOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const corsAllowlist = [...new Set([...allowedOrigins, ...devOrigins])];

// Allow all origins — CORS handled at Vercel/CDN level
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

// Trust Render/Railway/Vercel proxy headers
app.set('trust proxy', 1);

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

const buildDataQuality = (businesses = [], aiSuggestions = '', rawSourceCounts = null) => {
  // rawSourceCounts = pre-dedup counts so OSM/Foursquare aren't hidden by dedup
  const sourceCounts = rawSourceCounts || businesses.reduce((acc, b) => {
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
const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { error: 'Too many requests, please try again later.' }, validate: { xForwardedForHeader: false } });
const analysisLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: { error: 'Too many analysis requests. Wait a minute.' }, validate: { xForwardedForHeader: false } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many auth attempts.' }, validate: { xForwardedForHeader: false } });
const adminLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: { error: 'Too many admin login attempts. Try again later.' }, validate: { xForwardedForHeader: false } });
app.use('/api', generalLimiter);
app.use('/api/analyze-location', analysisLimiter);
app.use('/api/auth', authLimiter);

// ── Quick strategy route (registered early to avoid any issues) ──
// Fallback strategy generator — idea-specific, not generic
function generateFallbackStrategy(idea, city, budget, background, timeline) {
  const cityName = city || 'India';
  const ideaL = idea.toLowerCase();
  const budgetNum = budget?.includes('2L') ? 200000 : budget?.includes('50k') ? 50000 : budget?.includes('10k') ? 10000 : 5000;

  // Detect idea type for specific content
  const isFood = /tiffin|food|restaurant|cafe|catering|cook|meal|snack|bakery|chai|dhaba/.test(ideaL);
  const isTech = /app|software|saas|platform|tool|ai|bot|website|tech|digital|online/.test(ideaL);
  const isService = /service|consult|tutor|teach|coach|clean|repair|salon|beauty|fitness|gym/.test(ideaL);
  const isRetail = /shop|store|sell|product|ecommerce|resell|wholesale|kirana|grocery/.test(ideaL);
  const isEducation = /tutor|coaching|course|teach|learn|student|education|training/.test(ideaL);

  // Idea-specific data
  const ideaData = {
    buyer: isFood ? `Working professionals aged 22–35 in PGs and hostels near ${cityName}` :
           isTech ? `Tech-savvy professionals and students aged 20–30 in ${cityName}` :
           isService ? `Busy urban households and professionals in ${cityName}` :
           isRetail ? `Price-conscious shoppers in ${cityName} looking for convenience` :
           `Urban residents aged 25–40 in ${cityName} with disposable income`,

    income: isFood ? '₹15,000–₹40,000/month, spend ₹3,000–₹8,000 on food' :
            isTech ? '₹30,000–₹1,00,000/month, willing to pay for productivity tools' :
            isService ? '₹25,000–₹80,000/month, outsource tasks they hate' :
            '₹20,000–₹60,000/month, value-conscious buyers',

    pain: isFood ? 'Eating out daily is expensive and unhealthy; cooking is not possible in PG' :
          isTech ? 'Current tools are too complex, expensive, or not built for Indian workflows' :
          isService ? 'No time for non-core tasks; existing options are unreliable or overpriced' :
          isRetail ? 'Inconvenient access, high prices, or poor quality from existing options' :
          'Existing solutions are too expensive, unreliable, or not localized for India',

    platform: isFood ? 'WhatsApp groups in PG colonies, Instagram food pages, Swiggy listing' :
              isTech ? 'LinkedIn, Twitter/X, Product Hunt, developer communities' :
              isService ? 'WhatsApp, Instagram, local Facebook groups, JustDial' :
              isRetail ? 'Instagram, WhatsApp Business, Meesho, local markets' :
              'WhatsApp, Instagram, LinkedIn, local community groups',

    tam: isFood ? '₹1,50,000 crore — India food delivery market' :
         isTech ? '₹80,000 crore — India SaaS and digital tools market' :
         isService ? '₹50,000 crore — India home and professional services market' :
         isRetail ? '₹70,000 crore — India e-commerce and retail market' :
         '₹40,000 crore — India urban services market',

    sam: `₹800–3,000 crore in ${cityName} and nearby Tier 1/2 cities`,
    som: `₹5–30 lakh realistically in Year 1 with focused execution`,

    whyNow: isFood ? 'PG population in Indian cities grew 40% post-pandemic; food inflation makes home-cooked meals more valuable' :
            isTech ? 'India added 15M new internet users in 2025; SMBs are digitizing rapidly' :
            isService ? 'Dual-income households rising; time poverty is real in urban India' :
            isRetail ? 'Quick commerce normalized instant delivery expectations; local players can compete' :
            'India\'s middle class grew by 8% in 2025; spending on convenience is at all-time high',

    launchWhere: isFood ? `Start with 2-3 PG colonies within 1km of each other in ${cityName} — walk-in distance for delivery` :
                 isTech ? `Launch on Product Hunt + LinkedIn; target one specific industry vertical first` :
                 isService ? `Start with one residential society or office complex in ${cityName}` :
                 isRetail ? `Start with one WhatsApp group of 200+ people in ${cityName}` :
                 `Start with one tight-knit community — college, office park, or housing society in ${cityName}`,

    competitors: isFood ? [
      'Zomato/Swiggy | Food delivery | 30% commission, impersonal | Your gap: personal relationship, no commission',
      'Local dabbawala | Traditional tiffin | No digital presence, cash only | Your gap: WhatsApp ordering, UPI payment',
      'Rebel Foods/Faasos | Cloud kitchen | Expensive, no customization | Your gap: home-cooked feel, dietary preferences',
    ] : isTech ? [
      'Zoho | Indian SaaS suite | Complex, enterprise-focused | Your gap: simple, mobile-first for SMBs',
      'International tools (Notion/Slack) | Feature-rich | Expensive in ₹, no Hindi support | Your gap: localized, affordable',
      'Freelancers on Upwork | Custom solutions | Inconsistent, no product | Your gap: productized, repeatable',
    ] : isService ? [
      'Urban Company | Home services | Premium pricing, slow response | Your gap: faster, cheaper, personal',
      'Local unorganized workers | Cheap | Unreliable, no accountability | Your gap: verified, rated, digital',
      'Sulekha/JustDial | Lead gen | No quality control | Your gap: curated, guaranteed service',
    ] : [
      'Amazon/Flipkart | Everything | Impersonal, slow delivery | Your gap: hyperlocal, same-day',
      'Local shops | Familiar | No digital presence | Your gap: WhatsApp ordering, delivery',
      'Meesho | Social commerce | Low quality perception | Your gap: curated, quality-focused',
    ],

    mvp: isFood ? 'WhatsApp number + Google Form for orders + home kitchen. No app needed.' :
         isTech ? 'Landing page + manual service delivery. Automate only after 10 paying customers.' :
         isService ? 'WhatsApp Business profile + manual booking. No website needed in Month 1.' :
         isRetail ? 'WhatsApp catalog + UPI payment. No website or app needed.' :
         'WhatsApp Business + manual fulfillment. Build only what customers pay for.',

    pricing: isFood ? `Free trial (3 days) → ₹${Math.round(budgetNum * 0.15)}/month (lunch only) → ₹${Math.round(budgetNum * 0.25)}/month (lunch + dinner)` :
             isTech ? `Free (limited) → ₹${Math.round(budgetNum * 0.1)}/month (basic) → ₹${Math.round(budgetNum * 0.3)}/month (pro)` :
             isService ? `First session free → ₹${Math.round(budgetNum * 0.08)}/session → ₹${Math.round(budgetNum * 0.2)}/month subscription` :
             `Free sample → ₹${Math.round(budgetNum * 0.05)} (starter pack) → ₹${Math.round(budgetNum * 0.15)} (monthly bundle)`,

    guerrilla: isFood ? `Leave a free tiffin sample at the most popular PG in ${cityName} with a QR code to WhatsApp` :
               isTech ? `Post a free tool or template on LinkedIn that solves one specific problem — collect emails` :
               isService ? `Offer free service to 3 influencers in ${cityName} in exchange for an Instagram story` :
               isRetail ? `Set up a free sample stall outside a busy metro station or college gate in ${cityName}` :
               `Give away your service free to 5 well-connected people in ${cityName} and ask for referrals`,

    risk1: isFood ? 'Food quality drops when you scale beyond 20 customers' :
           isTech ? 'Building features nobody asked for wastes 3 months' :
           isService ? 'One bad service experience goes viral on WhatsApp' :
           'Supplier reliability breaks down at scale',

    risk2: isFood ? 'FSSAI license and food safety compliance' :
           isTech ? 'Larger funded competitor launches same product' :
           isService ? 'Key service provider leaves and takes customers' :
           'Cash flow crunch from inventory before revenue arrives',

    founderTalk1: isFood ? `The one thing that will make or break "${idea}" is consistency. Not taste, not price — consistency. If your tiffin is great on Monday and terrible on Thursday, you will lose customers faster than you gained them. Your first 30 days must be about perfecting one meal, not expanding the menu.` :
                  isTech ? `The one thing that will make or break "${idea}" is whether you talk to 20 real users before writing a single line of code. Most tech founders build what they think users want. The ones who win build what users are already paying for in a worse form.` :
                  isService ? `The one thing that will make or break "${idea}" is your first 5 service deliveries. Word of mouth in Indian cities travels fast — one exceptional experience gets you 3 referrals. One bad one gets you 10 negative reviews on WhatsApp groups.` :
                  `The one thing that will make or break "${idea}" is your first 10 customers. Not your product, not your branding. If you can get 10 people to pay you before you have built anything polished, you have a real business.`,

    founderTalk2: isFood ? `The mistake 90% of tiffin founders make is starting with too many menu options. They offer 10 dishes to please everyone and end up with inconsistent quality. Start with 2 dishes done perfectly. Add variety only after you have 50 consistent customers.` :
                  isTech ? `The mistake 90% of tech founders make is spending 3 months building before getting a single paying customer. They confuse building with progress. Real progress is a customer paying you money. Everything else is just activity.` :
                  isService ? `The mistake 90% of service founders make is underpricing to get customers. Low prices attract the worst customers — the ones who complain most and refer least. Price fairly from Day 1 and attract customers who value quality.` :
                  `The mistake 90% of first-time founders make is building before selling. Sell first. Build only what customers are already paying for.`,
  };

  return `## 🎯 IDEA VERDICT
${idea} in ${cityName} — ${isFood ? 'solid demand, execution-heavy, margins depend on scale' : isTech ? 'high potential if you nail the niche, crowded space requires sharp differentiation' : isService ? 'proven model, success depends entirely on service quality and trust' : 'viable if you find the right distribution channel fast'}.
Market Demand: ${isFood ? 8 : isTech ? 7 : isService ? 7 : 6}/10 | ${ideaData.pain.split(';')[0]}
Competition Level: ${isFood ? 7 : isTech ? 8 : isService ? 6 : 7}/10 | ${isFood ? 'Zomato/Swiggy dominate but hyperlocal is wide open' : isTech ? 'Many players but most ignore Indian SMB needs' : isService ? 'Fragmented market — no dominant local player' : 'Established players but hyperlocal gap exists'}
Execution Difficulty: ${isFood ? 7 : isTech ? 6 : isService ? 5 : 6}/10 | ${isFood ? 'Daily operations, food safety, and consistency are hard to maintain' : isTech ? 'Building is easy; finding paying customers is the hard part' : isService ? 'Finding reliable service providers is the main challenge' : 'Inventory and supplier management require discipline'}
Profit Potential: ${isFood ? 7 : isTech ? 9 : isService ? 7 : 6}/10 | ${isFood ? '₹8,000–₹25,000/month per 30 customers at good margins' : isTech ? 'SaaS margins are 70%+ once product is built' : isService ? '₹30,000–₹80,000/month with 20 regular clients' : 'Thin margins but high volume potential'}

---
## 🌍 MARKET REALITY CHECK
1. WHO will pay?
- ${ideaData.buyer}
- ${ideaData.income}
- Pain point: ${ideaData.pain}
- Where online: ${ideaData.platform}

2. HOW BIG?
- TAM: ${ideaData.tam}
- SAM: ${ideaData.sam}
- SOM: ${ideaData.som}

3. WHY NOW?
- ${ideaData.whyNow}
- UPI adoption means frictionless payments for any business model
- ${background === 'Student' ? 'Student founders have unfair access to their own target market' : 'Post-COVID trust in local, known providers over large platforms'}

4. WHERE to launch first?
- ${ideaData.launchWhere}

5. WHAT do they really want?
- Not "${idea}" — they want ${isFood ? 'reliable, healthy food without thinking about it daily' : isTech ? 'to save time and look more professional without learning new tools' : isService ? 'peace of mind that the job will be done right, on time, every time' : 'convenience and trust — the product is secondary'}
- Job-to-be-done: eliminate one recurring daily friction point completely

---
## ⚔️ COMPETITOR MAP
${ideaData.competitors.join('\n')}

Your unfair advantage window: As a ${background?.toLowerCase() || 'founder'} in ${cityName}, you have direct access to your target customer. You can iterate in days, not months. Large players cannot match your personal touch, local knowledge, or speed. Your window is the first 6 months before anyone notices you are growing.

---
## 🚀 GO-TO-MARKET STRATEGY
PHASE 1 — VALIDATE (Week 1-4, zero budget):
- Identify 50 potential customers in your immediate network — friends, classmates, colleagues
- Offer the service free or at cost to 5 people and ask for brutal honest feedback
- ${isFood ? 'Post in 3 PG/hostel WhatsApp groups with a photo of your food and a specific offer' : isTech ? 'Post your idea on LinkedIn and ask "would you pay ₹X for this?" — count serious replies' : isService ? 'Offer free first session to 5 people in your target area' : 'Create a WhatsApp catalog and share with 50 contacts'}
- Success metric: 10 people say "I will pay you money for this" before you build anything

PHASE 2 — LAUNCH (Month 2-3):
- MVP: ${ideaData.mvp}
- Growth channels: ${ideaData.platform.split(',')[0]} (highest ROI) → Instagram content → offline word of mouth
- Pricing: ${ideaData.pricing}
- Guerrilla tactic: ${ideaData.guerrilla}

PHASE 3 — SCALE (Month 4-12):
- Hire first person at 50+ paying customers — ${isFood ? 'delivery/kitchen helper' : isTech ? 'customer support/onboarding' : isService ? 'second service provider' : 'operations/packing'}
- Revenue milestone: ₹${Math.round(budgetNum * 3).toLocaleString('en-IN')}/month before expanding to new areas
- Partnership: ${isFood ? 'Partner with PG owners for bulk deals — they refer all residents' : isTech ? 'Partner with CA firms or business associations for bulk licenses' : isService ? 'Partner with housing societies for exclusive service contracts' : 'Partner with local influencers for affiliate commissions'}
- Big bet: ${isFood ? 'Corporate tiffin contracts — one office = 50 customers at once' : isTech ? 'White-label your tool to agencies who resell to their clients' : isService ? 'Annual maintenance contracts — predictable recurring revenue' : 'Launch a subscription box — monthly recurring revenue'}

---
## 💰 FINANCIAL BLUEPRINT
Month 1: Target ₹${Math.round(budgetNum * 0.4).toLocaleString('en-IN')} — ${isFood ? '15 customers × ₹' + Math.round(budgetNum * 0.025) + '/month' : '10 customers × ₹' + Math.round(budgetNum * 0.04) + '/month'}
Month 3: Break-even at ${isFood ? '25–30 customers' : '20–25 customers'} — cover all direct costs
Month 6: ₹${Math.round(budgetNum * 2.5).toLocaleString('en-IN')}/month profit with ${isFood ? '60–80 customers' : '40–60 customers'}
Key cost to eliminate: ${isFood ? 'Packaging — use reusable containers, charge ₹200 deposit' : isTech ? 'Paid ads — organic content and referrals only in first 6 months' : isService ? 'Paid lead generation — referrals cost zero and convert better' : 'Inventory before orders — take pre-orders, buy only what is sold'}
CAC: ₹${isFood ? '150–300' : isTech ? '300–800' : isService ? '200–500' : '100–400'} via referral | LTV: ₹${isFood ? '4,000–12,000' : isTech ? '6,000–24,000' : isService ? '5,000–15,000' : '2,000–8,000'} over 12 months | ${isFood ? '13:1' : isTech ? '20:1' : isService ? '15:1' : '10:1'} LTV:CAC ratio — healthy

---
## 🆕 MARKET EXPANSION IDEAS
${isFood ? `CORPORATE TIFFIN CONTRACTS — sell to offices, not individuals
Why it works: One B2B deal = 20-50 customers; predictable monthly revenue
How to test: Email 5 offices near you offering a free 3-day trial for their team
Revenue potential: High

DIET-SPECIFIC MENUS — keto, diabetic, Jain, vegan tiffin
Why it works: Underserved niche willing to pay 40% premium for specialized food
How to test: Post "Would you pay ₹200/day for a diabetic-friendly tiffin?" in health groups
Revenue potential: High

TIFFIN SUBSCRIPTION APP — build a simple app for ordering and tracking
Why it works: Reduces WhatsApp chaos; enables auto-renewal and loyalty points
How to test: Use a free tool like Glide to build a no-code app in 1 day
Revenue potential: Medium

COOKING CLASSES — teach your recipes to others on weekends
Why it works: Zero additional cost; monetizes your skill in a second way
How to test: Offer one paid class to 5 people at ₹500 each
Revenue potential: Medium

FRANCHISE MODEL — license your tiffin brand to home cooks in other cities
Why it works: Asset-light expansion; you earn royalty without cooking
How to test: Document your process and offer it to 1 person in another city for ₹5,000
Revenue potential: Moonshot` :

isTech ? `VERTICAL SAAS — build the same tool for one specific industry (CA firms, clinics, schools)
Why it works: Vertical SaaS commands 3x higher prices and lower churn
How to test: Call 10 CA firms in ${cityName} and ask if they would pay ₹2,000/month for your tool
Revenue potential: High

WHATSAPP INTEGRATION — make your tool work inside WhatsApp
Why it works: 500M Indians use WhatsApp daily; zero learning curve for users
How to test: Build a WhatsApp bot version of your core feature in 1 week
Revenue potential: High

GOVERNMENT TENDER — sell to municipal corporations or government schools
Why it works: Large contracts, slow competition, sticky customers
How to test: Register on GeM portal and list your product this week
Revenue potential: Moonshot

RESELLER PROGRAM — let freelancers and agencies resell your tool
Why it works: Zero CAC; resellers bring their own customers
How to test: Offer 30% commission to 5 freelancers in your network
Revenue potential: High

API ACCESS — charge developers to integrate your tool into their products
Why it works: B2B2C model multiplies your reach without marketing spend
How to test: Document your API and post it in 3 developer communities
Revenue potential: Medium` :

`SUBSCRIPTION MODEL — monthly retainer instead of per-session pricing
Why it works: Predictable revenue; customers commit longer and churn less
How to test: Offer 3 existing customers a monthly deal at 15% discount
Revenue potential: High

CORPORATE WELLNESS CONTRACTS — sell to HR departments for employee benefits
Why it works: B2B deals are 10x larger and stickier than individual customers
How to test: Email 5 HR managers in ${cityName} offering a free pilot for their team
Revenue potential: High

TRAIN-THE-TRAINER — certify others to deliver your service in other cities
Why it works: Franchise-lite model; you earn without doing the work
How to test: Document your process and offer certification to 1 person for ₹10,000
Revenue potential: Moonshot

CONTENT MONETIZATION — create YouTube/Instagram content about your niche
Why it works: Content builds trust and drives inbound customers for free
How to test: Post 5 helpful videos and track which drives the most inquiries
Revenue potential: Medium

COMMUNITY MODEL — build a paid WhatsApp/Telegram community around your niche
Why it works: Indians pay for trusted communities; low cost to run
How to test: Create a free group, provide value for 2 weeks, then offer paid tier at ₹299/month
Revenue potential: Medium`}

---
## ⚠️ RISK RADAR
Risk: ${ideaData.risk1}
Probability: High
Kill move: ${isFood ? 'Limit to 20 customers in Month 1 — quality over quantity always' : isTech ? 'Talk to 5 paying customers before building any new feature' : isService ? 'Create a service checklist and quality review after every delivery' : 'Vet every supplier with a small test order before committing'}

Risk: ${ideaData.risk2}
Probability: Medium
Kill move: ${isFood ? 'Register FSSAI in Month 1 — ₹100/year, takes 7 days online' : isTech ? 'Build relationships with 3 potential customers before competitor launches' : isService ? 'Have 2 backup providers for every service category' : 'Maintain 30-day cash reserve before placing large orders'}

Risk: First 10 customers don't convert to paying after free trial
Probability: Medium
Kill move: Pre-sell before delivering — collect 50% payment upfront, balance on delivery

Risk: Negative word-of-mouth from one bad experience
Probability: Medium
Kill move: Over-deliver for first 20 customers — give more than promised, respond in under 1 hour

Risk: Founder burnout from doing everything alone in Month 1-3
Probability: High
Kill move: Automate one task per week — start with WhatsApp auto-replies and Google Form orders

---
## 📅 90-DAY ACTION PLAN
Week 1 | Research | Talk to 20 potential customers, ask: "What is your biggest problem with [current solution]?" | 5 people say "I would pay for this"
Week 2 | Validate | Deliver service free to 5 people, ask for honest feedback | 3 people say "When can I pay you?"
Week 3 | First sale | Convert 3 trial users to paying customers | First ₹ collected — screenshot it
Week 4 | Referrals | Ask each paying customer for 2 referrals with a specific ask | 6 new warm leads
Week 5 | Systems | Set up WhatsApp Business, UPI QR code, basic order tracking sheet | Process orders in under 30 minutes
Week 6 | Content | Post 3 pieces of content showing your work/results on Instagram | 100 new followers
Week 7 | Partnerships | Approach 3 complementary businesses for cross-promotion | 1 partnership confirmed
Week 8 | Pricing | Introduce premium tier to 3 existing customers | 1 upgrade to premium
Week 9 | Feedback | Survey all customers: "What would make you refer us to 3 friends?" | Fix top 2 complaints
Week 10 | Scale prep | Document every process so someone else can do it | Operations manual complete
Week 11 | Hire/delegate | Bring in 1 part-time helper for the most time-consuming task | Free up 15 hours/week
Week 12 | Review | Measure: revenue, customers, CAC, NPS, churn | Hit ₹${Math.round(budgetNum * 1.5).toLocaleString('en-IN')}/month revenue

---
## 💬 FOUNDER'S HONEST TALK
${ideaData.founderTalk1}

${ideaData.founderTalk2}

The one question you must answer before spending a single rupee on "${idea}": "Can I get 3 people to pay me money for this within the next 48 hours — not someday, not after I build the app, but right now?" If yes, you have a business. If no, the idea needs to change, not the execution. Go ask 3 people today.

---
*Strategy generated for: "${idea}" | ${cityName} | ${budget} | ${timeline}*`;
}

app.post('/api/strategy', async (req, res) => {
  try {
    const { idea, city, budget, background, timeline } = req.body;
    if (!idea) return res.status(400).json({ error: 'Business idea is required' });

    const prompt = `You are a world-class business strategist and McKinsey-level market analyst.

User inputs:
- Business Idea: ${idea}
- Target City/Region: ${city || 'India (general)'}
- Budget Range: ${budget || 'Bootstrap'}
- Background: ${background || 'Entrepreneur'}
- Timeline: ${timeline || '6 months'}

Generate a complete business strategy with these EXACT sections:

## 🎯 IDEA VERDICT
One-line honest verdict.
Market Demand: X/10 | reasoning
Competition Level: X/10 | reasoning
Execution Difficulty: X/10 | reasoning
Profit Potential: X/10 | reasoning

---
## 🌍 MARKET REALITY CHECK
1. WHO will pay? (age, income, pain point, where online)
2. HOW BIG? (TAM/SAM/SOM India estimate)
3. WHY NOW? (2025-2026 trend or gap)
4. WHERE to launch first? (specific city/platform)
5. WHAT do they really want? (job-to-be-done)

---
## ⚔️ COMPETITOR MAP
3-5 competitors: Name | What they do | Weakness | Your gap
Your unfair advantage window: [1 paragraph]

---
## 🚀 GO-TO-MARKET STRATEGY
PHASE 1 — VALIDATE (Week 1-4, zero budget):
- Steps to get first 10 paying customers
- Platform + what to say
- Success metric

PHASE 2 — LAUNCH (Month 2-3):
- MVP (what to build, what to skip)
- 3 growth channels by ROI
- Pricing: 3 tiers with ₹ amounts
- Guerrilla tactic for their city

PHASE 3 — SCALE (Month 4-12):
- First hire (when + role)
- Revenue milestone before scaling
- Partnership strategy
- One 10x move

---
## 💰 FINANCIAL BLUEPRINT
Month 1: Revenue target + how
Month 3: Break-even plan
Month 6: Profit projection
Key cost to eliminate
CAC estimate | LTV estimate | reasoning

---
## 🆕 MARKET EXPANSION IDEAS
5 unexpected angles (2 must be India-specific):
ANGLE NAME — description
Why it works: [logic]
How to test: [one experiment]
Revenue potential: Low/Medium/High/Moonshot

---
## ⚠️ RISK RADAR
5 specific risks (not generic):
Risk: [specific]
Probability: Low/Medium/High
Kill move: [exact action]

---
## 📅 90-DAY ACTION PLAN
Week | Focus | Top 3 Actions | Success Signal
(12 weeks, specific actions)

---
## 💬 FOUNDER'S HONEST TALK
3 paragraphs: what makes/breaks it, common mistake, question to answer first.

Use Indian context: ₹, WhatsApp, Instagram, Meesho, Zepto, local cities. Be brutally honest.`;

    let strategy = null;

    if (genAI) {
      for (const m of ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.0-pro']) {
        try {
          const model = genAI.getGenerativeModel({ model: m });
          const result = await model.generateContent(prompt);
          strategy = result.response.text();
          break;
        } catch (e) { console.log(`${m} failed:`, e.message.slice(0, 60)); }
      }
    }

    if (!strategy && openai) {
      try {
        const r = await openai.chat.completions.create({ model: 'gpt-3.5-turbo', messages: [{ role: 'user', content: prompt }], max_tokens: 3000 });
        strategy = r.choices[0].message.content;
      } catch (e) { console.log('OpenAI failed:', e.message.slice(0, 60)); }
    }

    if (!strategy) strategy = generateFallbackStrategy(idea, city, budget, background, timeline);
    res.json({ strategy, idea, city, budget, background, timeline });
  } catch (e) {
    console.error('Strategy error:', e.message);
    res.status(500).json({ error: 'Strategy generation failed.' });
  }
});
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
  plan: { type: DataTypes.STRING, defaultValue: 'free' }, // free | pro
  planExpiry: DataTypes.DATE,
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

// Feedback
const Feedback = sequelize.define('Feedback', {
  type: { type: DataTypes.STRING, defaultValue: 'general' }, // bug | feature | improvement | general
  page: { type: DataTypes.STRING, defaultValue: 'Other' },
  title: DataTypes.STRING,
  message: { type: DataTypes.TEXT, allowNull: false },
  email: DataTypes.STRING,
  rating: { type: DataTypes.INTEGER, defaultValue: 0 },
  status: { type: DataTypes.STRING, defaultValue: 'new' }, // new | read | resolved
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

// Error Log — stores all backend errors for admin visibility
const ErrorLog = sequelize.define('ErrorLog', {
  type: { type: DataTypes.STRING, allowNull: false },       // 'overpass' | 'tomtom' | 'gemini' | 'geocode' | 'db' | 'general'
  message: { type: DataTypes.TEXT, allowNull: false },
  context: DataTypes.TEXT,                                   // JSON: location, lat, lng, etc.
  resolved: { type: DataTypes.BOOLEAN, defaultValue: false },
  autoFixed: { type: DataTypes.BOOLEAN, defaultValue: false },
  fixNote: DataTypes.STRING,                                 // what auto-fix was applied
  severity: { type: DataTypes.STRING, defaultValue: 'warning' }, // 'info' | 'warning' | 'error' | 'critical'
});

// System Health — periodic health check results
const HealthCheck = sequelize.define('HealthCheck', {
  service: { type: DataTypes.STRING, allowNull: false },    // 'overpass' | 'tomtom' | 'gemini' | 'db'
  status: { type: DataTypes.STRING, allowNull: false },     // 'ok' | 'degraded' | 'down'
  latencyMs: DataTypes.INTEGER,
  detail: DataTypes.STRING,
});

// AI Setup — safe initialization
let openai = null;
try {
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
    const OpenAILib = require('openai');
    openai = new OpenAILib({ apiKey: process.env.OPENAI_API_KEY });
  }
} catch (e) { console.log('OpenAI init skipped:', e.message); }

let genAI = null;
try {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 10) {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
} catch (e) { console.log('Gemini init skipped:', e.message); }

const getAISuggestions = async (location, categoryStats, demandSignals = {}, cityTier = 5) => {
  const cityName = location.split(',')[0].trim();
  const { offices = 0, schools = 0, hospitals = 0 } = demandSignals;

  // Accept both array and object — SSE passes object, POST passes array
  const statsArray = Array.isArray(categoryStats)
    ? categoryStats
    : Object.entries(categoryStats).map(([category, stats]) => ({ category, ...stats }));

  const competitionSummary = statsArray
    .slice(0, 8)
    .map(s => `${s.category}: ${s.count} businesses, risk=${s.riskLevel}`)
    .join('; ');

  const totalDemandSignals = offices + schools + hospitals;
  const demandStrength = totalDemandSignals > 15 ? 'Very Strong' : totalDemandSignals > 8 ? 'Strong' : totalDemandSignals > 3 ? 'Moderate' : 'Low';

  const prompt = `You are a market analyst for Indian cities.

Location: ${cityName}
City Tier: ${cityTier === 10 ? 'Tier 1 (Metro)' : cityTier === 7 ? 'Tier 2 (Large city)' : 'Tier 3 (Small city)'}
Competition: ${competitionSummary}
Demand Signals: Offices nearby: ${offices}, Schools nearby: ${schools}, Hospitals nearby: ${hospitals}
Overall Demand Strength: ${demandStrength}

Rules:
- Do NOT say "high risk" only because competitors are many. Competition alone is not risk.
- If demand signals are strong (totalSignals > 8), explicitly say "High competition but strong demand — viable for differentiated players".
- Suggest businesses where Demand > Competition gap is highest.
- Give exactly 5 recommendations.
- For each recommendation provide:
  1. Business Type (be specific, not generic)
  2. Why this area — mention real neighbourhoods, markets, or streets in ${cityName}
  3. Demand vs Competition: one line honest assessment
  4. Opportunity Level: High / Medium / Low
  5. One tip: one actionable differentiator specific to ${cityName}

Format each recommendation as:
**[Business Type]**
Why: [reason]
Demand vs Competition: [assessment]
Opportunity: [High/Medium/Low]
Tip: [specific tip]

Be specific to ${cityName}. Avoid generic advice.`;

  // Try Gemini first (free) — try multiple models in case one hits quota
  if (genAI && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 10) {
    for (const modelName of ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.0-pro']) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        return result.response.text();
      } catch (e) {
        console.log(`Gemini ${modelName} failed:`, e.message?.slice(0, 80));
        // If quota error (429), try next model; other errors break immediately
        if (!e.message?.includes('429') && !e.message?.includes('quota') && !e.message?.includes('RESOURCE_EXHAUSTED')) break;
      }
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
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
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

// ── Self-Healing Error System ──

// Log an error to DB (non-blocking)
const logError = (type, message, context = {}, severity = 'error', autoFixed = false, fixNote = '') => {
  ErrorLog.create({
    type, message,
    context: JSON.stringify(context),
    severity, autoFixed, fixNote,
    resolved: autoFixed,
  }).catch(() => {}); // never throw from logger
  console.error(`[${severity.toUpperCase()}][${type}] ${message}`, context);
};

// Mark an error as resolved
const resolveError = async (id, fixNote = 'Manually resolved') => {
  await ErrorLog.update({ resolved: true, fixNote }, { where: { id } }).catch(() => {});
};

// Health check for all external services
const runHealthChecks = async () => {
  const checks = [
    {
      service: 'overpass',
      check: async () => {
        const start = Date.now();
        const res = await axios.post('https://overpass-api.de/api/interpreter',
          'data=[out:json][timeout:5];node["amenity"="cafe"](around:100,28.6139,77.2090);out body;',
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 8000 }
        );
        return { ok: !!res.data?.elements, latency: Date.now() - start };
      }
    },
    {
      service: 'nominatim',
      check: async () => {
        const start = Date.now();
        const res = await axios.get('https://nominatim.openstreetmap.org/search?q=Delhi&format=json&limit=1',
          { headers: { 'User-Agent': 'BizScopeAI/1.0' }, timeout: 6000 }
        );
        return { ok: res.data?.length > 0, latency: Date.now() - start };
      }
    },
    {
      service: 'gemini',
      check: async () => {
        if (!genAI) return { ok: false, latency: 0, detail: 'No API key' };
        const start = Date.now();
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        await model.generateContent('Say OK');
        return { ok: true, latency: Date.now() - start };
      }
    },
    {
      service: 'database',
      check: async () => {
        const start = Date.now();
        await sequelize.authenticate();
        return { ok: true, latency: Date.now() - start };
      }
    },
  ];

  for (const { service, check } of checks) {
    try {
      const result = await check();
      const status = result.ok ? (result.latency > 5000 ? 'degraded' : 'ok') : 'down';
      await HealthCheck.create({ service, status, latencyMs: result.latency || 0, detail: result.detail || null });
      if (status === 'down') {
        logError(service, `${service} health check failed`, {}, 'critical');
      } else if (status === 'degraded') {
        logError(service, `${service} is slow (${result.latency}ms)`, { latency: result.latency }, 'warning');
      }
    } catch (e) {
      await HealthCheck.create({ service, status: 'down', latencyMs: 0, detail: e.message });
      logError(service, `${service} health check threw: ${e.message}`, {}, 'critical');
    }
  }
};

// Run health checks every 10 minutes
setInterval(() => { runHealthChecks().catch(() => {}); }, 10 * 60 * 1000);
// Run once after 60s startup delay
setTimeout(() => { runHealthChecks().catch(() => {}); }, 60000);

// Geocode cache (in-memory, no expiry — city coords don't change)
const geocodeCache = new Map();

// AI-powered location normalizer — fixes spelling, transliterates Hindi area names,
// and suggests the closest known locality when the input doesn't match OSM data.
// Returns: { normalized: string, corrected: bool, note: string|null }
const normalizeLocationWithAI = async (street, city, pincode, countryCode) => {
  // Build a readable input string for AI
  const parts = [street, city, pincode].filter(p => p && p.trim());
  const rawInput = parts.join(', ');

  // If Gemini not available, return as-is
  if (!genAI) return { normalized: rawInput, corrected: false, note: null };

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const countryHint = countryCode === 'IN' ? 'India' : (countryCode || 'India');

    const prompt = `You are a location spelling corrector for ${countryHint}.

User entered this location:
- Street/Area: "${street || ''}"
- City: "${city || ''}"
- Pincode: "${pincode || ''}"

Your job:
1. Fix any spelling mistakes in the area/street name (e.g. "madhavpuri" → "Madhavpuri", "koramangla" → "Koramangala")
2. If the area name looks like a Hindi transliteration, keep it but fix spelling (e.g. "vrindavan" is correct, "vrindabn" → "Vrindavan")
3. If the area name is completely unrecognizable, suggest the closest real locality in that city
4. Return ONLY a JSON object, no explanation, no markdown:
{"normalized":"<corrected full location string>","corrected":<true|false>,"note":"<short note if corrected, else null>"}

Examples:
- Input: street="madhavpuri", city="mathura" → {"normalized":"Madhavpuri, Mathura","corrected":false,"note":null}
- Input: street="koramangla", city="bangalore" → {"normalized":"Koramangala, Bangalore","corrected":true,"note":"Corrected koramangla → Koramangala"}
- Input: street="vrindabn", city="mathura" → {"normalized":"Vrindavan, Mathura","corrected":true,"note":"Corrected vrindabn → Vrindavan"}
- Input: street="sadar bazar", city="mathura" → {"normalized":"Sadar Bazaar, Mathura","corrected":false,"note":null}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Extract JSON — strip markdown code fences if present
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { normalized: rawInput, corrected: false, note: null };

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      normalized: parsed.normalized || rawInput,
      corrected: !!parsed.corrected,
      note: parsed.note || null,
    };
  } catch (e) {
    console.log('AI location normalization failed:', e.message);
    return { normalized: rawInput, corrected: false, note: null };
  }
};

// Free geocoding via OpenStreetMap Nominatim — primary geocoder
// Google Geocoding removed (billing required, REQUEST_DENIED)
const geocodeLocation = async (location, countryCode = null, structuredParts = null) => {
  const cacheKey = (location + '|' + (countryCode || '')).toLowerCase().trim().replace(/\s+/g, ' ');
  if (geocodeCache.has(cacheKey)) return geocodeCache.get(cacheKey);

  // ── Nominatim ────────────────────────────────────────────────────────────
  const tryGeocode = async (query, cc) => {
    const url = `https://nominatim.openstreetmap.org/search`;
    const params = { q: query, format: 'json', limit: 1, addressdetails: 1 };
    if (cc && /^[A-Z]{2}$/.test(cc)) params.countrycodes = cc.toLowerCase();
    const res = await axios.get(url, {
      params,
      headers: { 'User-Agent': 'BizScopeAI/1.0' },
      timeout: 6000,
    });
    return res.data && res.data.length > 0 ? res.data[0] : null;
  };

  // Structured search — Nominatim understands street+city separately, much more accurate
  const tryStructuredGeocode = async (street, city, postalcode, cc) => {
    const url = `https://nominatim.openstreetmap.org/search`;
    const params = { format: 'json', limit: 1, addressdetails: 1 };
    if (street)     params.street = street;
    if (city)       params.city   = city;
    if (postalcode) params.postalcode = postalcode;
    if (cc && /^[A-Z]{2}$/.test(cc)) params.countrycodes = cc.toLowerCase();
    const res = await axios.get(url, {
      params,
      headers: { 'User-Agent': 'BizScopeAI/1.0' },
      timeout: 6000,
    });
    return res.data && res.data.length > 0 ? res.data[0] : null;
  };

  let result = null;
  let matchedQuery = location;
  let partialMatch = false;

  // Step 1: Try structured search first (most accurate — uses street/city/pincode separately)
  if (structuredParts && (structuredParts.street || structuredParts.city)) {
    result = await tryStructuredGeocode(
      structuredParts.street,
      structuredParts.city,
      structuredParts.pincode,
      countryCode
    ).catch(() => null);
    if (result) {
      console.log(`Structured geocode hit for street="${structuredParts.street}" city="${structuredParts.city}"`);
    }
  }

  // Step 2: Try full free-text query
  if (!result) {
    result = await tryGeocode(location, countryCode);
  }

  // Step 3: If structured parts available, try area+city without pincode
  if (!result && structuredParts && structuredParts.street && structuredParts.city) {
    const areaCity = `${structuredParts.street}, ${structuredParts.city}`;
    result = await tryGeocode(areaCity, countryCode);
    if (result) { matchedQuery = areaCity; partialMatch = false; }
  }

  // Step 4: Try just city + pincode (pincode gives precise area centroid)
  if (!result && structuredParts && structuredParts.city && structuredParts.pincode) {
    result = await tryStructuredGeocode(null, structuredParts.city, structuredParts.pincode, countryCode).catch(() => null);
    if (result) { matchedQuery = `${structuredParts.city} - ${structuredParts.pincode}`; partialMatch = true; }
  }

  // Step 5: Progressively strip parts from left (existing fallback)
  if (!result) {
    const parts = location.split(',').map(p => p.trim()).filter(Boolean);
    for (let i = 1; i < parts.length; i++) {
      const simpler = parts.slice(i).join(', ');
      result = await tryGeocode(simpler, countryCode);
      if (result) { matchedQuery = simpler; partialMatch = true; break; }
    }
  }

  // Step 6: Last resort — just city name
  if (!result && structuredParts && structuredParts.city) {
    result = await tryGeocode(structuredParts.city, countryCode);
    if (result) { matchedQuery = structuredParts.city; partialMatch = true; }
  }

  if (!result) return null;

  const geo = {
    latitude: parseFloat(result.lat),
    longitude: parseFloat(result.lon),
    displayName: result.display_name || matchedQuery || location,
    partialMatch,
    matchedQuery,
  };
  console.log(`Geocoded "${location}" → ${geo.latitude}, ${geo.longitude} (matched: "${matchedQuery}")`);
  geocodeCache.set(cacheKey, geo);
  return geo;
};

// OSM category mapping — comprehensive
const osmToCategory = {
  // Food & Drink
  restaurant: 'Restaurant', fast_food: 'Restaurant', food_court: 'Restaurant',
  bar: 'Restaurant', pub: 'Restaurant', nightclub: 'Restaurant', casino: 'Restaurant',
  marketplace: 'Retail', deli: 'Restaurant', butcher: 'Grocery', seafood: 'Grocery',
  greengrocer: 'Grocery', alcohol: 'Grocery', beverages: 'Grocery',
  // Leisure
  fitness_centre: 'Gym', sports_centre: 'Gym', swimming_pool: 'Gym', stadium: 'Gym',
  bowling_alley: 'Gym', climbing: 'Gym', yoga: 'Gym', dance: 'Gym', martial_arts: 'Gym',
  trampoline_park: 'Gym', amusement_arcade: 'Gym', escape_game: 'Gym',
  // Education extras
  driving_school: 'Education', language_school: 'Education', music_school: 'Education',
  dance_school: 'Education', art_school: 'Education', kindergarten: 'Education',
  childcare: 'Education', library: 'Education',
  // Health extras
  nursing_home: 'Hospital', veterinary: 'Hospital', physiotherapist: 'Hospital',
  alternative: 'Hospital', optician: 'Pharmacy',
  // Retail extras
  gift: 'Retail', art: 'Retail', craft: 'Retail', fabric: 'Retail', sewing: 'Retail',
  leather: 'Retail', bags: 'Retail', accessories: 'Retail', cosmetics: 'Salon',
  perfumery: 'Salon', second_hand: 'Retail', charity: 'Retail', antiques: 'Retail',
  interior_decoration: 'Furniture', kitchen: 'Furniture', bathroom: 'Furniture',
  garden_centre: 'Retail', pet: 'Retail', bicycle: 'Retail', outdoor: 'Retail',
  travel_agency: 'Office', ticket: 'Retail', copyshop: 'Retail', printing: 'Retail',
  photo: 'Retail', music: 'Retail', musical_instrument: 'Retail', games: 'Retail',
  // Tourism
  museum: 'Other', gallery: 'Other', attraction: 'Other', theme_park: 'Other',
  zoo: 'Other', aquarium: 'Other', viewpoint: 'Other',
  // Services
  post_office: 'Finance', police: 'Other', fire_station: 'Other',
  cinema: 'Other', theatre: 'Other', studio: 'Other',
  community_centre: 'Other', social_facility: 'Other', place_of_worship: 'Other',
  // Office extras
  insurance: 'Finance', financial: 'Finance', employment_agency: 'Office',
  advertising: 'Office', marketing: 'Office', media: 'Office', research: 'Office',
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

// Deterministic pseudo-random — same input always gives same output
// Prevents rating/review fluctuation on every analysis
const deterministicRandom = (seed) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return Math.abs(h) / 2147483647;
};

const stableRating = (name, category) => {
  const r = deterministicRandom(`${name}_${category}_rating`);
  return parseFloat((r * 2 + 3).toFixed(1)); // 3.0 – 5.0
};

const stableReviews = (name, category, max = 300) => {
  const r = deterministicRandom(`${name}_${category}_reviews`);
  return Math.floor(r * max + 10);
};

// ── Smart merge: compare TomTom vs OSM, take best of each ──
// - Business count: whichever source gives MORE unique businesses wins
// - Category: per-category, whichever source has MORE businesses for that category wins
// - Dedup: name+position based (not category+position)
const mergeSmarter = (tomtomList = [], osmList = []) => {
  const dedup = (list) => {
    const seen = new Set();
    return list.filter(b => {
      const nameKey = (b.name || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
      const posKey = `${Math.round((b.latitude || 0) * 2000)}_${Math.round((b.longitude || 0) * 2000)}`;
      const key = nameKey.length > 2 ? `${nameKey}_${posKey}` : `${posKey}_${b.category}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const ttUnique = dedup(tomtomList);
  const osmUnique = dedup(osmList);

  // Count categories per source
  const ttCats = ttUnique.reduce((acc, b) => { acc[b.category] = (acc[b.category] || 0) + 1; return acc; }, {});
  const osmCats = osmUnique.reduce((acc, b) => { acc[b.category] = (acc[b.category] || 0) + 1; return acc; }, {});

  // All categories from both sources
  const allCats = new Set([...Object.keys(ttCats), ...Object.keys(osmCats)]);

  const merged = [];

  allCats.forEach(cat => {
    const ttCount = ttCats[cat] || 0;
    const osmCount = osmCats[cat] || 0;

    if (ttCount >= osmCount) {
      // TomTom wins for this category
      merged.push(...ttUnique.filter(b => b.category === cat));
    } else {
      // OSM wins for this category
      merged.push(...osmUnique.filter(b => b.category === cat));
    }
  });

  // Final dedup on merged result
  const final = dedup(merged);

  console.log(`[mergeSmarter] TomTom: ${ttUnique.length} | OSM: ${osmUnique.length} | Merged: ${final.length}`);
  console.log(`[mergeSmarter] Category winners:`, Object.fromEntries(
    [...allCats].map(cat => [cat, (ttCats[cat] || 0) >= (osmCats[cat] || 0) ? `TomTom(${ttCats[cat]||0})` : `OSM(${osmCats[cat]||0})`])
  ));

  return final;
};

// ── Hyperlocal Hot Spot Analysis ──────────────────────────────────────────────
// Uses the already-fetched businesses array to identify high-footfall anchor points
// (temples, markets, bus stands, hospitals, colleges) and finds gaps near them.
// Returns top 5 "hot spots" with: anchor name, type, footfall level,
// nearby competitor count, recommended business type, and reason.

const ANCHOR_CATEGORIES = {
  // Religious — highest footfall in pilgrimage cities
  temple:       { label: 'Temple / Mandir',    icon: '🛕', footfall: 'Very High', keyword: ['temple','mandir','mosque','church','gurudwara','dargah','ashram','shrine','devsthana','devasthan'] },
  // Transport
  transit:      { label: 'Bus / Railway Hub',  icon: '🚌', footfall: 'High',      keyword: ['bus stand','bus station','railway','metro','auto stand','taxi stand','junction','terminus'] },
  // Education
  college:      { label: 'College / School',   icon: '🎓', footfall: 'High',      keyword: ['college','university','school','institute','academy','coaching','polytechnic','iit','nit'] },
  // Markets
  market:       { label: 'Market / Bazaar',    icon: '🛍️', footfall: 'Very High', keyword: ['market','bazaar','bazar','mandi','chowk','ganj','haat','mall','plaza','complex'] },
  // Medical
  hospital:     { label: 'Hospital / Clinic',  icon: '🏥', footfall: 'High',      keyword: ['hospital','clinic','medical','nursing','health','dispensary','maternity','diagnostic'] },
  // Tourism
  tourist:      { label: 'Tourist Spot',       icon: '🏛️', footfall: 'High',      keyword: ['museum','fort','palace','ghat','kund','kund','garden','park','monument','heritage'] },
  // Hotels
  hotel:        { label: 'Hotel / Dharamshala',icon: '🏨', footfall: 'Medium',    keyword: ['hotel','dharamshala','dharmshala','guest house','guesthouse','resort','lodge','inn','bhavan'] },
};

// What to sell near each anchor type
const ANCHOR_RECOMMENDATIONS = {
  temple:   [
    { category: 'Grocery',    reason: 'Pilgrims buy puja items, flowers, offerings daily' },
    { category: 'Restaurant', reason: 'Devotees need sattvic meals before/after darshan' },
    { category: 'Retail',     reason: 'Religious items, malas, idols — high tourist purchase rate' },
    { category: 'Clothing',   reason: 'Pilgrims buy traditional attire for rituals' },
  ],
  transit:  [
    { category: 'Restaurant', reason: 'Travelers need quick meals while waiting' },
    { category: 'Grocery',    reason: 'Snacks and essentials for journey' },
    { category: 'Retail',     reason: 'Luggage, accessories, essentials sell well' },
    { category: 'Pharmacy',   reason: 'Travelers often need medicines urgently' },
  ],
  college:  [
    { category: 'Cafe',       reason: 'Students spend hours studying in cafes' },
    { category: 'Grocery',    reason: 'Hostel students need daily essentials' },
    { category: 'Education',  reason: 'Coaching and tutoring always in demand' },
    { category: 'Restaurant', reason: 'Affordable canteen-style food always needed' },
    { category: 'Laundry',    reason: 'Hostel students outsource laundry' },
  ],
  market:   [
    { category: 'Finance',    reason: 'Traders and shoppers need banking/ATM access' },
    { category: 'Wholesale',  reason: 'Bulk buying anchors attract wholesale demand' },
    { category: 'Restaurant', reason: 'Shoppers and traders need nearby food' },
    { category: 'Retail',     reason: 'Add-on retail thrives in busy market zones' },
  ],
  hospital: [
    { category: 'Pharmacy',   reason: 'Patients and visitors buy medicines immediately' },
    { category: 'Grocery',    reason: 'Families staying for patient care need daily items' },
    { category: 'Restaurant', reason: 'Attendants of patients need affordable food' },
    { category: 'Laundry',    reason: 'Long-stay families need laundry services' },
  ],
  tourist:  [
    { category: 'Restaurant', reason: 'Tourists explore local cuisine near attractions' },
    { category: 'Retail',     reason: 'Souvenirs and local crafts sell well near tourist spots' },
    { category: 'Hotel',      reason: 'Accommodation demand near popular tourist spots' },
    { category: 'Cafe',       reason: 'Photo stops and resting points near sightseeing areas' },
  ],
  hotel:    [
    { category: 'Restaurant', reason: 'Hotel guests want dining options nearby' },
    { category: 'Pharmacy',   reason: 'Travelers frequently need medicines' },
    { category: 'Grocery',    reason: 'Guests buy snacks and daily items' },
    { category: 'Laundry',    reason: 'Long-stay guests need laundry' },
  ],
};

const computeHotSpots = (businesses, locationType = 'general') => {
  if (!businesses || businesses.length === 0) return [];

  // Step 1: Identify anchor businesses from the fetched data
  const anchors = [];
  businesses.forEach(b => {
    if (!b.name || !b.latitude || !b.longitude) return;
    const nameLower = b.name.toLowerCase();
    for (const [type, config] of Object.entries(ANCHOR_CATEGORIES)) {
      if (config.keyword.some(kw => nameLower.includes(kw))) {
        anchors.push({
          name: b.name,
          type,
          label: config.label,
          icon: config.icon,
          footfall: config.footfall,
          lat: b.latitude,
          lng: b.longitude,
        });
        break; // one anchor type per business
      }
    }
  });

  if (anchors.length === 0) return [];

  // Step 2: For each anchor, count how many commercial businesses are within 300m
  const haversineKm = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const RADIUS_KM = 0.3; // 300m gap analysis

  const scoredAnchors = anchors.map(anchor => {
    const nearby = businesses.filter(b =>
      b.latitude && b.longitude &&
      haversineKm(anchor.lat, anchor.lng, b.latitude, b.longitude) <= RADIUS_KM
    );
    const nearbyCats = nearby.reduce((acc, b) => {
      acc[b.category] = (acc[b.category] || 0) + 1;
      return acc;
    }, {});

    // Get recommendations for this anchor type, filtered by what's MISSING nearby
    const recs = (ANCHOR_RECOMMENDATIONS[anchor.type] || ANCHOR_RECOMMENDATIONS.temple);
    const gapRecs = recs
      .map(r => ({ ...r, existingCount: nearbyCats[r.category] || 0 }))
      .filter(r => r.existingCount <= 2) // gap = 2 or fewer nearby
      .sort((a, b) => a.existingCount - b.existingCount) // least saturated first
      .slice(0, 2);

    const gapScore = gapRecs.length > 0 ? (10 - nearby.length * 0.1) : 0;
    const footfallScore = anchor.footfall === 'Very High' ? 3 : anchor.footfall === 'High' ? 2 : 1;

    return {
      ...anchor,
      nearbyCount: nearby.length,
      gapScore: Math.max(0, gapScore + footfallScore),
      recommendations: gapRecs,
      nearbyCats,
    };
  });

  // Step 3: Deduplicate by proximity (merge anchors within 100m of each other — same cluster)
  const seen = [];
  const deduped = scoredAnchors.filter(a => {
    const tooClose = seen.some(s => haversineKm(a.lat, a.lng, s.lat, s.lng) < 0.1 && s.type === a.type);
    if (!tooClose) seen.push(a);
    return !tooClose;
  });

  // Step 4: Return top 5 by gap score, only if there are actual recommendations
  return deduped
    .filter(a => a.recommendations.length > 0)
    .sort((a, b) => b.gapScore - a.gapScore)
    .slice(0, 5)
    .map(a => ({
      anchorName: a.name,
      anchorType: a.type,
      anchorLabel: a.label,
      icon: a.icon,
      footfall: a.footfall,
      lat: a.lat,
      lng: a.lng,
      nearbyBusinessCount: a.nearbyCount,
      recommendations: a.recommendations,
      gapScore: parseFloat(a.gapScore.toFixed(1)),
      insight: `${a.recommendations[0]?.category || ''} near ${a.name.split(' ').slice(0,4).join(' ')} — ${a.recommendations[0]?.reason || ''}`,
    }));
};

const fetchRealBusinesses = async (lat, lng, radiusMeters = 8000, timeoutMs = 12000) => {
  try {
    // Query node + way — Indian businesses are often mapped as ways (buildings)
    // timeout:25 gives Overpass enough time for dense cities like Mumbai/Delhi
    const amenityVals = "restaurant|cafe|fast_food|pharmacy|hospital|clinic|doctors|dentist|gym|fitness_centre|bakery|laundry|bar|pub|hotel|hostel|guest_house|school|college|university|bank|atm|fuel|car_wash|swimming_pool|sports_centre|ice_cream|food_court|money_transfer|marketplace|post_office|library|cinema|theatre|nursing_home|veterinary|optician|physiotherapist|studio";
    const shopVals = "supermarket|convenience|grocery|hairdresser|beauty|clothes|shoes|electronics|mobile_phone|computer|jewellery|hardware|books|sports|furniture|stationery|toys|florist|chemist|tailor|massage|nail_salon|spa|boutique|car_repair|tyres|motorcycle|wholesale|watches|gold|bakery|confectionery|pastry|deli|butcher|greengrocer|cosmetics|medical_supply|bicycle|outdoor|gift|art|electrical|paint|pet|second_hand|fabric|bags|accessories|perfumery|kitchen|carpet|interior_decoration|department_store|mall|variety_store|clothing|fashion|apparel";
    const officeVals = "company|it|lawyer|accountant|architect|engineer|real_estate|consulting|insurance|financial|travel_agent|employment_agency|advertising|educational_institution";
    const tourismVals = "hotel|hostel|guest_house|motel|apartment";
    const leisureVals = "fitness_centre|gym|sports_centre|swimming_pool|bowling_alley|yoga|dance|martial_arts";

    const buildOsmQuery = (clat, clng, r) =>
      `[out:json][timeout:30];(`
      + `node["amenity"~"${amenityVals}"]["name"](around:${r},${clat},${clng});`
      + `way["amenity"~"${amenityVals}"]["name"](around:${r},${clat},${clng});`
      + `node["shop"~"${shopVals}"]["name"](around:${r},${clat},${clng});`
      + `way["shop"~"${shopVals}"]["name"](around:${r},${clat},${clng});`
      + `node["office"~"${officeVals}"]["name"](around:${r},${clat},${clng});`
      + `way["office"~"${officeVals}"]["name"](around:${r},${clat},${clng});`
      + `node["tourism"~"${tourismVals}"]["name"](around:${r},${clat},${clng});`
      + `way["tourism"~"${tourismVals}"]["name"](around:${r},${clat},${clng});`
      + `node["leisure"~"${leisureVals}"]["name"](around:${r},${clat},${clng});`
      + `way["leisure"~"${leisureVals}"]["name"](around:${r},${clat},${clng});`
      + `node["brand"](around:${r},${clat},${clng});`
      + `way["brand"](around:${r},${clat},${clng});`
      + `);out center qt;`;

    const mirrors = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
      'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
      'https://overpass.nchc.org.tw/api/interpreter',
    ];

    // ── Sub-grid: run center cell first, then outer 4 cardinal points only if needed ──
    // Strategy: center query usually gets enough data for Tier 2/3 cities.
    // Run all 9 cells only for dense Tier 1 metros where Overpass hits its ~500 result cap.
    // This prevents overwhelming Overpass with 36 parallel requests.
    const subRadius = Math.round(radiusMeters * 0.55);
    const offsetDeg = (radiusMeters * 0.006) / 1000;

    const fetchOneCell = async (clat, clng) => {
      const query = buildOsmQuery(clat, clng, subRadius);
      try {
        const winner = await Promise.any(
          mirrors.map(url =>
            axios.post(url, `data=${encodeURIComponent(query)}`,
              { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: timeoutMs }
            ).then(res => {
              if (!res?.data?.elements?.length) throw new Error('empty');
              return res.data.elements;
            })
          )
        );
        return winner;
      } catch (_) { return []; }
    };

    let allElements = [];
    try {
      // Always run center cell
      const centerElements = await fetchOneCell(lat, lng);

      // Run 4 cardinal cells — but only if center returned < 300 results (not already dense enough)
      // This avoids hammering Overpass for small cities while still expanding for dense metros
      const cardinalOffsets = [
        [offsetDeg, 0], [-offsetDeg, 0],
        [0, offsetDeg], [0, -offsetDeg],
      ];

      let outerElements = [];
      if (centerElements.length < 300) {
        const outerResults = await Promise.allSettled(
          cardinalOffsets.map(([dlat, dlng]) => fetchOneCell(lat + dlat, lng + dlng))
        );
        outerElements = outerResults
          .filter(r => r.status === 'fulfilled')
          .flatMap(r => r.value);
      }

      // Run diagonal cells only for very dense areas where even 5 cells aren't enough
      let diagElements = [];
      if (centerElements.length + outerElements.length > 400) {
        const diagOffsets = [
          [offsetDeg * 0.7, offsetDeg * 0.7],
          [offsetDeg * 0.7, -offsetDeg * 0.7],
          [-offsetDeg * 0.7, offsetDeg * 0.7],
          [-offsetDeg * 0.7, -offsetDeg * 0.7],
        ];
        const diagResults = await Promise.allSettled(
          diagOffsets.map(([dlat, dlng]) => fetchOneCell(lat + dlat, lng + dlng))
        );
        diagElements = diagResults
          .filter(r => r.status === 'fulfilled')
          .flatMap(r => r.value);
      }

      allElements = [...centerElements, ...outerElements, ...diagElements];
    } catch (e) {
      logError('overpass', 'Sub-grid fetch failed', { lat, lng, radiusMeters }, 'error', true, 'Falling back to estimated data');
      return [];
    }

    if (!allElements.length) {
      logError('overpass', 'All sub-grid cells returned empty', { lat, lng, radiusMeters }, 'warn', true, 'Falling back to estimated data');
      return [];
    }

    // Dedup by OSM element id — sub-grid cells overlap so same element may appear multiple times
    const seenOsmIds = new Set();
    const uniqueElements = allElements.filter(el => {
      const osmId = `${el.type || 'n'}_${el.id}`;
      if (seenOsmIds.has(osmId)) return false;
      seenOsmIds.add(osmId);
      return true;
    });

    const results = uniqueElements.map((el) => {
      const tags = el.tags || {};
      // way elements use center.lat/center.lon (from "out center"); node elements use el.lat/el.lon
      const elLat = el.lat ?? el.center?.lat;
      const elLon = el.lon ?? el.center?.lon;
      if (!elLat || !elLon) return null;

      // Name: prefer brand tag (Zudio, Peter England etc.) over name, skip unnamed
      const name = tags.brand || tags.name || tags['name:en'] || tags.operator || null;
      if (!name) return null; // skip unnamed — they add noise without value

      const rawCat = tags.amenity || tags.shop || tags.office || tags.tourism || tags.leisure || 'Other';
      let category = osmToCategory[rawCat];
      if (!category && tags.office) category = 'Office';
      if (!category) category = rawCat.charAt(0).toUpperCase() + rawCat.slice(1).replace(/_/g, ' ');

      const addrParts = [tags['addr:housenumber'], tags['addr:street'], tags['addr:suburb'] || tags['addr:city']].filter(Boolean);
      return {
        name,
        category,
        rating: stableRating(name, category),
        reviewCount: stableReviews(name, category),
        address: addrParts.join(', ') || `Near ${elLat.toFixed(3)}, ${elLon.toFixed(3)}`,
        phone: tags.phone || tags['contact:phone'] || '',
        website: tags.website || tags['contact:website'] || '',
        latitude: elLat,
        longitude: elLon,
        source: 'osm',
        ratingEstimated: true,
        reviewCountEstimated: true,
      };
    }).filter(b => b && b.latitude && b.longitude && b.name);

    console.log(`Overpass sub-grid returned ${allElements.length} raw elements → ${uniqueElements.length} unique → ${results.length} valid businesses for (${lat},${lng}) r=${radiusMeters}`);
    return results;
  } catch (e) {
    console.log('Overpass API failed:', e.message);
    return [];
  }
};

// Foursquare Places API — real ratings and reviews, no card needed
const fsqCategoryMap = {
  'Restaurant': 'Restaurant', 'Fast Food': 'Restaurant', 'Café': 'Cafe', 'Coffee Shop': 'Cafe',
  'Bakery': 'Bakery', 'Grocery Store': 'Grocery', 'Supermarket': 'Grocery',
  'Pharmacy': 'Pharmacy', 'Hospital': 'Hospital', 'Clinic': 'Hospital', 'Doctor': 'Hospital',
  'Gym': 'Gym', 'Fitness Center': 'Gym', 'Yoga Studio': 'Gym',
  'Salon': 'Salon', 'Beauty Salon': 'Salon', 'Spa': 'Salon',
  'Clothing Store': 'Clothing', 'Electronics Store': 'Electronics',
  'Hotel': 'Hotel', 'Hostel': 'Hotel', 'Bank': 'Finance', 'ATM': 'Finance',
  'School': 'Education', 'College': 'Education', 'University': 'Education',
};

const fetchFoursquareBusinesses = async (lat, lng, radiusMeters = 8000) => {
  // Foursquare v3 API deprecated June 2025 — new API not yet available on free tier
  // Returning empty array to avoid errors
  return [];
};

// Google Places API (Nearby Search) — best coverage for branded Indian retail stores
// Zudio, Peter England, Westside, etc. are all on Google Maps
const googlePlacesCatMap = (types = []) => {
  const t = types.join(' ');
  if (t.includes('restaurant') || t.includes('food') || t.includes('meal')) return 'Restaurant';
  if (t.includes('cafe') || t.includes('bakery') || t.includes('coffee')) return 'Cafe';
  if (t.includes('clothing') || t.includes('apparel') || t.includes('fashion')) return 'Clothing';
  if (t.includes('electronics') || t.includes('mobile') || t.includes('computer')) return 'Electronics';
  if (t.includes('grocery') || t.includes('supermarket') || t.includes('convenience')) return 'Grocery';
  if (t.includes('pharmacy') || t.includes('drugstore') || t.includes('chemist')) return 'Pharmacy';
  if (t.includes('hospital') || t.includes('doctor') || t.includes('health')) return 'Hospital';
  if (t.includes('gym') || t.includes('fitness') || t.includes('sports')) return 'Gym';
  if (t.includes('salon') || t.includes('beauty') || t.includes('spa') || t.includes('hair')) return 'Salon';
  if (t.includes('hotel') || t.includes('lodging') || t.includes('hostel')) return 'Hotel';
  if (t.includes('bank') || t.includes('atm') || t.includes('finance')) return 'Finance';
  if (t.includes('school') || t.includes('university') || t.includes('education')) return 'Education';
  if (t.includes('jewelry') || t.includes('jewellery')) return 'Jewellery';
  if (t.includes('furniture') || t.includes('home_goods')) return 'Furniture';
  if (t.includes('hardware') || t.includes('tool')) return 'Hardware';
  if (t.includes('shoe') || t.includes('footwear')) return 'Clothing';
  if (t.includes('department_store') || t.includes('shopping_mall') || t.includes('store')) return 'Retail';
  if (t.includes('car') || t.includes('auto') || t.includes('fuel') || t.includes('gas')) return 'Automotive';
  return 'Retail';
};

// ── Google Place Details — fetch phone + website for a place_id ──
const placeDetailsCache = new Map();
const fetchPlaceDetails = async (placeId, key) => {
  if (placeDetailsCache.has(placeId)) return placeDetailsCache.get(placeId);
  try {
    const res = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
      params: {
        place_id: placeId,
        fields: 'formatted_phone_number,website,opening_hours,url',
        key,
      },
      timeout: 6000,
    });
    const r = res.data?.result || {};
    const detail = {
      phone: r.formatted_phone_number || '',
      website: r.website || '',
      isOpen: r.opening_hours?.open_now ?? null,
      googleUrl: r.url || '',
    };
    placeDetailsCache.set(placeId, detail);
    return detail;
  } catch (_) { return { phone: '', website: '', isOpen: null, googleUrl: '' }; }
};

const fetchGooglePlacesBusinesses = async (lat, lng, radiusMeters = 5000) => {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || key === 'your_google_places_key' || key === 'your_google_places_api_key') return [];

  const results = [];
  const seen = new Set();
  // Store place_ids for details enrichment
  const placeIds = [];

  const addPlace = (place, typeHint = '') => {
    if (!place.geometry?.location) return;
    const nameKey = (place.name || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
    const posKey = `${Math.round(place.geometry.location.lat * 2000)}_${Math.round(place.geometry.location.lng * 2000)}`;
    const dedupKey = nameKey.length > 2 ? `${nameKey}_${posKey}` : `${posKey}_${typeHint}`;
    if (seen.has(dedupKey)) return;
    seen.add(dedupKey);
    const idx = results.length;
    results.push({
      name: place.name,
      category: googlePlacesCatMap(place.types || [typeHint]),
      rating: place.rating || null,
      reviewCount: place.user_ratings_total || 0,
      address: place.vicinity || place.formatted_address || '',
      phone: '',
      website: '',
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      source: 'google',
      isOpen: place.opening_hours?.open_now ?? null,
      priceLevel: place.price_level,
      googleUrl: '',
    });
    // Track place_id for enrichment (only top 300 to limit API calls)
    if (place.place_id && placeIds.length < 300) {
      placeIds.push({ idx, place_id: place.place_id });
    }
  };

  // ── Sub-grid: divide the area into a 3×3 grid of overlapping circles ──
  // Each sub-circle has ~2km radius — together they cover the full 5km area
  // This bypasses Google's 60-result cap per search by searching different sub-areas
  const subRadiusMeters = Math.round(radiusMeters * 0.45); // ~45% of total radius per cell
  const offsetDeg = (radiusMeters * 0.0055) / 1000; // ~offset in degrees per km
  const gridOffsets = [
    [0, 0],                           // center
    [offsetDeg, 0],                   // north
    [-offsetDeg, 0],                  // south
    [0, offsetDeg],                   // east
    [0, -offsetDeg],                  // west
    [offsetDeg * 0.7, offsetDeg * 0.7],   // NE
    [offsetDeg * 0.7, -offsetDeg * 0.7],  // NW
    [-offsetDeg * 0.7, offsetDeg * 0.7],  // SE
    [-offsetDeg * 0.7, -offsetDeg * 0.7], // SW
  ];

  // Helper: fetch nearbysearch (all pages) for a given center + type
  const fetchNearbyAllPages = async (clat, clng, type) => {
    const fetchPage = async (pageToken = null) => {
      const params = { location: `${clat},${clng}`, radius: subRadiusMeters, key };
      if (pageToken) { params.pagetoken = pageToken; }
      else { params.type = type; }
      try {
        const res = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
          params, timeout: 10000,
        });
        return res.data || {};
      } catch (_) { return {}; }
    };

    const page1 = await fetchPage();
    (page1.results || []).forEach(p => addPlace(p, type));
    if (page1.next_page_token) {
      await new Promise(r => setTimeout(r, 2000));
      const page2 = await fetchPage(page1.next_page_token);
      (page2.results || []).forEach(p => addPlace(p, type));
      if (page2.next_page_token) {
        await new Promise(r => setTimeout(r, 2000));
        const page3 = await fetchPage(page2.next_page_token);
        (page3.results || []).forEach(p => addPlace(p, type));
      }
    }
  };

  // Helper: fetch textsearch (2 pages) for a given center + query
  const fetchTextAllPages = async (clat, clng, query) => {
    const fetchPage = async (pageToken = null) => {
      const params = { query, location: `${clat},${clng}`, radius: subRadiusMeters, key };
      if (pageToken) params.pagetoken = pageToken;
      try {
        const res = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
          params, timeout: 10000,
        });
        return res.data || {};
      } catch (_) { return {}; }
    };
    const page1 = await fetchPage();
    (page1.results || []).forEach(p => addPlace(p));
    if (page1.next_page_token) {
      await new Promise(r => setTimeout(r, 2000));
      const page2 = await fetchPage(page1.next_page_token);
      (page2.results || []).forEach(p => addPlace(p));
    }
  };

  // ── Track 1: Nearby Search across all 9 grid points, high-priority types ──
  // Use most-common types — these yield the most unique businesses per query
  const nearbyTypes = [
    'restaurant', 'cafe', 'store', 'clothing_store', 'electronics_store',
    'grocery_or_supermarket', 'pharmacy', 'gym', 'hair_care', 'bank',
    'school', 'hospital', 'lodging', 'jewelry_store', 'furniture_store',
    'hardware_store', 'car_repair', 'bakery',
  ];

  // Run grid × types — batched to avoid Google rate-limit
  // Each grid point runs types in small batches of 6 with 500ms pause between batches
  for (let gi = 0; gi < gridOffsets.length; gi += 3) {
    const batch = gridOffsets.slice(gi, gi + 3);
    await Promise.all(batch.map(async ([dlat, dlng]) => {
      const clat = lat + dlat;
      const clng = lng + dlng;
      for (let ti = 0; ti < nearbyTypes.length; ti += 6) {
        const typeBatch = nearbyTypes.slice(ti, ti + 6);
        await Promise.all(typeBatch.map(type => fetchNearbyAllPages(clat, clng, type).catch(() => {})));
        if (ti + 6 < nearbyTypes.length) await new Promise(r => setTimeout(r, 500));
      }
    }));
    if (gi + 3 < gridOffsets.length) await new Promise(r => setTimeout(r, 800));
  }

  // ── Track 2: Text Search — center only (catches branded Indian stores) ──
  const textQueries = [
    'shops', 'restaurants', 'medical store', 'clothing store',
    'electronics shop', 'hotel', 'salon beauty parlour',
    'coaching centre', 'sweet shop mithai', 'hardware store',
    'petrol pump fuel station', 'jewellery gold shop',
    'kirana grocery store', 'mobile repair shop',
  ];

  await Promise.all(textQueries.map(q => fetchTextAllPages(lat, lng, q).catch(() => {})));

  // ── Track 3: Text Search on offset grid for high-density areas ──
  // Only run on 4 cardinal points (not all 9 — keeps API cost reasonable)
  const cardinalOffsets = gridOffsets.slice(1, 5); // N, S, E, W
  const denseTextQueries = ['restaurant', 'shop store', 'medical pharmacy'];
  await Promise.all(cardinalOffsets.map(async ([dlat, dlng]) => {
    await Promise.all(denseTextQueries.map(q =>
      fetchTextAllPages(lat + dlat, lng + dlng, q).catch(() => {})
    ));
  }));

  // ── Track 4: Google Places New API (places.googleapis.com/v1) ──
  // New API returns richer data in one call — phone, website, opening hours included
  // Uses includedTypes field — no separate Details call needed for basic info
  const newApiTypes = [
    ['restaurant', 'cafe', 'bakery', 'bar', 'meal_delivery', 'meal_takeaway'],
    ['clothing_store', 'jewelry_store', 'shoe_store', 'department_store', 'shopping_mall'],
    ['electronics_store', 'hardware_store', 'furniture_store', 'home_goods_store'],
    ['grocery_or_supermarket', 'convenience_store', 'supermarket'],
    ['pharmacy', 'hospital', 'doctor', 'dentist', 'physiotherapist'],
    ['gym', 'beauty_salon', 'hair_care', 'spa'],
    ['bank', 'atm', 'insurance_agency', 'finance'],
    ['school', 'university', 'secondary_school', 'tutoring_center'],
    ['lodging', 'hotel', 'motel', 'guest_house'],
    ['car_repair', 'car_dealer', 'gas_station', 'parking'],
    ['laundry', 'dry_cleaning'],
  ];

  // New Places API — searchNearby v1
  const newApiPromises = newApiTypes.map(async (typeGroup) => {
    try {
      const res = await axios.post(
        'https://places.googleapis.com/v1/places:searchNearby',
        {
          includedTypes: typeGroup,
          maxResultCount: 20,
          locationRestriction: {
            circle: {
              center: { latitude: lat, longitude: lng },
              radius: radiusMeters,
            },
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': key,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.types,places.rating,places.userRatingCount,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.currentOpeningHours,places.priceLevel',
          },
          timeout: 10000,
        }
      );
      const places = res.data?.places || [];
      places.forEach(p => {
        if (!p.location?.latitude || !p.location?.longitude) return;
        const nameKey = (p.displayName?.text || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
        const posKey = `${Math.round(p.location.latitude * 2000)}_${Math.round(p.location.longitude * 2000)}`;
        const dedupKey = nameKey.length > 2 ? `${nameKey}_${posKey}` : `${posKey}_new`;
        if (seen.has(dedupKey)) return;
        seen.add(dedupKey);
        results.push({
          name: p.displayName?.text || '',
          category: googlePlacesCatMap(p.types || []),
          rating: p.rating || null,
          reviewCount: p.userRatingCount || 0,
          address: p.formattedAddress || '',
          phone: p.nationalPhoneNumber || '',
          website: p.websiteUri || '',
          latitude: p.location.latitude,
          longitude: p.location.longitude,
          source: 'google_new',
          isOpen: p.currentOpeningHours?.openNow ?? null,
          priceLevel: p.priceLevel || null,
          googleUrl: '',
        });
      });
    } catch (_) {}
  });
  await Promise.all(newApiPromises);

  // ── Enrich top results with Place Details (phone + website) ──
  // Only enrich entries that still have no phone — batched 10 at a time
  const needsEnrichment = placeIds.filter(({ idx }) => !results[idx]?.phone);
  const enrichBatchSize = 10;
  for (let i = 0; i < Math.min(needsEnrichment.length, 200); i += enrichBatchSize) {
    const batch = needsEnrichment.slice(i, i + enrichBatchSize);
    await Promise.all(batch.map(async ({ idx, place_id }) => {
      const detail = await fetchPlaceDetails(place_id, key);
      if (results[idx]) {
        results[idx].phone = detail.phone || results[idx].phone;
        results[idx].website = detail.website || results[idx].website;
        results[idx].isOpen = results[idx].isOpen ?? detail.isOpen;
        results[idx].googleUrl = detail.googleUrl || '';
      }
    }));
  }

  console.log(`Google Places returned ${results.length} businesses for (${lat},${lng}) [grid+textsearch+newAPI+details]`);
  return results;
};

// Mappls (MapmyIndia) Nearby API — India-specific, NO card needed, covers branded stores
// Free signup at: https://developer.mappls.com  (Indian company, best India coverage)
const mapplsCatMap = (subType = '') => {
  const s = subType.toLowerCase();
  if (s.includes('restaurant') || s.includes('food') || s.includes('dhaba') || s.includes('eatery')) return 'Restaurant';
  if (s.includes('cafe') || s.includes('coffee') || s.includes('bakery') || s.includes('sweet')) return 'Cafe';
  if (s.includes('cloth') || s.includes('fashion') || s.includes('apparel') || s.includes('garment') || s.includes('boutique') || s.includes('textile')) return 'Clothing';
  if (s.includes('shoe') || s.includes('footwear')) return 'Clothing';
  if (s.includes('electronic') || s.includes('mobile') || s.includes('computer') || s.includes('phone')) return 'Electronics';
  if (s.includes('grocery') || s.includes('supermarket') || s.includes('kirana') || s.includes('provision')) return 'Grocery';
  if (s.includes('pharmacy') || s.includes('chemist') || s.includes('medical') || s.includes('drug')) return 'Pharmacy';
  if (s.includes('hospital') || s.includes('clinic') || s.includes('doctor') || s.includes('health')) return 'Hospital';
  if (s.includes('gym') || s.includes('fitness') || s.includes('yoga') || s.includes('sports')) return 'Gym';
  if (s.includes('salon') || s.includes('beauty') || s.includes('spa') || s.includes('parlour') || s.includes('hair')) return 'Salon';
  if (s.includes('hotel') || s.includes('lodge') || s.includes('hostel') || s.includes('guest')) return 'Hotel';
  if (s.includes('bank') || s.includes('atm') || s.includes('finance') || s.includes('insurance')) return 'Finance';
  if (s.includes('school') || s.includes('college') || s.includes('coaching') || s.includes('tutor') || s.includes('education')) return 'Education';
  if (s.includes('jewel') || s.includes('gold') || s.includes('silver')) return 'Jewellery';
  if (s.includes('furniture') || s.includes('home') || s.includes('decor') || s.includes('interior')) return 'Furniture';
  if (s.includes('hardware') || s.includes('tool') || s.includes('building')) return 'Hardware';
  if (s.includes('petrol') || s.includes('fuel') || s.includes('auto') || s.includes('car') || s.includes('garage')) return 'Automotive';
  if (s.includes('mall') || s.includes('market') || s.includes('plaza') || s.includes('bazaar') || s.includes('shop')) return 'Retail';
  return 'Retail';
};

const fetchMapplsBusinesses = async (lat, lng, radiusMeters = 3000) => {
  const key = process.env.MAPPLS_API_KEY;
  if (!key || key === 'your_mappls_api_key') return [];

  try {
    // Mappls Nearby API — static key goes as query param
    const res = await axios.get('https://atlas.mappls.com/api/places/nearby/json', {
      params: {
        keywords: 'shop;restaurant;hospital;school;hotel;bank;gym;salon;pharmacy;clothing;electronics',
        refLocation: `${lat},${lng}`,
        radius: radiusMeters,
        sortBy: 'dist:asc',
        page: 1,
        pod: 'LOCALITY',
        token: key,   // static key goes here for Mappls
      },
      timeout: 8000,
    });

    const places = res.data?.suggestedLocations || res.data?.nearbyPlaces || res.data?.results || [];
    const seen = new Set();

    const results = places.map(place => {
      const lat_ = parseFloat(place.latitude || place.lat);
      const lng_ = parseFloat(place.longitude || place.lng);
      if (!lat_ || !lng_ || isNaN(lat_) || isNaN(lng_)) return null;

      const nameKey = (place.placeName || place.name || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
      const posKey = `${Math.round(lat_ * 1000)}_${Math.round(lng_ * 1000)}`;
      const dedupKey = `${nameKey}_${posKey}`;
      if (seen.has(dedupKey)) return null;
      seen.add(dedupKey);

      return {
        name: place.placeName || place.name || place.placeAddress,
        category: mapplsCatMap(place.type || place.subType || place.categoryCode || ''),
        rating: null,
        reviewCount: 0,
        address: place.placeAddress || place.address || '',
        phone: place.tel || place.phone || '',
        website: '',
        latitude: lat_,
        longitude: lng_,
        source: 'mappls',
      };
    }).filter(Boolean);

    console.log(`Mappls returned ${results.length} businesses for (${lat},${lng})`);
    return results;
  } catch (e) {
    console.log('Mappls failed:', e.message.slice(0, 80));
    return [];
  }
};

// TomTom POI fetch — nearbySearch primary, category fallback

const tomtomCatMap = (catStr) => {
  if (catStr.includes('restaurant') || catStr.includes('fast food') || catStr.includes('food court')) return 'Restaurant';
  if (catStr.includes('cafe') || catStr.includes('coffee') || catStr.includes('tea house')) return 'Cafe';
  if (catStr.includes('grocery') || catStr.includes('supermarket') || catStr.includes('convenience store')) return 'Grocery';
  if (catStr.includes('pharmacy') || catStr.includes('chemist') || catStr.includes('drug store')) return 'Pharmacy';
  if (catStr.includes('hospital') || catStr.includes('clinic') || catStr.includes('doctor') || catStr.includes('medical')) return 'Hospital';
  if (catStr.includes('gym') || catStr.includes('fitness') || catStr.includes('sports centre') || catStr.includes('yoga')) return 'Gym';
  if (catStr.includes('salon') || catStr.includes('beauty') || catStr.includes('spa') || catStr.includes('hair')) return 'Salon';
  if (catStr.includes('cloth') || catStr.includes('fashion') || catStr.includes('apparel') || catStr.includes('boutique')) return 'Clothing';
  if (catStr.includes('electron') || catStr.includes('mobile') || catStr.includes('computer') || catStr.includes('phone')) return 'Electronics';
  if (catStr.includes('hotel') || catStr.includes('hostel') || catStr.includes('motel') || catStr.includes('lodge') || catStr.includes('guest house')) return 'Hotel';
  if (catStr.includes('bank') || catStr.includes('atm') || catStr.includes('finance') || catStr.includes('money')) return 'Finance';
  if (catStr.includes('school') || catStr.includes('college') || catStr.includes('university') || catStr.includes('education') || catStr.includes('coaching')) return 'Education';
  if (catStr.includes('jewel') || catStr.includes('gold') || catStr.includes('jewelry')) return 'Jewellery';
  if (catStr.includes('car') || catStr.includes('auto') || catStr.includes('petrol') || catStr.includes('fuel') || catStr.includes('garage')) return 'Automotive';
  if (catStr.includes('bakery') || catStr.includes('pastry') || catStr.includes('bread') || catStr.includes('cake')) return 'Bakery';
  if (catStr.includes('hardware') || catStr.includes('tool') || catStr.includes('building material')) return 'Hardware';
  if (catStr.includes('furniture') || catStr.includes('home decor') || catStr.includes('interior')) return 'Furniture';
  if (catStr.includes('laundry') || catStr.includes('dry clean')) return 'Laundry';
  if (catStr.includes('wholesale') || catStr.includes('warehouse')) return 'Wholesale';
  if (catStr.includes('retail') || catStr.includes('department store') || catStr.includes('shopping')) return 'Retail';
  if (catStr.includes('office') || catStr.includes('business centre') || catStr.includes('coworking')) return 'Office';
  if (catStr.includes('shop') || catStr.includes('store') || catStr.includes('market')) return 'Retail';
  if (catStr.includes('bar') || catStr.includes('pub') || catStr.includes('nightclub')) return 'Restaurant';
  if (catStr.includes('park') || catStr.includes('garden') || catStr.includes('recreation')) return 'Other';
  if (catStr.includes('place of worship') || catStr.includes('temple') || catStr.includes('mosque') || catStr.includes('church')) return 'Other';
  if (catStr.includes('it') || catStr.includes('tech') || catStr.includes('software')) return 'Office';
  return 'Other';
};

const fetchTomTomBusinesses = async (lat, lng, radiusMeters = 8000) => {
  const key = process.env.TOMTOM_API_KEY;
  if (!key || key === 'your_tomtom_key_here') return [];

  const seen = new Set();
  const results = [];

  const addPlace = (place) => {
    const pos = place.position;
    if (!pos?.lat || !pos?.lon || !place.poi?.name) return;
    const dk = place.poi.name.toLowerCase().replace(/\s+/g, '').slice(0, 20)
      + '_' + Math.round(pos.lat * 2000) + '_' + Math.round(pos.lon * 2000);
    if (seen.has(dk)) return;
    seen.add(dk);
    const catStr = (place.poi?.categories || []).join(' ').toLowerCase();
    const category = tomtomCatMap(catStr);
    results.push({
      name: place.poi.name,
      category,
      rating: stableRating(place.poi.name, category),
      reviewCount: stableReviews(place.poi.name, category, 200),
      address: [place.address?.streetName, place.address?.municipalitySubdivision, place.address?.municipality]
        .filter(Boolean).join(', ') || ('Near ' + pos.lat.toFixed(3) + ', ' + pos.lon.toFixed(3)),
      phone: place.poi?.phone || '',
      website: place.poi?.url || '',
      latitude: pos.lat,
      longitude: pos.lon,
      source: 'tomtom',
      ratingEstimated: true,
      reviewCountEstimated: true,
    });
  };

  // All TomTom category IDs for Indian businesses
  const allCats = [
    '7315','7314','7313','7316','7317','7318','7319','7320','7321','7322',
    '7311','7312','9376','9361','7332','9362','9379','9383','9374','9377',
    '9352','9353','9357','9358','9359','9360','9378','9380','9381','9382',
  ];

  try {
    // Center point first — most important results
    const centerRes = await axios.get('https://api.tomtom.com/search/2/nearbySearch/.json', {
      params: { key, lat, lon: lng, radius: radiusMeters, limit: 100, language: 'en-GB', spreadingMode: 'auto' },
      timeout: 12000,
    }).catch(() => null);
    if (centerRes?.data?.results) centerRes.data.results.forEach(addPlace);

    // Category searches on center — most coverage, single point
    const allCats = [
      '7315','7314','7313','7316','7317','7318','7319','7320','7321','7322',
      '7311','7312','9376','9361','7332','9362','9379','9383','9374','9377',
      '9352','9353','9357','9358','9359','9360','9378','9380','9381','9382',
    ];
    await Promise.all(allCats.map(catId =>
      axios.get('https://api.tomtom.com/search/2/categorySearch/.json', {
        params: { key, lat, lon: lng, radius: radiusMeters, limit: 100, categorySet: catId, language: 'en-GB' },
        timeout: 8000,
      }).then(res => { if (res?.data?.results) res.data.results.forEach(addPlace); }).catch(() => {})
    ));

    // Sub-grid on 4 cardinal offsets — extra coverage without full 9-point overhead
    const offsetDeg = (radiusMeters * 0.004) / 1000;
    const subRadius = Math.round(radiusMeters * 0.55);
    const cardinalOffsets = [
      [offsetDeg, 0], [-offsetDeg, 0], [0, offsetDeg], [0, -offsetDeg],
    ];

    await Promise.all(cardinalOffsets.map(async ([dlat, dlng]) => {
      const clat = lat + dlat;
      const clng = lng + dlng;
      const r = await axios.get('https://api.tomtom.com/search/2/nearbySearch/.json', {
        params: { key, lat: clat, lon: clng, radius: subRadius, limit: 100, language: 'en-GB', spreadingMode: 'auto' },
        timeout: 10000,
      }).catch(() => null);
      if (r?.data?.results) r.data.results.forEach(addPlace);

      // Only high-yield categories on sub-grid to save time
      const subCats = ['7315','7311','7312','9376','9361','7318','7321','7332','9362','9379'];
      await Promise.all(subCats.map(catId =>
        axios.get('https://api.tomtom.com/search/2/categorySearch/.json', {
          params: { key, lat: clat, lon: clng, radius: subRadius, limit: 100, categorySet: catId, language: 'en-GB' },
          timeout: 8000,
        }).then(res => { if (res?.data?.results) res.data.results.forEach(addPlace); }).catch(() => {})
      ));
    }));

    console.log(`TomTom returned ${results.length} businesses (center+${allCats.length}cats + 4 cardinal offsets)`);
    return results;
  } catch (e) {
    console.log('TomTom failed:', e.message);
    return [];
  }
}

// Foursquare category → our category mapping

// Wikidata SPARQL — fetch notable places near location
const fetchWikidataPlaces = async (lat, lng, radiusMeters = 8000) => {
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
      } LIMIT 100
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
        rating: stableRating(b.placeLabel?.value || `${b.lat?.value}_${b.lng?.value}`, mapped),
        reviewCount: stableReviews(b.placeLabel?.value || `${b.lat?.value}_${b.lng?.value}`, mapped, 150),
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
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours — stable results

const getCached = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.time > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
};
const setCache = (key, data) => {
  // Never cache estimated/mock data — only real OSM data
  if (data?.estimatedData) return;
  cache.set(key, { data, time: Date.now() });
};

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

// Feedback — public submit
app.post('/api/feedback', async (req, res) => {
  try {
    const { type, page, title, message, email, rating } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });
    const fb = await Feedback.create({
      type: type || 'general',
      page: page || 'Other',
      title: (title || '').slice(0, 200),
      message: message.slice(0, 2000),
      email: (email || '').slice(0, 100),
      rating: parseInt(rating) || 0,
    });
    res.json({ success: true, id: fb.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin: get all feedback
app.get('/api/admin/feedback', adminAuth, async (req, res) => {
  try {
    const items = await Feedback.findAll({ order: [['createdAt', 'DESC']], limit: 200 });
    res.json(items);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin: update feedback status
app.patch('/api/admin/feedback/:id', adminAuth, async (req, res) => {
  try {
    const fb = await Feedback.findByPk(req.params.id);
    if (!fb) return res.status(404).json({ error: 'Not found' });
    await fb.update({ status: req.body.status });
    res.json(fb);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── WhatsApp Bot — Twilio ─────────────────────────────────────────────────────
app.post('/api/whatsapp', async (req, res) => {
  try {
    const { Body, From } = req.body;
    const message = (Body || '').trim();
    const from = From || '';

    // Send WhatsApp reply via Twilio
    const sendReply = async (text) => {
      if (!process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID === 'your_twilio_sid') return;
      try {
        const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        await twilio.messages.create({ from: process.env.TWILIO_WHATSAPP_FROM, to: from, body: text });
      } catch (e) { console.log('Twilio send failed:', e.message); }
    };

    // Help message
    if (!message || message.toLowerCase() === 'help' || message.toLowerCase() === 'hi' || message.toLowerCase() === 'hello') {
      await sendReply(`🚀 *BizScope AI — WhatsApp Bot*\n\nSend any Indian city name to get instant market analysis!\n\nExamples:\n• Mumbai\n• Connaught Place Delhi\n• Koramangala Bangalore\n\nType a city name to start 👇`);
      return res.send('<Response></Response>');
    }

    // Analyze the location
    await sendReply(`🔍 Analyzing *${message}*... Please wait 10-15 seconds.`);

    const geo = await geocodeLocation(message);
    if (!geo) {
      await sendReply(`❌ Couldn't find "${message}". Try a more specific city name like "Mumbai" or "Connaught Place Delhi".`);
      return res.send('<Response></Response>');
    }

    const businesses = await fetchRealBusinesses(geo.latitude, geo.longitude, 5000);
    if (businesses.length === 0) {
      await sendReply(`⚠️ No businesses found near ${geo.displayName.split(',')[0]}. Try a different area.`);
      return res.send('<Response></Response>');
    }

    // Calculate category stats
    const catStats = {};
    businesses.forEach(({ category, rating, reviewCount }) => {
      if (!catStats[category]) catStats[category] = { count: 0, totalRating: 0, totalReviews: 0 };
      catStats[category].count++;
      catStats[category].totalRating += parseFloat(rating);
      catStats[category].totalReviews += reviewCount;
    });
    const sorted = Object.entries(catStats)
      .map(([cat, s]) => ({ cat, count: s.count, score: s.count * 0.4 + (s.totalRating / s.count) * 0.3 + Math.sqrt(s.totalReviews) * 0.3 }))
      .sort((a, b) => b.score - a.score);

    const city = geo.displayName.split(',')[0];
    const topCat = sorted[0];
    const bestOpp = sorted[sorted.length - 1];

    const reply = `📊 *Market Analysis: ${city}*\n\n` +
      `🏪 *${businesses.length}* businesses found within 5km\n` +
      `📂 *${sorted.length}* business categories\n\n` +
      `🔴 *Most Competitive:* ${topCat.cat} (${topCat.count} businesses)\n` +
      `🟢 *Best Opportunity:* ${bestOpp.cat} (${bestOpp.count} businesses)\n\n` +
      `📈 *Top Categories:*\n` +
      sorted.slice(0, 5).map((s, i) => `${i + 1}. ${s.cat} — ${s.count} competitors`).join('\n') +
      `\n\n🔗 Full analysis: https://bizscope-og.vercel.app/?location=${encodeURIComponent(message)}\n\n_Reply with another city to analyze_`;

    await sendReply(reply);
    res.send('<Response></Response>');
  } catch (e) {
    console.error('WhatsApp bot error:', e.message);
    res.send('<Response></Response>');
  }
});

// ── Razorpay Payment — Pro Plan ──────────────────────────────────────────────
const PRO_PRICE_PAISE = 49900; // ₹499 in paise

app.post('/api/payment/create-order', authMiddleware, async (req, res) => {
  try {
    if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === 'your_razorpay_key_id') {
      return res.status(503).json({ error: 'Payment not configured yet. Contact support.' });
    }
    const Razorpay = require('razorpay');
    const razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
    const order = await razorpay.orders.create({
      amount: PRO_PRICE_PAISE,
      currency: 'INR',
      receipt: `pro_${req.user.id}_${Date.now()}`,
      notes: { userId: req.user.id, plan: 'pro' },
    });
    res.json({ orderId: order.id, amount: PRO_PRICE_PAISE, currency: 'INR', keyId: process.env.RAZORPAY_KEY_ID });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/payment/verify', authMiddleware, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const crypto = require('crypto');
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
    if (expected !== razorpay_signature) return res.status(400).json({ error: 'Invalid signature' });
    // Upgrade user to Pro
    await User.update({ plan: 'pro', planExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }, { where: { id: req.user.id } });
    res.json({ success: true, message: 'Welcome to BizScope Pro! 🎉' });
  } catch (e) { res.status(500).json({ error: e.message }); }
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

// ── Business Strategy Engine ──────────────────────────────────────────────────
// Test route
app.get('/api/strategy-test', (req, res) => res.json({ ok: true }));

// ── Interior Design Planner — 10 Concepts ────────────────────────────────────
app.post('/api/interior-design', async (req, res) => {
  try {
    const { businessName, industry, spaceScale } = req.body;
    if (!businessName || !industry) return res.status(400).json({ error: 'Business name and industry required' });
    const scale = spaceScale || 'Small';

    const prompt = `Act as a Senior Commercial Interior Designer and Budget Strategist for startup businesses in India.

Business Type: ${industry} (${businessName})
Space Scale: ${scale}

Generate exactly 10 distinct interior design concepts. Each must be low-budget with high visual impact. Include 2026 trends: Warm Minimalism, Color Drenching, Biophilic DIY, Soft Industrial, Zoning.

For each concept, respond in this EXACT JSON format (return only valid JSON array, no markdown):
[
  {
    "id": 1,
    "emoji": "🌿",
    "themeName": "Theme Name Here",
    "category": "Biophilic",
    "budgetHack": "One specific low-cost material or DIY trick",
    "heroFeature": "One focal point that makes the space look expensive",
    "spaceOptimization": "How to arrange for ${scale} space specifically",
    "imageKeywords": "comma,separated,visual,keywords,for,image,generator",
    "estimatedCost": "₹X,XXX – ₹XX,XXX",
    "vibe": "2-word vibe description"
  }
]

Make the 10 themes vary across these categories (use these emojis):
🌿 Biophilic (plant-based, natural)
🏗️ Industrial (raw, metal, concrete)
🎨 Dopamine Decor (colorful, bright)
☕ Warm Minimalist (cozy, neutral)
🌙 Dark Moody (dramatic, deep colors)
🪵 Rustic Indian (terracotta, jute, brass)
⚡ Tech Modern (LED, glass, clean lines)
🎭 Vintage Retro (nostalgia, warm wood)
🏔️ Scandinavian (white, pine, functional)
🌈 Color Drenching (one bold color everywhere)

Ensure designs are specific to a ${scale} ${industry} in India. All costs in ₹. Keep imageKeywords under 15 words.`;

    let concepts = null;

    if (genAI) {
      for (const m of ['gemini-2.0-flash', 'gemini-1.5-flash']) {
        try {
          const model = genAI.getGenerativeModel({ model: m });
          const r = await model.generateContent(prompt);
          const text = r.response.text().replace(/```json|```/g, '').trim();
          concepts = JSON.parse(text);
          break;
        } catch (e) { console.log(`interior ${m}:`, e.message.slice(0, 60)); }
      }
    }

    // Fallback static concepts
    if (!concepts) {
      concepts = [
        { id:1, emoji:'🌿', themeName:'The Biophilic Jungle Corner', category:'Biophilic', budgetHack:'Use pothos and money plants in recycled tin cans as planters — ₹50 each', heroFeature:'A living moss wall panel (DIY with preserved moss from nursery, ₹800)', spaceOptimization:`For ${scale} space: cluster plants in one corner to create depth without taking floor space`, imageKeywords:'biophilic cafe, indoor plants, moss wall, warm lighting, natural wood', estimatedCost:'₹8,000 – ₹15,000', vibe:'Fresh Calm' },
        { id:2, emoji:'🏗️', themeName:'The Soft Industrial Loft', category:'Industrial', budgetHack:'Leave concrete walls bare, add warm 3000K LED strips along ceiling edges', heroFeature:'Exposed black iron pipe shelving with Edison bulbs (₹1,200 total)', spaceOptimization:`For ${scale} space: use vertical pipe shelving to maximize wall space`, imageKeywords:'industrial loft, exposed concrete, Edison bulbs, iron pipes, warm amber lighting', estimatedCost:'₹10,000 – ₹20,000', vibe:'Raw Warm' },
        { id:3, emoji:'🎨', themeName:'The Dopamine Burst', category:'Dopamine Decor', budgetHack:'Color drenching — paint walls, ceiling, and pipes one bold color (Terracotta or Cobalt)', heroFeature:'One oversized hand-painted mural on the main wall (hire local art student, ₹2,000)', spaceOptimization:`For ${scale} space: bold color makes small spaces feel intentional, not cramped`, imageKeywords:'dopamine decor, terracotta walls, colorful interior, bold paint, vibrant cafe', estimatedCost:'₹6,000 – ₹12,000', vibe:'Bold Joyful' },
        { id:4, emoji:'☕', themeName:'The Warm Minimalist Den', category:'Warm Minimalist', budgetHack:'Plywood furniture with natural oil finish — looks premium at 20% of solid wood cost', heroFeature:'Japandi-style low seating with floor cushions (₹300 each from wholesale market)', spaceOptimization:`For ${scale} space: low furniture creates illusion of height and openness`, imageKeywords:'warm minimalist, plywood furniture, japandi style, neutral tones, cozy lighting', estimatedCost:'₹12,000 – ₹22,000', vibe:'Quiet Cozy' },
        { id:5, emoji:'🌙', themeName:'The Dark Moody Speakeasy', category:'Dark Moody', budgetHack:'Paint everything dark (charcoal or forest green) — cheap paint transforms any space', heroFeature:'Backlit bar shelf with fairy lights behind bottles (₹500 total)', spaceOptimization:`For ${scale} space: dark walls recede visually, making space feel larger and more intimate`, imageKeywords:'dark moody interior, deep green walls, candlelight, intimate lighting, speakeasy', estimatedCost:'₹7,000 – ₹14,000', vibe:'Mysterious Intimate' },
        { id:6, emoji:'🪵', themeName:'The Terracotta Zen', category:'Rustic Indian', budgetHack:'Terracotta pots, jute rope, and brass fixtures from local hardware — all under ₹200 each', heroFeature:'Handmade terracotta tile feature wall (local potter, ₹1,500 for accent wall)', spaceOptimization:`For ${scale} space: use jute curtains as soft dividers instead of walls`, imageKeywords:'terracotta interior, jute decor, brass fixtures, Indian rustic, warm earthy tones', estimatedCost:'₹9,000 – ₹18,000', vibe:'Earthy Grounded' },
        { id:7, emoji:'⚡', themeName:'The Neon Tech Hub', category:'Tech Modern', budgetHack:'RGB LED strips (₹200/meter) behind furniture and under counters for ambient glow', heroFeature:'Custom neon sign with business name (₹2,500–4,000 from local sign maker)', spaceOptimization:`For ${scale} space: use mirrors with LED frames to double perceived space`, imageKeywords:'neon tech interior, RGB lighting, modern minimalist, glass surfaces, futuristic cafe', estimatedCost:'₹15,000 – ₹28,000', vibe:'Electric Modern' },
        { id:8, emoji:'🎭', themeName:'The Vintage Nostalgia Corner', category:'Vintage Retro', budgetHack:'Source old furniture from OLX/Facebook Marketplace — refurbish with chalk paint (₹400)', heroFeature:'Vintage clock collection wall or old film poster gallery (₹100–300 per poster)', spaceOptimization:`For ${scale} space: eclectic mix of vintage pieces works better in smaller spaces`, imageKeywords:'vintage retro interior, warm wood, old posters, antique furniture, nostalgic cafe', estimatedCost:'₹8,000 – ₹16,000', vibe:'Nostalgic Warm' },
        { id:9, emoji:'🏔️', themeName:'The Scandinavian Light Box', category:'Scandinavian', budgetHack:'White walls + pine wood accents + black metal frames — all from IKEA or local alternatives', heroFeature:'Oversized pendant light in woven rattan (₹800 from home decor store)', spaceOptimization:`For ${scale} space: Scandinavian works best — white maximizes light in small spaces`, imageKeywords:'scandinavian interior, white walls, pine wood, rattan pendant, clean minimal', estimatedCost:'₹11,000 – ₹20,000', vibe:'Clean Airy' },
        { id:10, emoji:'🌈', themeName:'The Color Drench Statement', category:'Color Drenching', budgetHack:'Buy 10L of one bold color paint (₹1,200) and paint EVERYTHING — walls, ceiling, furniture', heroFeature:'Monochromatic space with one contrasting texture (velvet cushions or brass handles)', spaceOptimization:`For ${scale} space: color drenching is the cheapest way to make any size look architectural`, imageKeywords:'color drenching, monochromatic interior, bold single color, architectural space, 2026 trend', estimatedCost:'₹5,000 – ₹10,000', vibe:'Architectural Bold' },
      ];
    }

    // Add image URL — Unsplash Source (instant, no API key, real photos)
    const unsplashKeywords = {
      'Biophilic':       'biophilic,interior,plants,cafe',
      'Industrial':      'industrial,loft,interior,design',
      'Dopamine Decor':  'colorful,interior,design,vibrant',
      'Warm Minimalist': 'minimalist,interior,warm,cozy',
      'Dark Moody':      'dark,moody,interior,restaurant',
      'Rustic Indian':   'rustic,indian,interior,terracotta',
      'Tech Modern':     'modern,tech,office,interior,neon',
      'Vintage Retro':   'vintage,retro,cafe,interior',
      'Scandinavian':    'scandinavian,interior,white,minimal',
      'Color Drenching': 'bold,color,interior,design',
    };
    const conceptsWithImages = concepts.map(c => {
      const kw = unsplashKeywords[c.category] || c.imageKeywords.split(',').slice(0, 3).join(',');
      return {
        ...c,
        imageUrl: `https://source.unsplash.com/480x300/?${encodeURIComponent(kw)}&sig=${c.id * 17}`,
      };
    });

    res.json({ concepts: conceptsWithImages, businessName, industry, spaceScale: scale });
  } catch (e) {
    console.error('Interior design error:', e.message);
    res.status(500).json({ error: 'Design generation failed.' });
  }
});

// City Insights — AI-powered quick insights for a city (shown below search)
const cityInsightsCache = new Map();
app.get('/api/city-insights', async (req, res) => {
  const city = (req.query.city || '').trim();
  if (!city || city.length < 2) return res.status(400).json({ error: 'City required' });

  // Cache for 1 hour
  if (cityInsightsCache.has(city.toLowerCase())) {
    return res.json(cityInsightsCache.get(city.toLowerCase()));
  }

  // Static insights for top cities (instant, no AI needed)
  const staticInsights = {
    mumbai: { insights: ['Financial hub — fintech and B2B services have high demand', 'Food delivery market is saturated but premium/healthy food gaps exist', 'Co-working and professional services growing in suburbs like Thane, Navi Mumbai'], topOpportunity: 'Premium healthy tiffin for corporate professionals' },
    delhi: { insights: ['Massive student population — EdTech and coaching have strong demand', 'Wedding and events industry is ₹10,000 crore+ market', 'Hyperlocal delivery in colonies like Dwarka, Rohini is underserved'], topOpportunity: 'Hyperlocal grocery delivery in residential colonies' },
    bangalore: { insights: ['IT workforce drives demand for productivity tools and SaaS', 'PG accommodation services are in high demand near tech parks', 'Health and fitness market growing 30% YoY in Koramangala, Indiranagar'], topOpportunity: 'SaaS tools for small IT teams and freelancers' },
    bengaluru: { insights: ['IT workforce drives demand for productivity tools and SaaS', 'PG accommodation services are in high demand near tech parks', 'Health and fitness market growing 30% YoY'], topOpportunity: 'SaaS tools for small IT teams and freelancers' },
    hyderabad: { insights: ['Pharma and biotech hub — B2B services for life sciences growing', 'Real estate boom in Gachibowli and Kondapur creates property service demand', 'Food tech startups thriving — cloud kitchens have low competition in suburbs'], topOpportunity: 'Cloud kitchen targeting IT corridor workers' },
    pune: { insights: ['Large student and young professional population', 'Manufacturing sector needs digital tools and B2B services', 'Fitness and wellness market growing rapidly in Kothrud, Baner'], topOpportunity: 'Affordable fitness and wellness services for students' },
    jaipur: { insights: ['Tourism drives demand for hospitality and local experience services', 'Handicraft and textile export market is underdigitized', 'Growing IT sector creating demand for professional services'], topOpportunity: 'Digital marketing for local handicraft businesses' },
    mathura: { insights: ['Religious tourism creates year-round demand for hospitality', 'Dairy and food processing is a strong local industry', 'Limited digital services — huge gap for local business digitization'], topOpportunity: 'Online booking platform for dharamshalas and local guides' },
    noida: { insights: ['Large corporate workforce — B2B and professional services in demand', 'Residential colonies need hyperlocal delivery and home services', 'EdTech and coaching centers have strong demand near schools'], topOpportunity: 'Home services and maintenance for residential societies' },
    lucknow: { insights: ['Growing IT and startup ecosystem with government support', 'Chikankari and traditional crafts need digital marketplace', 'Food culture is strong — premium restaurant and catering opportunities'], topOpportunity: 'Online marketplace for traditional Lucknowi crafts' },
    surat: { insights: ['Diamond and textile industry needs B2B digital tools', 'Young entrepreneur culture — startup services in demand', 'Food delivery market growing rapidly in new residential areas'], topOpportunity: 'B2B procurement tools for textile traders' },
    ahmedabad: { insights: ['Strong MSME ecosystem — business services have high demand', 'Pharma and chemical industry needs compliance and digital tools', 'Real estate market growing — property services opportunity'], topOpportunity: 'Compliance and documentation services for MSMEs' },
    chennai: { insights: ['Auto and manufacturing hub — B2B industrial services growing', 'Strong IT sector in OMR corridor driving professional services demand', 'Healthcare and wellness market expanding rapidly'], topOpportunity: 'Recruitment and staffing for manufacturing sector' },
    kolkata: { insights: ['Strong retail and wholesale market — e-commerce enablement needed', 'Cultural events and tourism create hospitality opportunities', 'Affordable city — price-sensitive market rewards value-for-money offerings'], topOpportunity: 'E-commerce enablement for traditional retail shops' },
  };

  const cityKey = city.toLowerCase().replace(/\s+/g, '');
  const matched = Object.keys(staticInsights).find(k => cityKey.includes(k) || k.includes(cityKey));

  if (matched) {
    const result = staticInsights[matched];
    cityInsightsCache.set(city.toLowerCase(), result);
    return res.json(result);
  }

  // For unknown cities, use AI
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const prompt = `You are a business analyst. Give 3 short, specific business insights for entrepreneurs looking to start a business in ${city}, India. Also suggest the single best business opportunity.

Format your response as JSON only:
{
  "insights": ["insight 1", "insight 2", "insight 3"],
  "topOpportunity": "one specific business opportunity"
}

Keep each insight under 15 words. Be specific to ${city}.`;
      const r = await model.generateContent(prompt);
      const text = r.response.text().replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(text);
      cityInsightsCache.set(city.toLowerCase(), parsed);
      return res.json(parsed);
    } catch (e) {
      console.log('City insights AI failed:', e.message.slice(0, 50));
    }
  }

  // Generic fallback
  const fallback = {
    insights: [
      `${city} has growing demand for local digital services and delivery`,
      'Hyperlocal businesses with WhatsApp ordering outperform large platforms',
      'First-mover advantage available in most service categories',
    ],
    topOpportunity: 'Hyperlocal service business with WhatsApp-first approach',
  };
  cityInsightsCache.set(city.toLowerCase(), fallback);
  res.json(fallback);
});

// Quick Strategy — 5-part, under 400 words, Business Name + Industry only
app.post('/api/quick-strategy', async (req, res) => {
  try {
    const { businessName, industry } = req.body;
    if (!businessName || !industry) return res.status(400).json({ error: 'Business name and industry are required' });

    const prompt = `Act as a Senior Business Consultant and SEO Expert.

Business Name: ${businessName}
Industry: ${industry}

Generate a comprehensive, actionable 5-part Business Strategy in this EXACT format:

## 1. Executive Summary
A 2-line vision for ${businessName} in the ${industry} industry.

## 2. Market Analysis
Target audience: [specific description]
Competitor 1: [Name] — [what they do and their weakness]
Competitor 2: [Name] — [what they do and their weakness]

## 3. SEO & Keywords
5 high-intent keywords ${businessName} should rank for:
1. [keyword]
2. [keyword]
3. [keyword]
4. [keyword]
5. [keyword]

## 4. Actionable Steps
3 immediate steps to get the first customer:
1. [specific action]
2. [specific action]
3. [specific action]

## 5. Scaling Strategy
How to double revenue in 6 months using AI tools: [2-3 sentences with specific AI tools]

Tone: Professional, encouraging, and data-driven.
Keep the entire response under 400 words. Be specific to the ${industry} industry in India.`;

    let result = null;

    if (genAI) {
      for (const m of ['gemini-2.0-flash', 'gemini-1.5-flash']) {
        try {
          const model = genAI.getGenerativeModel({ model: m });
          const r = await model.generateContent(prompt);
          result = r.response.text();
          break;
        } catch (e) { console.log(`quick-strategy ${m}:`, e.message.slice(0, 50)); }
      }
    }

    if (!result && openai) {
      try {
        const r = await openai.chat.completions.create({ model: 'gpt-3.5-turbo', messages: [{ role: 'user', content: prompt }], max_tokens: 600 });
        result = r.choices[0].message.content;
      } catch (e) { console.log('quick-strategy openai:', e.message.slice(0, 50)); }
    }

    // Fallback
    if (!result) {
      result = `## 1. Executive Summary
${businessName} aims to become the most trusted ${industry} brand in India by delivering consistent quality and building a loyal customer base through digital-first growth.

## 2. Market Analysis
Target audience: Urban professionals and students aged 22–40 seeking reliable ${industry} solutions
Competitor 1: Established local players — strong offline presence but weak digital marketing
Competitor 2: Large national brands — high awareness but poor personalization and high prices

## 3. SEO & Keywords
1. best ${industry.toLowerCase()} in [city]
2. affordable ${industry.toLowerCase()} near me
3. ${businessName.toLowerCase()} ${industry.toLowerCase()} reviews
4. top ${industry.toLowerCase()} service India 2026
5. ${industry.toLowerCase()} for professionals India

## 4. Actionable Steps
1. Create a Google Business Profile today — add photos, hours, and ask 5 customers for reviews this week
2. Post 3 pieces of content on Instagram showing your work/product with local hashtags
3. Offer a limited-time 20% discount to first 10 customers who book via WhatsApp

## 5. Scaling Strategy
Use ChatGPT to write weekly content and respond to customer queries 24/7. Deploy a WhatsApp chatbot via Wati or Interakt to automate bookings and follow-ups. Use Google Analytics + Meta Ads to identify your best-converting audience and double ad spend on that segment — this alone can 2x revenue in 90 days.`;
    }

    res.json({ strategy: result, businessName, industry });
  } catch (e) {
    console.error('Quick strategy error:', e.message);
    res.status(500).json({ error: 'Strategy generation failed.' });
  }
});

app.post('/api/strategy', async (req, res) => {
  try {
    const { idea, city, budget, background, timeline } = req.body;
    if (!idea) return res.status(400).json({ error: 'Business idea is required' });

    const prompt = `You are a world-class business strategist, McKinsey-level market analyst, and senior product architect.

A user wants a complete business strategy. Here are their inputs:
- Business Idea: ${idea}
- Target City/Region: ${city || 'India (general)'}
- Budget Range: ${budget || 'Bootstrap'}
- Their Background: ${background || 'Entrepreneur'}
- Timeline: ${timeline || '6 months'}

Generate a complete, production-ready business strategy following this EXACT structure. Be brutally honest, specific, and use Indian market context (₹, cities, WhatsApp/Instagram/Meesho etc). No fluff. Every sentence must carry information or action.

## 🎯 IDEA VERDICT
Give a 1-line brutal honest verdict.
SCORES (format exactly like this):
Market Demand: X/10 | [one sentence reasoning]
Competition Level: X/10 | [one sentence reasoning]
Execution Difficulty: X/10 | [one sentence reasoning]
Profit Potential: X/10 | [one sentence reasoning]

---
## 🌍 MARKET REALITY CHECK
1. WHO will pay? (3 bullet points: age, income, pain point, where online)
2. HOW BIG is this market in India? (TAM/SAM/SOM with reasoning)
3. WHY NOW? (trend or gap making 2025-2026 the right time)
4. WHERE to launch first? (single best city/neighborhood/platform with local logic)
5. WHAT does the customer actually want? (job-to-be-done, not surface desire)

---
## ⚔️ COMPETITOR MAP
List 3-5 real or likely competitors:
Name | What they do | Their weakness | Your gap to exploit

Your unfair advantage window: [1 paragraph on the specific angle that makes this winnable]

---
## 🚀 GO-TO-MARKET STRATEGY
PHASE 1 — VALIDATE (Week 1-4, Zero budget):
- Exact steps to get first 10 paying customers
- Which platform to use and what to say
- Success metric to know if it's working

PHASE 2 — LAUNCH (Month 2-3):
- MVP description (what to build, what to skip)
- 3 growth channels ranked by ROI
- Pricing: 3 tiers (free/basic/premium with ₹ amounts)
- One guerrilla marketing tactic specific to their city

PHASE 3 — SCALE (Month 4-12):
- When to hire first person (and what role)
- Revenue milestone before scaling
- Partnership or distribution strategy
- One big bet move that could 10x the business

---
## 💰 FINANCIAL BLUEPRINT
Month 1: Revenue target + how to hit it
Month 3: Break-even plan
Month 6: Profit projection
Key cost to eliminate: [most founders waste money here]
Unit economics: CAC estimate | LTV estimate | reasoning

---
## 🆕 MARKET EXPANSION IDEAS
Generate 5 unexpected angles. Format each as:
ANGLE NAME — one line description
Why it works: [market logic]
How to test it: [one-sentence experiment]
Revenue potential: Low/Medium/High/Moonshot
(At least 2 must be specific to Indian market behavior)

---
## ⚠️ RISK RADAR
List top 5 specific risks (NOT generic ones like "competition"):
Risk: [specific thing that could go wrong]
Probability: Low/Medium/High
Kill move: [exact action to prevent or survive it]

---
## 📅 90-DAY ACTION PLAN
Week-by-week table:
Week | Focus | Top 3 Actions | Success Signal
(Be specific — which app to open, what message to send, what to build)

---
## 💬 FOUNDER'S HONEST TALK
3 paragraphs written like a brutally honest mentor:
1. The one thing that will make or break this idea
2. The mistake 90% of first-time founders make with this type of business
3. The one question they must answer before spending a single rupee`;

    let strategy = null;

    // Try multiple Gemini models — each has separate quota
    if (genAI) {
      for (const modelName of ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.0-pro']) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(prompt);
          strategy = result.response.text();
          console.log(`Strategy: used ${modelName}`);
          break;
        } catch (e) {
          console.log(`${modelName} failed:`, e.message.slice(0, 60));
        }
      }
    }

    // Fallback to OpenAI
    if (!strategy && openai) {
      try {
        const result = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 3000,
        });
        strategy = result.choices[0].message.content;
      } catch (e) {
        console.log('OpenAI strategy failed:', e.message.slice(0, 60));
      }
    }

    if (!strategy) {
      // Use data-driven fallback when AI quota is exceeded
      strategy = generateFallbackStrategy(idea, city, budget, background, timeline);
    }

    res.json({ strategy, idea, city, budget, background, timeline });
  } catch (e) {
    console.error('Strategy engine error:', e.message);
    res.status(500).json({ error: 'Strategy generation failed. Please try again.' });
  }
});

// News API — startup, tech, innovation, hackathon news
const newsCache = { data: null, time: 0, fetching: false };

async function prefetchNews() {
  const key = process.env.NEWS_API_KEY;
  if (!key || key === 'your_newsapi_key_here') return;
  try {
    const queries = ['startup India funding 2026', 'technology innovation AI 2026', 'hackathon entrepreneur India'];
    const results = await Promise.allSettled(
      queries.map(q => axios.get('https://newsapi.org/v2/everything', {
        params: { q, language: 'en', sortBy: 'publishedAt', pageSize: 15, apiKey: key },
        timeout: 5000,
      }))
    );
    const seen = new Set();
    const articles = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value.data.articles || [])
      .filter(a => {
        if (!a.title || !a.url || a.title.includes('[Removed]')) return false;
        if (seen.has(a.url)) return false;
        seen.add(a.url); return true;
      })
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .slice(0, 30)
      .map(a => ({ title: a.title, url: a.url, source: a.source?.name || 'News', publishedAt: a.publishedAt, urlToImage: a.urlToImage, description: a.description }));
    if (articles.length > 0) { newsCache.data = { articles }; newsCache.time = Date.now(); console.log(`News pre-warmed: ${articles.length} articles`); }
  } catch (e) { console.log('News prefetch failed:', e.message); }
}
setTimeout(prefetchNews, 3000);
setInterval(prefetchNews, 25 * 60 * 1000);

app.get('/api/news', async (req, res) => {
  if (newsCache.data) {
    if (Date.now() - newsCache.time > 25 * 60 * 1000 && !newsCache.fetching) {
      newsCache.fetching = true;
      prefetchNews().finally(() => { newsCache.fetching = false; });
    }
    return res.json(newsCache.data);
  }
  res.json({ articles: FALLBACK_NEWS });
  if (!newsCache.fetching) { newsCache.fetching = true; prefetchNews().finally(() => { newsCache.fetching = false; }); }
});

const FALLBACK_NEWS = [
  { title: 'India startup ecosystem raises $8.9B in 2025', url: 'https://inc42.com', source: 'Inc42', publishedAt: new Date().toISOString() },
  { title: 'OpenAI launches GPT-5 with advanced reasoning', url: 'https://openai.com', source: 'OpenAI', publishedAt: new Date().toISOString() },
  { title: 'Zepto raises $350M — quick commerce boom continues', url: 'https://techcrunch.com', source: 'TechCrunch', publishedAt: new Date().toISOString() },
  { title: 'Google Gemini 2.0 now free for all developers', url: 'https://ai.google.dev', source: 'Google AI', publishedAt: new Date().toISOString() },
  { title: 'Y Combinator W26 batch — 40% Indian founders', url: 'https://ycombinator.com', source: 'YC', publishedAt: new Date().toISOString() },
  { title: 'India becomes 3rd largest startup ecosystem globally', url: 'https://inc42.com', source: 'Inc42', publishedAt: new Date().toISOString() },
  { title: 'Devpost announces $1M hackathon prize pool for 2026', url: 'https://devpost.com', source: 'Devpost', publishedAt: new Date().toISOString() },
  { title: 'PhonePe crosses 500M registered users milestone', url: 'https://inc42.com', source: 'Inc42', publishedAt: new Date().toISOString() },
  { title: 'HealthTech funding up 120% — telemedicine leads growth', url: 'https://techcrunch.com', source: 'TechCrunch', publishedAt: new Date().toISOString() },
  { title: 'Meesho hits 150M users — social commerce dominates Tier 2', url: 'https://inc42.com', source: 'Inc42', publishedAt: new Date().toISOString() },
];

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
  const rawLocation = sanitizeLocationInput(req.query.location || '');
  const countryCode = (req.query.country || '').replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase() || null;

  // Accept structured parts from frontend (street, city, pincode sent separately)
  const rawStreet  = (req.query.street  || '').trim();
  const rawCity    = (req.query.city    || '').trim();
  const rawPincode = (req.query.pincode || '').trim();

  if (!rawLocation || !isSafeLocation(rawLocation)) return res.status(400).json({ error: 'Valid location required' });

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (step, message, sub, progress) => {
    res.write(`data: ${JSON.stringify({ step, message, sub, progress })}\n\n`);
  };

  try {
    // Step 1a: AI spelling correction + normalization (runs before geocoding)
    send('geocode', 'Verifying location spelling with AI...', 'AI is checking your area name', 8);

    let location = rawLocation;
    let aiCorrectionNote = null;
    let structuredParts = null;

    // Only run AI normalization if we have structured parts (street/city/pincode)
    if (rawStreet || rawCity) {
      const aiResult = await normalizeLocationWithAI(rawStreet, rawCity, rawPincode, countryCode);
      location = sanitizeLocationInput(aiResult.normalized);
      aiCorrectionNote = aiResult.corrected ? aiResult.note : null;

      if (aiResult.corrected) {
        console.log(`AI corrected location: "${rawLocation}" → "${location}" (${aiResult.note})`);
        send('geocode', `AI corrected: "${aiResult.note}"`, 'Spelling fixed, locating...', 10);
      }

      // Pass structured parts to geocoder for precise lookup
      // Use AI-corrected values if available
      const correctedParts = location.split(',').map(p => p.trim());
      structuredParts = {
        street:  rawStreet  ? correctedParts[0] : null,
        city:    rawCity    ? (correctedParts[1] || correctedParts[0]) : null,
        pincode: rawPincode || null,
      };
    }

    // Step 1b: Geocode with structured parts for precision
    send('geocode', 'Finding your exact location on the map...', 'Geocoding your area', 12);
    let geo = null;
    try {
      geo = await geocodeLocation(location, countryCode, structuredParts);
    } catch (geoErr) {
      console.error('[SSE] geocodeLocation threw:', geoErr?.message);
    }
    if (!geo) {
      res.write(`data: ${JSON.stringify({ step: 'error', message: 'Location not found. Please check the spelling or try a nearby landmark.' })}\n\n`);
      return res.end();
    }
    const { latitude, longitude, displayName, partialMatch, matchedQuery } = geo;

    // Cache key uses 4 decimal precision (~11m) to avoid cross-locality collisions
    const cacheKey = `${location.toLowerCase().trim()}|${latitude.toFixed(4)}|${longitude.toFixed(4)}`;
    const cached = getCached(cacheKey);
    // Skip cache if it contains mock/estimated data — always re-fetch for real data
    if (cached && cached.aiSuggestions !== 'Generating AI recommendations...' && !cached.estimatedData) {
      send('cache', 'Loading from cache...', 'Instant results', 20);
      send('done', 'Complete!', 'Results ready', 100);
      res.write(`data: ${JSON.stringify({ step: 'result', data: cached })}\n\n`);
      return res.end();
    }

    const confirmedLabel = (displayName || matchedQuery || location).split(',').slice(0, 2).join(', ');
    send('geocode', `Found: ${confirmedLabel}`, aiCorrectionNote ? `✏️ ${aiCorrectionNote}` : 'Location confirmed', 20);

    // Step 2: Fetch businesses — TomTom + OSM + Foursquare + Google Places + Mappls + Manual all in parallel
    send('fetch', 'Scanning businesses nearby...', 'Collecting data from multiple map sources', 30);
    const [tomtomBusinesses, osmBusinesses, foursquareBusinesses, googleBusinesses, mapplsBusinesses, manualBusinesses] = await Promise.all([
      fetchTomTomBusinesses(latitude, longitude, 8000).catch(() => []),
      fetchRealBusinesses(latitude, longitude, 8000).catch(() => []),
      fetchFoursquareBusinesses(latitude, longitude, 5000).catch(() => []),
      fetchGooglePlacesBusinesses(latitude, longitude, 5000).catch(() => []),
      fetchMapplsBusinesses(latitude, longitude, 3000).catch(() => []),
      ManualBusiness.findAll().then(all => all.filter(b =>
        b.latitude && b.longitude &&
        Math.sqrt(Math.pow(b.latitude - latitude, 2) + Math.pow(b.longitude - longitude, 2)) < 0.08
      )).catch(() => []),
    ]);

    send('fetch', `Found ${tomtomBusinesses.length + osmBusinesses.length + foursquareBusinesses.length + googleBusinesses.length + mapplsBusinesses.length} raw businesses, analyzing...`, 'Processing data', 45);

    // Second OSM pass removed — fetchRealBusinesses now uses sub-grid internally,
    // so a second full call would double the Overpass load unnecessarily.
    const osmWider = [];

    // Track raw source counts BEFORE dedup
    const rawSourceCounts = {};
    if (tomtomBusinesses.length)    rawSourceCounts.tomtom     = tomtomBusinesses.length;
    if (osmBusinesses.length)       rawSourceCounts.osm        = osmBusinesses.length;
    if (foursquareBusinesses.length) rawSourceCounts.foursquare = foursquareBusinesses.length;
    if (googleBusinesses.length)    rawSourceCounts.google     = googleBusinesses.length;
    if (mapplsBusinesses.length)    rawSourceCounts.mappls     = mapplsBusinesses.length;
    if (manualBusinesses.length)    rawSourceCounts.manual     = manualBusinesses.length;

    // Merge all sources — Google/Mappls first (best branded store coverage), then Foursquare (ratings), then TomTom+OSM
    const allOsm = [...osmBusinesses, ...(osmWider || [])];
    const allSources = [
      ...googleBusinesses,        // Google first — best branded store coverage
      ...mapplsBusinesses,        // Mappls — India-specific branded stores (no card needed)
      ...foursquareBusinesses,    // Foursquare — real ratings
      ...mergeSmarter(tomtomBusinesses, allOsm),  // TomTom + OSM merged
    ];

    // Global dedup across all sources
    const globalSeen = new Set();
    let businesses = allSources.filter(b => {
      if (!b || !b.latitude || !b.longitude || !b.name) return false;
      const nameKey = (b.name || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
      const posKey = `${Math.round(b.latitude * 2000)}_${Math.round(b.longitude * 2000)}`;
      const key = nameKey.length > 2 ? `${nameKey}_${posKey}` : `${posKey}_${b.category}`;
      if (globalSeen.has(key)) return false;
      globalSeen.add(key);
      return true;
    });

    // Add manual businesses
    businesses.push(...manualBusinesses.map(b => ({
      name: b.name, category: b.category, rating: 4.0, reviewCount: 50,
      address: b.address, phone: b.phone, website: b.website,
      latitude: b.latitude, longitude: b.longitude, isManual: true,
    })));

    // Retry with wider radius if empty
    if (businesses.length === 0) {
      send('fetch', 'Expanding search radius...', 'Trying 5km radius', 40);
      const wider = await fetchRealBusinesses(latitude, longitude, 10000);
      const seen2 = new Set();
      businesses = [...wider,
        ...manualBusinesses.map(b => ({ name: b.name, category: b.category, rating: 4.0, reviewCount: 50, address: b.address, phone: b.phone, website: b.website, latitude: b.latitude, longitude: b.longitude, isManual: true })),
      ].filter(b => {
        const nameKey = (b.name || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
        const posKey = `${Math.round(b.latitude * 2000)}_${Math.round(b.longitude * 2000)}`;
        const key = nameKey.length > 2 ? `${nameKey}_${posKey}` : `${posKey}_${b.category}`;
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
    const osmTotal = (rawSourceCounts.osm || 0);
    const ttTotal = (rawSourceCounts.tomtom || 0);
    send('count', `Found ${businesses.length} businesses nearby`,
      usingEstimated
        ? 'Using estimated data — live sources unavailable'
        : `TomTom: ${ttTotal} · OSM: ${osmTotal} · Unique after dedup: ${businesses.length}`,
      55);
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

    // Step 4: AI — pass demand signals for better recommendations
    const wsOfficeCount   = businesses.filter(b => ['Office', 'Education', 'Finance'].includes(b.category)).length;
    const wsSchoolCount   = businesses.filter(b => b.category === 'Education').length;
    const wsHospitalCount = businesses.filter(b => b.category === 'Hospital').length;
    const wsResidential   = businesses.some(b => ['Grocery', 'Pharmacy', 'Laundry'].includes(b.category)) ? 1 : 0;
    const wsCityLower = (displayName || '').toLowerCase();
    const wsCityTierMap = { mumbai:10,delhi:10,bangalore:10,bengaluru:10,hyderabad:10,chennai:10,kolkata:10,pune:10,ahmedabad:10,surat:10,jaipur:7,lucknow:7,kanpur:7,nagpur:7,indore:7,bhopal:7,agra:7,nashik:7,varanasi:7,patna:7,allahabad:7,prayagraj:7,chandigarh:7,mysore:7,mysuru:7,meerut:7,guwahati:7,kota:7 };
    const wsCityTier = Object.entries(wsCityTierMap).find(([c]) => wsCityLower.includes(c))?.[1] || 5;
    const clampWs = (v, a, b) => Math.max(a, Math.min(b, v));
    const wsDemandScore = parseFloat(clampWs((wsCityTier * 0.4) + ((wsOfficeCount + wsSchoolCount + wsHospitalCount) / Math.max(businesses.length,1)) * 10 * 0.4 + (wsResidential * 2), 1, 10).toFixed(1));
    const wsAvgComp = sortedStats.length ? sortedStats.reduce((s,x) => s + x.riskScore, 0) / sortedStats.length / 10 : 5;
    const wsCompetitionScore = parseFloat(clampWs(wsAvgComp, 1, 10).toFixed(1));
    const wsOpportunityScore = parseFloat(clampWs((wsDemandScore * 0.6) - (wsCompetitionScore * 0.4) + 5, 1, 10).toFixed(1));
    const wsOpportunityLabel = wsOpportunityScore >= 7.5 ? 'Strong Opportunity' : wsOpportunityScore >= 5.5 ? 'Moderate Opportunity' : wsOpportunityScore >= 3.5 ? 'Competitive Market' : 'High Risk';
    const wsOpportunityContext = wsDemandScore >= 7 && wsCompetitionScore >= 7 ? 'High competition but strong demand — viable for differentiated businesses' : wsDemandScore >= 7 && wsCompetitionScore < 5 ? 'Low competition with strong demand — excellent entry window' : wsDemandScore < 5 && wsCompetitionScore >= 7 ? 'High risk — low demand with heavy competition' : `Demand from offices (${wsOfficeCount}), schools (${wsSchoolCount}), hospitals (${wsHospitalCount})`;

    // ── Location type detection ─────────────────────────────────────────────
    // Detect what kind of area this is so demand proxies are relevant
    const cityLowerWs = (displayName || '').toLowerCase();

    // Pilgrimage / tourism cities — tourist footfall matters more than offices
    const PILGRIMAGE_CITIES = ['vrindavan','mathura','varanasi','haridwar','rishikesh','tirupati',
      'shirdi','ayodhya','puri','dwarka','amritsar','bodh gaya','nashik','ujjain','pushkar',
      'kedarnath','badrinath','jammu','rameswaram','madurai','kanchipuram'];
    const TOURIST_CITIES = ['agra','goa','shimla','manali','ooty','darjeeling','mysore','mysuru',
      'jaipur','udaipur','jodhpur','jaisalmer','mussoorie','nainital','kodaikanal'];
    const INDUSTRIAL_CITIES = ['surat','ludhiana','kanpur','coimbatore','rajkot','faridabad',
      'gurgaon','gurugram','noida','pune','chennai','ahmedabad'];

    const isPilgrimage = PILGRIMAGE_CITIES.some(c => cityLowerWs.includes(c));
    const isTourist    = TOURIST_CITIES.some(c => cityLowerWs.includes(c));
    const isIndustrial = INDUSTRIAL_CITIES.some(c => cityLowerWs.includes(c));
    const locType = isPilgrimage ? 'pilgrimage' : isTourist ? 'tourist' : isIndustrial ? 'industrial' : 'general';

    // Detect signal counts from actual business data
    const wsHotelCount    = businesses.filter(b => ['Hotel','Hospitality'].includes(b.category)).length;
    const wsTempleSignal  = isPilgrimage ? Math.min(50, wsHotelCount * 3) : 0; // proxy for pilgrim footfall
    const wsTouristSignal = (isPilgrimage ? wsHotelCount * 4 : isTourist ? wsHotelCount * 3 : wsHotelCount) ;

    // ── Industry failure rate adjustment ────────────────────────────────────
    // High failure rate categories get a penalty — even if competition is low,
    // if demand fundamentals don't support the category it shouldn't be top pick
    const INDUSTRY_VIABILITY = {
      // score 1-10: how viable is this category in this location type
      // pilgrimage: temples, dharamshalas, pilgrims → food, prasad, clothing matter most
      pilgrimage: {
        Restaurant: 9, Grocery: 8, Clothing: 8, Bakery: 7, Hotel: 9,
        Pharmacy: 7, Retail: 7, Wholesale: 6, Hardware: 5,
        Cafe: 4,       // pilgrims don't typically go to cafes
        Gym: 3,        // low relevance in pilgrimage towns
        Finance: 5, Automotive: 5, Electronics: 5,
        Education: 4, Laundry: 6, Salon: 5, Furniture: 3,
      },
      tourist: {
        Restaurant: 9, Hotel: 9, Cafe: 7, Retail: 8, Clothing: 7,
        Bakery: 6, Grocery: 7, Pharmacy: 6, Salon: 6,
        Gym: 5, Finance: 5, Electronics: 6, Automotive: 5,
        Education: 3, Laundry: 5, Hardware: 4, Furniture: 3,
      },
      industrial: {
        Restaurant: 8, Grocery: 8, Pharmacy: 7, Laundry: 8, Gym: 7,
        Salon: 7, Finance: 8, Hardware: 8, Automotive: 8,
        Cafe: 6, Education: 7, Electronics: 7, Clothing: 6,
        Hotel: 5, Retail: 6, Bakery: 5, Furniture: 6,
      },
      general: {
        Restaurant: 8, Grocery: 8, Pharmacy: 7, Laundry: 7, Gym: 7,
        Salon: 7, Finance: 7, Education: 7, Electronics: 7,
        Cafe: 6, Clothing: 7, Hardware: 7, Bakery: 6,
        Hotel: 6, Retail: 7, Automotive: 6, Furniture: 5,
      },
    };
    const viabilityMap = INDUSTRY_VIABILITY[locType] || INDUSTRY_VIABILITY.general;

    // ── Per-category demand proxy (location-aware) ───────────────────────────
    const categoryDemandProxy = {
      Restaurant: locType === 'pilgrimage'
        ? wsTouristSignal * 4 + wsHospitalCount * 2 + wsOfficeCount
        : wsOfficeCount * 2 + wsSchoolCount + wsHospitalCount + wsTouristSignal,
      Cafe: locType === 'pilgrimage'
        ? wsOfficeCount * 2 + wsSchoolCount               // low for pilgrimage
        : locType === 'tourist'
          ? wsTouristSignal * 2 + wsOfficeCount
          : wsOfficeCount + wsSchoolCount,
      Grocery:     wsSchoolCount + wsHospitalCount + wsResidential * 20 + wsTouristSignal,
      Pharmacy:    wsHospitalCount * 3 + wsResidential * 15 + wsSchoolCount,
      Bakery:      wsSchoolCount * 2 + wsOfficeCount + (locType !== 'pilgrimage' ? 5 : 2),
      Laundry:     wsOfficeCount * 2 + wsResidential * 20 + wsHotelCount * 3,
      Gym:         wsOfficeCount * 2 + wsResidential * 10 + (locType === 'pilgrimage' ? -10 : 0),
      Salon:       wsOfficeCount + wsResidential * 10 + wsHotelCount * 2,
      Clothing:    locType === 'pilgrimage'
        ? wsTouristSignal * 2 + wsResidential * 8
        : wsOfficeCount + wsSchoolCount + wsResidential * 5,
      Electronics: wsOfficeCount * 2 + wsSchoolCount + (locType === 'industrial' ? 10 : 0),
      Education:   wsSchoolCount * 3 + wsResidential * 10,
      Hospital:    wsResidential * 20 + wsHospitalCount * 2,
      Hardware:    wsResidential * 15 + (locType === 'industrial' ? 15 : 0),
      Furniture:   wsResidential * 10,
      Hotel:       wsTouristSignal * 4 + wsCityTier * 3,
      Finance:     wsOfficeCount * 3 + wsCityTier * 3,
      Automotive:  wsResidential * 10 + (locType === 'industrial' ? 15 : 0) + wsCityTier * 2,
      Retail:      wsOfficeCount + wsSchoolCount + wsResidential * 8 + wsTouristSignal,
      Wholesale:   wsOfficeCount + (locType === 'industrial' ? 15 : 0) + wsCityTier * 4,
    };

    // ── Compute per-category opportunity (demand - competition, with viability gate) ──
    const maxDemandProxy = Math.max(...Object.values(categoryDemandProxy), 1);

    const bestOpportunities = sortedStats.map(s => {
      const viabilityScore = viabilityMap[s.category] ?? 5; // 1-10
      const demandProxyRaw = categoryDemandProxy[s.category] ?? (wsOfficeCount + wsResidential * 5);
      const demandProxyNorm = Math.min(100, (demandProxyRaw / maxDemandProxy) * 100);
      const cityDemandBoost = wsCityTier * 2; // slightly reduced — city tier is less important than local signals
      const totalDemand = Math.min(100, demandProxyNorm + cityDemandBoost);
      const competition = s.riskScore; // 0-100

      // Viability gate: if viability < 5 for this location type, suppress opportunity heavily
      const viabilityMultiplier = viabilityScore / 10; // 0.1 to 1.0
      const rawOpp = Math.round(((totalDemand * 0.6) - (competition * 0.4) + 40) * viabilityMultiplier);
      const catOpportunity = Math.max(0, Math.min(100, rawOpp));

      return {
        category: s.category,
        opportunityScore: catOpportunity,
        demandScore: Math.round(totalDemand),
        competitionScore: competition,
        viabilityScore,
        locationType: locType,
        count: s.count,
        riskLevel: s.riskLevel,
        demandSignalBreakdown: {
          offices: wsOfficeCount,
          schools: wsSchoolCount,
          hospitals: wsHospitalCount,
          residential: wsResidential,
          hotels: wsHotelCount,
          cityTier: wsCityTier,
          locationType: locType,
        },
      };
    })
    // Filter: only suggest categories with viability >= 5 AND some demand
    .filter(s => s.viabilityScore >= 5 && s.demandScore >= 20)
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, 5);

    send('ai', 'Asking AI for recommendations...', 'Generating personalized insights', 80);
    const aiSuggestions = await getAISuggestions(location, sortedStats, { offices: wsOfficeCount, schools: wsSchoolCount, hospitals: wsHospitalCount }, wsCityTier);

    // ── Hyperlocal hot spots ──
    const hotSpots = computeHotSpots(businesses, locType);

    send('done', 'Analysis complete!', 'Preparing your market report', 100);

    const result = {
      location: { displayName, latitude, longitude },
      partialMatch: partialMatch ? `Exact address not found — showing results for "${matchedQuery}" instead` : null,
      aiCorrectionNote: aiCorrectionNote || null,
      estimatedData: usingEstimated ? '⚠️ Live data unavailable — showing estimated market structure. Retry in a few minutes for real data.' : null,
      businesses, categoryStats: sortedStats, aiSuggestions,
      demandScore: wsDemandScore,
      competitionScore: wsCompetitionScore,
      opportunityScore: wsOpportunityScore,
      opportunityLabel: wsOpportunityLabel,
      opportunityContext: wsOpportunityContext,
      cityTier: wsCityTier,
      demandSignals: { offices: wsOfficeCount, schools: wsSchoolCount, hospitals: wsHospitalCount },
      bestOpportunities,
      hotSpots,
      userLat: latitude, userLng: longitude,
      dataQuality: buildDataQuality(businesses, aiSuggestions, rawSourceCounts),
    };
    setCache(cacheKey, result);
    res.write(`data: ${JSON.stringify({ step: 'result', data: result })}\n\n`);
    res.end();
  } catch (error) {
    console.error('[SSE CRASH]', error?.message, error?.stack?.split('\n').slice(0, 5).join(' | '));
    try {
      res.write(`data: ${JSON.stringify({ step: 'error', message: 'Analysis failed. Please try again.' })}\n\n`);
      res.end();
    } catch (_) {}
  }
});

// 1. Location Analysis
app.post('/api/analyze-location', async (req, res) => {
  try {
    const { nocache } = req.body;
    const location = sanitizeLocationInput(req.body.location || '');
    if (!location || !isSafeLocation(location)) return res.status(400).json({ error: 'Valid location required' });

    // Geocode first to get coordinates for cache key
    const countryCodePost = (req.body.country || req.query.country || "").replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase() || null;
    const geo = await geocodeLocation(location, countryCodePost);
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

    // Fetch TomTom (fast, 8s) + OSM sub-grid (15s max) in parallel
    const [tomtomBusinesses, osmBusinesses, manualBusinesses] = await Promise.all([
      fetchTomTomBusinesses(latitude, longitude, 8000).catch(() => []),
      fetchRealBusinesses(latitude, longitude, 8000).catch(() => []),
      ManualBusiness.findAll().then(all => all.filter(b =>
        b.latitude && b.longitude &&
        Math.sqrt(Math.pow(b.latitude - latitude, 2) + Math.pow(b.longitude - longitude, 2)) < 0.08
      )).catch(() => []),
    ]);

    // Track raw source counts BEFORE dedup — OSM entries get deduped out by TomTom
    const rawSourceCounts = {};
    if (tomtomBusinesses.length) rawSourceCounts.tomtom = tomtomBusinesses.length;
    if (osmBusinesses.length)    rawSourceCounts.osm    = osmBusinesses.length;
    if (manualBusinesses.length) rawSourceCounts.manual = manualBusinesses.length;

    // Smart merge: per-category winner takes all
    let businesses = [
      ...mergeSmarter(tomtomBusinesses, osmBusinesses),
      ...manualBusinesses.map(b => ({ name: b.name, category: b.category, rating: 4.0, reviewCount: 50, address: b.address, phone: b.phone, website: b.website, latitude: b.latitude, longitude: b.longitude, isManual: true })),
    ];

    // Retry with wider radius if empty
    if (businesses.length === 0) {
      const wider = await fetchRealBusinesses(latitude, longitude, 10000, 8000);
      const seen2 = new Set();
      businesses = [...wider,
        ...manualBusinesses.map(b => ({ name: b.name, category: b.category, rating: 4.0, reviewCount: 50, address: b.address, phone: b.phone, website: b.website, latitude: b.latitude, longitude: b.longitude, isManual: true })),
      ].filter(b => {
        const nameKey = (b.name || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
        const posKey = `${Math.round(b.latitude * 2000)}_${Math.round(b.longitude * 2000)}`;
        const key = nameKey.length > 2 ? `${nameKey}_${posKey}` : `${posKey}_${b.category}`;
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

    // ── Demand Score & Opportunity Score ──────────────────────────────────────
    // City tier based on known Indian cities (Tier 1 = 10, Tier 2 = 7, Tier 3 = 5)
    const cityTierMap = {
      // Tier 1
      mumbai: 10, delhi: 10, bangalore: 10, bengaluru: 10, hyderabad: 10,
      chennai: 10, kolkata: 10, pune: 10, ahmedabad: 10, surat: 10,
      // Tier 2
      jaipur: 7, lucknow: 7, kanpur: 7, nagpur: 7, indore: 7, bhopal: 7,
      visakhapatnam: 7, patiala: 7, vadodara: 7, coimbatore: 7, ludhiana: 7,
      agra: 7, nashik: 7, faridabad: 7, meerut: 7, rajkot: 7, varanasi: 7,
      patna: 7, srinagar: 7, aurangabad: 7, dhanbad: 7, amritsar: 7,
      allahabad: 7, prayagraj: 7, ranchi: 7, howrah: 7, jabalpur: 7,
      gwalior: 7, vijayawada: 7, jodhpur: 7, madurai: 7, raipur: 7,
      kota: 7, guwahati: 7, chandigarh: 7, solapur: 7, hubli: 7,
      bareilly: 7, moradabad: 7, mysore: 7, mysuru: 7, tiruchirappalli: 7,
      // Tier 3 — default for unrecognized
    };
    const cityLower = (displayName || '').toLowerCase();
    const detectedTier = Object.entries(cityTierMap).find(([city]) => cityLower.includes(city))?.[1] || 5;

    // Count demand signals from businesses
    const officeCount  = businesses.filter(b => ['Office', 'Education', 'Finance'].includes(b.category)).length;
    const schoolCount  = businesses.filter(b => b.category === 'Education').length;
    const hospitalCount = businesses.filter(b => b.category === 'Hospital').length;
    const residentialSignal = businesses.some(b =>
      b.category === 'Grocery' || b.category === 'Pharmacy' || b.category === 'Laundry'
    ) ? 1 : 0;

    const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
    const overallDemandScore = parseFloat(clamp(
      (detectedTier * 0.4) +
      ((officeCount + schoolCount + hospitalCount) / Math.max(businesses.length, 1)) * 10 * 0.4 +
      (residentialSignal * 2),
      1, 10
    ).toFixed(1));

    // Normalize competition: avg competitor score across all categories (0-10 scale)
    const avgCompetitorScore = sortedStats.length
      ? sortedStats.reduce((sum, s) => sum + s.riskScore, 0) / sortedStats.length / 10
      : 5;
    const overallCompetitionScore = parseFloat(clamp(avgCompetitorScore, 1, 10).toFixed(1));

    const overallOpportunityScore = parseFloat(clamp(
      (overallDemandScore * 0.6) - (overallCompetitionScore * 0.4) + 5,
      1, 10
    ).toFixed(1));

    const opportunityLabel =
      overallOpportunityScore >= 7.5 ? 'Strong Opportunity' :
      overallOpportunityScore >= 5.5 ? 'Moderate Opportunity' :
      overallOpportunityScore >= 3.5 ? 'Competitive Market' : 'High Risk';

    const opportunityContext =
      overallDemandScore >= 7 && overallCompetitionScore >= 7
        ? 'High competition but strong demand — viable for differentiated businesses'
        : overallDemandScore >= 7 && overallCompetitionScore < 5
          ? 'Low competition with strong demand — excellent entry window'
          : overallDemandScore < 5 && overallCompetitionScore >= 7
            ? 'High risk — low demand with heavy competition'
            : `Demand from offices (${officeCount}), schools (${schoolCount}), hospitals (${hospitalCount})`;
    // ──────────────────────────────────────────────────────────────────────────

    // ── Per-category opportunity scores for POST route (location-aware) ──
    const postCityLower = (displayName || '').toLowerCase();
    const POST_PILGRIMAGE = ['vrindavan','mathura','varanasi','haridwar','rishikesh','tirupati','shirdi','ayodhya','puri','dwarka','amritsar','bodh gaya','pushkar','kedarnath','badrinath','rameswaram','madurai'];
    const POST_TOURIST    = ['agra','goa','shimla','manali','ooty','darjeeling','mysore','mysuru','jaipur','udaipur','jodhpur','jaisalmer','mussoorie','nainital'];
    const POST_INDUSTRIAL = ['surat','ludhiana','kanpur','coimbatore','rajkot','faridabad','gurgaon','gurugram','noida','pune','chennai','ahmedabad'];
    const postLocType = POST_PILGRIMAGE.some(c => postCityLower.includes(c)) ? 'pilgrimage'
      : POST_TOURIST.some(c => postCityLower.includes(c)) ? 'tourist'
      : POST_INDUSTRIAL.some(c => postCityLower.includes(c)) ? 'industrial' : 'general';

    const postHotelCount   = businesses.filter(b => ['Hotel','Hospitality'].includes(b.category)).length;
    const postTouristSignal = postLocType === 'pilgrimage' ? postHotelCount * 4 : postLocType === 'tourist' ? postHotelCount * 3 : postHotelCount;

    const POST_VIABILITY = {
      pilgrimage: { Restaurant:9,Grocery:8,Clothing:8,Bakery:7,Hotel:9,Pharmacy:7,Retail:7,Wholesale:6,Hardware:5,Cafe:4,Gym:3,Finance:5,Automotive:5,Electronics:5,Education:4,Laundry:6,Salon:5,Furniture:3 },
      tourist:    { Restaurant:9,Hotel:9,Cafe:7,Retail:8,Clothing:7,Bakery:6,Grocery:7,Pharmacy:6,Salon:6,Gym:5,Finance:5,Electronics:6,Automotive:5,Education:3,Laundry:5,Hardware:4,Furniture:3 },
      industrial: { Restaurant:8,Grocery:8,Pharmacy:7,Laundry:8,Gym:7,Salon:7,Finance:8,Hardware:8,Automotive:8,Cafe:6,Education:7,Electronics:7,Clothing:6,Hotel:5,Retail:6,Bakery:5,Furniture:6 },
      general:    { Restaurant:8,Grocery:8,Pharmacy:7,Laundry:7,Gym:7,Salon:7,Finance:7,Education:7,Electronics:7,Cafe:6,Clothing:7,Hardware:7,Bakery:6,Hotel:6,Retail:7,Automotive:6,Furniture:5 },
    };
    const postViabilityMap = POST_VIABILITY[postLocType] || POST_VIABILITY.general;

    const postCategoryDemandProxy = {
      Restaurant: postLocType === 'pilgrimage' ? postTouristSignal * 4 + hospitalCount * 2 + officeCount : officeCount * 2 + schoolCount + hospitalCount + postTouristSignal,
      Cafe:       postLocType === 'pilgrimage' ? officeCount * 2 + schoolCount : postLocType === 'tourist' ? postTouristSignal * 2 + officeCount : officeCount + schoolCount,
      Grocery:    schoolCount + hospitalCount + residentialSignal * 20 + postTouristSignal,
      Pharmacy:   hospitalCount * 3 + residentialSignal * 15 + schoolCount,
      Bakery:     schoolCount * 2 + officeCount,
      Laundry:    officeCount * 2 + residentialSignal * 20 + postHotelCount * 3,
      Gym:        officeCount * 2 + residentialSignal * 10 + (postLocType === 'pilgrimage' ? -10 : 0),
      Salon:      officeCount + residentialSignal * 10 + postHotelCount * 2,
      Clothing:   postLocType === 'pilgrimage' ? postTouristSignal * 2 + residentialSignal * 8 : officeCount + schoolCount + residentialSignal * 5,
      Electronics:officeCount * 2 + schoolCount + (postLocType === 'industrial' ? 10 : 0),
      Education:  schoolCount * 3 + residentialSignal * 10,
      Hospital:   residentialSignal * 20 + hospitalCount * 2,
      Hardware:   residentialSignal * 15 + (postLocType === 'industrial' ? 15 : 0),
      Furniture:  residentialSignal * 10,
      Hotel:      postTouristSignal * 4 + detectedTier * 3,
      Finance:    officeCount * 3 + detectedTier * 3,
      Automotive: residentialSignal * 10 + (postLocType === 'industrial' ? 15 : 0) + detectedTier * 2,
      Retail:     officeCount + schoolCount + residentialSignal * 8 + postTouristSignal,
      Wholesale:  officeCount + (postLocType === 'industrial' ? 15 : 0) + detectedTier * 4,
    };
    const postMaxProxy = Math.max(...Object.values(postCategoryDemandProxy), 1);
    const bestOpportunities = sortedStats.map(s => {
      const viab = postViabilityMap[s.category] ?? 5;
      const proxyRaw = postCategoryDemandProxy[s.category] ?? (officeCount + residentialSignal * 5);
      const proxyNorm = Math.min(100, (proxyRaw / postMaxProxy) * 100);
      const totalDemand = Math.min(100, proxyNorm + detectedTier * 2);
      const rawOpp = Math.round(((totalDemand * 0.6) - (s.riskScore * 0.4) + 40) * (viab / 10));
      const catOpp = Math.max(0, Math.min(100, rawOpp));
      return {
        category: s.category, opportunityScore: catOpp,
        demandScore: Math.round(totalDemand), competitionScore: s.riskScore,
        viabilityScore: viab, locationType: postLocType,
        count: s.count, riskLevel: s.riskLevel,
        demandSignalBreakdown: { offices: officeCount, schools: schoolCount, hospitals: hospitalCount, residential: residentialSignal, hotels: postHotelCount, cityTier: detectedTier, locationType: postLocType },
      };
    })
    .filter(s => s.viabilityScore >= 5 && s.demandScore >= 20)
    .sort((a, b) => b.opportunityScore - a.opportunityScore).slice(0, 5);
    // ─────────────────────────────────────────────────────────────────────────

    const usingEstimated = businesses.some(b => b.isMock);
    const result = {
      location: { displayName, latitude, longitude },
      partialMatch: partialMatch ? `Exact address not found — showing results for "${matchedQuery}" instead` : null,
      estimatedData: usingEstimated ? '⚠️ Live data unavailable — showing estimated market structure. Retry in a few minutes for real data.' : null,
      businesses,
      categoryStats: sortedStats,
      demandScore: overallDemandScore,
      competitionScore: overallCompetitionScore,
      opportunityScore: overallOpportunityScore,
      opportunityLabel,
      opportunityContext,
      cityTier: detectedTier,
      demandSignals: { offices: officeCount, schools: schoolCount, hospitals: hospitalCount },
      bestOpportunities,
      hotSpots: computeHotSpots(businesses, postLocType),
      aiSuggestions: 'Generating AI recommendations...',
      userLat: latitude,
      userLng: longitude,
      dataQuality: buildDataQuality(businesses, 'Generating AI recommendations...', rawSourceCounts),
    };

    // Send response immediately, then get AI in background
    setCache(cacheKey, result);
    res.json(result);

    // Update cache with AI result after response sent
    getAISuggestions(location, categoryStats, { offices: officeCount, schools: schoolCount, hospitals: hospitalCount }, detectedTier).then(ai => {
      result.aiSuggestions = ai;
      result.dataQuality = buildDataQuality(result.businesses, ai, rawSourceCounts);
      setCache(cacheKey, result);
    });

  } catch (error) {
    console.error('[POST CRASH]', error?.message, error?.stack?.split('\n').slice(0,3).join(' | '));
    if (!res.headersSent) res.status(500).json({ error: 'Analysis failed' });
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

        // Use govt circle rates for realistic pricing — deterministic based on element ID
        const sizeR = deterministicRandom(`size_${el.id}`);
        const sizeSqft = Math.floor(sizeR * 1200 + 200);
        const isRent = i % 3 !== 1;
        const varianceR = deterministicRandom(`variance_${el.id}`);
        const variance = 0.8 + varianceR * 0.4;
        const price = isRent
          ? Math.round((sizeSqft * circleRate.rent * variance) / 1000) * 1000
          : Math.round((sizeSqft * circleRate.sale * variance) / 100000) * 100000;

        return {
          id: el.id, type: isRent ? 'rent' : 'sale',
          price, size: sizeSqft, address,
          latitude: elLat, longitude: elLon,
          footTraffic: 60 + Math.floor(deterministicRandom(`traffic_${el.id}`) * 35),
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
    const variance = 0.8 + deterministicRandom(`fallback_prop_${i}_${lat}`) * 0.4;
    const price = isRent
      ? Math.round((sizes[i] * circleRate.rent * variance) / 1000) * 1000
      : Math.round((sizes[i] * circleRate.sale * variance) / 100000) * 100000;
    const latOff = (deterministicRandom(`lat_${i}_${lat}`) - 0.5) * 0.025;
    const lngOff = (deterministicRandom(`lng_${i}_${lng}`) - 0.5) * 0.025;
    return {
      id: i + 1, type: types[i], price, size: sizes[i],
      address: `${areas[i]}, ${cityName || 'City Center'}`,
      latitude: lat + latOff,
      longitude: lng + lngOff,
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
    // Fetch from OSM + Google Places in parallel for best map coverage
    const [osmElements, googleBizRaw] = await Promise.all([
      (async () => {
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
        return (osmRes.data.elements || []).filter(el => {
          const elLat = el.lat ?? el.center?.lat;
          const elLon = el.lon ?? el.center?.lon;
          return elLat && elLon;
        });
      })().catch(() => []),
      fetchGooglePlacesBusinesses(lat, lng, radiusMeters).catch(() => []),
    ]);

    const allBiz = [];
    const mapSeen = new Set();

    // Add Google Places first (real ratings)
    googleBizRaw.forEach(b => {
      const nameKey = (b.name || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 18);
      const posKey = `${Math.round(b.latitude * 2000)}_${Math.round(b.longitude * 2000)}`;
      const key = nameKey.length > 2 ? `${nameKey}_${posKey}` : `${posKey}_g`;
      if (mapSeen.has(key)) return;
      mapSeen.add(key);
      allBiz.push({
        id: `g_${nameKey}_${posKey}`,
        name: b.name,
        category: b.category,
        rating: b.rating || stableRating(b.name, b.category),
        reviewCount: b.reviewCount || stableReviews(b.name, b.category, 240),
        address: b.address,
        latitude: b.latitude,
        longitude: b.longitude,
        phone: b.phone || null,
        isOpen: b.isOpen,
        source: 'google',
      });
    });

    // Add OSM elements (fills gaps Google misses)
    osmElements.forEach((el, i) => {
      const tags = el.tags || {};
      const elLat = el.lat ?? el.center?.lat;
      const elLon = el.lon ?? el.center?.lon;
      const name = tags.name || tags.brand || tags.operator || tags.ref;
      if (!name) return;
      const nameKey = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 18);
      const posKey = `${Math.round(elLat * 2000)}_${Math.round(elLon * 2000)}`;
      const key = nameKey.length > 2 ? `${nameKey}_${posKey}` : `${posKey}_o`;
      if (mapSeen.has(key)) return;
      mapSeen.add(key);
      const category = tags.amenity || tags.shop || tags.office || tags.tourism || tags.leisure || 'Business';
      const addressParts = [tags['addr:street'], tags['addr:housenumber'], tags['addr:suburb'], tags['addr:city'], tags['addr:postcode']].filter(Boolean);
      allBiz.push({
        id: `${el.type}_${el.id}`,
        name,
        category: osmToCategory[category] || category,
        rating: stableRating(name, category),
        reviewCount: stableReviews(name, category, 240),
        address: addressParts.join(', ') || tags['addr:full'] || null,
        latitude: elLat,
        longitude: elLon,
        phone: tags.phone || tags['contact:phone'] || null,
        source: 'osm',
      });
    });

    if (allBiz.length > 0) return res.json(allBiz);
  } catch (e) {
    console.log('Map business fetch failed:', e.message);
  }

  // fallback mock
  const cats = ['Restaurant', 'Cafe', 'Grocery', 'Gym', 'Salon', 'Pharmacy', 'Bakery', 'Laundry'];
  const mock = Array.from({ length: 20 }, (_, i) => ({
    name: `Business ${i + 1}`,
    category: cats[i % cats.length],
    rating: parseFloat((deterministicRandom(`mock_${i}_${lat}`) * 2 + 3).toFixed(1)),
    reviewCount: Math.floor(deterministicRandom(`mock_rev_${i}`) * 300 + 10),
    address: `Address ${i + 1}`,
    latitude: parseFloat(lat) + (deterministicRandom(`mock_lat_${i}`) - 0.5) * 0.01,
    longitude: parseFloat(lng) + (deterministicRandom(`mock_lng_${i}`) - 0.5) * 0.01,
  }));
  res.json(mock);
});

// Cache bust endpoint (admin only)
app.post('/api/admin/clear-cache', adminAuth, (req, res) => {
  cache.clear();
  geocodeCache.clear();
  res.json({ success: true, message: 'Cache cleared' });
});

// ── System Health & Error Log endpoints ──

// Get error logs
app.get('/api/admin/errors', adminAuth, async (req, res) => {
  try {
    const errors = await ErrorLog.findAll({
      order: [['createdAt', 'DESC']],
      limit: 100,
    });
    res.json(errors);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Resolve an error
app.patch('/api/admin/errors/:id/resolve', adminAuth, async (req, res) => {
  try {
    await ErrorLog.update(
      { resolved: true, fixNote: req.body.fixNote || 'Manually resolved by admin' },
      { where: { id: req.params.id } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Clear all resolved errors
app.delete('/api/admin/errors/resolved', adminAuth, async (req, res) => {
  try {
    const count = await ErrorLog.destroy({ where: { resolved: true } });
    res.json({ success: true, deleted: count });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get latest health check per service
app.get('/api/admin/health', adminAuth, async (req, res) => {
  try {
    const services = ['overpass', 'nominatim', 'gemini', 'database'];
    const latest = await Promise.all(services.map(s =>
      HealthCheck.findOne({ where: { service: s }, order: [['createdAt', 'DESC']] })
    ));
    res.json(latest.filter(Boolean));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Trigger manual health check
app.post('/api/admin/health/check', adminAuth, async (req, res) => {
  try {
    await runHealthChecks();
    const services = ['overpass', 'nominatim', 'gemini', 'database'];
    const latest = await Promise.all(services.map(s =>
      HealthCheck.findOne({ where: { service: s }, order: [['createdAt', 'DESC']] })
    ));
    res.json({ success: true, results: latest.filter(Boolean) });
  } catch (e) { res.status(500).json({ error: e.message }); }
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

// ── Business Plan Public Endpoint (no auth required) ──────────────────────────
app.post('/api/business-plan-public', async (req, res) => {
  try {
    const { idea, city, budget, timeline, background } = req.body;
    if (!idea) return res.status(400).json({ error: 'Business idea is required' });

    const prompt = `You are a world-class business plan writer. Create a comprehensive, investor-ready business plan for the following:

Business Idea: ${idea}
Target City: ${city || 'India'}
Budget: ${budget || 'Bootstrap'}
Timeline: ${timeline || '6 months'}
Founder Background: ${background || 'Entrepreneur'}

Write a complete business plan with these sections:
## Executive Summary
## Market Analysis
## Business Model
## Marketing Strategy
## Operations Plan
## Financial Projections
## Risk Analysis
## 90-Day Action Plan

Be specific, practical, and India-focused. Use ₹ for currency. Keep each section concise but actionable.`;

    let plan = null;

    if (genAI) {
      for (const m of ['gemini-2.0-flash', 'gemini-1.5-flash']) {
        try {
          const model = genAI.getGenerativeModel({ model: m });
          const r = await model.generateContent(prompt);
          plan = r.response.text();
          break;
        } catch (e) { console.log(`business-plan-public ${m}:`, e.message.slice(0, 60)); }
      }
    }

    if (!plan) {
      plan = generateFallbackStrategy(idea, city, budget, background, timeline);
    }

    res.json({ plan });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Competitor Tracking Endpoints ─────────────────────────────────────────────
const TrackedLocation = sequelize.define('TrackedLocation', {
  userId: { type: DataTypes.INTEGER, allowNull: false },
  location: { type: DataTypes.STRING, allowNull: false },
  businessCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  lastChecked: DataTypes.DATE,
  newBusinesses: { type: DataTypes.INTEGER, defaultValue: 0 },
  closedBusinesses: { type: DataTypes.INTEGER, defaultValue: 0 },
  snapshotData: DataTypes.TEXT, // JSON stringified business list
});

// Get all tracked locations for user
app.get('/api/track', authMiddleware, async (req, res) => {
  try {
    const items = await TrackedLocation.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
    });
    res.json(items);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Add a location to track
app.post('/api/track', authMiddleware, async (req, res) => {
  try {
    const { location } = req.body;
    if (!location || location.trim().length < 2) return res.status(400).json({ error: 'Location is required' });
    const existing = await TrackedLocation.findOne({ where: { userId: req.user.id, location: location.trim() } });
    if (existing) return res.status(409).json({ error: 'Already tracking this location' });
    const item = await TrackedLocation.create({ userId: req.user.id, location: location.trim(), businessCount: 0 });
    res.json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Check a tracked location for changes
app.get('/api/track/check', authMiddleware, async (req, res) => {
  try {
    const { id } = req.query;
    const item = await TrackedLocation.findOne({ where: { id, userId: req.user.id } });
    if (!item) return res.status(404).json({ error: 'Tracked location not found' });

    // Geocode the location
    let lat, lng;
    try {
      const geoRes = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: { q: item.location, format: 'json', limit: 1 },
        headers: { 'User-Agent': 'BizScope/2.0' },
        timeout: 8000,
      });
      if (geoRes.data?.[0]) { lat = parseFloat(geoRes.data[0].lat); lng = parseFloat(geoRes.data[0].lon); }
    } catch (_) {}

    let currentCount = item.businessCount;
    if (lat && lng) {
      try {
        const osmRes = await axios.get('https://overpass-api.de/api/interpreter', {
          params: { data: `[out:json][timeout:15];(node["shop"](around:1000,${lat},${lng});node["amenity"~"restaurant|cafe|pharmacy|hospital|school|bank"](around:1000,${lat},${lng}););out count;` },
          timeout: 15000,
        });
        currentCount = osmRes.data?.elements?.[0]?.tags?.total || osmRes.data?.elements?.length || item.businessCount;
      } catch (_) {}
    }

    const prevCount = item.businessCount || currentCount;
    const diff = currentCount - prevCount;
    const newBusinesses = diff > 0 ? diff : 0;
    const closedBusinesses = diff < 0 ? Math.abs(diff) : 0;

    await item.update({ businessCount: currentCount, lastChecked: new Date(), newBusinesses, closedBusinesses });
    res.json({ businessCount: currentCount, lastChecked: new Date(), newBusinesses, closedBusinesses });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Delete a tracked location
app.delete('/api/track/:id', authMiddleware, async (req, res) => {
  try {
    const item = await TrackedLocation.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!item) return res.status(404).json({ error: 'Not found' });
    await item.destroy();
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Co-founder Matcher Endpoints ──────────────────────────────────────────────
const CoFounder = sequelize.define('CoFounder', {
  name: { type: DataTypes.STRING, allowNull: false },
  city: { type: DataTypes.STRING, allowNull: false },
  skills: DataTypes.TEXT, // JSON array
  lookingFor: DataTypes.STRING,
  ideaStage: DataTypes.STRING,
  commitment: DataTypes.STRING,
  bio: DataTypes.TEXT,
  whatsapp: DataTypes.STRING,
});

// Get all co-founder profiles (public)
app.get('/api/cofounder', async (req, res) => {
  try {
    const profiles = await CoFounder.findAll({ order: [['createdAt', 'DESC']], limit: 100 });
    res.json(profiles.map(p => ({
      id: p.id,
      name: p.name,
      city: p.city,
      skills: p.skills ? JSON.parse(p.skills) : [],
      lookingFor: p.lookingFor,
      ideaStage: p.ideaStage,
      commitment: p.commitment,
      bio: p.bio,
      whatsapp: p.whatsapp,
      createdAt: p.createdAt,
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Create a co-founder profile (public, no auth)
app.post('/api/cofounder', async (req, res) => {
  try {
    const { name, city, skills, lookingFor, ideaStage, commitment, bio, whatsapp } = req.body;
    if (!name || !city || !lookingFor || !commitment) {
      return res.status(400).json({ error: 'Name, city, lookingFor, and commitment are required' });
    }
    const profile = await CoFounder.create({
      name: String(name).slice(0, 100),
      city: String(city).slice(0, 100),
      skills: JSON.stringify(Array.isArray(skills) ? skills.slice(0, 10) : []),
      lookingFor: String(lookingFor).slice(0, 100),
      ideaStage: ideaStage ? String(ideaStage).slice(0, 100) : null,
      commitment: String(commitment).slice(0, 100),
      bio: bio ? String(bio).slice(0, 500) : null,
      whatsapp: whatsapp ? String(whatsapp).replace(/[^0-9+]/g, '').slice(0, 15) : null,
    });
    res.json({ success: true, id: profile.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Delete a co-founder profile (by id — honor system, no auth for now)
app.delete('/api/cofounder/:id', async (req, res) => {
  try {
    const profile = await CoFounder.findByPk(req.params.id);
    if (!profile) return res.status(404).json({ error: 'Not found' });
    await profile.destroy();
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Start server immediately — don't wait for DB sync
// NEW FEATURE ROUTES
app.post('/api/scorecard', scorecardHandler);
app.post('/api/competitor-alert', competitorAlertHandler);
app.post('/api/revenue-estimate', revenueEstimateHandler);
app.post('/api/compare-cities', compareCitiesHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Self-ping every 10 minutes to prevent Render free tier sleep
  // Render sleeps after 15min of inactivity — ping every 10min to stay awake
  const BACKEND_URL =
    process.env.RENDER_EXTERNAL_URL ||
    (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null);

  if (BACKEND_URL) {
    // First ping after 5 minutes (let server fully warm up)
    setTimeout(() => {
      axios.get(`${BACKEND_URL}/api/health`).catch(() => {});
    }, 5 * 60 * 1000);

    // Then every 10 minutes
    setInterval(() => {
      axios.get(`${BACKEND_URL}/api/health`).catch(() => {});
    }, 10 * 60 * 1000);

    console.log(`Self-ping enabled every 10min: ${BACKEND_URL}/api/health`);
  } else {
    console.log('Self-ping disabled (no RENDER_EXTERNAL_URL set)');
  }
});

// Sync DB in background — server stays up even if DB is slow
// alter:true adds missing columns to existing tables without dropping data
sequelize.sync({ force: false, alter: true })
  .then(() => console.log('Database synced (alter mode — new columns added)'))
  .catch(e => console.error('DB sync failed (non-fatal):', e.message));
