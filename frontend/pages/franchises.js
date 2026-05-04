import { useState } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout';

const FRANCHISES = [
  { id: 1, emoji: '🥛', name: 'Amul', category: 'Food', investment: 'Under ₹5L', investmentNum: 2, roi: '20–25%', description: 'India\'s largest dairy brand. Parlour franchise with low investment and strong brand recall.', contact: 'amul.coop/franchise', highlight: 'Zero royalty fee' },
  { id: 2, emoji: '📦', name: 'DTDC', category: 'Services', investment: 'Under ₹5L', investmentNum: 1, roi: '25–35%', description: 'Leading courier and logistics franchise. High demand in every city and town.', contact: 'dtdc.com/franchise', highlight: 'Pan-India network' },
  { id: 3, emoji: '🔬', name: 'Dr. Lal PathLabs', category: 'Health', investment: '₹5–20L', investmentNum: 3, roi: '30–40%', description: 'Trusted diagnostic chain. Collection centre franchise with strong doctor referral network.', contact: 'lalpathlabs.com/franchise', highlight: 'Recession-proof' },
  { id: 4, emoji: '👕', name: 'Jockey', category: 'Retail', investment: '₹20–50L', investmentNum: 4, roi: '20–30%', description: 'Premium innerwear and activewear brand. Exclusive brand outlet franchise.', contact: 'jockey.in/franchise', highlight: 'Premium brand' },
  { id: 5, emoji: '🥪', name: 'Subway', category: 'Food', investment: '₹20–50L', investmentNum: 4, roi: '15–25%', description: 'World\'s largest fast food chain by outlets. Customizable subs with strong global brand.', contact: 'subway.com/en-IN/franchise', highlight: 'Global brand' },
  { id: 6, emoji: '🍕', name: "Domino's", category: 'Food', investment: '₹50L+', investmentNum: 5, roi: '20–30%', description: 'India\'s #1 pizza delivery brand. High-volume outlet with strong delivery infrastructure.', contact: 'dominos.co.in/franchise', highlight: 'Delivery leader' },
  { id: 7, emoji: '👶', name: 'FirstCry', category: 'Retail', investment: '₹20–50L', investmentNum: 4, roi: '20–28%', description: 'India\'s largest baby and kids products retailer. Franchise store with omnichannel support.', contact: 'firstcry.com/franchise', highlight: 'Growing market' },
  { id: 8, emoji: '👓', name: 'Lenskart', category: 'Retail', investment: '₹20–50L', investmentNum: 4, roi: '25–35%', description: 'India\'s leading eyewear brand. Tech-enabled store with virtual try-on and strong online-offline model.', contact: 'lenskart.com/franchise', highlight: 'Tech-enabled' },
  { id: 9, emoji: '☕', name: 'Chai Point', category: 'Food', investment: '₹5–20L', investmentNum: 3, roi: '25–35%', description: 'Organized chai café chain. Kiosk and café formats available for high-footfall locations.', contact: 'chaipoint.com/franchise', highlight: 'Low footprint' },
  { id: 10, emoji: '🍜', name: 'Wow! Momo', category: 'Food', investment: '₹5–20L', investmentNum: 3, roi: '30–40%', description: 'India\'s fastest growing QSR chain. Momos, burgers, and Chinese food with strong youth appeal.', contact: 'wowmomo.in/franchise', highlight: 'Fast growing' },
  { id: 11, emoji: '💇', name: 'Naturals Salon', category: 'Services', investment: '₹20–50L', investmentNum: 4, roi: '20–30%', description: 'South India\'s largest salon chain. Full-service unisex salon with training support.', contact: 'naturals.in/franchise', highlight: 'Proven model' },
  { id: 12, emoji: '🎒', name: 'Kidzee', category: 'Education', investment: '₹5–20L', investmentNum: 3, roi: '25–35%', description: 'India\'s largest preschool chain by Zee Learn. Curriculum-based preschool franchise.', contact: 'kidzee.com/franchise', highlight: 'Largest preschool chain' },
  { id: 13, emoji: '🏫', name: 'EuroKids', category: 'Education', investment: '₹5–20L', investmentNum: 3, roi: '25–35%', description: 'Premium preschool and daycare franchise. Strong curriculum and parent trust.', contact: 'eurokidsindia.com/franchise', highlight: 'Premium segment' },
  { id: 14, emoji: '🌿', name: 'Patanjali', category: 'Retail', investment: 'Under ₹5L', investmentNum: 2, roi: '15–25%', description: 'Baba Ramdev\'s FMCG brand. Mega store and regular store franchise with wide product range.', contact: 'patanjaliayurved.net/franchise', highlight: 'Mass market' },
  { id: 15, emoji: '🍱', name: "Haldiram's", category: 'Food', investment: '₹50L+', investmentNum: 5, roi: '20–30%', description: 'Iconic Indian snacks and sweets brand. Restaurant and retail franchise with strong brand loyalty.', contact: 'haldirams.com/franchise', highlight: 'Iconic brand' },
  { id: 16, emoji: '👟', name: 'Bata', category: 'Retail', investment: '₹20–50L', investmentNum: 4, roi: '20–28%', description: 'India\'s most trusted footwear brand. Franchise store with full inventory and marketing support.', contact: 'bata.in/franchise', highlight: 'Trusted brand' },
  { id: 17, emoji: '🥾', name: 'Woodland', category: 'Retail', investment: '₹20–50L', investmentNum: 4, roi: '20–30%', description: 'Premium outdoor footwear and apparel brand. Exclusive brand outlet with strong aspirational appeal.', contact: 'woodlandworldwide.com/franchise', highlight: 'Premium outdoor' },
  { id: 18, emoji: '📺', name: 'Croma', category: 'Retail', investment: '₹50L+', investmentNum: 5, roi: '15–22%', description: 'Tata\'s consumer electronics retail chain. Large format store with full Tata group backing.', contact: 'croma.com/franchise', highlight: 'Tata backed' },
  { id: 19, emoji: '📱', name: 'Reliance Digital', category: 'Retail', investment: '₹50L+', investmentNum: 5, roi: '15–20%', description: 'India\'s largest electronics retailer. Franchise with Reliance\'s supply chain and brand power.', contact: 'reliancedigital.in/franchise', highlight: 'Largest electronics chain' },
  { id: 20, emoji: '🛍️', name: 'Miniso', category: 'Retail', investment: '₹20–50L', investmentNum: 4, roi: '25–35%', description: 'Japanese lifestyle brand with trendy products. High-footfall mall and high-street franchise.', contact: 'minisoindia.com/franchise', highlight: 'Trendy & fast-growing' },
];

