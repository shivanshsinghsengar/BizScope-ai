import Head from 'next/head';
import { useState } from 'react';
import API_URL from '../utils/api';
import Layout from '../components/Layout';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

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
  'Tiruchirappalli', 'Bareilly', 'Aligarh', 'Moradabad',
];

const CITY_COLORS = ['#3b82f6', '#f59e0b', '#22c55e', '#ec4899'];

const METRICS = [
  { key: 'competitionLevel', label: 'Competition Level', icon: '⚔️', desc: 'Lower = better opportunity', invertColor: true },
  { key: 'marketSize', label: 'Market Size', icon: '🌍', desc: 'Relative market demand score', invertColor: false },
  { key: 'propertyCost', label: 'Property Cost', icon: '🏠', desc: 'Relative rental cost index', invertColor: true },
  { key: 'demandScore', label: 'Demand Score', icon: '📈', desc: 'Consumer demand strength', invertColor: false },
  { key: 'profitPotential', label: 'Profit Potential', icon: '💰', desc: 'Expected profitability score', invertColor: false },
  { key: 'easeOfEntry', label: 'Ease of Entry', icon: '🚀', desc: 'How easy to start here', invertColor: false },
];

const getScoreColor = (score, invertColor) => {
  const effective = invertColor ? 10 - score : score;
  if (effective >= 7) return '#22c55e';
  if (effective >= 5) return '#f59e0b';
  return '#ef4444';
};

const getWinner = (results, key, invertColor) => {
  if (!results || results.length === 0) return null;
  return results.reduce((best, r) =>
    invertColor
      ? (r.scores[key] < best.scores[key] ? r : best)
      : (r.scores[key] > best.scores[key] ? r : best)
  );
};

