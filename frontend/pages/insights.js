import API_URL from '../utils/api';
import Head from 'next/head';
import Layout from '../components/Layout';
import useAnalysis from '../hooks/useAnalysis';
import { useState, useEffect } from 'react';
import { PageSkeleton } from '../components/Skeleton';

const categoryColors = {
  Restaurant: '#f59e0b', Cafe: '#8b5cf6', Grocery: '#3b82f6', Gym: '#3b82f6',
  Salon: '#ec4899', Pharmacy: '#06b6d4', Bakery: '#f97316', Laundry: '#6366f1',
  Hospital: '#ef4444', Clothing: '#a855f7', Electronics: '#0ea5e9',
  Hardware: '#78716c', Furniture: '#d97706', Education: '#14b8a6',
  Jewellery: '#eab308', Automotive: '#64748b', Finance: '#22c55e',
  Hotel: '#0ea5e9', Hospitality: '#f43f5e', Retail: '#8b5cf6', Wholesale: '#0891b2',
  Office: '#6366f1', Other: '#64748b',
};
const categoryIcons = {
  Restaurant: '🍽️', Cafe: '☕', Grocery: '🛒', Gym: '💪',
  Salon: '✂️', Pharmacy: '💊', Bakery: '🥐', Laundry: '👕',
  Hospital: '🏥', Clothing: '👗', Electronics: '📱',
  Hardware: '🔧', Furniture: '🛋️', Education: '🎓',
  Jewellery: '💍', Automotive: '🚗', Finance: '🏦',
  Hotel: '🏩', Hospitality: '🏨', Retail: '🛍️', Wholesale: '📦',
  Office: '🏢', Other: '🏪',
};

// Smart area suggestions per category type
const categoryAreaHints = {
  Restaurant: { zone: 'busy market or food street', why: 'High foot traffic from shoppers and office workers' },
  Cafe: { zone: 'college area or IT hub', why: 'Students and young professionals are regular customers' },
  Grocery: { zone: 'residential colony or housing society', why: 'Daily need — residents prefer nearby stores' },
  Gym: { zone: 'residential or office area', why: 'Working professionals need fitness centers close to home/work' },
  Salon: { zone: 'main market or shopping street', why: 'Walk-in customers from nearby shops and offices' },
  Pharmacy: { zone: 'near hospital or clinic cluster', why: 'Patients need medicines immediately after consultation' },
  Bakery: { zone: 'school zone or residential area', why: 'Morning rush from school kids and families' },
  Laundry: { zone: 'PG/hostel area or working professional zone', why: 'Bachelors and working people outsource laundry' },
  Hospital: { zone: 'central or well-connected area', why: 'Accessibility is critical for medical emergencies' },
  Clothing: { zone: 'main bazaar or shopping complex', why: 'Shoppers compare options — clusters attract more buyers' },
  Electronics: { zone: 'electronics market or commercial hub', why: 'Buyers prefer areas with multiple options to compare' },
  Hardware: { zone: 'industrial area or construction zone', why: 'Contractors and builders need nearby supply' },
  Furniture: { zone: 'furniture market lane or new residential area', why: 'New homeowners buy furniture in bulk' },
  Education: { zone: 'school/college zone or residential area', why: 'Parents prefer coaching centers close to schools' },
  Jewellery: { zone: 'main market or wedding shopping area', why: 'Trust and visibility matter — busy markets build both' },
  Automotive: { zone: 'highway or transport nagar', why: 'Vehicle owners prefer service centers on main roads' },
  Finance: { zone: 'commercial or business district', why: 'Businesses and professionals need financial services nearby' },
  Hotel: { zone: 'tourist area, railway station, or bus stand', why: 'Travelers need accommodation near transit points' },
  Hospitality: { zone: 'tourist spot or city center', why: 'Visitors and travelers are the primary customers' },
  Retail: { zone: 'high street or shopping mall area', why: 'Impulse buying happens in high-footfall zones' },
  Wholesale: { zone: 'mandi or wholesale market area', why: 'Buyers come specifically to wholesale zones for bulk deals' },
  Office: { zone: 'business park or commercial complex', why: 'Clients and employees prefer professional environments' },
};

