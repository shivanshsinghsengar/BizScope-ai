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

// ── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:        '#F8FAFC',
  card:      '#FFFFFF',
  primary:   '#1F6FEB',
  secondary: '#2E8B57',
  accent:    '#F59E0B',
  text:      '#1E293B',
  muted:     '#64748B',
  border:    '#E2E8F0',
  success:   '#16A34A',
  warning:   '#F59E0B',
  danger:    '#DC2626',
};

const categoryColors = {
  Restaurant:'#1F6FEB', Cafe:'#7C3AED', Grocery:'#2E8B57', Gym:'#0891B2',
  Salon:'#DB2777', Pharmacy:'#0F766E', Bakery:'#D97706', Laundry:'#1F6FEB',
  Hospital:'#DC2626', Clothing:'#7C3AED', Electronics:'#0369A1',
  Hardware:'#78716C', Furniture:'#B45309', Education:'#0F766E',
  Jewellery:'#B45309', Automotive:'#64748B', Finance:'#16A34A',
  Hotel:'#0891B2', Hospitality:'#DB2777', Retail:'#7C3AED',
  Wholesale:'#0369A1', Office:'#1F6FEB', Other:'#64748B',
};
const categoryIcons = {
  Restaurant:'🍽️', Cafe:'☕', Grocery:'🛒', Gym:'💪', Salon:'✂️',
  Pharmacy:'💊', Bakery:'🥐', Laundry:'👕', Hospital:'🏥', Clothing:'👗',
  Electronics:'📱', Hardware:'🔧', Furniture:'🛋️', Education:'🎓',
  Jewellery:'💍', Automotive:'🚗', Finance:'🏦', Hotel:'🏨',
  Hospitality:'🏨', Retail:'🛍️', Wholesale:'📦', Office:'🏢', Other:'🏪',
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const card = (extra = {}) => ({
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: '16px',
  boxShadow: '0 1px 4px rgba(15,23,42,0.06), 0 4px 16px rgba(15,23,42,0.04)',
  ...extra,
});

const label = (extra = {}) => ({
  fontSize: '11px',
  fontWeight: '600',
  color: C.muted,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  fontFamily: "'Inter', sans-serif",
  ...extra,
});

const statNum = (color = C.text, extra = {}) => ({
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: '32px',
  fontWeight: '700',
  color,
  letterSpacing: '-0.5px',
  lineHeight: 1,
  ...extra,
});

const tag = (color = C.primary, extra = {}) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  fontSize: '11px',
  fontWeight: '600',
  color,
  background: color + '12',
  border: `1px solid ${color}25`,
  borderRadius: '100px',
  padding: '3px 10px',
  ...extra,
});

const sectionTitle = (extra = {}) => ({
  fontFamily: "'Manrope', sans-serif",
  fontSize: '16px',
  fontWeight: '700',
  color: C.text,
  marginBottom: '4px',
  ...extra,
});

// ── Greeting ─────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ icon, label: lbl, value, sub, color = C.primary, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        ...card({ padding: '20px 22px', cursor: onClick ? 'pointer' : 'default',
          transition: 'box-shadow 0.18s, transform 0.18s',
          boxShadow: hov
            ? '0 4px 24px rgba(15,23,42,0.10), 0 1px 4px rgba(15,23,42,0.06)'
            : '0 1px 4px rgba(15,23,42,0.06)',
          transform: hov && onClick ? 'translateY(-2px)' : 'none',
        }),
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: color + '12',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
          {icon}
        </div>
        {sub && <span style={tag(color)}>{sub}</span>}
      </div>
      <div style={statNum(color, { fontSize: '26px', marginBottom: '4px' })}>{value}</div>
      <div style={label()}>{lbl}</div>
    </div>
  );
}

