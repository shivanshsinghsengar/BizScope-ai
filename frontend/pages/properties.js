import API_URL from '../utils/api';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import useAnalysis from '../hooks/useAnalysis';
import { PageSkeleton } from '../components/Skeleton';

const typeConfig = {
  rent: { label: '🔑 FOR RENT', color: '#3b82f6', light: '#3b82f615', border: '#3b82f630', btn: 'linear-gradient(135deg,#3b82f6,#2563eb)', suffix: '/month' },
  sale: { label: '🏷️ FOR SALE', color: '#10b981', light: '#10b98115', border: '#10b98130', btn: 'linear-gradient(135deg,#10b981,#059669)', suffix: ' total' },
};

export default function Properties() {
  const data = useAnalysis();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('default');

  useEffect(() => {
    if (data?.userLat && data?.userLng) {
      setLoading(true);
      fetch(`${API_URL}/api/properties/${data.userLat}/${data.userLng}`)
        .then(r => r.json())
        .then(d => { setProperties(Array.isArray(d) ? d : []); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [data]);

  if (!data) return <Layout><PageSkeleton /></Layout>;

  let filtered = filter === 'all' ? properties : properties.filter(p => p.type === filter);
  if (sort === 'price-asc') filtered = [...filtered].sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') filtered = [...filtered].sort((a, b) => b.price - a.price);
  if (sort === 'size') filtered = [...filtered].sort((a, b) => b.size - a.size);
  if (sort === 'traffic') filtered = [...filtered].sort((a, b) => b.footTraffic - a.footTraffic);

  const rentCount = properties.filter(p => p.type === 'rent').length;
  const saleCount = properties.filter(p => p.type === 'sale').length;

  return (
    <Layout>
      <Head><title>Properties — BizScope AI</title></Head>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px' }}>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text)', marginBottom: '8px' }}>🏠 Available Properties</h1>
          <p style={{ color: 'var(--muted)', fontSize: '15px' }}>
            Commercial spaces near <span style={{ color: '#a78bfa' }}>{data.location?.displayName?.split(',').slice(0, 2).join(',')}</span>
          </p>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {[
            { icon: '🏪', label: 'Total Listings', value: properties.length, color: '#6366f1' },
            { icon: '🔑', label: 'For Rent', value: rentCount, color: '#3b82f6' },
            { icon: '🏷️', label: 'For Sale', value: saleCount, color: '#10b981' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--surface)', border: `1px solid ${s.color}25`, borderRadius: '14px', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '22px' }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text)' }}>{s.value}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters + Sort */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[{ val: 'all', label: '🌐 All' }, { val: 'rent', label: '🔑 Rent' }, { val: 'sale', label: '🏷️ Sale' }].map(f => (
              <button key={f.val} onClick={() => setFilter(f.val)}
                style={{ padding: '9px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', transition: 'all 0.2s', background: filter === f.val ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : 'var(--surface2)', color: filter === f.val ? 'white' : 'var(--muted)', boxShadow: filter === f.val ? '0 4px 15px rgba(99,102,241,0.3)' : 'none' }}>
                {f.label}
              </button>
            ))}
          </div>
          <select value={sort} onChange={e => setSort(e.target.value)}
            style={{ padding: '9px 16px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: '13px', cursor: 'pointer', outline: 'none' }}>
            <option value="default">Sort: Default</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="size">Largest First</option>
            <option value="traffic">Best Foot Traffic</option>
          </select>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: '20px' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '24px', padding: '28px', height: '320px', animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏚️</div>
            <div style={{ color: 'var(--text)', fontWeight: '600', fontSize: '18px', marginBottom: '8px' }}>No properties found</div>
            <div style={{ color: 'var(--muted)', fontSize: '14px' }}>Try changing the filter or analyze a different location.</div>
          </div>
        )}

        {/* Property cards */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {filtered.map((p, i) => {
              const cfg = typeConfig[p.type] || typeConfig.rent;
              return (
                <div key={p.id || i}
                  style={{ background: 'var(--surface)', border: `1px solid ${cfg.border}`, borderRadius: '24px', padding: '28px', transition: 'all 0.25s', cursor: 'default', position: 'relative', overflow: 'hidden' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = `0 20px 40px ${cfg.color}18`; e.currentTarget.style.borderColor = cfg.color + '60'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = cfg.border; }}>

                  {/* Top accent */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: cfg.btn }} />

                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: cfg.light, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' }}>🏪</div>
                    <span style={{ padding: '5px 14px', borderRadius: '100px', fontSize: '11px', fontWeight: '700', letterSpacing: '0.06em', background: cfg.light, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                      {cfg.label}
                    </span>
                  </div>

                  {/* Address */}
                  <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)', marginBottom: '6px', lineHeight: '1.4' }}>{p.address}</div>

                  {/* Price */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '20px' }}>
                    <span style={{ fontSize: '36px', fontWeight: '800', color: cfg.color, lineHeight: 1 }}>
                      ₹{p.price?.toLocaleString('en-IN')}
                    </span>
                    <span style={{ fontSize: '14px', color: 'var(--muted)' }}>{cfg.suffix}</span>
                  </div>

                  {/* Stats grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '20px' }}>
                    {[
                      { icon: '📐', label: 'Size', val: `${p.size} sqft` },
                      { icon: '👥', label: 'Foot Traffic', val: `${p.footTraffic}%` },
                      { icon: '📍', label: 'Type', val: p.type === 'rent' ? 'Rental' : 'Purchase' },
                    ].map(d => (
                      <div key={d.label} style={{ background: 'var(--surface2)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', marginBottom: '4px' }}>{d.icon}</div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>{d.val}</div>
                        <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '2px' }}>{d.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Foot traffic bar */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
                      <span>Foot Traffic Score</span>
                      <span style={{ color: cfg.color, fontWeight: '600' }}>{p.footTraffic}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--surface2)', borderRadius: '3px' }}>
                      <div style={{ height: '100%', borderRadius: '3px', background: cfg.btn, width: `${p.footTraffic}%`, transition: 'width 1s ease' }} />
                    </div>
                  </div>

                  {/* CTA */}
                  <button style={{ width: '100%', padding: '13px', borderRadius: '14px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '14px', background: cfg.btn, color: 'white', transition: 'opacity 0.2s, transform 0.1s', boxShadow: `0 4px 20px ${cfg.color}30` }}
                    onMouseEnter={e => { e.target.style.opacity = '0.9'; e.target.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { e.target.style.opacity = '1'; e.target.style.transform = 'translateY(0)'; }}>
                    {p.type === 'rent' ? '📞 Enquire About Rent' : '💼 Enquire About Purchase'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--muted3)', marginTop: '32px' }}>
          Property data sourced from OpenStreetMap. Prices are estimates based on area and size.
        </p>
      </div>
    </Layout>
  );
}