export default function Compare() {
  const [businessType, setBusinessType] = useState('');
  const [cities, setCities] = useState(['', '', '']);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const addCity = () => {
    if (cities.length < 4) setCities([...cities, '']);
  };

  const removeCity = (i) => {
    if (cities.length <= 2) return;
    setCities(cities.filter((_, idx) => idx !== i));
  };

  const updateCity = (i, val) => {
    const updated = [...cities];
    updated[i] = val;
    setCities(updated);
  };

  const handleCompare = async (e) => {
    e.preventDefault();
    const validCities = cities.filter(c => c.trim());
    if (!businessType || validCities.length < 2) return;
    setLoading(true);
    setError('');
    setResults(null);
    try {
      const res = await fetch(`${API_URL}/api/compare-cities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessType, cities: validCities }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`Backend unavailable (status ${res.status}). Make sure the server is running on port 5000.`);
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResults(data.results);
    } catch (err) {
      setError(err.message || 'Comparison failed. Please try again.');
    }
    setLoading(false);
  };

  // Build bar chart for a metric
  const buildChart = (metricKey) => {
    if (!results) return null;
    return {
      labels: results.map(r => r.city),
      datasets: [{
        label: metricKey,
        data: results.map(r => r.scores[metricKey] || 0),
        backgroundColor: results.map((_, i) => CITY_COLORS[i % CITY_COLORS.length] + 'cc'),
        borderRadius: 8,
        borderSkipped: false,
      }],
    };
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        borderWidth: 1,
        titleColor: '#e2e8f0',
        bodyColor: '#94a3b8',
        padding: 10,
      },
    },
    scales: {
      x: { ticks: { color: '#475569', font: { size: 12 } }, grid: { display: false } },
      y: { beginAtZero: true, max: 10, ticks: { color: '#475569' }, grid: { color: '#1e293b' } },
    },
  };

  // Find overall best city
  const overallBest = results
    ? results.reduce((best, r) => {
        const score = METRICS.reduce((s, m) => s + (m.invertColor ? 10 - r.scores[m.key] : r.scores[m.key]), 0);
        const bestScore = METRICS.reduce((s, m) => s + (m.invertColor ? 10 - best.scores[m.key] : best.scores[m.key]), 0);
        return score > bestScore ? r : best;
      })
    : null;

  return (
    <Layout>
      <Head>
        <title>Compare Cities — BizScope AI</title>
        <meta name="description" content="Compare 2-4 cities side by side for any business type. See competition level, market size, property cost, and demand score." />
      </Head>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text)', marginBottom: '8px' }}>
            🏙️ Location Comparison Tool
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '15px' }}>
            Compare 2–4 cities side by side for any business type. See competition, market size, property cost, and demand score.
          </p>
        </div>

        {/* Example */}
        <div style={{ background: 'linear-gradient(135deg, #3b82f615, #8b5cf610)', border: '1px solid #3b82f630', borderRadius: '16px', padding: '14px 20px', marginBottom: '24px', fontSize: '13px', color: 'var(--muted)' }}>
          💡 Example: <span style={{ color: '#60a5fa', fontWeight: '600' }}>Mumbai vs Pune vs Bangalore</span> for opening a <span style={{ color: '#60a5fa', fontWeight: '600' }}>Gym</span> — see which city has the best opportunity.
        </div>

        {/* Form */}
        <form onSubmit={handleCompare}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '24px', padding: '28px', marginBottom: '28px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #3b82f6, #f59e0b, #22c55e, #ec4899)' }} />

            {/* Business type */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                🏪 Business Type *
              </label>
              <select
                value={businessType}
                onChange={e => setBusinessType(e.target.value)}
                required
                className="input-field"
                style={{ maxWidth: '360px', width: '100%' }}
              >
                <option value="">Select business type...</option>
                {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Cities */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                📍 Cities to Compare (2–4) *
              </label>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                {cities.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: CITY_COLORS[i % CITY_COLORS.length], flexShrink: 0 }} />
                    <select
                      value={c}
                      onChange={e => updateCity(i, e.target.value)}
                      className="input-field"
                      style={{ width: '160px' }}
                    >
                      <option value="">City {i + 1}...</option>
                      {CITIES.map(city => <option key={city} value={city}>{city}</option>)}
                    </select>
                    {cities.length > 2 && (
                      <button type="button" onClick={() => removeCity(i)}
                        style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid #ef444440', background: 'transparent', color: '#f87171', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {cities.length < 4 && (
                  <button type="button" onClick={addCity}
                    style={{ padding: '8px 16px', borderRadius: '10px', border: '1px dashed #3b82f640', background: 'transparent', color: '#60a5fa', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                    + Add City
                  </button>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !businessType || cities.filter(c => c.trim()).length < 2}
              style={{
                width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
                background: loading ? '#1e293b' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                color: loading ? '#475569' : 'white', fontWeight: '700', fontSize: '15px',
                cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(59,130,246,0.35)',
              }}
            >
              {loading ? '⏳ Comparing cities...' : '🏙️ Compare Cities'}
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
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>🏙️</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text)', marginBottom: '8px' }}>Comparing cities...</div>
            <div style={{ fontSize: '14px', color: 'var(--muted)' }}>Analyzing market data for {cities.filter(c => c).join(', ')}</div>
          </div>
        )}

        {/* Results */}
        {results && (
          <div>
            {/* Winner banner */}
            {overallBest && (
              <div style={{ background: 'linear-gradient(135deg, #22c55e15, #3b82f610)', border: '1px solid #22c55e40', borderRadius: '20px', padding: '20px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '48px' }}>🏆</div>
                <div>
                  <div style={{ fontSize: '13px', color: '#22c55e', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Best City for {businessType}</div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text)' }}>{overallBest.city}</div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>{overallBest.summary}</div>
                </div>
              </div>
            )}

            {/* Side-by-side score table */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '24px', padding: '28px', marginBottom: '24px', overflowX: 'auto', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #3b82f6, #f59e0b, #22c55e, #ec4899)' }} />
              <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', marginBottom: '20px' }}>📊 Side-by-Side Comparison</div>

              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: '12px', color: 'var(--muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid var(--border)' }}>
                      Metric
                    </th>
                    {results.map((r, i) => (
                      <th key={r.city} style={{ textAlign: 'center', padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: CITY_COLORS[i % CITY_COLORS.length] }} />
                          <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)' }}>{r.city}</span>
                          {overallBest?.city === r.city && <span style={{ fontSize: '14px' }}>🏆</span>}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {METRICS.map((metric, mi) => {
                    const winner = getWinner(results, metric.key, metric.invertColor);
                    return (
                      <tr key={metric.key} style={{ borderBottom: mi < METRICS.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <td style={{ padding: '14px', fontSize: '13px', color: 'var(--text2)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '16px' }}>{metric.icon}</span>
                            <div>
                              <div style={{ fontWeight: '600' }}>{metric.label}</div>
                              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{metric.desc}</div>
                            </div>
                          </div>
                        </td>
                        {results.map((r, i) => {
                          const score = r.scores[metric.key] || 0;
                          const color = getScoreColor(score, metric.invertColor);
                          const isWinner = winner?.city === r.city;
                          return (
                            <td key={r.city} style={{ padding: '14px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                <div style={{ fontSize: '20px', fontWeight: '800', color, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  {score}/10
                                  {isWinner && <span style={{ fontSize: '14px' }}>✓</span>}
                                </div>
                                <div style={{ width: '60px', height: '5px', background: 'var(--surface2)', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', borderRadius: '3px', background: color, width: `${score * 10}%` }} />
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bar charts for each metric */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
              {METRICS.map(metric => (
                <div key={metric.key} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', marginBottom: '4px' }}>
                    {metric.icon} {metric.label}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '14px' }}>{metric.desc}</div>
                  <div style={{ height: '140px' }}>
                    <Bar data={buildChart(metric.key)} options={barOptions} />
                  </div>
                </div>
              ))}
            </div>

            {/* City summaries */}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${results.length}, 1fr)`, gap: '16px', marginBottom: '24px' }}>
              {results.map((r, i) => (
                <div key={r.city} style={{ background: 'var(--surface)', border: `1px solid ${CITY_COLORS[i % CITY_COLORS.length]}30`, borderRadius: '20px', padding: '22px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: CITY_COLORS[i % CITY_COLORS.length] }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: CITY_COLORS[i % CITY_COLORS.length] }} />
                    <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text)' }}>{r.city}</div>
                    {overallBest?.city === r.city && <span style={{ fontSize: '16px' }}>🏆</span>}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.6', marginBottom: '12px' }}>{r.summary}</div>
                  {r.pros && r.pros.length > 0 && (
                    <div style={{ marginBottom: '8px' }}>
                      {r.pros.map((p, pi) => (
                        <div key={pi} style={{ fontSize: '12px', color: '#4ade80', marginBottom: '3px' }}>✅ {p}</div>
                      ))}
                    </div>
                  )}
                  {r.cons && r.cons.length > 0 && (
                    <div>
                      {r.cons.map((c, ci) => (
                        <div key={ci} style={{ fontSize: '12px', color: '#f87171', marginBottom: '3px' }}>⚠️ {c}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Try another */}
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => { setResults(null); setBusinessType(''); setCities(['', '', '']); }}
                style={{ padding: '12px 28px', borderRadius: '12px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}
              >
                🔄 Compare Again
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