// ── Opportunity Card ──────────────────────────────────────────────────────────
function OpportunityCard({ opp, rank, onClick }) {
  const [hov, setHov] = useState(false);
  const color = rank === 0 ? C.secondary : rank === 1 ? C.primary : C.muted;
  const rankLabel = rank === 0 ? '#1 Top Pick' : rank === 1 ? '#2 Runner Up' : '#3 Good Bet';
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        ...card({ padding: '18px 20px', cursor: 'pointer',
          transition: 'all 0.18s',
          boxShadow: hov ? `0 6px 24px ${color}18, 0 1px 4px rgba(15,23,42,0.06)` : '0 1px 4px rgba(15,23,42,0.06)',
          transform: hov ? 'translateY(-2px)' : 'none',
          borderTop: `3px solid ${color}`,
        }),
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={tag(color)}>{rankLabel}</span>
        <span style={{ fontSize: '20px' }}>{categoryIcons[opp.category] || '🏪'}</span>
      </div>
      <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: '17px', fontWeight: '700',
        color: C.text, marginBottom: '12px' }}>{opp.category}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {[
          { lbl: 'Opportunity', val: opp.opportunityScore, color: color },
          { lbl: 'Demand', val: opp.demandScore, color: C.primary },
          { lbl: 'Competition', val: opp.competitionScore, color: C.danger },
        ].map(row => (
          <div key={row.lbl}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span style={label()}>{row.lbl}</span>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '12px',
                fontWeight: '700', color: row.color }}>{row.val}%</span>
            </div>
            <div style={{ height: '3px', background: C.border, borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${row.val}%`, background: row.color,
                borderRadius: '2px', transition: 'width 0.6s ease' }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${C.border}`,
        fontSize: '12px', color: C.muted }}>
        {opp.count} existing · {opp.riskLevel} risk
      </div>
    </div>
  );
}

// ── Category Row ─────────────────────────────────────────────────────────────
function CategoryRow({ s, total, onClick }) {
  const [hov, setHov] = useState(false);
  const color = categoryColors[s.category] || C.primary;
  const pct = Math.min(Math.round((s.count / Math.max(total, 1)) * 100), 100);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: '12px 16px',
        borderRadius: '10px',
        background: hov ? '#F8FAFC' : 'transparent',
        cursor: 'pointer',
        transition: 'background 0.15s',
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <span style={{ fontSize: '20px', flexShrink: 0 }}>{categoryIcons[s.category] || '🏪'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '13px', fontWeight: '600',
            color: C.text }}>{s.category}</span>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', fontWeight: '700',
            color: color }}>{s.count}</span>
        </div>
        <div style={{ height: '3px', background: C.border, borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '2px',
            transition: 'width 0.6s ease' }} />
        </div>
      </div>
      <span style={tag(s.riskScore >= 70 ? C.danger : s.riskScore >= 35 ? C.warning : C.success)}>
        {s.riskLevel}
      </span>
    </div>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────
function SectionDivider({ title, subtitle }) {
  return (
    <div style={{ margin: '32px 0 20px' }}>
      <h2 style={{ fontFamily: "'Manrope', sans-serif", fontSize: '18px', fontWeight: '800',
        color: C.text, margin: 0, marginBottom: '4px' }}>{title}</h2>
      {subtitle && <p style={{ fontSize: '13px', color: C.muted, margin: 0 }}>{subtitle}</p>}
    </div>
  );
}

