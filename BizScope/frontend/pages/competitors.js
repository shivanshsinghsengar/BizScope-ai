import Head from 'next/head';
import { useState } from 'react';
import Layout from '../components/Layout';
import useAnalysis from '../hooks/useAnalysis';
import { PageSkeleton } from '../components/Skeleton';

const categoryColors = {
  Restaurant: '#f59e0b', Cafe: '#8b5cf6', Grocery: '#10b981', Gym: '#3b82f6',
  Salon: '#ec4899', Pharmacy: '#06b6d4', Bakery: '#f97316', Laundry: '#6366f1',
  Hospital: '#ef4444', Clothing: '#a855f7', Electronics: '#0ea5e9',
  Hardware: '#78716c', Furniture: '#d97706', Education: '#14b8a6',
  Jewellery: '#eab308', Automotive: '#64748b', Finance: '#22c55e',
  Hospitality: '#f43f5e', Retail: '#8b5cf6', Wholesale: '#0891b2',
  Office: '#6366f1', Other: '#64748b',
};
const categoryIcons = {
  Restaurant: '🍽️', Cafe: '☕', Grocery: '🛒', Gym: '💪',
  Salon: '✂️', Pharmacy: '💊', Bakery: '🥐', Laundry: '👕',
  Hospital: '🏥', Clothing: '👗', Electronics: '📱',
  Hardware: '🔧', Furniture: '🛋️', Education: '🎓',
  Jewellery: '💍', Automotive: '🚗', Finance: '🏦',
  Hospitality: '🏨', Retail: '🛍️', Wholesale: '📦',
  Office: '🏢', Other: '🏪',
};

const getBusinessName = (business) => business.name || business.businessName || business.title || 'Unnamed business';

export default function Competitors() {
  const data = useAnalysis();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [sort, setSort] = useState('rating');

  if (!data) return <Layout><PageSkeleton /></Layout>;

  const categories = ['All', ...new Set(data.businesses?.map(b => b.category) || [])];
  const filtered = (data.businesses || [])
    .filter(b => {
      const label = getBusinessName(b).toLowerCase();
      return (filter === 'All' || b.category === filter) && label.includes(search.toLowerCase());
    })
    .sort((a, b) => sort === 'rating' ? b.rating - a.rating : b.reviewCount - a.reviewCount);

  return (
    <Layout>
      <Head><title>Competitors — BizScope AI</title></Head>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px' }}>

        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text)', marginBottom: '8px' }}>🏪 Competitor Directory</h1>
          <p style={{ color: 'var(--muted)', fontSize: '15px' }}>{data.businesses?.length} businesses found within 5km of your location</p>
        </div>

        {/* Filters */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search by name..." className="input-field" style={{ flex: 1, minWidth: '200px' }} />
          <select value={sort} onChange={e => setSort(e.target.value)} className="input-field" style={{ width: '160px' }}>
            <option value="rating">Sort: Rating</option>
            <option value="reviews">Sort: Reviews</option>
          </select>
        </div>

        {/* Category pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
              style={{ padding: '8px 18px', borderRadius: '100px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', transition: 'all 0.2s', background: filter === cat ? (categoryColors[cat] || '#6366f1') : 'var(--surface2)', color: filter === cat ? 'white' : 'var(--muted)', boxShadow: filter === cat ? `0 4px 15px ${(categoryColors[cat] || '#6366f1')}40` : 'none' }}>
              {cat === 'All' ? '🌐 All' : `${categoryIcons[cat] || '🏪'} ${cat}`}
            </button>
          ))}
        </div>

        <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>{filtered.length} results</div>

        <div className="responsive-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {filtered.map((b, i) => (
            <div key={i} style={{ background: 'linear-gradient(135deg, var(--surface) 0%, var(--surface2) 100%)', border: '1.5px solid var(--border)', borderRadius: '20px', padding: '24px', transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = (categoryColors[b.category] || '#6366f1'); e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)'; e.currentTarget.style.boxShadow = `0 20px 40px ${(categoryColors[b.category] || '#6366f1')}25, inset 0 1px 0 ${(categoryColors[b.category] || '#6366f1')}15`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}>
              
              {/* Category Badge */}
              <div style={{ position: 'absolute', top: '16px', right: '16px', background: `${categoryColors[b.category] || '#6366f1'}25`, border: `1px solid ${categoryColors[b.category] || '#6366f1'}50`, padding: '6px 14px', borderRadius: '50px', fontSize: '11px', fontWeight: '700', color: categoryColors[b.category] || '#6366f1' }}>
                {b.category}
              </div>

              {/* Icon + Header */}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: `linear-gradient(135deg, ${categoryColors[b.category] || '#6366f1'}30 0%, ${categoryColors[b.category] || '#6366f1'}15 100%)`, border: `1.5px solid ${categoryColors[b.category] || '#6366f1'}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', flexShrink: 0 }}>
                  {categoryIcons[b.category] || '🏪'}
                </div>
                <div style={{ flex: 1, minWidth: 0, marginTop: '2px' }}>
                  <h3 style={{ fontWeight: '800', color: 'var(--text)', fontSize: '16px', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: '1.2' }}>{getBusinessName(b)}</h3>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    📍 {b.address || 'Location not available'}
                  </div>
                </div>
              </div>

              {/* Rating Bar */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', padding: '12px', background: 'var(--surface2)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1 }}>
                  <span style={{ color: '#f59e0b', fontSize: '16px' }}>⭐</span>
                  <span style={{ color: 'var(--text)', fontWeight: '800', fontSize: '15px' }}>{b.rating}</span>
                  <span style={{ color: 'var(--muted)', fontSize: '12px' }}>·</span>
                  <span style={{ color: 'var(--muted)', fontSize: '12px' }}>{b.reviewCount} reviews</span>
                </div>
                <div style={{ width: '1px', height: '20px', background: 'var(--border)' }}></div>
                {b.distance && <span style={{ color: 'var(--muted)', fontSize: '11px', fontWeight: '600' }}>📏 {b.distance}m</span>}
              </div>

              {/* Contact Info */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                {b.phone && <div style={{ fontSize: '11px', color: 'var(--muted)', background: 'var(--surface2)', padding: '6px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>📞 {b.phone}</div>}
                {b.website && <div style={{ fontSize: '11px', color: 'var(--muted)', background: 'var(--surface2)', padding: '6px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>🌐 Website</div>}
                {b.source && <div style={{ fontSize: '10px', color: 'var(--muted)', opacity: 0.6 }}>via {b.source}</div>}
              </div>

              {/* Action Button */}
              <button style={{ width: '100%', padding: '12px', background: `linear-gradient(135deg, ${categoryColors[b.category] || '#6366f1'} 0%, ${categoryColors[b.category] || '#6366f1'}dd 100%)`, color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: `0 4px 15px ${(categoryColors[b.category] || '#6366f1')}40` }}
                onMouseEnter={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = `0 6px 20px ${(categoryColors[b.category] || '#6366f1')}50`; }}
                onMouseLeave={e => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = `0 4px 15px ${(categoryColors[b.category] || '#6366f1')}40`; }}>
                View Details →
              </button>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
