import Head from 'next/head';
import { useState } from 'react';
import Layout from '../components/Layout';
import useAnalysis from '../hooks/useAnalysis';
import { PageSkeleton } from '../components/Skeleton';

const categoryColors = { Restaurant: '#f59e0b', Cafe: '#8b5cf6', Grocery: '#10b981', Gym: '#3b82f6', Salon: '#ec4899', Pharmacy: '#06b6d4', Bakery: '#f97316', Laundry: '#6366f1', Other: '#64748b' };
const categoryIcons = { Restaurant: '🍽️', Cafe: '☕', Grocery: '🛒', Gym: '💪', Salon: '✂️', Pharmacy: '💊', Bakery: '🥐', Laundry: '👕', Other: '🏪' };

export default function Competitors() {
  const data = useAnalysis();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [sort, setSort] = useState('rating');

  if (!data) return <Layout><PageSkeleton /></Layout>;

  const categories = ['All', ...new Set(data.businesses?.map(b => b.category) || [])];
  const filtered = (data.businesses || [])
    .filter(b => (filter === 'All' || b.category === filter) && b.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sort === 'rating' ? b.rating - a.rating : b.reviewCount - a.reviewCount);

  return (
    <Layout>
      <Head><title>Competitors — BizScope AI</title></Head>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px' }}>

        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'white', marginBottom: '8px' }}>🏪 Competitor Directory</h1>
          <p style={{ color: '#475569', fontSize: '15px' }}>{data.businesses?.length} businesses found within 5km of your location</p>
        </div>

        {/* Filters */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '20px', marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
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
              style={{ padding: '8px 18px', borderRadius: '100px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', transition: 'all 0.2s', background: filter === cat ? (categoryColors[cat] || '#6366f1') : '#1e293b', color: filter === cat ? 'white' : '#64748b', boxShadow: filter === cat ? `0 4px 15px ${(categoryColors[cat] || '#6366f1')}40` : 'none' }}>
              {cat === 'All' ? '🌐 All' : `${categoryIcons[cat] || '🏪'} ${cat}`}
            </button>
          ))}
        </div>

        <div style={{ fontSize: '13px', color: '#475569', marginBottom: '16px' }}>{filtered.length} results</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
          {filtered.map((b, i) => (
            <div key={i} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '20px', transition: 'all 0.2s', cursor: 'default' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = (categoryColors[b.category] || '#6366f1') + '60'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 30px ${(categoryColors[b.category] || '#6366f1')}15`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e293b'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: `${categoryColors[b.category] || '#6366f1'}20`, border: `1px solid ${categoryColors[b.category] || '#6366f1'}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                  {categoryIcons[b.category] || '🏪'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '700', color: 'white', fontSize: '14px', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</div>
                  <div style={{ fontSize: '11px', color: categoryColors[b.category] || '#6366f1', fontWeight: '600', marginBottom: '8px' }}>{b.category}</div>
                  <div style={{ fontSize: '11px', color: '#475569', marginBottom: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📍 {b.address}</div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: '#f59e0b', fontSize: '13px' }}>⭐</span>
                      <span style={{ color: 'white', fontWeight: '700', fontSize: '13px' }}>{b.rating}</span>
                    </div>
                    <span style={{ color: '#334155', fontSize: '12px' }}>{b.reviewCount} reviews</span>
                    {b.phone && <span style={{ color: '#475569', fontSize: '11px' }}>📞</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
