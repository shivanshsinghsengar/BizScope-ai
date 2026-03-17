import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import useAnalysis from '../hooks/useAnalysis';

export default function Properties() {
  const data = useAnalysis();
  const [properties, setProperties] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (data?.userLat && data?.userLng) {
      fetch(`http://localhost:5000/api/properties/${data.userLat}/${data.userLng}`)
        .then(r => r.json()).then(setProperties);
    }
  }, [data]);

  if (!data) return null;

  const filtered = filter === 'all' ? properties : properties.filter(p => p.type === filter);

  return (
    <Layout>
      <Head><title>Properties — BizScope AI</title></Head>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px' }}>

        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'white', marginBottom: '8px' }}>🏠 Available Properties</h1>
          <p style={{ color: '#475569', fontSize: '15px' }}>Commercial spaces for rent or purchase near your location</p>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
          {[{ val: 'all', label: '🌐 All Properties' }, { val: 'rent', label: '🔑 For Rent' }, { val: 'sale', label: '🏷️ For Sale' }].map(f => (
            <button key={f.val} onClick={() => setFilter(f.val)}
              style={{ padding: '10px 22px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s', background: filter === f.val ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : '#1e293b', color: filter === f.val ? 'white' : '#64748b', boxShadow: filter === f.val ? '0 4px 15px rgba(99,102,241,0.3)' : 'none' }}>
              {f.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
          {filtered.map(p => (
            <div key={p.id} style={{ background: '#0f172a', border: `1px solid ${p.type === 'rent' ? '#3b82f625' : '#10b98125'}`, borderRadius: '24px', padding: '28px', transition: 'all 0.25s', cursor: 'default' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = `0 24px 48px ${p.type === 'rent' ? '#3b82f6' : '#10b981'}18`; e.currentTarget.style.borderColor = p.type === 'rent' ? '#3b82f650' : '#10b98150'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = p.type === 'rent' ? '#3b82f625' : '#10b98125'; }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: p.type === 'rent' ? '#3b82f615' : '#10b98115', border: `1px solid ${p.type === 'rent' ? '#3b82f630' : '#10b98130'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>🏪</div>
                <span style={{ padding: '6px 16px', borderRadius: '100px', fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', background: p.type === 'rent' ? '#3b82f615' : '#10b98115', color: p.type === 'rent' ? '#60a5fa' : '#34d399', border: `1px solid ${p.type === 'rent' ? '#3b82f630' : '#10b98130'}` }}>
                  {p.type === 'rent' ? '🔑 FOR RENT' : '🏷️ FOR SALE'}
                </span>
              </div>

              <div style={{ fontSize: '20px', fontWeight: '700', color: 'white', marginBottom: '8px' }}>{p.address}</div>
              <div style={{ fontSize: '40px', fontWeight: '800', color: p.type === 'rent' ? '#60a5fa' : '#34d399', marginBottom: '20px', lineHeight: 1 }}>
                ₹{p.price?.toLocaleString()}
                <span style={{ fontSize: '16px', fontWeight: '400', color: '#475569' }}>{p.type === 'rent' ? '/month' : ' total'}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '24px' }}>
                {[
                  { icon: '📐', label: 'Size', val: `${p.size} sqft` },
                  { icon: '👥', label: 'Foot Traffic', val: `${p.footTraffic}%` },
                  { icon: '📍', label: 'Type', val: p.type === 'rent' ? 'Rental' : 'Purchase' },
                ].map(d => (
                  <div key={d.label} style={{ background: '#1e293b', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', marginBottom: '6px' }}>{d.icon}</div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>{d.val}</div>
                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>{d.label}</div>
                  </div>
                ))}
              </div>

              {/* Foot traffic bar */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569', marginBottom: '6px' }}>
                  <span>Foot Traffic Score</span><span style={{ color: p.type === 'rent' ? '#60a5fa' : '#34d399' }}>{p.footTraffic}%</span>
                </div>
                <div style={{ height: '6px', background: '#1e293b', borderRadius: '3px' }}>
                  <div style={{ height: '100%', borderRadius: '3px', background: p.type === 'rent' ? 'linear-gradient(90deg, #3b82f6, #60a5fa)' : 'linear-gradient(90deg, #10b981, #34d399)', width: `${p.footTraffic}%`, transition: 'width 1s ease' }} />
                </div>
              </div>

              <button style={{ width: '100%', padding: '14px', borderRadius: '14px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '15px', background: p.type === 'rent' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'linear-gradient(135deg, #10b981, #059669)', color: 'white', transition: 'opacity 0.2s, transform 0.1s', boxShadow: `0 4px 20px ${p.type === 'rent' ? '#3b82f6' : '#10b981'}30` }}
                onMouseEnter={e => { e.target.style.opacity = '0.9'; e.target.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.target.style.opacity = '1'; e.target.style.transform = 'translateY(0)'; }}>
                {p.type === 'rent' ? '📞 Enquire About Rent' : '💼 Enquire About Purchase'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