// ── Executive Summary ─────────────────────────────────────────────────────────
function ExecutiveSummary({ data }) {
  const city = data.location?.displayName?.split(',')[0] || 'this area';
  const topOpp = data.bestOpportunities?.[0];
  const ds = data.demandScore ?? 5;
  const cs = data.competitionScore ?? 5;
  const os = data.opportunityScore ?? 5;
  const bCount = data.businesses?.length || 0;
  const cats = data.categoryStats?.length || 0;
  const demandTxt = ds >= 7 ? 'strong' : ds >= 4 ? 'moderate' : 'developing';
  const compTxt = cs >= 7 ? 'highly competitive' : cs >= 4 ? 'moderately competitive' : 'relatively open';
  const oppTxt = os >= 7.5 ? 'presents a strong entrepreneurial opportunity'
    : os >= 5.5 ? 'offers viable business opportunities for well-positioned entrants'
    : os >= 3.5 ? 'is competitive but viable for differentiated players'
    : 'poses significant challenges for new entrants';
  return (
    <div style={{ ...card({ padding: '28px 32px', marginBottom: '28px' }) }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: C.primary + '12',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📋</div>
        <div>
          <h3 style={{ fontFamily: "'Manrope', sans-serif", fontSize: '15px', fontWeight: '700',
            color: C.text, margin: 0 }}>Executive Summary</h3>
          <p style={{ fontSize: '12px', color: C.muted, margin: 0 }}>AI-generated market analysis</p>
        </div>
      </div>
      <p style={{ fontSize: '14px', lineHeight: '1.75', color: C.text, margin: 0 }}>
        Our analysis of <strong>{city}</strong> identified <strong>{bCount} businesses</strong> across{' '}
        <strong>{cats} categories</strong>, revealing a <strong>{demandTxt} demand environment</strong> in a{' '}
        <strong>{compTxt} market</strong>. The overall market {oppTxt}.
        {topOpp && (
          <> Our research signals that <strong>{topOpp.category}</strong> represents the highest opportunity
          in this area, with a demand-to-competition gap of <strong>{topOpp.opportunityScore}/100</strong>.
          {data.demandSignals?.offices > 5 && ` The presence of ${data.demandSignals.offices} office and commercial establishments suggests steady weekday foot traffic.`}
          {data.demandSignals?.schools > 3 && ` ${data.demandSignals.schools} educational institutions nearby indicate a younger, active consumer base.`}
          </>
        )}
        {data.aiSuggestions && data.aiSuggestions !== 'Generating AI recommendations...' && data.aiSuggestions !== 'AI suggestions unavailable (no OpenAI key set).' && (
          <span style={{ display: 'block', marginTop: '12px', fontStyle: 'italic', color: C.muted, fontSize: '13px',
            borderLeft: `3px solid ${C.primary}`, paddingLeft: '12px' }}>
            {data.aiSuggestions.split('\n')[0]?.replace(/\*\*/g, '')}
          </span>
        )}
      </p>
    </div>
  );
}

// ── AI Recommendations Panel ──────────────────────────────────────────────────
function AIRecommendations({ aiSuggestions, city }) {
  if (!aiSuggestions || aiSuggestions === 'Generating AI recommendations...'
    || aiSuggestions === 'AI suggestions unavailable (no OpenAI key set).') return null;
  const lines = aiSuggestions.split('\n').filter(l => l.trim());
  const recs = [];
  let cur = null;
  for (const line of lines) {
    if (line.startsWith('**') && line.endsWith('**')) {
      if (cur) recs.push(cur);
      cur = { title: line.replace(/\*\*/g, ''), body: [] };
    } else if (cur) {
      cur.body.push(line.replace(/\*\*/g, '').trim());
    }
  }
  if (cur) recs.push(cur);
  if (!recs.length) return null;
  return (
    <div>
      <SectionDivider title="Advisor Recommendations" subtitle={`Personalised insights for ${city}`} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {recs.map((rec, i) => (
          <div key={i} style={{ ...card({ padding: '20px 24px' }) }}>
            <div style={{ display: 'flex', gap: '14px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px',
                background: C.primary + '12', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                {['📊','🏪','💡','📈','🎯'][i] || '💡'}
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontFamily: "'Manrope', sans-serif", fontSize: '14px', fontWeight: '700',
                  color: C.text, margin: '0 0 8px' }}>{rec.title}</h4>
                {rec.body.filter(l => l).map((line, j) => {
                  const isKey = line.startsWith('Why:') || line.startsWith('Demand') ||
                    line.startsWith('Opportunity:') || line.startsWith('Tip:');
                  const [prefix, ...rest] = isKey ? line.split(':') : [null, line];
                  return (
                    <p key={j} style={{ fontSize: '13px', color: C.muted, margin: '0 0 4px',
                      lineHeight: '1.6' }}>
                      {isKey && <strong style={{ color: C.text }}>{prefix}: </strong>}
                      {isKey ? rest.join(':') : line}
                    </p>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Action Plan Timeline ──────────────────────────────────────────────────────
function ActionPlan() {
  const steps = [
    { week: 'Week 1', title: 'Market Survey', desc: 'Visit 20 target customers, validate demand assumptions', icon: '🔍' },
    { week: 'Week 2', title: 'Location', desc: 'Shortlist 3 locations, negotiate rent and lease terms', icon: '📍' },
    { week: 'Week 3', title: 'Licenses', desc: 'File GST registration, obtain business licence and FSSAI if food', icon: '📄' },
    { week: 'Week 4', title: 'Marketing', desc: 'Create Google Business profile, launch WhatsApp and Instagram', icon: '📣' },
    { week: 'Week 5', title: 'Launch', desc: 'Soft-launch with 50% discount for first 50 customers', icon: '🚀' },
  ];
  return (
    <div>
      <SectionDivider title="90-Day Action Plan" subtitle="Recommended launch roadmap for your area" />
      <div style={{ ...card({ padding: '24px 28px' }) }}>
        <div style={{ position: 'relative', paddingLeft: '40px' }}>
          <div style={{ position: 'absolute', left: '15px', top: '8px', bottom: '8px',
            width: '2px', background: C.border, borderRadius: '1px' }} />
          {steps.map((s, i) => (
            <div key={i} style={{ position: 'relative', marginBottom: i < steps.length - 1 ? '24px' : 0 }}>
              <div style={{ position: 'absolute', left: '-33px', top: '2px',
                width: '20px', height: '20px', borderRadius: '50%',
                background: i === 0 ? C.primary : C.card,
                border: `2px solid ${i === 0 ? C.primary : C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '10px' }}>
                {i === 0 ? '●' : '○'}
              </div>
              <div>
                <span style={tag(i === 0 ? C.primary : C.muted, { marginBottom: '4px', display: 'inline-flex' })}>
                  {s.week}
                </span>
                <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: '14px', fontWeight: '700',
                  color: C.text, marginBottom: '2px' }}>{s.icon} {s.title}</div>
                <div style={{ fontSize: '12px', color: C.muted }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const data = useAnalysis();
  const { user, token } = useAuth();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'categories' | 'research'

  if (!data) return <Layout><PageSkeleton /></Layout>;

  const city = data.location?.displayName?.split(',')[0] || 'your area';
  const cityFull = data.location?.displayName?.split(',').slice(0, 2).join(', ') || '';
  const bCount = data.businesses?.length || 0;
  const cats = data.categoryStats?.length || 0;
  const ds = data.demandScore ?? 5;
  const cs = data.competitionScore ?? 5;
  const os = data.opportunityScore ?? 5;

  const viabilityScore = data.categoryStats?.length
    ? Math.round(
        data.categoryStats.reduce((sum, s) => sum + (100 - s.riskScore) * (s.demandScore / 10), 0) /
        Math.max(data.categoryStats.reduce((sum, s) => sum + (s.demandScore / 10), 0), 0.01)
      )
    : 0;

  const sources = data.dataQuality?.sourceCounts ? Object.keys(data.dataQuality.sourceCounts) : [];
  const sourceLabel = sources.includes('tomtom') && sources.includes('osm') ? 'TomTom + OSM'
    : sources.includes('tomtom') ? 'TomTom' : sources.includes('osm') ? 'OSM Live' : 'Live Data';

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
        body: JSON.stringify({ location: data.location?.displayName,
          displayName: cityFull, data }),
      });
      setSaved(true);
      trackEvent('search_saved', { location: city });
    } catch (_) {}
  };

  const chartBar = {
    labels: data.categoryStats?.map(s => s.category) || [],
    datasets: [{
      label: 'Competition Score',
      data: data.categoryStats?.map(s => parseFloat(s.competitorScore?.toFixed(1) || 0)) || [],
      backgroundColor: data.categoryStats?.map(s => (categoryColors[s.category] || C.primary) + 'b0') || [],
      borderRadius: 6, borderSkipped: false,
    }],
  };
  const chartBarOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false },
      tooltip: { backgroundColor: '#fff', titleColor: C.text, bodyColor: C.muted,
        borderColor: C.border, borderWidth: 1 } },
    scales: {
      x: { ticks: { color: C.muted, font: { size: 10, family: 'Inter' } },
        grid: { color: C.border } },
      y: { beginAtZero: true, ticks: { color: C.muted, font: { size: 10 } },
        grid: { color: C.border } },
    },
  };
  const chartDoughnut = {
    labels: data.categoryStats?.map(s => s.category) || [],
    datasets: [{
      data: data.categoryStats?.map(s => s.count) || [],
      backgroundColor: data.categoryStats?.map(s => categoryColors[s.category] || C.primary) || [],
      borderWidth: 2, borderColor: '#fff', hoverOffset: 6,
    }],
  };
  const chartDoughnutOpts = {
    responsive: true, maintainAspectRatio: false, cutout: '68%',
    plugins: { legend: { position: 'right', labels: { color: C.muted,
      font: { size: 10, family: 'Inter' }, boxWidth: 10 } },
      tooltip: { backgroundColor: '#fff', titleColor: C.text, bodyColor: C.muted,
        borderColor: C.border, borderWidth: 1 } },
  };

  return (
    <Layout>
      <Head>
        <title>Business Analysis — {city} · BizScope AI</title>
        <meta name="description" content={`Market analysis for ${city} — ${bCount} businesses analyzed`} />
      </Head>

      {/* ── Page wrapper ── */}
      <div style={{ background: C.bg, minHeight: '100vh', padding: '0 0 60px' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '0 24px' }}>

          {/* ── HERO HEADER ── */}
          <div style={{ padding: '32px 0 24px', borderBottom: `1px solid ${C.border}`, marginBottom: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <p style={{ fontSize: '13px', color: C.muted, fontWeight: '500', margin: '0 0 4px',
                  fontFamily: "'Inter', sans-serif" }}>{getGreeting()}</p>
                <h1 style={{ fontFamily: "'Manrope', sans-serif", fontSize: '28px', fontWeight: '800',
                  color: C.text, margin: '0 0 6px', letterSpacing: '-0.5px' }}>
                  Business Analysis Report
                </h1>
                <p style={{ fontSize: '14px', color: C.muted, margin: 0 }}>
                  Here&apos;s what we discovered after analyzing{' '}
                  <strong style={{ color: C.text }}>{cityFull || city}</strong> — {bCount} businesses, {cats} categories.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <ExportPDF data={data} onExported={() => trackEvent('pdf_exported', { location: city })} />
                <button onClick={handleShare} style={{ padding: '8px 16px', borderRadius: '8px',
                  border: `1px solid ${C.border}`, background: copied ? C.primary + '10' : C.card,
                  color: copied ? C.primary : C.muted, cursor: 'pointer', fontSize: '13px',
                  fontWeight: '600', transition: 'all 0.15s', fontFamily: "'Inter', sans-serif" }}>
                  {copied ? '✓ Copied' : '↗ Share'}
                </button>
                {user && (
                  <button onClick={saveSearch} disabled={saved} style={{ padding: '8px 16px',
                    borderRadius: '8px', border: `1px solid ${C.border}`,
                    background: saved ? C.success + '10' : C.card,
                    color: saved ? C.success : C.muted, cursor: saved ? 'default' : 'pointer',
                    fontSize: '13px', fontWeight: '600', fontFamily: "'Inter', sans-serif" }}>
                    {saved ? '✓ Saved' : '🔖 Save'}
                  </button>
                )}
                <button onClick={() => router.push('/')} style={{ padding: '8px 16px',
                  borderRadius: '8px', background: C.primary, color: '#fff', border: 'none',
                  cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                  fontFamily: "'Inter', sans-serif" }}>
                  + New Analysis
                </button>
              </div>
            </div>

            {/* Source + status bar */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
              <span style={tag(C.success)}>● Live Data</span>
              <span style={tag(C.muted, {})}>{sourceLabel}</span>
              {data.dataQuality?.hasEstimatedMetrics && (
                <span style={tag(C.warning)}>⚠ Some estimates</span>
              )}
              {data.aiCorrectionNote && (
                <span style={tag(C.primary)}>✏ AI corrected: {data.aiCorrectionNote}</span>
              )}
            </div>

            {/* Warnings */}
            {data.estimatedData && (
              <div style={{ marginTop: '12px', padding: '10px 16px', borderRadius: '8px',
                background: C.warning + '10', border: `1px solid ${C.warning}30`,
                fontSize: '13px', color: C.text, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚠️</span>
                <span>{data.estimatedData}</span>
                <button onClick={() => { sessionStorage.removeItem('analysisData'); router.push('/'); }}
                  style={{ marginLeft: 'auto', padding: '4px 10px', borderRadius: '6px',
                    border: `1px solid ${C.warning}40`, background: 'transparent',
                    color: C.warning, cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                  Retry
                </button>
              </div>
            )}
            {data.partialMatch && (
              <div style={{ marginTop: '8px', padding: '10px 16px', borderRadius: '8px',
                background: C.warning + '10', border: `1px solid ${C.warning}30`,
                fontSize: '13px', color: C.text }}>⚠️ {data.partialMatch}</div>
            )}
          </div>

          {/* ── RECOMMENDED ACTIONS ── */}
          <RecommendedActions />

          {/* ── EXECUTIVE SUMMARY ── */}
          <ExecutiveSummary data={data} />

          {/* ── KPI CARDS ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px',
            marginBottom: '32px' }} className="kpi-grid">
            <KPICard icon="🎯" label="Opportunity Score" value={`${os.toFixed(1)}/10`}
              sub={data.opportunityLabel} color={os >= 7.5 ? C.success : os >= 5 ? C.primary : C.danger}
              onClick={() => {}} />
            <KPICard icon="📈" label="Demand Score" value={`${ds.toFixed(1)}/10`}
              sub={ds >= 7 ? 'Strong' : ds >= 4 ? 'Moderate' : 'Low'} color={C.primary} />
            <KPICard icon="⚔️" label="Competition Level" value={`${cs.toFixed(1)}/10`}
              sub={cs >= 7 ? 'High' : cs >= 4 ? 'Medium' : 'Low'} color={C.danger} />
            <KPICard icon="🏪" label="Businesses Analyzed" value={bCount.toLocaleString()}
              sub={`${cats} categories`} color={C.primary}
              onClick={() => router.push('/competitors')} />
            <KPICard icon="📊" label="Market Viability" value={`${viabilityScore}/100`}
              sub={viabilityScore >= 70 ? 'Excellent' : viabilityScore >= 50 ? 'Good' : viabilityScore >= 30 ? 'Fair' : 'Tough'}
              color={viabilityScore >= 70 ? C.success : viabilityScore >= 50 ? C.primary : C.warning}
              onClick={() => router.push('/insights')} />
            <KPICard icon="🏙️" label="City Tier" value={
              data.cityTier >= 10 ? 'Tier 1' : data.cityTier >= 7 ? 'Tier 2' : 'Tier 3'}
              sub={data.cityTier >= 10 ? 'Metro' : data.cityTier >= 7 ? 'Large City' : 'Small City'}
              color={C.secondary} />
          </div>

          {/* ── DEMAND SIGNALS ── */}
          {data.demandSignals && (
            <div style={{ ...card({ padding: '20px 24px', marginBottom: '32px' }) }}>
              <h3 style={sectionTitle({ marginBottom: '14px' })}>Demand Signals</h3>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                {[
                  { icon: '🏢', label: 'Offices & Finance', val: data.demandSignals.offices, max: 50 },
                  { icon: '🎓', label: 'Schools & Colleges', val: data.demandSignals.schools, max: 30 },
                  { icon: '🏥', label: 'Hospitals & Clinics', val: data.demandSignals.hospitals, max: 20 },
                  { icon: '🏘️', label: 'Residential Density',
                    val: (data.categoryStats?.filter(s => ['Grocery','Pharmacy','Laundry'].includes(s.category)).length || 0) > 0 ? 'High' : 'Low',
                    isText: true },
                ].map((sig, i) => (
                  <div key={i} style={{ flex: 1, minWidth: '120px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '16px' }}>{sig.icon}</span>
                      <span style={label()}>{sig.label}</span>
                    </div>
                    {sig.isText ? (
                      <span style={tag(sig.val === 'High' ? C.success : C.muted)}>{sig.val}</span>
                    ) : (
                      <>
                        <div style={statNum(C.primary, { fontSize: '22px', marginBottom: '4px' })}>{sig.val}</div>
                        <div style={{ height: '3px', background: C.border, borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min((sig.val / sig.max) * 100, 100)}%`,
                            background: C.primary, borderRadius: '2px', transition: 'width 0.6s ease' }} />
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
              {data.opportunityContext && (
                <div style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '8px',
                  background: C.primary + '08', border: `1px solid ${C.primary}15`,
                  fontSize: '13px', color: C.text, lineHeight: '1.6' }}>
                  💡 {data.opportunityContext}
                </div>
              )}
            </div>
          )}

          {/* ── TOP OPPORTUNITIES ── */}
          {data.bestOpportunities?.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <SectionDivider title="Top Business Opportunities"
                subtitle="Ranked by demand-to-competition gap in your area" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}
                className="opp-grid">
                {data.bestOpportunities.slice(0, 3).map((opp, i) => (
                  <OpportunityCard key={i} opp={opp} rank={i}
                    onClick={() => router.push(`/competitors?category=${encodeURIComponent(opp.category)}`)} />
                ))}
              </div>
              {/* Best pick detail */}
              {(() => {
                const top = data.bestOpportunities[0];
                const sig = top.demandSignalBreakdown || {};
                return (
                  <div style={{ ...card({ padding: '20px 24px', marginTop: '16px' }) }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <span style={tag(C.success)}>Why {top.category}?</span>
                    </div>
                    <p style={{ fontSize: '13px', color: C.text, lineHeight: '1.7', margin: 0 }}>
                      <strong>{top.category}</strong> has the highest opportunity score ({top.opportunityScore}/100)
                      because demand signals are{' '}
                      {top.demandScore >= 70 ? 'strong' : top.demandScore >= 40 ? 'moderate' : 'developing'} ({top.demandScore}%)
                      while competition remains{' '}
                      {top.competitionScore <= 30 ? 'very low' : top.competitionScore <= 55 ? 'manageable' : 'moderate'} ({top.competitionScore}%).
                      {top.count <= 3 && ` Only ${top.count} existing ${top.category.toLowerCase()} businesses were found in this area.`}
                      {sig.offices > 5 && ` ${sig.offices} offices provide a reliable weekday customer base.`}
                      {sig.schools > 3 && ` ${sig.schools} nearby schools drive consistent daily footfall.`}
                    </p>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                      {[
                        { icon: '🏢', lbl: 'Offices', val: sig.offices, good: sig.offices > 5 },
                        { icon: '🎓', lbl: 'Schools', val: sig.schools, good: sig.schools > 3 },
                        { icon: '🏥', lbl: 'Hospitals', val: sig.hospitals, good: sig.hospitals > 2 },
                        { icon: '🏙️', lbl: `City Tier ${sig.cityTier >= 10 ? '1' : sig.cityTier >= 7 ? '2' : '3'}`,
                          val: '', good: sig.cityTier >= 7 },
                      ].map((s, i) => (
                        <span key={i} style={tag(s.good ? C.success : C.muted)}>
                          {s.icon} {s.lbl}{s.val ? ` ${s.val}` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── MARKET OVERVIEW CHARTS ── */}
          <div style={{ marginBottom: '32px' }}>
            <SectionDivider title="Market Overview" subtitle="Competition and market share by business category" />
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '16px' }}
              className="chart-grid">
              <div style={{ ...card({ padding: '20px 24px' }) }}>
                <h3 style={sectionTitle()}>Competition by Category</h3>
                <p style={{ fontSize: '12px', color: C.muted, marginBottom: '16px' }}>
                  Higher score = more competition. Lower = better entry window.</p>
                <div style={{ height: '280px' }}>
                  <Bar data={chartBar} options={chartBarOpts} />
                </div>
              </div>
              <div style={{ ...card({ padding: '20px 24px' }) }}>
                <h3 style={sectionTitle()}>Market Distribution</h3>
                <p style={{ fontSize: '12px', color: C.muted, marginBottom: '12px' }}>
                  Business count by category</p>
                <div style={{ height: '260px' }}>
                  <Doughnut data={chartDoughnut} options={chartDoughnutOpts} />
                </div>
              </div>
            </div>
          </div>

          {/* ── TAB NAVIGATION ── */}
          <div style={{ display: 'flex', gap: '0', marginBottom: '24px',
            borderBottom: `2px solid ${C.border}` }}>
            {[
              { key: 'overview', label: 'Category Analysis' },
              { key: 'research', label: 'Deep Research' },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                padding: '10px 20px', background: 'none', border: 'none',
                borderBottom: activeTab === tab.key ? `2px solid ${C.primary}` : '2px solid transparent',
                marginBottom: '-2px', color: activeTab === tab.key ? C.primary : C.muted,
                fontFamily: "'Inter', sans-serif", fontSize: '13px', fontWeight: '600',
                cursor: 'pointer', transition: 'all 0.15s',
              }}>{tab.label}</button>
            ))}
          </div>

          {/* ── CATEGORY ANALYSIS TAB ── */}
          {activeTab === 'overview' && (
            <div style={{ ...card({ marginBottom: '32px', overflow: 'hidden' }) }}>
              <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}` }}>
                <h3 style={sectionTitle()}>All Categories</h3>
                <p style={{ fontSize: '12px', color: C.muted, margin: 0 }}>
                  Click any category to see detailed competitor list</p>
              </div>
              <div>
                {data.categoryStats?.map((s, i) => (
                  <CategoryRow key={i} s={s} total={bCount}
                    onClick={() => router.push(`/competitors?category=${encodeURIComponent(s.category)}`)} />
                ))}
              </div>
              {data.categoryStats?.length === 0 && (
                <div style={{ padding: '40px', textAlign: 'center', color: C.muted }}>
                  No category data available
                </div>
              )}
            </div>
          )}

          {/* ── DEEP RESEARCH TAB ── */}
          {activeTab === 'research' && (
            <div style={{ marginBottom: '32px' }}>
              {data.bestOpportunities?.map((opp, i) => (
                <div key={i} style={{ ...card({ padding: '20px 24px', marginBottom: '12px' }) }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                    marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '22px' }}>{categoryIcons[opp.category] || '🏪'}</span>
                      <div>
                        <h4 style={{ fontFamily: "'Manrope', sans-serif", fontSize: '15px', fontWeight: '700',
                          color: C.text, margin: 0 }}>{opp.category}</h4>
                        <p style={{ fontSize: '12px', color: C.muted, margin: 0 }}>
                          {opp.count} existing businesses · {opp.riskLevel} risk</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={tag(C.primary)}>Demand {opp.demandScore}%</span>
                      <span style={tag(C.danger)}>Competition {opp.competitionScore}%</span>
                      <span style={tag(C.success, { fontWeight: '700' })}>
                        Opportunity {opp.opportunityScore}/100
                      </span>
                    </div>
                  </div>
                  <div style={{ height: '6px', background: C.border, borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${opp.opportunityScore}%`,
                      background: `linear-gradient(90deg, ${C.success}, ${C.primary})`,
                      borderRadius: '3px', transition: 'width 0.6s ease' }} />
                  </div>
                  <button onClick={() => router.push(`/competitors?category=${encodeURIComponent(opp.category)}`)}
                    style={{ marginTop: '12px', padding: '7px 14px', borderRadius: '7px',
                      border: `1px solid ${C.border}`, background: 'transparent', color: C.primary,
                      cursor: 'pointer', fontSize: '12px', fontWeight: '600',
                      fontFamily: "'Inter', sans-serif" }}>
                    View competitors →
                  </button>
                </div>
              ))}
              {!data.bestOpportunities?.length && (
                <div style={{ ...card({ padding: '40px', textAlign: 'center' }), color: C.muted }}>
                  No opportunity data available
                </div>
              )}
            </div>
          )}

          {/* ── AI RECOMMENDATIONS ── */}
          <AIRecommendations aiSuggestions={data.aiSuggestions} city={city} />

          {/* ── ACTION PLAN ── */}
          <ActionPlan />

          {/* ── FOOTER DATA LINE ── */}
          <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: `1px solid ${C.border}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              {[
                { lbl: 'Data Confidence', val: data.dataQuality?.usesMockData ? 'Estimated' : 'High' },
                { lbl: 'Sources Analyzed', val: Object.keys(data.dataQuality?.sourceCounts || {}).join(', ') || 'OSM' },
                { lbl: 'Businesses Scanned', val: bCount },
              ].map((item, i) => (
                <div key={i}>
                  <div style={label()}>{item.lbl}</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: C.text }}>{item.val}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <ExportPDF data={data} onExported={() => trackEvent('pdf_exported', { location: city })} />
              <button onClick={handleShare} style={{ padding: '7px 14px', borderRadius: '7px',
                border: `1px solid ${C.border}`, background: C.card, color: C.muted,
                cursor: 'pointer', fontSize: '12px', fontWeight: '600',
                fontFamily: "'Inter', sans-serif" }}>
                ↗ Share Report
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ── AI Chat ── */}
      <MarketChat data={{ ...data, viabilityScore }} />

      <style>{`
        .kpi-grid { grid-template-columns: repeat(3, 1fr) !important; }
        .opp-grid { grid-template-columns: repeat(3, 1fr) !important; }
        .chart-grid { grid-template-columns: 1.6fr 1fr !important; }
        @media (max-width: 1024px) {
          .kpi-grid   { grid-template-columns: repeat(2, 1fr) !important; }
          .opp-grid   { grid-template-columns: repeat(2, 1fr) !important; }
          .chart-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .kpi-grid   { grid-template-columns: 1fr 1fr !important; }
          .opp-grid   { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </Layout>
  );
}
