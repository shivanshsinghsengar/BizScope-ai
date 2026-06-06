import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import useAnalysis from '../hooks/useAnalysis';
import { PageSkeleton } from '../components/Skeleton';

// Country code → official company registry
const REGISTRIES = {
  IN: { name: 'MCA India', search: (n) => `https://www.google.com/search?q=${encodeURIComponent(n + ' MCA company registration India')}`, flag: '🇮🇳' },
  GB: { name: 'Companies House', search: (n) => `https://find-and-update.company-information.service.gov.uk/search?q=${encodeURIComponent(n)}`, flag: '🇬🇧' },
  US: { name: 'SEC EDGAR', search: (n) => `https://www.sec.gov/cgi-bin/browse-edgar?company=${encodeURIComponent(n)}&action=getcompany`, flag: '🇺🇸' },
  AU: { name: 'ASIC', search: (n) => `https://www.google.com/search?q=${encodeURIComponent(n + ' ASIC company registration Australia')}`, flag: '🇦🇺' },
  SG: { name: 'ACRA', search: (n) => `https://www.google.com/search?q=${encodeURIComponent(n + ' ACRA company Singapore')}`, flag: '🇸🇬' },
  CA: { name: 'Corporations Canada', search: (n) => `https://www.google.com/search?q=${encodeURIComponent(n + ' Corporations Canada registration')}`, flag: '🇨🇦' },
  DE: { name: 'Handelsregister', search: (n) => `https://www.google.com/search?q=${encodeURIComponent(n + ' Handelsregister Germany')}`, flag: '🇩🇪' },
  AE: { name: 'UAE Registry', search: (n) => `https://www.google.com/search?q=${encodeURIComponent(n + ' UAE company registration')}`, flag: '🇦🇪' },
  NZ: { name: 'Companies Office NZ', search: (n) => `https://app.companiesoffice.govt.nz/companies/app/ui/pages/companies/search?q=${encodeURIComponent(n)}`, flag: '🇳🇿' },
};
const DEFAULT_REGISTRY = { name: 'OpenCorporates', search: (n) => `https://opencorporates.com/companies?q=${encodeURIComponent(n)}`, flag: '🌍' };

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

