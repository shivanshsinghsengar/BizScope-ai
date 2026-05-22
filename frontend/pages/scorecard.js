import Head from 'next/head';
import { useState } from 'react';
import API_URL from '../utils/api';
import Layout from '../components/Layout';
import {
  Chart as ChartJS, RadialLinearScale, PointElement, LineElement,
  Filler, Tooltip, Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const DIMENSIONS = [
  { key: 'marketSize',    label: 'Market Size',      icon: '🌍', desc: 'How large is the addressable market?' },
  { key: 'competition',   label: 'Competition',       icon: '⚔️', desc: 'How crowded is this space? (lower = better)' },
  { key: 'profitability', label: 'Profitability',     icon: '💰', desc: 'Expected profit margins' },
  { key: 'easeOfStart',   label: 'Ease of Start',     icon: '🚀', desc: 'How easy is it to launch?' },
  { key: 'trend',         label: 'Trend',             icon: '📈', desc: 'Is this market growing?' },
];

const SCORE_LABELS = {
  1: 'Very Poor', 2: 'Poor', 3: 'Below Average', 4: 'Fair', 5: 'Average',
  6: 'Good', 7: 'Very Good', 8: 'Great', 9: 'Excellent', 10: 'Outstanding',
};

const getColor = (score) => {
  if (score >= 8) return '#22c55e';
  if (score >= 6) return '#3b82f6';
  if (score >= 4) return '#f59e0b';
  return '#ef4444';
};

const getVerdict = (avg) => {
  if (avg >= 8) return { label: 'Strong Opportunity', color: '#22c55e', emoji: '🚀' };
  if (avg >= 6.5) return { label: 'Good Potential', color: '#3b82f6', emoji: '✅' };
  if (avg >= 5) return { label: 'Moderate Viability', color: '#f59e0b', emoji: '⚠️' };
  return { label: 'High Risk', color: '#ef4444', emoji: '🔴' };
};

export default function Scorecard() {
  const [idea, setIdea] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleScore = async (e) => {
    e.preventDefault();
    if (!idea.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/api/scorecard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: idea.trim(), city: city.trim() }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`Backend unavailable (status ${res.status}). Make sure the server is running on port 5000.`);
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Failed to score idea. Please try again.');
    }
    setLoading(false);
  };

  const avg = result
    ? (DIMENSIONS.reduce((s, d) => s + (result.scores[d.key] || 0), 0) / DIMENSIONS.length).toFixed(1)
    : null;
  const verdict = avg ? getVerdict(parseFloat(avg)) : null;

  const radarData = result
    ? {
        labels: DIMENSIONS.map(d => d.label),
        datasets: [
          {
            label: idea,
            data: DIMENSIONS.map(d => result.scores[d.key] || 0),
            backgroundColor: 'rgba(59,130,246,0.15)',
            borderColor: '#3b82f6',
            borderWidth: 2.5,
            pointBackgroundColor: DIMENSIONS.map(d => getColor(result.scores[d.key] || 0)),
            pointBorderColor: '#0f172a',
            pointBorderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 9,
          },
        ],
      }
    : null;

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        min: 0,
        max: 10,
        ticks: {
          stepSize: 2,
          color: '#475569',
          backdropColor: 'transparent',
          font: { size: 11 },
        },
        grid: { color: '#1e293b' },
        angleLines: { color: '#1e293b' },
        pointLabels: {
          color: '#94a3b8',
          font: { size: 13, weight: '600' },
        },
      },
    },
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
          label: (ctx) => ` Score: ${ctx.parsed.r}/10 — ${SCORE_LABELS[Math.round(ctx.parsed.r)] || ''}`,
        },
      },
    },
  };

  return (
    <Layout>
      <Head>
        <title>Business Idea Scorecard — BizScope AI</title>
        <meta name="description" content="Score your business idea across 5 dimensions: Market Size, Competition, Profitability, Ease of Start, and Trend. Get a visual radar chart." />
      </Head>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text)', marginBottom: '8px' }}>
            📊 Business Idea Scorecard
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '15px' }}>
            Enter your business idea and get an AI-powered score across 5 key dimensions — visualized as a radar chart.
          </p>
        </div>

        {/* Input form */}
        <form onSubmit={handleScore}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '24px', padding: '28px', marginBottom: '28px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                  💡 Your Business Idea *
                </label>
                <input
                  value={idea}
                  onChange={e => setIdea(e.target.value)}
                  placeholder="e.g. Tiffin service, Gym, SaaS tool for CAs..."
                  required
                  className="input-field"
                  style={{ width: '100%', fontSize: '15px', padding: '14px 16px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                  📍 City / Location (optional)
                </label>
                <input
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="e.g. Bangalore, Mumbai, Pune..."
                  className="input-field"
                  style={{ width: '100%', fontSize: '15px', padding: '14px 16px' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !idea.trim()}
              style={{
                width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
                background: loading ? '#1e293b' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                color: loading ? '#475569' : 'white', fontWeight: '700', fontSize: '15px',
                cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(59,130,246,0.35)',
              }}
            >
              {loading ? '⏳ Scoring your idea...' : '🎯 Score My Idea'}
            </button>

            {error && (
              <div style={{ marginTop: '16px', padding: '12px 16px', background: '#ef444415', border: '1px solid #ef444440', borderRadius: '12px', color: '#f87171', fontSize: '13px' }}>
                ⚠️ {error}
              </div>
            )}
          </div>
        </form>

        {/* Dimension legend */}
        {!result && !loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '28px' }}>
            {DIMENSIONS.map(d => (
              <div key={d.key} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '18px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>{d.icon}</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', marginBottom: '4px' }}>{d.label}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: '1.5' }}>{d.desc}</div>
              </div>
            ))}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>🤖</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text)', marginBottom: '8px' }}>Analyzing your idea...</div>
            <div style={{ fontSize: '14px', color: 'var(--muted)' }}>AI is scoring across 5 dimensions</div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '24px' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6', animation: `pulse 1.2s ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div>
            {/* Verdict banner */}
            <div style={{
              background: `linear-gradient(135deg, ${verdict.color}15, ${verdict.color}08)`,
              border: `1px solid ${verdict.color}40`,
              borderRadius: '20px', padding: '24px 28px', marginBottom: '24px',
              display: 'flex', alignItems: 'center', gap: '20px',
            }}>
              <div style={{ fontSize: '52px' }}>{verdict.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: verdict.color, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
                  Overall Score: {avg}/10
                </div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text)', marginBottom: '4px' }}>
                  {verdict.label}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
                  "{idea}"{city ? ` in ${city}` : ''}
                </div>
              </div>
              {/* Overall score ring */}
              <svg width="90" height="90" viewBox="0 0 90 90" style={{ flexShrink: 0 }}>
                <circle cx="45" cy="45" r="36" fill="none" stroke="var(--surface2)" strokeWidth="8" />
                <circle cx="45" cy="45" r="36" fill="none" stroke={verdict.color} strokeWidth="8"
                  strokeDasharray={`${(parseFloat(avg) / 10) * 226} 226`}
                  strokeLinecap="round" transform="rotate(-90 45 45)" />
                <text x="45" y="41" textAnchor="middle" fill="var(--text)" fontSize="16" fontWeight="800">{avg}</text>
                <text x="45" y="54" textAnchor="middle" fill="var(--muted)" fontSize="9">/10</text>
              </svg>
            </div>

            {/* Radar + Dimension scores */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
              {/* Radar chart */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '24px', padding: '28px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)' }} />
                <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', marginBottom: '4px' }}>📡 Radar Chart</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '20px' }}>5-dimension visual breakdown</div>
                <div style={{ height: '320px' }}>
                  <Radar data={radarData} options={radarOptions} />
                </div>
              </div>

              {/* Dimension scores */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '24px', padding: '28px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #8b5cf6, #ec4899)' }} />
                <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', marginBottom: '4px' }}>📋 Dimension Scores</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '20px' }}>Scored out of 10</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {DIMENSIONS.map(d => {
                    const score = result.scores[d.key] || 0;
                    const color = getColor(score);
                    return (
                      <div key={d.key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '18px' }}>{d.icon}</span>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>{d.label}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{SCORE_LABELS[Math.round(score)]}</span>
                            <span style={{ fontSize: '16px', fontWeight: '800', color }}>{score}/10</span>
                          </div>
                        </div>
                        <div style={{ height: '6px', background: 'var(--surface2)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: '3px',
                            background: `linear-gradient(90deg, ${color}, ${color}aa)`,
                            width: `${score * 10}%`,
                            transition: 'width 0.8s ease',
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* AI Reasoning */}
            {result.reasoning && (
              <div style={{ background: 'var(--surface)', border: '1px solid #3b82f630', borderRadius: '24px', padding: '28px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #3b82f6, #60a5fa, #ec4899)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#3b82f615', border: '1px solid #3b82f630', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>🤖</div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)' }}>AI Analysis</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Detailed reasoning for each dimension</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {DIMENSIONS.map(d => {
                    const score = result.scores[d.key] || 0;
                    const color = getColor(score);
                    const reason = result.reasoning[d.key] || '';
                    return (
                      <div key={d.key} style={{ background: 'var(--surface2)', borderRadius: '14px', padding: '16px 18px', borderLeft: `3px solid ${color}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '16px' }}>{d.icon}</span>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>{d.label}</span>
                          <span style={{ marginLeft: 'auto', fontSize: '14px', fontWeight: '800', color }}>{score}/10</span>
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.6' }}>{reason}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Key recommendations */}
            {result.recommendations && result.recommendations.length > 0 && (
              <div style={{ background: 'var(--surface)', border: '1px solid #22c55e30', borderRadius: '24px', padding: '28px' }}>
                <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', marginBottom: '16px' }}>
                  ✅ Key Recommendations
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {result.recommendations.map((rec, i) => (
                    <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px 16px', background: 'var(--surface2)', borderRadius: '12px' }}>
                      <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#22c55e20', border: '1px solid #22c55e40', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', color: '#22c55e', flexShrink: 0, marginTop: '1px' }}>
                        {i + 1}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: '1.6' }}>{rec}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Try another */}
            <div style={{ textAlign: 'center', marginTop: '28px' }}>
              <button
                onClick={() => { setResult(null); setIdea(''); setCity(''); }}
                style={{ padding: '12px 28px', borderRadius: '12px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}
              >
                🔄 Score Another Idea
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