const getAreaSuggestion = (category, cityName, index) => {
  const hint = categoryAreaHints[category] || { zone: 'main market area', why: 'High visibility and foot traffic' };
  // Vary the phrasing so each card looks different
  const phrases = [
    `Look for space in the ${hint.zone} of ${cityName}`,
    `Target the ${hint.zone} near ${cityName} city center`,
    `Best spot: ${hint.zone} in ${cityName}`,
    `Open near the ${hint.zone} in ${cityName}`,
    `Scout the ${hint.zone} around ${cityName}`,
  ];
  return { area: phrases[index % phrases.length], why: hint.why };
};

// Suppliers per category
const categorySuppliers = {
  Restaurant: [
    { name: 'Metro Cash & Carry', type: 'Wholesale food & kitchen supplies', url: 'https://www.metro.co.in', tag: 'Wholesale' },
    { name: 'IndiaMART', type: 'Raw ingredients, utensils, equipment', url: 'https://www.indiamart.com', tag: 'Online B2B' },
    { name: 'Local Mandi / APMC', type: 'Fresh vegetables, grains, spices', url: null, tag: 'Local Market' },
    { name: 'Pepperfry Business', type: 'Restaurant furniture & interiors', url: 'https://www.pepperfry.com', tag: 'Furniture' },
  ],
  Cafe: [
    { name: 'Blue Tokai Coffee', type: 'Premium coffee beans & equipment', url: 'https://bluetokaicoffee.com', tag: 'Coffee' },
    { name: 'IndiaMART', type: 'Espresso machines, grinders, cups', url: 'https://www.indiamart.com', tag: 'Online B2B' },
    { name: 'Nescafé / HUL Distributors', type: 'Instant coffee, tea, beverages', url: null, tag: 'FMCG Distributor' },
    { name: 'Amazon Business', type: 'Cafe furniture, decor, packaging', url: 'https://business.amazon.in', tag: 'Online' },
  ],
  Grocery: [
    { name: 'Metro Cash & Carry', type: 'Bulk FMCG, packaged goods', url: 'https://www.metro.co.in', tag: 'Wholesale' },
    { name: 'Local APMC Mandi', type: 'Fresh produce, grains, pulses', url: null, tag: 'Local Market' },
    { name: 'HUL / ITC Distributors', type: 'Branded FMCG products', url: null, tag: 'FMCG Distributor' },
    { name: 'Udaan', type: 'B2B grocery wholesale platform', url: 'https://udaan.com', tag: 'Online B2B' },
  ],
  Pharmacy: [
    { name: 'Medline / Stockist', type: 'Medicines from local pharma stockist', url: null, tag: 'Local Stockist' },
    { name: 'PharmEasy B2B', type: 'Bulk medicine procurement', url: 'https://pharmeasy.in', tag: 'Online B2B' },
    { name: 'IndiaMART', type: 'Medical equipment, shelving, billing software', url: 'https://www.indiamart.com', tag: 'Online B2B' },
    { name: 'Sun Pharma / Cipla Distributors', type: 'Branded medicines wholesale', url: null, tag: 'Pharma Distributor' },
  ],
  Gym: [
    { name: 'Kore Fitness', type: 'Gym equipment — treadmills, weights', url: 'https://www.korefitness.in', tag: 'Equipment' },
    { name: 'IndiaMART', type: 'Bulk gym equipment at wholesale price', url: 'https://www.indiamart.com', tag: 'Online B2B' },
    { name: 'Amazon Business', type: 'Accessories, mats, supplements display', url: 'https://business.amazon.in', tag: 'Online' },
    { name: 'Local Steel Fabricator', type: 'Custom racks, benches, frames', url: null, tag: 'Local Supplier' },
  ],
  Salon: [
    { name: 'Wella / L\'Oréal Distributors', type: 'Hair color, shampoo, styling products', url: null, tag: 'Brand Distributor' },
    { name: 'IndiaMART', type: 'Salon chairs, mirrors, equipment', url: 'https://www.indiamart.com', tag: 'Online B2B' },
    { name: 'Nykaa B2B', type: 'Beauty & skincare products wholesale', url: 'https://www.nykaa.com', tag: 'Beauty Wholesale' },
    { name: 'Amazon Business', type: 'Towels, tools, disposables', url: 'https://business.amazon.in', tag: 'Online' },
  ],
  Bakery: [
    { name: 'Local Flour Mill / Atta Chakki', type: 'Wheat flour, maida, suji in bulk', url: null, tag: 'Local Supplier' },
    { name: 'IndiaMART', type: 'Baking ovens, mixers, molds', url: 'https://www.indiamart.com', tag: 'Online B2B' },
    { name: 'Metro Cash & Carry', type: 'Butter, sugar, dairy, packaging', url: 'https://www.metro.co.in', tag: 'Wholesale' },
    { name: 'Amazon Business', type: 'Baking tools, display cases', url: 'https://business.amazon.in', tag: 'Online' },
  ],
  Hotel: [
    { name: 'IndiaMART', type: 'Beds, mattresses, linen, furniture', url: 'https://www.indiamart.com', tag: 'Online B2B' },
    { name: 'Pepperfry Business', type: 'Hotel furniture & room decor', url: 'https://www.pepperfry.com', tag: 'Furniture' },
    { name: 'Amazon Business', type: 'Toiletries, towels, housekeeping supplies', url: 'https://business.amazon.in', tag: 'Online' },
    { name: 'Local Textile Market', type: 'Bed sheets, pillow covers, curtains bulk', url: null, tag: 'Local Market' },
  ],
  Clothing: [
    { name: 'Surat Textile Market', type: 'Fabric wholesale — largest in India', url: null, tag: 'Wholesale Market' },
    { name: 'IndiaMART', type: 'Readymade garments, fabric, accessories', url: 'https://www.indiamart.com', tag: 'Online B2B' },
    { name: 'Udaan', type: 'Fashion wholesale B2B platform', url: 'https://udaan.com', tag: 'Online B2B' },
    { name: 'Local Kapda Mandi', type: 'Regional fabric and garment wholesale', url: null, tag: 'Local Market' },
  ],
  Electronics: [
    { name: 'Nehru Place / Lamington Road', type: 'Electronics wholesale market', url: null, tag: 'Wholesale Market' },
    { name: 'IndiaMART', type: 'Electronics components, accessories', url: 'https://www.indiamart.com', tag: 'Online B2B' },
    { name: 'Ingram Micro India', type: 'IT products distributor', url: 'https://www.ingrammicro.com', tag: 'Distributor' },
    { name: 'Amazon Business', type: 'Accessories, display items', url: 'https://business.amazon.in', tag: 'Online' },
  ],
  Education: [
    { name: 'Amazon Business', type: 'Books, stationery, whiteboards, furniture', url: 'https://business.amazon.in', tag: 'Online' },
    { name: 'IndiaMART', type: 'Classroom furniture, projectors, AV equipment', url: 'https://www.indiamart.com', tag: 'Online B2B' },
    { name: 'Local Book Distributor', type: 'NCERT, reference books wholesale', url: null, tag: 'Local Supplier' },
    { name: 'Flipkart Wholesale', type: 'Stationery and supplies bulk', url: 'https://wholesale.flipkart.com', tag: 'Online B2B' },
  ],
};