function BusinessDialog({ b, onClose, countryCode }) {
  const color = categoryColors[b.category] || '#6366f1';
  const [showResearch, setShowResearch] = useState(false);

  const registry = REGISTRIES[countryCode] || DEFAULT_REGISTRY;
  const q = encodeURIComponent(b.name);
  const addr = encodeURIComponent((b.address || '').split(',').slice(-2).join(',').trim());

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--surface)', borderRadius: '24px', width: '100%', maxWidth: '520px', border: `1px solid ${color}40`, position: 'relative', overflow: 'hidden', boxShadow: `0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px ${color}20`, maxHeight: '90vh', overflowY: 'auto' }}>

        <div style={{ height: '4px', background: `linear-gradient(90deg, ${color}, ${color}60, transparent)` }} />

        <div style={{ padding: '28px' }}>
          {/* Close */}
          <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', width: '32px', height: '32px', borderRadius: '50%', background: 'var(--surface2)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--muted)', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>

          {/* Header */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: `${color}20`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', flexShrink: 0 }}>
              {categoryIcons[b.category] || '🏪'}
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text)', marginBottom: '4px' }}>{b.name}</div>
              <span style={{ padding: '3px 12px', borderRadius: '100px', background: `${color}20`, color, fontSize: '12px', fontWeight: '700' }}>{b.category}</span>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div style={{ background: 'var(--surface2)', borderRadius: '14px', padding: '14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>Rating</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#f59e0b' }}>{b.rating}</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{b.reviewCount} reviews</div>
            </div>
            <div style={{ background: 'var(--surface2)', borderRadius: '14px', padding: '14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>Category</div>
              <div style={{ fontSize: '15px', fontWeight: '700', color }}>{categoryIcons[b.category]} {b.category}</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>Business type</div>
            </div>
          </div>

          {/* Info rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {b.address && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px 14px', background: 'var(--surface2)', borderRadius: '12px' }}>
                <span style={{ fontSize: '16px' }}>📍</span>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '2px' }}>Address</div>
                  <div style={{ fontSize: '13px', color: 'var(--text)', fontWeight: '500' }}>{b.address}</div>
                </div>
              </div>
            )}
            {b.phone && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '12px 14px', background: 'var(--surface2)', borderRadius: '12px' }}>
                <span style={{ fontSize: '16px' }}>📞</span>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '2px' }}>Phone</div>
                  <a href={`tel:${b.phone}`} style={{ fontSize: '13px', color, fontWeight: '600', textDecoration: 'none' }}>{b.phone}</a>
                </div>
              </div>
            )}
            {b.website && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '12px 14px', background: 'var(--surface2)', borderRadius: '12px' }}>
                <span style={{ fontSize: '16px' }}>🌐</span>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '2px' }}>Website</div>
                  <a href={b.website} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color, fontWeight: '600', textDecoration: 'none' }}>{b.website}</a>
                </div>
              </div>
            )}
            {b.latitude && b.longitude && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '12px 14px', background: 'var(--surface2)', borderRadius: '12px' }}>
                <span style={{ fontSize: '16px' }}>🗺️</span>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '2px' }}>Coordinates</div>
                  <div style={{ fontSize: '13px', color: 'var(--text)', fontWeight: '500' }}>{b.latitude.toFixed(4)}, {b.longitude.toFixed(4)}</div>
                </div>
              </div>
            )}
          </div>

          {/* ── Company Research Panel ── */}
          <div style={{ marginBottom: '20px' }}>
            <button onClick={() => setShowResearch(v => !v)}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #6366f140', background: showResearch ? '#6366f118' : '#6366f110', color: '#818cf8', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}>
              🏛️ Research This Company {showResearch ? '▲' : '▼'}
            </button>

            {showResearch && (
              <div style={{ marginTop: '12px', borderRadius: '14px', border: '1px solid #6366f125', overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', background: '#6366f112', fontSize: '11px', fontWeight: '800', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  🔍 Research Links — Opens in new tab
                </div>
                <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>

                  {/* Official Registry */}
                  <a href={registry.search(b.name)} target="_blank" rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: 'var(--surface2)', borderRadius: '10px', textDecoration: 'none', border: '1px solid transparent', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f140'; e.currentTarget.style.background = '#6366f110'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'var(--surface2)'; }}>
                    <span style={{ fontSize: '22px' }}>{registry.flag}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>{registry.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Official government company registry</div>
                    </div>
                    <span style={{ fontSize: '11px', color: '#818cf8', fontWeight: '600' }}>Open →</span>
                  </a>

                  {/* Google Search */}
                  <a href={`https://www.google.com/search?q=${q}+company+registration+${addr}`} target="_blank" rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: 'var(--surface2)', borderRadius: '10px', textDecoration: 'none', border: '1px solid transparent', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f640'; e.currentTarget.style.background = '#3b82f610'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'var(--surface2)'; }}>
                    <span style={{ fontSize: '22px' }}>🔍</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>Google Search</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>News, reviews, ownership info</div>
                    </div>
                    <span style={{ fontSize: '11px', color: '#3b82f6', fontWeight: '600' }}>Open →</span>
                  </a>

                  {/* LinkedIn */}
                  <a href={`https://www.linkedin.com/search/results/companies/?keywords=${q}`} target="_blank" rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: 'var(--surface2)', borderRadius: '10px', textDecoration: 'none', border: '1px solid transparent', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#0ea5e940'; e.currentTarget.style.background = '#0ea5e910'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'var(--surface2)'; }}>
                    <span style={{ fontSize: '22px' }}>💼</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>LinkedIn</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Company profile, employees, size</div>
                    </div>
                    <span style={{ fontSize: '11px', color: '#0ea5e9', fontWeight: '600' }}>Open →</span>
                  </a>

                  {/* OpenCorporates */}
                  <a href={`https://opencorporates.com/companies?q=${q}`} target="_blank" rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: 'var(--surface2)', borderRadius: '10px', textDecoration: 'none', border: '1px solid transparent', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#f59e0b40'; e.currentTarget.style.background = '#f59e0b10'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'var(--surface2)'; }}>
                    <span style={{ fontSize: '22px' }}>🌐</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>OpenCorporates</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>200M+ companies, 140 countries</div>
                    </div>
                    <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: '600' }}>Open →</span>
                  </a>

                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <a href={`https://www.google.com/maps/search/${encodeURIComponent(b.name + ' ' + (b.address || ''))}/@${b.latitude},${b.longitude},17z`}
              target="_blank" rel="noreferrer"
              style={{ flex: 1, padding: '11px', borderRadius: '12px', background: `linear-gradient(135deg, ${color}, ${color}cc)`, color: 'white', fontWeight: '700', fontSize: '13px', textAlign: 'center', textDecoration: 'none' }}>
              📍 View on Maps
            </a>
            {b.phone ? (
              <a href={`tel:${b.phone}`}
                style={{ flex: 1, padding: '11px', borderRadius: '12px', background: 'var(--surface2)', border: `1px solid ${color}40`, color, fontWeight: '700', fontSize: '13px', textAlign: 'center', textDecoration: 'none' }}>
                📞 {b.phone}
              </a>
            ) : (
              <a href={`https://www.google.com/search?q=${encodeURIComponent(b.name + ' ' + (b.address || '') + ' contact number')}`}
                target="_blank" rel="noreferrer"
                style={{ flex: 1, padding: '11px', borderRadius: '12px', background: 'var(--surface2)', border: `1px solid ${color}40`, color, fontWeight: '700', fontSize: '13px', textAlign: 'center', textDecoration: 'none' }}>
                🔍 Find Contact
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Competitors() {
  const data = useAnalysis();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [sort, setSort] = useState('rating');
  const [distKm, setDistKm] = useState(5);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (router.query.category) setFilter(router.query.category);
  }, [router.query.category]);

  if (!data) return <Layout><PageSkeleton /></Layout>;

  const countryCode = data.countryCode || 'IN';
  const categories = ['All', ...new Set(data.businesses?.map(b => b.category) || [])];

  const userLat = data.userLat;
  const userLng = data.userLng;
  const withinDist = (b) => {
    if (!userLat || !userLng || !b.latitude || !b.longitude) return true;
    const dLat = (b.latitude - userLat) * 111;
    const dLng = (b.longitude - userLng) * 111 * Math.cos(userLat * Math.PI / 180);
    return Math.sqrt(dLat * dLat + dLng * dLng) <= distKm;
  };

  const filtered = (data.businesses || [])
    .filter(b => !b.isMock)
    .filter(b => (filter === 'All' || b.category === filter) && b.name.toLowerCase().includes(search.toLowerCase()) && withinDist(b))
    .sort((a, b) => sort === 'rating' ? b.rating - a.rating : b.reviewCount - a.reviewCount);

  return (
    <Layout>
      <Head>
        <title>Competitor Directory — BizScope AI</title>
        <meta name="description" content="Browse all businesses found near your location — filter by category, sort by rating, and research any competitor with one click." />
        <link rel="canonical" href="https://biz-scope-ai.vercel.app/competitors" />
        <meta property="og:title" content="Competitor Directory — BizScope AI" />
        <meta property="og:description" content="Browse all businesses near your location — filter by category, sort by rating, and research any competitor." />
        <meta property="og:url" content="https://biz-scope-ai.vercel.app/competitors" />
        <meta property="og:image" content="https://biz-scope-ai.vercel.app/og-image.svg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://biz-scope-ai.vercel.app/og-image.svg" />
      </Head>

      {selected && <BusinessDialog b={selected} countryCode={countryCode} onClose={() => setSelected(null)} />}

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text)', marginBottom: '8px' }}>🏪 Competitor Directory</h1>
          <p style={{ color: 'var(--muted)', fontSize: '15px' }}>{(data.businesses || []).filter(b => !b.isMock).length} businesses found within 5km of your location</p>
        </div>

        {(data.dataQuality?.usesMockData || data.dataQuality?.hasEstimatedMetrics) && (
          <div style={{ background: '#f59e0b12', border: '1px solid #f59e0b40', borderRadius: '14px', padding: '10px 14px', marginBottom: '20px', fontSize: '12px', color: 'var(--muted)' }}>
            ⚠️ Data quality: {data.dataQuality?.usesMockData ? 'fallback entries are included' : 'all entries are live'}; ratings/review counts can include estimates.
          </div>
        )}

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search by name..." className="input-field" style={{ flex: 1, minWidth: '200px' }} />
          <select value={sort} onChange={e => setSort(e.target.value)} className="input-field" style={{ width: '160px' }}>
            <option value="rating">Sort: Rating</option>
            <option value="reviews">Sort: Reviews</option>
          </select>
          <select value={distKm} onChange={e => setDistKm(Number(e.target.value))} className="input-field" style={{ width: '140px' }}>
            <option value={1}>Within 1 km</option>
            <option value={2}>Within 2 km</option>
            <option value={3}>Within 3 km</option>
            <option value={5}>Within 5 km</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => {
              setFilter(cat);
              router.replace({ pathname: '/competitors', query: cat === 'All' ? {} : { category: cat } }, undefined, { shallow: true });
            }}
              style={{ padding: '8px 18px', borderRadius: '100px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', transition: 'all 0.2s', background: filter === cat ? (categoryColors[cat] || '#6366f1') : 'var(--surface2)', color: filter === cat ? 'white' : 'var(--muted)', boxShadow: filter === cat ? `0 4px 15px ${(categoryColors[cat] || '#6366f1')}40` : 'none' }}>
              {cat === 'All' ? '🌐 All' : `${categoryIcons[cat] || '🏪'} ${cat}`}
            </button>
          ))}
        </div>

        <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>{filtered.length} results</div>

        <div className="responsive-grid-3" style={{ display: 'grid', gap: '14px' }}>
          {filtered.map((b, i) => (
            <div key={i} onClick={() => setSelected(b)}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', transition: 'all 0.2s', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = (categoryColors[b.category] || '#6366f1') + '60'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 30px ${(categoryColors[b.category] || '#6366f1')}15`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: `${categoryColors[b.category] || '#6366f1'}20`, border: `1px solid ${categoryColors[b.category] || '#6366f1'}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                  {categoryIcons[b.category] || '🏪'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '700', color: 'var(--text)', fontSize: '14px', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</div>
                  <div style={{ fontSize: '11px', color: categoryColors[b.category] || '#6366f1', fontWeight: '600', marginBottom: '8px' }}>{b.category}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📍 {b.address}</div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span style={{ color: '#f59e0b', fontSize: '13px' }}>⭐</span>
                    <span style={{ color: 'var(--text)', fontWeight: '700', fontSize: '13px' }}>{b.rating}</span>
                    <span style={{ color: 'var(--muted)', fontSize: '12px' }}>{b.reviewCount} reviews</span>
                    {b.phone && <span style={{ color: 'var(--muted)', fontSize: '11px' }}>📞</span>}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '12px', fontSize: '11px', color: categoryColors[b.category] || '#6366f1', fontWeight: '600' }}>Click for details →</div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
