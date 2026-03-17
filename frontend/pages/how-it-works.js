import Head from 'next/head';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { useTheme } from '../context/ThemeContext';

const sections = [
  { id: 'overview', label: '🗺️ Overview' },
  { id: 'data', label: '📡 Data Sources' },
  { id: 'geocoding', label: '📍 Geocoding' },
  { id: 'competitor', label: '🏪 Competitor Score' },
  { id: 'risk', label: '⚠️ Risk Score' },
  { id: 'demand', label: '📈 Demand Score' },
  { id: 'trends', label: '📊 Trend Charts' },
  { id: 'ai', label: '🤖 AI Engine' },
  { id: 'properties', label: '🏠 Properties' },
  { id: 'caching', label: '⚡ Caching' },
];

export default function HowItWorks() {
  const router = useRouter();
  const { dark, toggle } = useTheme();
  const [active, setActive] = useState('overview');

  const Formula = ({ children }) => (
    <div style={{ background: dark ? '#0a0f1a' : '#f1f5f9', border: '1px solid var(--border)', borderLeft: '3px solid #6366f1', borderRadius: '10px', padding: '14px 18px', margin: '12px 0', fontFamily: 'monospace', fontSize: '14px', color: '#a78bfa', lineHeight: '1.8' }}>
      {children}
    </div>
  );

  const Tag = ({ color = '#6366f1', children }) => (
    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '100px', background: color + '20', color, fontSize: '12px', fontWeight: '600', margin: '2px' }}>{children}</span>
  );

  const H = ({ children }) => (
    <div style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text)', marginTop: '28px', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>{children}</div>
  );

  const P = ({ children }) => (
    <p style={{ color: 'var(--text2)', fontSize: '14px', lineHeight: '1.8', marginBottom: '10px' }}>{children}</p>
  );

  const content = {
    overview: (
      <>
        <P>BizScope AI is a full-stack market intelligence platform. When you enter a location, it runs a multi-step pipeline: geocoding → OSM data fetch → scoring → AI analysis — all within seconds.</P>
        <H>Pipeline Flow</H>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '16px 0' }}>
          {[
            { step: '01', title: 'Geocoding', desc: 'Convert city/address/pincode → lat/lng coordinates via Nominatim (OpenStreetMap)', color: '#6366f1' },
            { step: '02', title: 'OSM Query', desc: 'Fetch all businesses within 5km radius using Overpass API (nodes only, fast)', color: '#8b5cf6' },
            { step: '03', title: 'Category Grouping', desc: 'Map OSM amenity/shop tags → BizScope categories (Restaurant, Cafe, Gym, etc.)', color: '#ec4899' },
            { step: '04', title: 'Scoring Engine', desc: 'Calculate Competitor Score, Risk Score, Demand Score per category', color: '#f59e0b' },
            { step: '05', title: 'AI Analysis', desc: 'Send category stats to Gemini/GPT — returns 5 business recommendations (async)', color: '#10b981' },
            { step: '06', title: 'Response', desc: 'Return all data instantly. AI text streams in via polling every 3 seconds', color: '#3b82f6' },
          ].map(s => (
            <div key={s.step} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', padding: '14px 16px', background: 'var(--surface2)', borderRadius: '12px', border: `1px solid ${s.color}20` }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: s.color + '20', border: `1px solid ${s.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', color: s.color, flexShrink: 0 }}>{s.step}</div>
              <div>
                <div style={{ fontWeight: '600', color: 'var(--text)', fontSize: '14px', marginBottom: '3px' }}>{s.title}</div>
                <div style={{ fontSize: '13px', color: 'var(--muted)' }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </>
    ),

    data: (
      <>
        <H>OpenStreetMap (OSM)</H>
        <P>All business data comes from OpenStreetMap — a free, community-maintained global map with 50M+ points of interest. No paid API keys required.</P>
        <P>BizScope queries the <strong style={{ color: 'var(--text)' }}>Overpass API</strong> — a read-only OSM query engine — to fetch nodes within a radius.</P>
        <Formula>
          {`Overpass Query (simplified):\n[out:json][timeout:15];\nnode["amenity"](around:5000, {lat}, {lng});\nout body;\n\nAlso queries: shop, leisure, healthcare, office tags`}
        </Formula>
        <H>OSM Tag → Category Mapping</H>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '12px 0' }}>
          {[
            ['restaurant, fast_food, food_court', 'Restaurant'],
            ['cafe, coffee_shop', 'Cafe'],
            ['supermarket, convenience, grocery', 'Grocery'],
            ['gym, fitness_centre, sports_centre', 'Gym'],
            ['hairdresser, beauty, salon', 'Salon'],
            ['pharmacy, chemist, drugstore', 'Pharmacy'],
            ['bakery, pastry', 'Bakery'],
            ['laundry, dry_cleaning', 'Laundry'],
            ['hospital, clinic, doctors, dentist', 'Hospital'],
            ['clothes, shoes, boutique, fashion', 'Clothing'],
            ['electronics, mobile_phone, computer', 'Electronics'],
            ['hardware, doityourself, paint', 'Hardware'],
            ['furniture, interior_decoration', 'Furniture'],
            ['school, college, university, tutoring', 'Education'],
            ['jewellery, gold, watches', 'Jewellery'],
            ['car, car_repair, fuel, motorcycle', 'Automotive'],
            ['bank, atm, money_transfer', 'Finance'],
            ['hotel, hostel, guest_house', 'Hospitality'],
            ['stationery, books, toys, florist', 'Retail'],
            ['wholesale, warehouse', 'Wholesale'],
            ['office=company/it/lawyer/accountant', 'Office'],
          ].map(([tags, cat]) => (
            <div key={cat} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px 14px', fontSize: '12px' }}>
              <span style={{ color: 'var(--muted)', fontFamily: 'monospace' }}>{tags}</span>
              <span style={{ color: '#a78bfa', margin: '0 6px' }}>→</span>
              <span style={{ color: 'var(--text)', fontWeight: '600' }}>{cat}</span>
            </div>
          ))}
        </div>
        <H>Address Building</H>
        <P>BizScope builds addresses from OSM tags in priority order:</P>
        <Formula>
          {`addr:housenumber + addr:street\n+ addr:suburb / addr:neighbourhood / addr:quarter\n+ addr:city / addr:town / addr:village\n+ addr:state\n\nFallback: "Near {lat}, {lng}" if no address data`}
        </Formula>
      </>
    ),

    geocoding: (
      <>
        <H>Nominatim Geocoding</H>
        <P>User input (city + address + pincode) is sent to Nominatim — OSM's free geocoding service — to get precise lat/lng coordinates.</P>
        <Formula>
          {`GET https://nominatim.openstreetmap.org/search\n  ?q={city},{address},{pincode}\n  &format=json\n  &limit=1\n  &countrycodes=in\n\nReturns: { lat, lon, display_name }`}
        </Formula>
        <H>Search Radius</H>
        <P>All competitor and property queries use a fixed 5km radius from the geocoded point.</P>
        <Formula>
          {`radius = 5000 meters (5km)\n\nManual business filter:\n  |business.lat - center.lat| < 0.08°\n  |business.lng - center.lng| < 0.08°\n  (~8.9km bounding box, then filtered by circle)`}
        </Formula>
      </>
    ),

    competitor: (
      <>
        <H>Competitor Score Formula</H>
        <P>For each business category, BizScope calculates a weighted score combining three signals:</P>
        <Formula>
          {`popularityScore = √(totalReviews)\n\ncompetitorScore =\n  (count × 0.4)          ← 40% weight: raw competitor count\n  + (avgRating × 0.3)    ← 30% weight: average star rating\n  + (popularityScore × 0.3)  ← 30% weight: √(total reviews)`}
        </Formula>
        <H>Why these weights?</H>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '12px 0' }}>
          {[
            { w: '40%', title: 'Count', desc: 'More competitors = harder market. Highest weight as it directly measures supply.' },
            { w: '30%', title: 'Avg Rating', desc: 'High-rated competitors are harder to beat. A 4.8★ area is tougher than a 3.2★ area.' },
            { w: '30%', title: 'Popularity (√reviews)', desc: 'Square root dampens outliers. A business with 10,000 reviews isn\'t 100× harder than one with 100 reviews.' },
          ].map(r => (
            <div key={r.w} style={{ display: 'flex', gap: '12px', padding: '12px 16px', background: 'var(--surface2)', borderRadius: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#6366f120', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: '#a78bfa', fontSize: '12px', flexShrink: 0 }}>{r.w}</div>
              <div>
                <div style={{ fontWeight: '600', color: 'var(--text)', fontSize: '13px' }}>{r.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{r.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <H>Example Calculation</H>
        <Formula>
          {`Category: Restaurant\n  count = 12\n  avgRating = 4.2\n  totalReviews = 850\n  popularityScore = √850 ≈ 29.2\n\ncompetitorScore = (12 × 0.4) + (4.2 × 0.3) + (29.2 × 0.3)\n               = 4.8 + 1.26 + 8.76\n               = 14.82`}
        </Formula>
      </>
    ),

    risk: (
      <>
        <H>Risk Score (0–100)</H>
        <P>Raw competitor scores vary by city size. A score of 14 in Mumbai means something different than in a small town. So BizScope normalizes all scores relative to each other within the same analysis.</P>
        <Formula>
          {`riskScore = ((competitorScore - minScore) / (maxScore - minScore)) × 100\n\nEdge case: if all categories have equal score → riskScore = 50\n\nRisk Levels:\n  riskScore ≥ 70  →  🔴 High Risk\n  riskScore ≥ 35  →  🟡 Medium Risk\n  riskScore < 35  →  🟢 Low Risk`}
        </Formula>
        <H>What this means</H>
        <P>The category with the highest competitor score always gets riskScore = 100. The lowest always gets 0. Everything else is proportional. This makes the scores meaningful regardless of city size.</P>
        <H>Best Opportunity</H>
        <P>The category with the lowest riskScore (least competition relative to others in that area) is flagged as the "Best Opportunity".</P>
        <Formula>
          {`bestOpportunity = categoryStats.sort(by competitorScore ASC)[0]`}
        </Formula>
      </>
    ),

    demand: (
      <>
        <H>Demand Score (0–10)</H>
        <P>Demand score measures how much customer activity exists per competitor — a proxy for unmet demand.</P>
        <Formula>
          {`demandScore = min(10,  (popularityScore / count) × 2 )\n\nwhere popularityScore = √(totalReviews)\n\nCapped at 10 to keep it on a readable scale.`}
        </Formula>
        <H>Interpretation</H>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '12px 0' }}>
          {[
            { score: '8–10', label: 'High Demand', desc: 'Lots of customer activity per business — market may be underserved', color: '#10b981' },
            { score: '4–7', label: 'Moderate Demand', desc: 'Balanced supply and demand', color: '#f59e0b' },
            { score: '0–3', label: 'Low Demand', desc: 'Few reviews per business — either new area or low interest', color: '#ef4444' },
          ].map(r => (
            <div key={r.score} style={{ display: 'flex', gap: '12px', padding: '12px 16px', background: 'var(--surface2)', borderRadius: '10px', border: `1px solid ${r.color}20` }}>
              <Tag color={r.color}>{r.score}</Tag>
              <div>
                <div style={{ fontWeight: '600', color: 'var(--text)', fontSize: '13px' }}>{r.label}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{r.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <H>Profit Estimate (AI-generated)</H>
        <P>Monthly profit estimates shown in AI recommendations are generated by the AI model based on category, demand score, risk level, and local market context — not a fixed formula.</P>
      </>
    ),

    trends: (
      <>
        <H>Trend Chart Data</H>
        <P>The Trends page shows 12-month simulated movement charts. Since OSM is a snapshot (not time-series), BizScope generates realistic trend curves seeded from real category stats.</P>
        <Formula>
          {`// Seeded random walk from real base value\nfunction generateTrend(base, volatility = 0.15) {\n  let val = base;\n  return months.map(() => {\n    val = val + (Math.random() - 0.48) × volatility × base;\n    return max(0, val);\n  });\n}`}
        </Formula>
        <H>Three Chart Modes</H>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '12px 0' }}>
          {[
            { mode: 'Demand Trend', base: 'totalReviews / 12', desc: 'Monthly review activity — proxy for customer demand over time' },
            { mode: 'Competition Level', base: 'competitorScore', desc: 'How crowded each category is — seeded from real competitor score' },
            { mode: 'Growth Trend', base: 'popularityScore', desc: 'Popularity momentum — seeded from √(totalReviews)' },
          ].map(r => (
            <div key={r.mode} style={{ padding: '12px 16px', background: 'var(--surface2)', borderRadius: '10px' }}>
              <div style={{ fontWeight: '600', color: 'var(--text)', fontSize: '13px', marginBottom: '4px' }}>{r.mode}</div>
              <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#a78bfa', marginBottom: '4px' }}>base = {r.base}</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{r.desc}</div>
            </div>
          ))}
        </div>
        <H>Sparkline Cards</H>
        <P>Each category card shows a mini SVG sparkline — a polyline plotted from the same seeded trend data, normalized to fit the card height.</P>
        <Formula>
          {`// SVG point calculation\npoints = trend.map((v, idx) => {\n  x = (idx / (trend.length - 1)) × 120\n  y = 40 - ((v - min) / (max - min)) × 36\n  return \`\${x},\${y}\`\n})`}
        </Formula>
      </>
    ),

    ai: (
      <>
        <H>AI Recommendation Engine</H>
        <P>BizScope supports two AI providers — Gemini (Google) and GPT (OpenAI). Gemini is preferred as it has a free tier.</P>
        <Formula>
          {`Priority order:\n  1. Gemini (GEMINI_API_KEY in .env)\n  2. OpenAI GPT (OPENAI_API_KEY in .env)\n  3. Data-driven fallback (no AI key needed)`}
        </Formula>
        <H>The Prompt</H>
        <P>BizScope sends the full category stats JSON to the AI with this prompt structure:</P>
        <Formula>
          {`"You are a business consultant. Analyze this market data\nfor {location}:\n{categoryStats JSON}\n\nSuggest the 5 best businesses to start here.\nFor each provide:\n- Business type\n- Demand score (1-10)\n- Competition level (Low/Medium/High)\n- Estimated monthly profit in INR\n- One key reason why it's a good opportunity"`}
        </Formula>
        <H>Async Polling</H>
        <P>AI runs in the background so the main analysis loads instantly. The frontend polls every 3 seconds until AI text arrives.</P>
        <Formula>
          {`// Frontend polling loop\nconst poll = setInterval(async () => {\n  const res = await fetch('/api/analyze-location', { ...sameParams })\n  if (res.aiSuggestions && res.aiSuggestions !== 'Generating...') {\n    setAiText(res.aiSuggestions)\n    clearInterval(poll)\n  }\n}, 3000)`}
        </Formula>
        <H>Fallback (No AI Key)</H>
        <P>If no API key is configured, BizScope generates data-driven recommendation cards from the category stats — showing the top 5 lowest-risk categories with their demand scores and risk levels.</P>
      </>
    ),

    properties: (
      <>
        <H>Commercial Property Data</H>
        <P>BizScope fetches real commercial properties from OSM using shop/office/commercial tags within the 5km radius.</P>
        <Formula>
          {`Overpass tags queried:\n  shop=vacant, office=*, landuse=commercial,\n  building=commercial, amenity=marketplace`}
        </Formula>
        <H>Property Attributes</H>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '12px 0' }}>
          {[
            { field: 'type', source: 'OSM tag (shop, office, commercial, etc.)' },
            { field: 'address', source: 'Built from addr:* tags (same as businesses)' },
            { field: 'price', source: 'Estimated from OSM rent/price tags, or null' },
            { field: 'size', source: 'From building:floor_area tag, or null' },
            { field: 'footTraffic', source: 'Random 55–95 (OSM has no foot traffic data)' },
          ].map(r => (
            <div key={r.field} style={{ display: 'flex', gap: '12px', padding: '10px 14px', background: 'var(--surface2)', borderRadius: '10px', fontSize: '13px' }}>
              <code style={{ color: '#a78bfa', minWidth: '100px', fontFamily: 'monospace' }}>{r.field}</code>
              <span style={{ color: 'var(--muted)' }}>{r.source}</span>
            </div>
          ))}
        </div>
        <H>Fallback Properties</H>
        <P>If OSM returns fewer than 3 properties, BizScope adds up to 6 realistic fallback entries with randomized coordinates near the center point.</P>
      </>
    ),

    caching: (
      <>
        <H>In-Memory Cache</H>
        <P>BizScope caches analysis results in server memory to avoid repeated Overpass API calls for the same location.</P>
        <Formula>
          {`Cache key: "{lat},{lng}"  (rounded to 3 decimal places)\nCache TTL: 2 hours (7,200,000 ms)\n\nsetCache(key, data) → cache.set(key, { data, time: Date.now() })\ngetCache(key) → if (Date.now() - time < TTL) return data`}
        </Formula>
        <H>Rate Limiting</H>
        <P>Three rate limit tiers protect the backend from abuse:</P>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '12px 0' }}>
          {[
            { route: 'All /api/* routes', limit: '100 requests / 15 minutes', color: '#10b981' },
            { route: '/api/analyze-location', limit: '10 requests / 1 minute', color: '#f59e0b' },
            { route: '/api/auth/*', limit: '20 requests / 15 minutes', color: '#ef4444' },
          ].map(r => (
            <div key={r.route} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: 'var(--surface2)', borderRadius: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <code style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text2)' }}>{r.route}</code>
              <Tag color={r.color}>{r.limit}</Tag>
            </div>
          ))}
        </div>
        <H>Database</H>
        <P>PostgreSQL via Sequelize ORM. Tables auto-created on server start via <code style={{ color: '#a78bfa', fontFamily: 'monospace' }}>sequelize.sync()</code>. The database is named <code style={{ color: '#a78bfa', fontFamily: 'monospace' }}>bizscope</code> and is auto-created if it doesn't exist.</P>
      </>
    ),
  };

  return (
    <>
      <Head>
        <title>How It Works — BizScope AI</title>
        <meta name="description" content="Full technical breakdown of BizScope AI — formulas, scoring algorithms, data sources, and AI engine." />
      </Head>
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>

        {/* Navbar */}
        <nav style={{ borderBottom: '1px solid var(--border)', background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
          <div onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🚀</div>
            <span style={{ fontWeight: '700', fontSize: '18px', color: 'var(--text)' }}>Biz<span style={{ background: 'linear-gradient(135deg,#6366f1,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Scope</span> AI</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={toggle} style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '16px' }}>{dark ? '☀️' : '🌙'}</button>
            <button onClick={() => router.push('/')} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px' }}>← Back</button>
          </div>
        </nav>

        {/* Hero */}
        <div style={{ background: 'linear-gradient(135deg, #4f46e510, #7c3aed08)', borderBottom: '1px solid var(--border)', padding: '40px 24px 32px' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '100px', padding: '5px 14px', fontSize: '12px', color: '#a78bfa', marginBottom: '16px' }}>
              ⚙️ Technical Documentation
            </div>
            <h1 style={{ fontSize: 'clamp(26px,4vw,40px)', fontWeight: '800', color: 'var(--text)', marginBottom: '10px' }}>How BizScope AI Works</h1>
            <p style={{ color: 'var(--muted)', fontSize: '15px', maxWidth: '600px' }}>Full breakdown of every formula, algorithm, data source, and system design decision behind the platform.</p>
          </div>
        </div>

        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 20px', display: 'flex', gap: '32px', alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* Sidebar */}
          <div className="hiw-sidebar" style={{ width: '200px', flexShrink: 0, position: 'sticky', top: '84px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Sections</div>
            {sections.map(s => (
              <button key={s.id} onClick={() => setActive(s.id)}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: active === s.id ? '600' : '400', marginBottom: '2px', background: active === s.id ? 'linear-gradient(135deg,#4f46e510,#7c3aed10)' : 'transparent', color: active === s.id ? '#a78bfa' : 'var(--muted)', borderLeft: active === s.id ? '2px solid #6366f1' : '2px solid transparent', transition: 'all 0.15s' }}>
                {s.label}
              </button>
            ))}
          </div>

          {/* Mobile picker */}
          <div className="hiw-mobile-select" style={{ display: 'none', width: '100%', marginBottom: '16px' }}>
            <select value={active} onChange={e => setActive(e.target.value)}
              style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: '14px', outline: 'none' }}>
              {sections.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '32px', minHeight: '500px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text)', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--border)' }}>
              {sections.find(s => s.id === active)?.label}
            </h2>
            {content[active]}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hiw-sidebar { display: none !important; }
          .hiw-mobile-select { display: block !important; }
        }
      `}</style>
    </>
  );
}