const getSuppliers = (category) =>
  categorySuppliers[category] || [
    { name: 'IndiaMART', type: 'Find verified suppliers for any business', url: 'https://www.indiamart.com', tag: 'Online B2B' },
    { name: 'Amazon Business', type: 'Business supplies and equipment', url: 'https://business.amazon.in', tag: 'Online' },
    { name: 'Udaan', type: 'B2B wholesale platform', url: 'https://udaan.com', tag: 'Online B2B' },
    { name: 'Local Wholesale Market', type: 'Visit your city\'s main wholesale market', url: null, tag: 'Local Market' },
  ];

export default function Insights() {
  const data = useAnalysis();
  const [aiText, setAiText] = useState(null);
  const [polling, setPolling] = useState(false);
  const [selectedCat, setSelectedCat] = useState(null);

  // Poll backend until AI text is ready
  useEffect(() => {
    if (!data) return;
    const initial = data.aiSuggestions;
    setAiText(initial);

    if (initial === 'Generating AI recommendations...') {
      setPolling(true);
      const location = data.location?.displayName?.split(',').slice(0, 2).join(',') || '';
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        try {
          const res = await fetch(`${API_URL}/api/analyze-location`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ location }),
          });
          const fresh = await res.json();
          if (fresh.aiSuggestions && fresh.aiSuggestions !== 'Generating AI recommendations...') {
            setAiText(fresh.aiSuggestions);
            // update sessionStorage too
            const stored = JSON.parse(sessionStorage.getItem('analysisData') || '{}');
            stored.aiSuggestions = fresh.aiSuggestions;
            sessionStorage.setItem('analysisData', JSON.stringify(stored));
            clearInterval(interval);
            setPolling(false);
          }
        } catch (_) {}
        if (attempts >= 10) { clearInterval(interval); setPolling(false); }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [data]);

  if (!data) return <Layout><PageSkeleton /></Layout>;

  const best = data.categoryStats ? [...data.categoryStats].reverse().slice(0, 4) : [];
  const worst = data.categoryStats?.slice(0, 4) || [];
  const noAI = !aiText || aiText === 'AI suggestions unavailable (no OpenAI key set).' || aiText === 'Generating AI recommendations...';
  const cityName = data.location?.displayName?.split(',')[0]?.trim() || 'this area';

  return (
    <Layout>
      <Head><title>AI Insights — BizScope AI</title></Head>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px' }}>

        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text)', marginBottom: '8px' }}>🤖 AI Insights</h1>
          <p style={{ color: 'var(--muted)', fontSize: '15px' }}>
            Market intelligence for <span style={{ color: '#a78bfa', fontWeight: '600' }}>{data.location?.displayName?.split(',').slice(0, 2).join(', ')}</span>
          </p>
        </div>

        {/* AI Suggestions */}
        <div style={{ background: 'var(--surface)', border: '1px solid #4f46e530', borderRadius: '24px', padding: '32px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #6366f1, #a78bfa, #ec4899)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'linear-gradient(135deg, #4f46e520, #7c3aed20)', border: '1px solid #4f46e540', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' }}>🤖</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text)' }}>AI Business Recommendations</div>
              <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Powered by Gemini / GPT market analysis</div>
            </div>
            {polling && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '100px', background: '#6366f115', border: '1px solid #6366f130' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1', animation: 'pulse 1.2s infinite' }} />
                <span style={{ fontSize: '12px', color: '#a78bfa' }}>Generating...</span>
              </div>
            )}
          </div>

          {polling && !aiText ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>⏳</div>
              <div style={{ color: 'var(--muted)', fontSize: '14px' }}>AI is analyzing the market data, please wait...</div>
            </div>
          ) : noAI ? (
            <div>
              <div style={{ background: 'var(--surface2)', borderRadius: '14px', padding: '14px 18px', marginBottom: '12px', fontSize: '13px', color: 'var(--muted)' }}>
                ℹ️ AI key not configured — showing data-driven recommendations instead.
              </div>
              {[...data.categoryStats].reverse().slice(0, 5).map((s, i) => {
                const areaSug = getAreaSuggestion(s.category, cityName, i);
                return (
                <div key={i} style={{ background: 'var(--surface2)', borderRadius: '14px', padding: '18px 20px', marginBottom: '10px', borderLeft: `3px solid ${categoryColors[s.category] || '#6366f1'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '700', color: 'var(--text)', fontSize: '15px' }}>{categoryIcons[s.category] || '🏪'} {s.category}</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: '100px', background: '#3b82f620', color: '#34d399', fontSize: '11px', fontWeight: '700' }}>
                        Demand: {Math.min(10, parseFloat(s.demandScore || 5)).toFixed(1)}/10
                      </span>
                      <span style={{ padding: '3px 10px', borderRadius: '100px', background: s.riskLevel === 'Low' ? '#3b82f620' : s.riskLevel === 'Medium' ? '#f59e0b20' : '#ef444420', color: s.riskLevel === 'Low' ? '#34d399' : s.riskLevel === 'Medium' ? '#fbbf24' : '#f87171', fontSize: '11px', fontWeight: '700' }}>
                        {s.riskLevel} Competition
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '10px' }}>
                    {s.count} competitor{s.count !== 1 ? 's' : ''} nearby · avg rating {s.avgRating} · {s.riskLevel === 'Low' ? 'Great entry opportunity with low competition.' : s.riskLevel === 'Medium' ? 'Moderate competition — differentiation needed.' : 'Highly saturated — strong USP required.'}
                  </div>
                  <div style={{ background: 'var(--surface)', borderRadius: '10px', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '12px', color: '#a78bfa', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      📍 {areaSug.area}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>💡 {areaSug.why}</div>
                  </div>
                </div>
                );
              })}
            </div>
          ) : (
            <div style={{ color: 'var(--text2)', lineHeight: '1.9', fontSize: '15px', whiteSpace: 'pre-line' }}>{aiText}</div>
          )}
        </div>

        {/* Risk formula explanation */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '24px', marginBottom: '24px' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', marginBottom: '16px' }}>📐 How Risk is Calculated</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '16px' }}>
            {[
              { icon: '🏪', label: 'Competitor Count', weight: '40%', desc: 'More competitors = higher risk' },
              { icon: '⭐', label: 'Avg Rating', weight: '30%', desc: 'Higher rated rivals = harder to compete' },
              { icon: '📣', label: 'Popularity', weight: '30%', desc: 'More reviews = more established market' },
            ].map(f => (
              <div key={f.label} style={{ background: 'var(--surface2)', borderRadius: '14px', padding: '16px' }}>
                <div style={{ fontSize: '22px', marginBottom: '8px' }}>{f.icon}</div>
                <div style={{ fontWeight: '600', color: 'var(--text)', fontSize: '13px', marginBottom: '4px' }}>{f.label}</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#6366f1', marginBottom: '4px' }}>{f.weight}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{f.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ background: 'var(--surface2)', borderRadius: '12px', padding: '14px 18px', fontSize: '13px', color: 'var(--muted)', fontFamily: 'monospace' }}>
            riskScore = normalize( count×0.4 + avgRating×0.3 + √totalReviews×0.3 ) → 0 to 100
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '12px' }}>
            <span style={{ color: '#34d399' }}>🟢 0–34 = Low Risk (good opportunity)</span>
            <span style={{ color: '#fbbf24' }}>🟡 35–69 = Medium Risk</span>
            <span style={{ color: '#f87171' }}>🔴 70–100 = High Risk (saturated)</span>
          </div>
        </div>

        {/* Best/Worst panels */}
        <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          {/* Best opportunities */}
          <div style={{ background: 'var(--surface)', border: '1px solid #3b82f625', borderRadius: '20px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#3b82f620', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>✅</div>
              <div>
                <div style={{ fontWeight: '700', color: 'var(--text)', fontSize: '15px' }}>Best Opportunities</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Lowest competition categories</div>
              </div>
            </div>
            {best.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: 'var(--surface2)', borderRadius: '14px', marginBottom: '10px', border: '1px solid #3b82f615' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${categoryColors[s.category] || '#6366f1'}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{categoryIcons[s.category] || '🏪'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', color: 'var(--text)', fontSize: '14px' }}>{s.category}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Only {s.count} competitors nearby</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ padding: '4px 12px', borderRadius: '100px', background: '#3b82f620', color: '#34d399', fontSize: '11px', fontWeight: '700' }}>Low Risk</span>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>Score: {s.competitorScore?.toFixed(1)}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Saturated markets */}
          <div style={{ background: 'var(--surface)', border: '1px solid #ef444425', borderRadius: '20px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ef444420', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>⚠️</div>
              <div>
                <div style={{ fontWeight: '700', color: 'var(--text)', fontSize: '15px' }}>Saturated Markets</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>High competition — proceed carefully</div>
              </div>
            </div>
            {worst.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: 'var(--surface2)', borderRadius: '14px', marginBottom: '10px', border: '1px solid #ef444415' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${categoryColors[s.category] || '#6366f1'}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{categoryIcons[s.category] || '🏪'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', color: 'var(--text)', fontSize: '14px' }}>{s.category}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{s.count} competitors • ⭐ {s.avgRating}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ padding: '4px 12px', borderRadius: '100px', background: '#ef444420', color: '#f87171', fontSize: '11px', fontWeight: '700' }}>High Risk</span>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>Score: {s.competitorScore?.toFixed(1)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Market summary cards */}
        <div className="responsive-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
          {data.categoryStats?.map((s, i) => (
            <div key={i}
              onClick={() => setSelectedCat(s.category)}
              style={{ background: 'var(--surface)', border: `1px solid ${(categoryColors[s.category] || '#6366f1')}20`, borderRadius: '16px', padding: '20px', textAlign: 'center', transition: 'all 0.2s', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = (categoryColors[s.category] || '#6366f1') + '60'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = (categoryColors[s.category] || '#6366f1') + '20'; }}>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>{categoryIcons[s.category] || '🏪'}</div>
              <div style={{ fontWeight: '700', color: 'var(--text)', fontSize: '14px', marginBottom: '6px' }}>{s.category}</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: categoryColors[s.category] || '#6366f1', marginBottom: '4px' }}>{s.count}</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>competitors</div>
              <div style={{ marginTop: '8px', padding: '6px', borderRadius: '8px', background: s.riskLevel === 'Low' ? '#3b82f615' : s.riskLevel === 'Medium' ? '#f59e0b15' : '#ef444415', color: s.riskLevel === 'Low' ? '#34d399' : s.riskLevel === 'Medium' ? '#fbbf24' : '#f87171', fontSize: '11px', fontWeight: '700' }}>
                {s.riskLevel === 'Low' ? '🟢 Low Risk' : s.riskLevel === 'Medium' ? '🟡 Medium Risk' : '🔴 High Risk'}
              </div>
              <div style={{ fontSize: '10px', color: '#a78bfa', marginTop: '6px', fontWeight: '600' }}>📦 View suppliers</div>
            </div>
          ))}
        </div>

        {/* Suppliers Modal */}
        {selectedCat && (() => {
          const suppliers = getSuppliers(selectedCat);
          const color = categoryColors[selectedCat] || '#6366f1';
          return (
            <>
              {/* Backdrop */}
              <div onClick={() => setSelectedCat(null)}
                style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }} />
              {/* Dialog */}
              <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 600, width: '90%', maxWidth: '640px', maxHeight: '85vh', overflowY: 'auto', background: 'var(--surface)', border: `1px solid ${color}40`, borderRadius: '24px', padding: '32px', boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px ${color}20` }}>
                {/* Top accent */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', borderRadius: '24px 24px 0 0', background: `linear-gradient(90deg, ${color}, transparent)` }} />
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: `${color}20`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', flexShrink: 0 }}>
                    {categoryIcons[selectedCat] || '🏪'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text)' }}>📦 {selectedCat} Suppliers</div>
                    <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>Where to source materials to start your {selectedCat.toLowerCase()} business</div>
                  </div>
                  <button onClick={() => setSelectedCat(null)}
                    style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--surface2)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--muted)', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    ✕
                  </button>
                </div>
                {/* Supplier cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {suppliers.map((sup, i) => (
                    <div key={i} style={{ background: 'var(--surface2)', borderRadius: '14px', padding: '18px 20px', border: `1px solid ${color}15`, display: 'flex', alignItems: 'center', gap: '16px', transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = color + '50'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = color + '15'; e.currentTarget.style.transform = 'translateX(0)'; }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                        {sup.tag === 'Online B2B' ? '🌐' : sup.tag === 'Wholesale' || sup.tag === 'Wholesale Market' ? '🏭' : sup.tag === 'Local Market' || sup.tag === 'Local Supplier' ? '📍' : sup.tag === 'Online' ? '🛒' : '🏪'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '700', color: 'var(--text)', fontSize: '14px' }}>{sup.name}</span>
                          <span style={{ padding: '2px 8px', borderRadius: '100px', background: `${color}20`, color, fontSize: '10px', fontWeight: '700', whiteSpace: 'nowrap' }}>{sup.tag}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: '1.5' }}>{sup.type}</div>
                      </div>
                      {sup.url ? (
                        <a href={sup.url} target="_blank" rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color, fontWeight: '700', textDecoration: 'none', whiteSpace: 'nowrap', padding: '8px 14px', borderRadius: '10px', background: `${color}15`, border: `1px solid ${color}30`, flexShrink: 0 }}>
                          Visit →
                        </a>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--muted)', fontStyle: 'italic', whiteSpace: 'nowrap', flexShrink: 0 }}>Local in {cityName}</span>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '20px', padding: '14px 16px', background: `${color}10`, borderRadius: '12px', fontSize: '12px', color: 'var(--muted)', textAlign: 'center' }}>
                  💡 Tip: Compare prices from at least 3 suppliers before finalizing your vendor
                </div>
              </div>
            </>
          );
        })()}
      </div>
    </Layout>
  );
}
