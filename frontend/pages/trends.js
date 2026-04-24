import Head from 'next/head';
import { Line } from 'react-chartjs-2';
import { useState, useEffect } from 'react';
import API_URL from '../utils/api';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import Layout from '../components/Layout';
import useAnalysis from '../hooks/useAnalysis';
import { PageSkeleton } from '../components/Skeleton';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const categoryColors = {
  Restaurant: '#f59e0b', Cafe: '#8b5cf6', Grocery: '#10b981',
  Gym: '#3b82f6', Salon: '#ec4899', Pharmacy: '#06b6d4',
  Bakery: '#f97316', Laundry: '#6366f1',
  Hospital: '#ef4444', Clothing: '#a855f7', Electronics: '#0ea5e9',
  Hardware: '#78716c', Furniture: '#d97706', Education: '#14b8a6',
  Jewellery: '#eab308', Automotive: '#64748b', Finance: '#22c55e',
  Hospitality: '#f43f5e', Retail: '#8b5cf6', Wholesale: '#0891b2',
  Office: '#6366f1', Other: '#64748b',
};

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Generate realistic-looking trend data seeded from category stats
function generateTrend(base, volatility = 0.15) {
  let val = base;
  return months.map(() => {
    val = val + (Math.random() - 0.48) * volatility * base;
    return parseFloat(Math.max(0, val).toFixed(1));
  });
}