const INVESTMENT_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Under ₹5L', value: 'Under ₹5L' },
  { label: '₹5–20L', value: '₹5–20L' },
  { label: '₹20–50L', value: '₹20–50L' },
  { label: '₹50L+', value: '₹50L+' },
];

const CATEGORY_FILTERS = [
  { label: 'All', value: 'all' },
  { label: '🍔 Food', value: 'Food' },
  { label: '🛍️ Retail', value: 'Retail' },
  { label: '🎓 Education', value: 'Education' },
  { label: '💊 Health', value: 'Health' },
  { label: '🔧 Services', value: 'Services' },
];

export default function FranchisesPage() {
  const [investFilter, setInvestFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const filtered = FRANCHISES.filter(f => {
    if (investFilter !== 'all' && f.investment !== investFilter) return false;
    if (catFilter !== 'all' && f.category !== catFilter) return false;
    if (search && !f.name.toLowerCase().includes(search.toLowerCase()) && !f.category.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <Layout>
      <Head>
        <title>Franchise Finder — BizScope AI</title>
        <meta name="description" content="Discover 20 popular Indian franchise opportunities with investment details and ROI estimates." />
      </Head>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>
        {/* Header */}
        <div className="anim-fade-up" style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏪</div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#f3f4f6', marginBottom: '10px' }}>
            Franchise Finder
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '16px', maxWidth: '560px', margin: '0 auto' }}>
            Explore 20 popular Indian franchise opportunities. Filter by investment range and category to find your perfect match.
          </p>
        </div>

        {/* Filters */}
        <div className="card anim-fade-up delay-1" style={{ padding: '20px 24px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Search franchises..."
              className="input-field"
              style={{ flex: 1, minWidth: '180px', maxWidth: '280px' }}
            />
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {INVESTMENT_FILTERS.map(f => (
                <button key={f.value} onClick={() => setInvestFilter(f.value)}
                  style={{ padding: '8px 14px', borderRadius: '100px', border: `1px solid ${investFilter === f.value ? '#3b82f6' : '#2d3748'}`, background: investFilter === f.value ? '#3b82f620' : 'transparent', color: investFilter === f.value ? '#3b82f6' : '#9ca3af', cursor: 'pointer', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                  {f.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {CATEGORY_FILTERS.map(f => (
                <button key={f.value} onClick={() => setCatFilter(f.value)}
                  style={{ padding: '8px 14px', borderRadius: '100px', border: `1px solid ${catFilter === f.value ? '#3b82f6' : '#2d3748'}`, background: catFilter === f.value ? '#3b82f620' : 'transparent', color: catFilter === f.value ? '#3b82f6' : '#9ca3af', cursor: 'pointer', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginTop: '12px', fontSize: '13px', color: '#6b7280' }}>
            Showing {filtered.length} of {FRANCHISES.length} franchises
          </div>
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {filtered.map((f, i) => (
            <div key={f.id} className="card anim-fade-up" style={{ padding: '24px', animationDelay: `${i * 0.04}s`, cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
              onClick={() => setSelected(selected?.id === f.id ? null : f)}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #3b82f6, #2563eb)' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#1c2130', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', flexShrink: 0 }}>
                    {f.emoji}
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#f3f4f6' }}>{f.name}</div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{f.category}</div>
                  </div>
                </div>
                <span style={{ padding: '4px 10px', borderRadius: '100px', background: '#3b82f615', border: '1px solid #3b82f630', color: '#3b82f6', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>
                  {f.highlight}
                </span>
              </div>

              <div style={{ fontSize: '13px', color: '#9ca3af', lineHeight: '1.6', marginBottom: '16px' }}>
                {f.description}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, background: '#1c2130', borderRadius: '10px', padding: '10px 14px' }}>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '3px' }}>Investment</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#f3f4f6' }}>{f.investment}</div>
                </div>
                <div style={{ flex: 1, background: '#1c2130', borderRadius: '10px', padding: '10px 14px' }}>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '3px' }}>Est. ROI</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#34d399' }}>{f.roi}</div>
                </div>
              </div>

              {selected?.id === f.id && (
                <div style={{ borderTop: '1px solid #1e2535', paddingTop: '16px', marginTop: '4px' }}>
                  <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '12px' }}>
                    📞 Contact / Apply:
                  </div>
                  <a href={`https://${f.contact}`} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'block', padding: '10px 16px', borderRadius: '10px', background: '#3b82f615', border: '1px solid #3b82f630', color: '#3b82f6', fontSize: '13px', fontWeight: '600', textDecoration: 'none', marginBottom: '10px', wordBreak: 'break-all' }}>
                    🌐 {f.contact}
                  </a>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    ⚠️ Investment ranges are estimates. Contact the brand directly for current terms.
                  </div>
                </div>
              )}

              <button
                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #3b82f640', background: selected?.id === f.id ? '#3b82f620' : 'transparent', color: '#3b82f6', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                {selected?.id === f.id ? '▲ Hide Details' : '▼ Get Details'}
              </button>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <div style={{ color: '#f3f4f6', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>No franchises match your filters</div>
            <div style={{ color: '#9ca3af', fontSize: '14px' }}>Try adjusting the investment range or category filter.</div>
          </div>
        )}

        {/* Disclaimer */}
        <div style={{ marginTop: '40px', padding: '20px 24px', background: '#f59e0b08', border: '1px solid #f59e0b20', borderRadius: '16px' }}>
          <div style={{ fontSize: '13px', color: '#fbbf24', fontWeight: '700', marginBottom: '6px' }}>⚠️ Disclaimer</div>
          <div style={{ fontSize: '13px', color: '#9ca3af', lineHeight: '1.7' }}>
            Investment ranges and ROI estimates are approximate and based on publicly available information. Always verify directly with the franchise brand before making any financial commitment. BizScope AI is not affiliated with any of the listed brands.
          </div>
        </div>
      </div>
    </Layout>
  );
}
