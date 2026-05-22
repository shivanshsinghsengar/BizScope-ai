import Head from 'next/head';
import { useState } from 'react';
import API_URL from '../utils/api';
import Layout from '../components/Layout';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const BUSINESS_TYPES = [
  'Restaurant', 'Cafe', 'Grocery', 'Gym', 'Salon', 'Pharmacy', 'Bakery',
  'Laundry', 'Clothing', 'Electronics', 'Hardware', 'Furniture',
  'Education / Coaching', 'Jewellery', 'Automotive', 'Finance / CA',
  'Hotel / Guesthouse', 'Retail Shop', 'Tiffin Service', 'Cloud Kitchen',
  'SaaS / Tech Product', 'Freelance Service', 'Other',
];

const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata',
  'Ahmedabad', 'Jaipur', 'Surat', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore',
  'Bhopal', 'Visakhapatnam', 'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana',
  'Agra', 'Nashik', 'Faridabad', 'Meerut', 'Rajkot', 'Varanasi', 'Srinagar',
  'Aurangabad', 'Dhanbad', 'Amritsar', 'Allahabad', 'Ranchi', 'Howrah',
  'Coimbatore', 'Jabalpur', 'Gwalior', 'Vijayawada', 'Jodhpur', 'Madurai',
  'Raipur', 'Kota', 'Chandigarh', 'Guwahati', 'Solapur', 'Hubli', 'Mysore',
  'Tiruchirappalli', 'Bareilly', 'Aligarh', 'Moradabad', 'Other',
];

const INVESTMENT_RANGES = [
  { label: 'Under ₹50,000', value: '50000' },
  { label: '₹50,000 – ₹1 Lakh', value: '100000' },
  { label: '₹1 – ₹2 Lakh', value: '200000' },
  { label: '₹2 – ₹5 Lakh', value: '500000' },
  { label: '₹5 – ₹10 Lakh', value: '1000000' },
  { label: '₹10 – ₹25 Lakh', value: '2500000' },
  { label: '₹25 – ₹50 Lakh', value: '5000000' },
  { label: '₹50 Lakh – ₹1 Crore', value: '10000000' },
  { label: 'Above ₹1 Crore', value: '15000000' },
];

const fmt = (n) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
};

