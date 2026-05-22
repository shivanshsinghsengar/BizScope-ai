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
import { trackEvent } from '../utils/analytics';
import MarketChat from '../components/MarketChat';
import RecommendedActions from '../components/RecommendedActions';
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const categoryColors = {
  Restaurant: '#f59e0b', Cafe: '#8b5cf6', Grocery: '#3b82f6', Gym: '#3b82f6',
  Salon: '#ec4899', Pharmacy: '#06b6d4', Bakery: '#f97316', Laundry: '#3b82f6',
  Hospital: '#ef4444', Clothing: '#a855f7', Electronics: '#0ea5e9',
  Hardware: '#78716c', Furniture: '#d97706', Education: '#14b8a6',
  Jewellery: '#eab308', Automotive: '#64748b', Finance: '#22c55e',
  Hotel: '#0ea5e9', Hospitality: '#f43f5e', Retail: '#8b5cf6', Wholesale: '#0891b2',
  Office: '#3b82f6', Other: '#64748b',
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

  const viabilityScore = data.categoryStats?.length
    ? Math.round(
        data.categoryStats.reduce((sum, s) => sum + (100 - s.riskScore) * (s.demandScore / 10), 0) /
        data.categoryStats.reduce((sum, s) => sum + (s.demandScore / 10), 0)
      )
    : 0;
  const viabilityLabel = viabilityScore >= 70 ? 'Excellent' : viabilityScore >= 50 ? 'Good' : viabilityScore >= 30 ? 'Fair' : 'Tough';
  const viabilityColor = viabilityScore >= 70 ? '#3b82f6' : viabilityScore >= 50 ? '#2563eb' : viabilityScore >= 30 ? '#f59e0b' : '#ef4444';

  const handleShare = () => {
    const loc = data.location?.displayName?.split(',').slice(0, 2).join(',') || '';
    const url = `${window.location.origin}/?location=${encodeURIComponent(loc)}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      trackEvent('report_shared', { location: loc });
      setTimeout(() => setCopied(false), 2000);
    });
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
      trackEvent('search_saved', { location: data.location?.displayName?.split(',')[0] || '' });
    } catch (_) {}
  };

  const chartBar = {
    labels: data.categoryStats?.map(s => s.category) || [],
    datasets: [{ label: 'Score', data: data.categoryStats?.map(s => parseFloat(s.competitorScore?.toFixed(1) || 0)) || [], backgroundColor: data.categoryStats?.map(s => (categoryColors[s.category] || '#3b82f6') + 'cc') || [], borderRadius: 10, borderSkipped: false }],
  };
  const chartDoughnut = {
    labels: data.categoryStats?.map(s => s.category) || [],
    datasets: [{ data: data.categoryStats?.map(s => s.count) || [], backgroundColor: data.categoryStats?.map(s => categoryColors[s.category] || '#3b82f6') || [], borderWidth: 0, hoverOffset: 8 }],
  };

  return (
    <Layout>
      <Head>
        <title>Dashboard — BizScope AI</title>
        <meta name="description" content={`Market analysis for ${data.location?.displayName?.split(',')[0]} — ${data.businesses?.length} businesses analyzed`} />
      </Head>

      <div style={{ padding: '0 20px 32px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>

        {/* ── Location Banner ── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(239,68,68,0.05) 100%)',
          border: '1px solid rgba(59,130,246,0.18)',
          borderRadius: '14px',
          padding: '14px 20px',
          margin: '16px 0 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ fontSize: '32px', lineHeight: 1 }}>📍</div>
            <div>
              <div style={{ fontSize: '10px', color: '#4f8ef7', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px' }}>Analyzing</div>
              <div style={{ fontSize: '15px', color: '#eef0f8', fontWeight: '700', letterSpacing: '-0.02em' }}>
                {data.location?.displayName?.split(',').slice(0, 3).join(', ')}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#3a4560', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4f8ef7', display: 'inline-block' }} />
              {data.businesses?.length} businesses
            </span>
            <span>📂 {data.categoryStats?.length} categories</span>
            <span style={{ fontSize: '10.5px', color: '#22c55e', fontWeight: '600', padding: '2px 8px', borderRadius: '100px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
              {(() => {
                const sources = data.dataQuality?.sourceCounts ? Object.keys(data.dataQuality.sourceCounts) : [];
                if (sources.includes('tomtom') && sources.includes('osm')) return '✅ TomTom + OSM Hybrid';
                if (sources.includes('tomtom') && sources.includes('foursquare')) return '✅ TomTom + Foursquare';
                if (sources.includes('tomtom')) return '✅ TomTom Data';
                if (sources.includes('osm')) return '✅ Live OSM Data';
                return '✅ Live Data';
              })()}
            </span>
            <ExportPDF data={data} onExported={() => trackEvent('pdf_exported', { location: data.location?.displayName?.split(',')[0] || '' })} />
            <button onClick={handleShare}
              style={{ padding: '5px 12px', borderRadius: '7px', border: '1px solid #1e2438', background: copied ? 'rgba(79,142,247,0.1)' : 'transparent', color: copied ? '#4f8ef7' : '#3a4560', cursor: 'pointer', fontSize: '11.5px', fontWeight: '600', transition: 'all 0.15s' }}>
              {copied ? '✅ Copied!' : '🔗 Share'}
            </button>
            {user && (
              <button onClick={saveSearch} disabled={saved}
                style={{ padding: '5px 12px', borderRadius: '7px', border: '1px solid #1e2438', background: saved ? 'rgba(52,211,153,0.1)' : 'transparent', color: saved ? '#34d399' : '#3a4560', cursor: saved ? 'default' : 'pointer', fontSize: '11.5px', fontWeight: '600' }}>
                {saved ? '✅ Saved' : '🔖 Save'}
              </button>
            )}
          </div>
        </div>

        {/* Data quality notice */}
        {(data.dataQuality?.usesMockData || data.dataQuality?.hasEstimatedMetrics || data.dataQuality?.warnings?.length) && (
          <details style={{ marginBottom: '14px' }}>
            <summary style={{
              background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
              borderRadius: '10px', padding: '10px 14px',
              fontSize: '11.5px', fontWeight: '700', color: '#f59e0b',
              cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase',
              listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span>⚠️ Data Quality Notice</span>
              <span style={{ fontSize: '10px' }}>▼</span>
            </summary>
            <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '12px 14px', fontSize: '12px', color: '#3a4560', lineHeight: '1.7' }}>
              {data.dataQuality?.usesMockData && <div>Some records are fallback data because live providers returned no results for this location.</div>}
              {data.dataQuality?.hasEstimatedMetrics && <div>Ratings and review counts may include estimates where source APIs do not provide them.</div>}
            </div>
          </details>
        )}

        {data.estimatedData && (
          <div style={{ background: '#f59e0b10', border: '1px solid #f59e0b40', borderRadius: '10px', padding: '10px 16px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>⚠️</span>
            <span style={{ color: '#fbbf24', fontWeight: '600', fontSize: '12px' }}>Estimated Data — {data.estimatedData}</span>
            <button onClick={() => { sessionStorage.removeItem('analysisData'); router.push('/'); }}
              style={{ marginLeft: 'auto', padding: '4px 10px', borderRadius: '6px', border: '1px solid #f59e0b40', background: 'transparent', color: '#fbbf24', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>
              🔄 Retry
            </button>
          </div>
        )}
        {data.partialMatch && (
          <div style={{ background: '#f59e0b15', border: '1px solid #f59e0b40', borderRadius: '10px', padding: '10px 16px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>⚠️</span>
            <span style={{ color: '#fbbf24', fontWeight: '600', fontSize: '12px' }}>{data.partialMatch}</span>
          </div>
        )}

        {/* ── RECOMMENDED ACTIONS ── */}
        <RecommendedActions />

        {/* ── OVERVIEW GRID LABEL ── */}
        <div style={{ fontSize: '10px', fontWeight: '700', color: '#2a3350', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
          Overview Grid
        </div>

        {/* ── MAIN CONTENT + RIGHT PANEL ── */}
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }} className="analysis-body">

          {/* Left main column */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* Stat cards */}
            <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
              {[
                { icon: '🏪', label: 'Total Businesses', value: data.businesses?.length || 0, color: '#4f8ef7', href: '/competitors' },
                { icon: '📂', label: 'Categories', value: data.categoryStats?.length || 0, color: '#8b5cf6', href: '/insights' },
                { icon: '🔴', label: 'Most Competitive', value: data.categoryStats?.[0]?.category || 'N/A', color: '#ef4444', href: `/competitors?category=${encodeURIComponent(data.categoryStats?.[0]?.category || '')}` },
                { icon: '🟢', label: 'Best Opportunity', value: data.categoryStats?.[data.categoryStats.length - 1]?.category || 'N/A', color: '#22c55e', href: `/competitors?category=${encodeURIComponent(data.categoryStats?.[data.categoryStats.length - 1]?.category || '')}` },
                { icon: '🎯', label: `Viability: ${viabilityLabel}`, value: `${viabilityScore}/100`, color: viabilityColor, href: '/insights' },
              ].map((s, i) => (
                <div key={i} onClick={() => router.push(s.href)}
                  style={{ background: '#161b27', border: `1px solid ${s.color}20`, borderRadius: '12px', padding: '16px', position: 'relative', overflow: 'hidden', transition: 'all 0.2s', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = s.color + '50'; e.currentTarget.style.boxShadow = `0 8px 24px ${s.color}15`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = s.color + '20'; e.currentTarget.style.boxShadow = 'none'; }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${s.color}, transparent)` }} />
                  <div style={{ fontSize: '22px', marginBottom: '8px' }}>{s.icon}</div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#eef0f8', lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: '11px', color: '#3a4560', marginTop: '5px' }}>{s.label}</div>
                  <div style={{ fontSize: '10.5px', color: s.color, fontWeight: '600', marginTop: '6px' }}>View details →</div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="chart-grid" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div style={{ background: '#161b27', border: '1px solid #1e2438', borderRadius: '14px', padding: '20px' }}>
                <div style={{ fontWeight: '700', color: '#eef0f8', marginBottom: '3px', fontSize: '13.5px' }}>📊 Competitor Score by Category</div>
                <div style={{ fontSize: '11.5px', color: '#3a4560', marginBottom: '16px' }}>Higher = more competition. Lower = better opportunity.</div>
                <div style={{ height: '220px' }}>
                  <Bar data={chartBar} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#3a4560', font: { size: 10 } }, grid: { color: '#1a1d28' } }, y: { beginAtZero: true, ticks: { color: '#3a4560', font: { size: 10 } }, grid: { color: '#1a1d28' } } } }} />
                </div>
              </div>
              <div style={{ background: '#161b27', border: '1px solid #1e2438', borderRadius: '14px', padding: '20px' }}>
                <div style={{ fontWeight: '700', color: '#eef0f8', marginBottom: '3px', fontSize: '13.5px' }}>🥧 Market Share</div>
                <div style={{ fontSize: '11.5px', color: '#3a4560', marginBottom: '12px' }}>Distribution by category</div>
                <div style={{ height: '200px' }}>
                  <Doughnut data={chartDoughnut} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#3a4560', font: { size: 10 }, boxWidth: 10 } } }, cutout: '65%' }} />
                </div>
              </div>
            </div>

            {/* Category cards */}
            <div className="cat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {data.categoryStats?.map((s, i) => (
                <div key={i}
                  onClick={() => router.push(`/competitors?category=${encodeURIComponent(s.category)}`)}
                  style={{ background: '#161b27', border: `1px solid ${(categoryColors[s.category] || '#4f8ef7')}20`, borderRadius: '12px', padding: '16px', transition: 'all 0.2s', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = (categoryColors[s.category] || '#4f8ef7') + '50'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = (categoryColors[s.category] || '#4f8ef7') + '20'; }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '20px' }}>{categoryIcons[s.category] || '🏪'}</span>
                      <span style={{ fontWeight: '600', color: '#eef0f8', fontSize: '13px' }}>{s.category}</span>
                    </div>
                    <span style={{ fontSize: '20px', fontWeight: '800', color: categoryColors[s.category] || '#4f8ef7' }}>{s.count}</span>
                  </div>
                  <div style={{ height: '3px', background: '#1e2438', borderRadius: '2px', marginBottom: '10px' }}>
                    <div style={{ height: '100%', borderRadius: '2px', background: categoryColors[s.category] || '#4f8ef7', width: `${Math.min((s.count / (data.businesses?.length || 1)) * 300, 100)}%` }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#3a4560' }}>
                    <span>⭐ {s.avgRating} avg</span>
                    <span style={{ color: categoryColors[s.category] || '#4f8ef7', fontWeight: '600' }}>Score: {s.competitorScore?.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right Panel ── */}
          <div className="right-panel" style={{ width: '210px', flexShrink: 0, position: 'sticky', top: '100px' }}>

            {/* Viability gauge */}
            <div style={{ background: '#161b27', border: `1px solid ${viabilityColor}25`, borderRadius: '14px', padding: '18px', marginBottom: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: '#2a3350', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Market Viability</div>
              <svg width="90" height="90" viewBox="0 0 100 100" style={{ margin: '0 auto 10px', display: 'block' }}>
                <circle cx="50" cy="50" r="40" fill="none" stroke="#1e2438" strokeWidth="10" />
                <circle cx="50" cy="50" r="40" fill="none" stroke={viabilityColor} strokeWidth="10"
                  strokeDasharray={`${(viabilityScore / 100) * 251} 251`}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)" />
                <text x="50" y="46" textAnchor="middle" fill="#eef0f8" fontSize="18" fontWeight="800">{viabilityScore}</text>
                <text x="50" y="60" textAnchor="middle" fill="#3a4560" fontSize="9">/100</text>
              </svg>
              <div style={{ fontSize: '13px', fontWeight: '700', color: viabilityColor }}>{viabilityLabel}</div>
              <div style={{ fontSize: '10.5px', color: '#2a3350', marginTop: '3px' }}>Overall market score</div>
            </div>

            {/* Top Opportunities */}
            <div style={{ background: '#161b27', border: '1px solid #1e2438', borderRadius: '14px', padding: '16px', marginBottom: '14px' }}>
              <div style={{ fontSize: '10px', color: '#2a3350', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>🟢 Top Opportunities</div>
              {[...data.categoryStats].reverse().slice(0, 4).map((s, i) => (
                <div key={i} onClick={() => router.push(`/competitors?category=${encodeURIComponent(s.category)}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 0', borderBottom: i < 3 ? '1px solid #1a1d28' : 'none', cursor: 'pointer' }}>
                  <span style={{ fontSize: '16px' }}>{categoryIcons[s.category] || '🏪'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '11.5px', fontWeight: '600', color: '#eef0f8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.category}</div>
                    <div style={{ fontSize: '10px', color: '#2a3350' }}>{s.count} competitors</div>
                  </div>
                  <span style={{ fontSize: '9.5px', padding: '2px 5px', borderRadius: '100px', background: 'rgba(34,197,94,0.1)', color: '#22c55e', fontWeight: '700', flexShrink: 0 }}>Low</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ background: '#161b27', border: '1px solid #1e2438', borderRadius: '14px', padding: '14px' }}>
              <div style={{ fontSize: '10px', color: '#2a3350', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>⚡ Quick Actions</div>
              {[
                { icon: '📄', label: 'Export PDF',   action: () => document.getElementById('export-pdf-btn')?.click() },
                { icon: '🔗', label: 'Share Report', action: handleShare },
                { icon: '🔍', label: 'New Analysis', action: () => router.push('/') },
              ].map(a => (
                <button key={a.label} onClick={a.action}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '7px 8px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#3a4560', background: 'transparent', marginBottom: '2px', textAlign: 'left', transition: 'all 0.14s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#eef0f8'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#3a4560'; }}>
                  <span style={{ fontSize: '15px' }}>{a.icon}</span>
                  <span>{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AI Market Chat */}
      <MarketChat data={{ ...data, viabilityScore }} />

      <style>{`
        @media (max-width: 1100px) {
          .stat-grid  { grid-template-columns: repeat(3, 1fr) !important; }
          .chart-grid { grid-template-columns: 1fr !important; }
          .cat-grid   { grid-template-columns: repeat(2, 1fr) !important; }
          .right-panel { display: none !important; }
        }
        @media (max-width: 768px) {
          .analysis-body { flex-direction: column !important; }
          .stat-grid  { grid-template-columns: repeat(2, 1fr) !important; }
          .cat-grid   { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </Layout>
  );
}