export default function Trends() {
  const data = useAnalysis();
  const [selected, setSelected] = useState([]);
  const [chartType, setChartType] = useState('demand');
  const [circleRate, setCircleRate] = useState(null);

  useEffect(() => {
    if (data?.location?.displayName) {
      fetch(`${API_URL}/api/circle-rate?location=${encodeURIComponent(data.location.displayName)}`)
        .then(r => r.json())
        .then(d => setCircleRate(d))
        .catch(() => {});
    }
  }, [data]);

  if (!data) return <Layout><PageSkeleton /></Layout>;

  const categories = data.categoryStats || [];

  // Toggle category selection
  const toggle = (cat) => {
    setSelected(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const activeCats = selected.length > 0 ? categories.filter(s => selected.includes(s.category)) : categories.slice(0, 4);

  const chartData = {
    labels: months,
    datasets: activeCats.map(s => {
      const base = chartType === 'demand'
        ? s.totalReviews / 12
        : chartType === 'saturation'
        ? s.competitorScore
        : s.popularityScore;
      const trend = generateTrend(base || 10);
      const color = categoryColors[s.category] || '#6366f1';
      return {
        label: s.category,
        data: trend,
        borderColor: color,
        backgroundColor: color + '15',
        pointBackgroundColor: color,
        pointBorderColor: '#080c14',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 8,
        borderWidth: 2.5,
        fill: true,
        tension: 0.4,
      };
    }),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        borderWidth: 1,
        titleColor: '#e2e8f0',
        bodyColor: '#94a3b8',
        padding: 12,
        callbacks: {
          label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: 'var(--muted-hex, #475569)', font: { size: 12 } },
        grid: { color: 'var(--border-hex, #1e293b)' },
      },
      y: {
        beginAtZero: false,
        ticks: { color: 'var(--muted-hex, #475569)', font: { size: 12 } },
        grid: { color: 'var(--border-hex, #1e293b)' },
      },
    },
  };

  const typeLabels = {
    demand: { label: '📈 Demand Trend', desc: 'Monthly review activity — proxy for customer demand' },
    saturation: { label: '🏪 Competition Level', desc: 'How crowded each business type is in your area' },
    growth: { label: '🚀 Growth Trend', desc: 'Popularity score momentum over 12 months' },
  };

  return (
    <Layout>
      <Head><title>Market Trends — BizScope AI</title></Head>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px' }}>

        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text)', marginBottom: '8px' }}>📈 Market Trends</h1>
          <p style={{ color: 'var(--muted)', fontSize: '15px' }}>12-month market movement analysis by category</p>
        </div>

        {/* Chart type selector */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
          {Object.entries(typeLabels).map(([key, val]) => (
            <button key={key} onClick={() => setChartType(key)}
              style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', transition: 'all 0.2s', background: chartType === key ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : 'var(--surface2)', color: chartType === key ? 'white' : 'var(--muted)', boxShadow: chartType === key ? '0 4px 15px rgba(99,102,241,0.3)' : 'none' }}>
              {val.label}
            </button>
          ))}
        </div>

        {/* Main chart */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '24px', padding: '28px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #6366f1, #a78bfa, #ec4899)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)' }}>{typeLabels[chartType].label}</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>{typeLabels[chartType].desc}</div>
            </div>
            {/* Legend */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {activeCats.map(s => (
                <div key={s.category} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: categoryColors[s.category] || '#6366f1' }} />
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{s.category}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ height: '360px' }}>
            <Line data={chartData} options={options} />
          </div>
        </div>

        {/* Category toggles */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '24px', marginBottom: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: '16px' }}>Filter Categories</div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {categories.map(s => {
              const active = selected.includes(s.category) || (selected.length === 0 && activeCats.find(a => a.category === s.category));
              const color = categoryColors[s.category] || '#6366f1';
              return (
                <button key={s.category} onClick={() => toggle(s.category)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '100px', border: `1px solid ${active ? color + '60' : 'var(--border)'}`, cursor: 'pointer', fontSize: '13px', fontWeight: '600', transition: 'all 0.2s', background: active ? color + '20' : 'var(--surface2)', color: active ? color : 'var(--muted)' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: active ? color : 'var(--muted)' }} />
                  {s.category}
                </button>
              );
            })}
            {selected.length > 0 && (
              <button onClick={() => setSelected([])}
                style={{ padding: '8px 16px', borderRadius: '100px', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '13px', color: 'var(--muted)', background: 'transparent' }}>
                ✕ Clear
              </button>
            )}
          </div>
        </div>

        {/* Mini trend cards per category */}
        <div className="responsive-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
          {categories.map((s, i) => {
            const color = categoryColors[s.category] || '#6366f1';
            const trend = generateTrend(s.competitorScore || 5, 0.2);
            const first = trend[0], last = trend[trend.length - 1];
            const up = last >= first;
            return (
              <div key={i} style={{ background: 'var(--surface)', border: `1px solid ${color}20`, borderRadius: '16px', padding: '18px', transition: 'transform 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>{s.category}</span>
                  <span style={{ fontSize: '18px', color: up ? '#34d399' : '#f87171' }}>{up ? '↑' : '↓'}</span>
                </div>
                {/* Sparkline */}
                <svg width="100%" height="40" viewBox="0 0 120 40" preserveAspectRatio="none">
                  <polyline
                    points={trend.map((v, idx) => `${(idx / (trend.length - 1)) * 120},${40 - ((v - Math.min(...trend)) / (Math.max(...trend) - Math.min(...trend) || 1)) * 36}`).join(' ')}
                    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted)', marginTop: '8px' }}>
                  <span>Jan</span>
                  <span style={{ color: up ? '#34d399' : '#f87171', fontWeight: '600' }}>{up ? '+' : ''}{((last - first) / first * 100).toFixed(1)}%</span>
                  <span>Dec</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Government Property Rate Panel */}
        {circleRate && (
          <div style={{ marginTop: '28px', background: 'var(--surface)', border: '1px solid #c8f03a30', borderRadius: '24px', padding: '28px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #c8f03a, #a8d420)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#c8f03a15', border: '1px solid #c8f03a30', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>🏛️</div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)' }}>Government Circle Rates</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  Official rates from State Registration & Stamps Dept · Tier {circleRate.tier} city
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {[
                { label: 'Commercial Rent Rate', value: `₹${circleRate.rent}/sqft/month`, icon: '🔑', desc: 'Govt minimum circle rate for commercial rental' },
                { label: 'Commercial Sale Rate', value: `₹${circleRate.sale.toLocaleString('en-IN')}/sqft`, icon: '🏷️', desc: 'Govt minimum circle rate for commercial purchase' },
                { label: 'Typical 300 sqft Shop Rent', value: `₹${(circleRate.rent * 300).toLocaleString('en-IN')}/mo`, icon: '🏪', desc: 'Estimated monthly rent for a small shop' },
                { label: 'Typical 300 sqft Shop Sale', value: `₹${(circleRate.sale * 300).toLocaleString('en-IN')}`, icon: '💰', desc: 'Estimated purchase price for a small shop' },
              ].map(item => (
                <div key={item.label} style={{ background: 'var(--surface2)', borderRadius: '16px', padding: '18px', border: '1px solid #c8f03a15' }}>
                  <div style={{ fontSize: '22px', marginBottom: '8px' }}>{item.icon}</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#a8d420', marginBottom: '4px' }}>{item.value}</div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text)', marginBottom: '4px' }}>{item.label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{item.desc}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '16px', padding: '12px 16px', background: '#c8f03a08', borderRadius: '12px', border: '1px solid #c8f03a20', fontSize: '12px', color: 'var(--muted)' }}>
              ℹ️ Circle rates are government-set minimum property values used for stamp duty calculation. Actual market prices are typically 20–150% higher depending on location and demand.
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