export default function RevenueCalculator() {
  const [form, setForm] = useState({
    businessType: '',
    city: '',
    investment: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.businessType || !form.city || !form.investment) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/api/revenue-estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`Backend unavailable (status ${res.status}). Make sure the server is running on port 5000.`);
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Calculation failed. Please try again.');
    }
    setLoading(false);
  };

  // Build 12-month revenue chart data
  const chartData = result
    ? (() => {
        const months = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12'];
        const ramp = result.monthlyRevenue;
        const revenueData = months.map((_, i) => {
          const factor = Math.min(1, 0.3 + (i / 11) * 0.7);
          return Math.round(ramp * factor);
        });
        const costData = months.map(() => result.monthlyExpenses);
        const profitData = revenueData.map((r, i) => r - costData[i]);

        return {
          labels: months,
          datasets: [
            {
              label: 'Revenue',
              data: revenueData,
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59,130,246,0.1)',
              fill: true,
              tension: 0.4,
              borderWidth: 2.5,
              pointRadius: 4,
            },
            {
              label: 'Expenses',
              data: costData,
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239,68,68,0.05)',
              fill: false,
              tension: 0.4,
              borderWidth: 2,
              borderDash: [5, 5],
              pointRadius: 3,
            },
            {
              label: 'Profit',
              data: profitData,
              borderColor: '#22c55e',
              backgroundColor: 'rgba(34,197,94,0.08)',
              fill: true,
              tension: 0.4,
              borderWidth: 2.5,
              pointRadius: 4,
            },
          ],
        };
      })()
    : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#94a3b8', font: { size: 12 }, boxWidth: 12 },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        borderWidth: 1,
        titleColor: '#e2e8f0',
        bodyColor: '#94a3b8',
        padding: 12,
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ${fmt(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: { ticks: { color: '#475569' }, grid: { color: '#1e293b' } },
      y: {
        beginAtZero: true,
        ticks: { color: '#475569', callback: (v) => fmt(v) },
        grid: { color: '#1e293b' },
      },
    },
  };

  return (
    <Layout>
      <Head>
        <title>Revenue Calculator — BizScope AI</title>
        <meta name="description" content="Calculate realistic monthly revenue, break-even point, and ROI timeline for your business idea." />
      </Head>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text)', marginBottom: '8px' }}>
            💰 Revenue Calculator
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '15px' }}>
            Enter your business type, city, and investment — get realistic monthly revenue, break-even point, and ROI timeline.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '24px', padding: '28px', marginBottom: '28px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #22c55e, #3b82f6, #8b5cf6)' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                  🏪 Business Type *
                </label>
                <select
                  value={form.businessType}
                  onChange={e => setForm(f => ({ ...f, businessType: e.target.value }))}
                  required
                  className="input-field"
                  style={{ width: '100%' }}
                >
                  <option value="">Select type...</option>
                  {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                  📍 City *
                </label>
                <select
                  value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  required
                  className="input-field"
                  style={{ width: '100%' }}
                >
                  <option value="">Select city...</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                  💵 Investment Amount *
                </label>
                <select
                  value={form.investment}
                  onChange={e => setForm(f => ({ ...f, investment: e.target.value }))}
                  required
                  className="input-field"
                  style={{ width: '100%' }}
                >
                  <option value="">Select range...</option>
                  {INVESTMENT_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !form.businessType || !form.city || !form.investment}
              style={{
                width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
                background: loading ? '#1e293b' : 'linear-gradient(135deg, #22c55e, #16a34a)',
                color: loading ? '#475569' : 'white', fontWeight: '700', fontSize: '15px',
                cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(34,197,94,0.3)',
              }}
            >
              {loading ? '⏳ Calculating...' : '📊 Calculate Revenue'}
            </button>

            {error && (
              <div style={{ marginTop: '16px', padding: '12px 16px', background: '#ef444415', border: '1px solid #ef444440', borderRadius: '12px', color: '#f87171', fontSize: '13px' }}>
                ⚠️ {error}
              </div>
            )}
          </div>
        </form>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>📊</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text)', marginBottom: '8px' }}>Crunching the numbers...</div>
            <div style={{ fontSize: '14px', color: 'var(--muted)' }}>Analyzing market data for {form.businessType} in {form.city}</div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div>
            {/* Key metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
              {[
                { icon: '💰', label: 'Monthly Revenue', value: fmt(result.monthlyRevenue), sub: 'at full capacity', color: '#3b82f6' },
                { icon: '📉', label: 'Monthly Expenses', value: fmt(result.monthlyExpenses), sub: 'estimated costs', color: '#ef4444' },
                { icon: '✅', label: 'Monthly Profit', value: fmt(result.monthlyProfit), sub: `${result.profitMargin}% margin`, color: result.monthlyProfit > 0 ? '#22c55e' : '#ef4444' },
                { icon: '⏱️', label: 'Break-even', value: result.breakEvenMonths + ' months', sub: 'to recover investment', color: '#f59e0b' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--surface)', border: `1px solid ${s.color}25`, borderRadius: '20px', padding: '22px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${s.color}, transparent)` }} />
                  <div style={{ fontSize: '26px', marginBottom: '10px' }}>{s.icon}</div>
                  <div style={{ fontSize: '26px', fontWeight: '800', color: s.color, lineHeight: 1, marginBottom: '4px' }}>{s.value}</div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text)', marginBottom: '2px' }}>{s.label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* ROI Timeline */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '24px', padding: '28px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #22c55e, #3b82f6)' }} />
              <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', marginBottom: '4px' }}>📈 12-Month Revenue Projection</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '20px' }}>
                Ramp-up curve from launch to full capacity — revenue, expenses, and profit
              </div>
              <div style={{ height: '300px' }}>
                <Line data={chartData} options={chartOptions} />
              </div>
            </div>

            {/* ROI milestones */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              {/* ROI Timeline */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '24px', padding: '24px' }}>
                <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', marginBottom: '16px' }}>🗓️ ROI Timeline</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {result.roiTimeline && result.roiTimeline.map((milestone, i) => (
                    <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px 14px', background: 'var(--surface2)', borderRadius: '12px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#3b82f620', border: '1px solid #3b82f640', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800', color: '#3b82f6', flexShrink: 0 }}>
                        {milestone.month}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)', marginBottom: '2px' }}>{milestone.label}</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{milestone.desc}</div>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#3b82f6', flexShrink: 0 }}>{fmt(milestone.cumulative)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cost breakdown */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '24px', padding: '24px' }}>
                <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', marginBottom: '16px' }}>💸 Monthly Cost Breakdown</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {result.costBreakdown && result.costBreakdown.map((item, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text2)' }}>{item.label}</span>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>{fmt(item.amount)}</span>
                      </div>
                      <div style={{ height: '5px', background: 'var(--surface2)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: '3px',
                          background: `hsl(${200 + i * 30}, 70%, 55%)`,
                          width: `${(item.amount / result.monthlyExpenses) * 100}%`,
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '16px', padding: '10px 14px', background: 'var(--surface2)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>Total Monthly Expenses</span>
                  <span style={{ fontSize: '15px', fontWeight: '800', color: '#ef4444' }}>{fmt(result.monthlyExpenses)}</span>
                </div>
              </div>
            </div>

            {/* Assumptions */}
            {result.assumptions && (
              <div style={{ background: 'var(--surface)', border: '1px solid #f59e0b30', borderRadius: '20px', padding: '24px', marginBottom: '24px' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)', marginBottom: '12px' }}>📋 Key Assumptions</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {result.assumptions.map((a, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12px', color: 'var(--muted)', padding: '8px 12px', background: 'var(--surface2)', borderRadius: '8px' }}>
                      <span style={{ color: '#f59e0b', flexShrink: 0 }}>•</span>
                      <span>{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div style={{ padding: '14px 18px', background: 'var(--surface2)', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--muted)', lineHeight: '1.7' }}>
              ⚠️ <strong style={{ color: 'var(--text)' }}>Disclaimer:</strong> These are estimates based on industry benchmarks and city-tier data. Actual results depend on execution, location, competition, and market conditions. Use this as a planning guide, not a guarantee.
            </div>

            {/* Try another */}
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <button
                onClick={() => { setResult(null); setForm({ businessType: '', city: '', investment: '' }); }}
                style={{ padding: '12px 28px', borderRadius: '12px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}
              >
                🔄 Calculate Another
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
