import API_URL from '../utils/api';
import Head from 'next/head';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import Layout from '../components/Layout';
import useAnalysis from '../hooks/useAnalysis';
import { PageSkeleton } from '../components/Skeleton';
import ExportPDF from '../components/ExportPDF';
import { useAuth } from '../context/AuthContext';
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const categoryColors = {
  Restaurant: '#f59e0b', Cafe: '#8b5cf6', Grocery: '#10b981', Gym: '#3b82f6',
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

export default function Dashboard() {
  const data = useAnalysis();
  const { user, token } = useAuth();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  if (!data) return <Layout><PageSkeleton /></Layout>;

  // Business Viability Score: avg of (100 - riskScore) weighted by demand
  const viabilityScore = data.categoryStats?.length
    ? Math.round(
        data.categoryStats.reduce((sum, s) => sum + (100 - s.riskScore) * (s.demandScore / 10), 0) /
        data.categoryStats.reduce((sum, s) => sum + (s.demandScore / 10), 0)
      )
    : 0;
  const viabilityLabel = viabilityScore >= 70 ? 'Excellent' : viabilityScore >= 50 ? 'Good' : viabilityScore >= 30 ? 'Fair' : 'Tough';
  const viabilityColor = viabilityScore >= 70 ? '#c8f03a' : viabilityScore >= 50 ? '#a8d420' : viabilityScore >= 30 ? '#f59e0b' : '#ef4444';

  const handleShare = () => {
    const loc = data.location?.displayName?.split(',').slice(0, 2).join(',') || '';
    const url = `${window.location.origin}/?location=${encodeURIComponent(loc)}`;
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const saveSearch = async () => {
    if (!user) return;
    try {
      await fetch(`${API_URL}/api/searches/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ location: data.location?.displayName, displayName: data.location?.displayName?.split(',').slice(0, 2).join(','), data }),
      });
      setSaved(true);
    } catch (_) {}
  };

  const chartBar = {
    labels: data.categoryStats?.map(s => s.category) || [],
    datasets: [{ label: 'Score', data: data.categoryStats?.map(s => parseFloat(s.competitorScore?.toFixed(1) || 0)) || [], backgroundColor: data.categoryStats?.map(s => (categoryColors[s.category] || '#6366f1') + 'cc') || [], borderRadius: 10, borderSkipped: false }],
  };
  const chartDoughnut = {
    labels: data.categoryStats?.map(s => s.category) || [],
    datasets: [{ data: data.categoryStats?.map(s => s.count) || [], backgroundColor: data.categoryStats?.map(s => categoryColors[s.category] || '#6366f1') || [], borderWidth: 0, hoverOffset: 8 }],
  };

  return (
    <Layout>
      <Head>
        <title>Dashboard — BizScope AI</title>
        <meta name="description" content={`Market analysis for ${data.location?.displayName?.split(',')[0]} — ${data.businesses?.length} businesses analyzed`} />
      </Head>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px' }}>

        {/* Partial match warning */}
        {data.partialMatch && (
          <div style={{ background: '#f59e0b15', border: '1px solid #f59e0b40', borderRadius: '12px', padding: '12px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>⚠️</span>
            <div>
              <span style={{ color: '#fbbf24', fontWeight: '600', fontSize: '13px' }}>{data.partialMatch}</span>
              <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '2px' }}>The street address or pincode may have a typo — results are based on the city/area found.</div>
            </div>
          </div>
        )}

        {/* Location banner */}
        <div style={{ background: 'linear-gradient(135deg, #4f46e520, #7c3aed10)', border: '1px solid #4f46e530', borderRadius: '16px', padding: '16px 24px', marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>📍</span>
            <div>
              <div style={{ fontSize: '11px', color: '#6366f1', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Analyzing</div>
              <div style={{ fontSize: '15px', color: 'var(--text)', fontWeight: '600' }}>{data.location?.displayName?.split(',').slice(0, 3).join(', ')}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: 'var(--muted)', alignItems: 'center', flexWrap: 'wrap' }}>
            <span>🏪 {data.businesses?.length} businesses</span>
            <span>📂 {data.categoryStats?.length} categories</span>
            <ExportPDF data={data} />
            <button onClick={handleShare}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '12px', border: '1px solid #c8f03a40', background: copied ? '#c8f03a15' : 'transparent', color: copied ? '#c8f03a' : '#64748b', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
              {copied ? '✅ Copied!' : '🔗 Share'}
            </button>
            {user && (
              <button onClick={saveSearch} disabled={saved}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '12px', border: '1px solid #10b98140', background: saved ? '#10b98115' : 'transparent', color: saved ? '#34d399' : '#64748b', cursor: saved ? 'default' : 'pointer', fontSize: '13px', fontWeight: '600' }}>
                {saved ? '✅ Saved' : '🔖 Save Search'}
              </button>
            )}
          </div>
        </div>

        {/* Stat cards */}
        <div className="responsive-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            { icon: '🏪', label: 'Total Businesses', value: data.businesses?.length || 0, color: '#6366f1', href: '/competitors' },
            { icon: '📂', label: 'Categories', value: data.categoryStats?.length || 0, color: '#8b5cf6', href: '/insights' },
            { icon: '🔴', label: 'Most Competitive', value: data.categoryStats?.[0]?.category || 'N/A', color: '#ef4444', href: `/competitors?category=${encodeURIComponent(data.categoryStats?.[0]?.category || '')}` },
            { icon: '🟢', label: 'Best Opportunity', value: data.categoryStats?.[data.categoryStats.length - 1]?.category || 'N/A', color: '#10b981', href: `/competitors?category=${encodeURIComponent(data.categoryStats?.[data.categoryStats.length - 1]?.category || '')}` },
            { icon: '🎯', label: `Viability: ${viabilityLabel}`, value: `${viabilityScore}/100`, color: viabilityColor, href: '/insights' },
          ].map((s, i) => (
            <div key={i} onClick={() => router.push(s.href)}
              style={{ background: 'var(--surface)', border: `1px solid ${s.color}25`, borderRadius: '20px', padding: '22px', position: 'relative', overflow: 'hidden', transition: 'transform 0.2s', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 12px 30px ${s.color}20`; e.currentTarget.style.borderColor = s.color + '60'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = s.color + '25'; }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${s.color}, transparent)` }} />
              <div style={{ fontSize: '26px', marginBottom: '10px' }}>{s.icon}</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text)', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '6px' }}>{s.label}</div>
              <div style={{ fontSize: '11px', color: s.color, fontWeight: '600', marginTop: '8px' }}>View details →</div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '20px', marginBottom: '24px' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '24px' }}>
            <div style={{ fontWeight: '700', color: 'var(--text)', marginBottom: '4px' }}>📊 Competitor Score by Category</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '20px' }}>Higher = more competition. Lower = better opportunity.</div>
            <div style={{ height: '240px' }}>
              <Bar data={chartBar} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: 'var(--muted)' }, grid: { color: 'var(--border)' } }, y: { beginAtZero: true, ticks: { color: 'var(--muted)' }, grid: { color: 'var(--border)' } } } }} />
            </div>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '24px' }}>
            <div style={{ fontWeight: '700', color: 'var(--text)', marginBottom: '4px' }}>🥧 Market Share</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '16px' }}>Distribution by category</div>
            <div style={{ height: '220px' }}>
              <Doughnut data={chartDoughnut} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#64748b', font: { size: 11 }, boxWidth: 12 } } }, cutout: '65%' }} />
            </div>
          </div>
        </div>

        {/* Category cards */}
        <div className="responsive-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
          {data.categoryStats?.map((s, i) => (
            <div key={i}
              onClick={() => router.push(`/competitors?category=${encodeURIComponent(s.category)}`)}
              style={{ background: 'var(--surface)', border: `1px solid ${(categoryColors[s.category] || '#6366f1')}25`, borderRadius: '16px', padding: '20px', transition: 'transform 0.2s', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 30px ${(categoryColors[s.category] || '#6366f1')}20`; e.currentTarget.style.borderColor = (categoryColors[s.category] || '#6366f1') + '60'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = (categoryColors[s.category] || '#6366f1') + '25'; }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '22px' }}>{categoryIcons[s.category] || '🏪'}</span>
                  <span style={{ fontWeight: '600', color: 'var(--text)', fontSize: '14px' }}>{s.category}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '22px', fontWeight: '800', color: categoryColors[s.category] || '#6366f1' }}>{s.count}</span>
                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>→</span>
                </div>
              </div>
              <div style={{ height: '4px', background: 'var(--surface2)', borderRadius: '2px', marginBottom: '12px' }}>
                <div style={{ height: '100%', borderRadius: '2px', background: categoryColors[s.category] || '#6366f1', width: `${Math.min((s.count / (data.businesses?.length || 1)) * 300, 100)}%` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--muted)' }}>
                <span>⭐ {s.avgRating} avg rating</span>
                <span>Score: <span style={{ color: categoryColors[s.category] || '#6366f1', fontWeight: '600' }}>{s.competitorScore?.toFixed(1)}</span></span>
              </div>
              <div style={{ marginTop: '10px', fontSize: '11px', color: categoryColors[s.category] || '#6366f1', fontWeight: '600' }}>View competitors →</div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
