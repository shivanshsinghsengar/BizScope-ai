import API_URL from '../utils/api';
import Head from 'next/head';
import Layout from '../components/Layout';
import useAnalysis from '../hooks/useAnalysis';
import { useState, useEffect } from 'react';
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

export default function Insights() {
  const data = useAnalysis();
  const [aiText, setAiText] = useState(null);
  const [polling, setPolling] = useState(false);

  // Poll backend until AI text is ready
  useEffect(() => {
    if (!data) return;
    const initial = data.aiSuggestions;
    setAiText(initial);

    if (initial === 'Generating AI recommendations...') {
      setPolling(true);
      const location = data.location?.displayName?.split(',').slice(0, 2).join(',') || '';
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        try {
          const res = await fetch(`${API_URL}/api/analyze-location`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ location }),
          });
          const fresh = await res.json();
          if (fresh.aiSuggestions && fresh.aiSuggestions !== 'Generating AI recommendations...') {
            setAiText(fresh.aiSuggestions);
            // update sessionStorage too
            const stored = JSON.parse(sessionStorage.getItem('analysisData') || '{}');
            stored.aiSuggestions = fresh.aiSuggestions;
            sessionStorage.setItem('analysisData', JSON.stringify(stored));
            clearInterval(interval);
            setPolling(false);
          }
        } catch (_) {}
        if (attempts >= 10) { clearInterval(interval); setPolling(false); }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [data]);

  if (!data) return <Layout><PageSkeleton /></Layout>;

  const best = data.categoryStats ? [...data.categoryStats].reverse().slice(0, 4) : [];
  const worst = data.categoryStats?.slice(0, 4) || [];
  const noAI = !aiText || aiText === 'AI suggestions unavailable (no OpenAI key set).' || aiText === 'Generating AI recommendations...';

  return (
    <Layout>
      <Head><title>AI Insights — BizScope AI</title></Head>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px' }}>

        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text)', marginBottom: '8px' }}>🤖 AI Insights</h1>
          <p style={{ color: 'var(--muted)', fontSize: '15px' }}>Market intelligence and business recommendations</p>
        </div>

        {/* AI Suggestions */}
        <div style={{ background: 'var(--surface)', border: '1px solid #4f46e530', borderRadius: '24px', padding: '32px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #6366f1, #a78bfa, #ec4899)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'linear-gradient(135deg, #4f46e520, #7c3aed20)', border: '1px solid #4f46e540', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' }}>🤖</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text)' }}>AI Business Recommendations</div>
              <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Powered by Gemini / GPT market analysis</div>
            </div>
            {polling && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '100px', background: '#6366f115', border: '1px solid #6366f130' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1', animation: 'pulse 1.2s infinite' }} />
                <span style={{ fontSize: '12px', color: '#a78bfa' }}>Generating...</span>
              </div>
            )}
          </div>

          {polling && !aiText ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>⏳</div>
              <div style={{ color: 'var(--muted)', fontSize: '14px' }}>AI is analyzing the market data, please wait...</div>
            </div>
          ) : noAI ? (
            <div>
              <div style={{ background: 'var(--surface2)', borderRadius: '14px', padding: '14px 18px', marginBottom: '12px', fontSize: '13px', color: 'var(--muted)' }}>
                ℹ️ AI key not configured — showing data-driven recommendations instead.
              </div>
              {[...data.categoryStats].reverse().slice(0, 5).map((s, i) => (
                <div key={i} style={{ background: 'var(--surface2)', borderRadius: '14px', padding: '18px 20px', marginBottom: '10px', borderLeft: `3px solid ${categoryColors[s.category] || '#6366f1'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '700', color: 'var(--text)', fontSize: '15px' }}>{categoryIcons[s.category] || '🏪'} {s.category}</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: '100px', background: '#10b98120', color: '#34d399', fontSize: '11px', fontWeight: '700' }}>
                        Demand: {Math.min(10, parseFloat(s.demandScore || 5)).toFixed(1)}/10
                      </span>
                      <span style={{ padding: '3px 10px', borderRadius: '100px', background: s.riskLevel === 'Low' ? '#10b98120' : s.riskLevel === 'Medium' ? '#f59e0b20' : '#ef444420', color: s.riskLevel === 'Low' ? '#34d399' : s.riskLevel === 'Medium' ? '#fbbf24' : '#f87171', fontSize: '11px', fontWeight: '700' }}>
                        {s.riskLevel} Competition
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                    {s.count} competitor{s.count !== 1 ? 's' : ''} nearby · avg rating {s.avgRating} · {s.riskLevel === 'Low' ? 'Great entry opportunity with low competition.' : s.riskLevel === 'Medium' ? 'Moderate competition — differentiation needed.' : 'Highly saturated — strong USP required.'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text2)', lineHeight: '1.9', fontSize: '15px', whiteSpace: 'pre-line' }}>{aiText}</div>
          )}
        </div>

        {/* Risk formula explanation */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '24px', marginBottom: '24px' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', marginBottom: '16px' }}>📐 How Risk is Calculated</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '16px' }}>
            {[
              { icon: '🏪', label: 'Competitor Count', weight: '40%', desc: 'More competitors = higher risk' },
              { icon: '⭐', label: 'Avg Rating', weight: '30%', desc: 'Higher rated rivals = harder to compete' },
              { icon: '📣', label: 'Popularity', weight: '30%', desc: 'More reviews = more established market' },
            ].map(f => (
              <div key={f.label} style={{ background: 'var(--surface2)', borderRadius: '14px', padding: '16px' }}>
                <div style={{ fontSize: '22px', marginBottom: '8px' }}>{f.icon}</div>
                <div style={{ fontWeight: '600', color: 'var(--text)', fontSize: '13px', marginBottom: '4px' }}>{f.label}</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#6366f1', marginBottom: '4px' }}>{f.weight}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{f.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ background: 'var(--surface2)', borderRadius: '12px', padding: '14px 18px', fontSize: '13px', color: 'var(--muted)', fontFamily: 'monospace' }}>
            riskScore = normalize( count×0.4 + avgRating×0.3 + √totalReviews×0.3 ) → 0 to 100
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '12px' }}>
            <span style={{ color: '#34d399' }}>🟢 0–34 = Low Risk (good opportunity)</span>
            <span style={{ color: '#fbbf24' }}>🟡 35–69 = Medium Risk</span>
            <span style={{ color: '#f87171' }}>🔴 70–100 = High Risk (saturated)</span>
          </div>
        </div>

        {/* Best/Worst panels */}
        <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          {/* Best opportunities */}
          <div style={{ background: 'var(--surface)', border: '1px solid #10b98125', borderRadius: '20px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#10b98120', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>✅</div>
              <div>
                <div style={{ fontWeight: '700', color: 'var(--text)', fontSize: '15px' }}>Best Opportunities</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Lowest competition categories</div>
              </div>
            </div>
            {best.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: 'var(--surface2)', borderRadius: '14px', marginBottom: '10px', border: '1px solid #10b98115' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${categoryColors[s.category] || '#6366f1'}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{categoryIcons[s.category] || '🏪'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', color: 'var(--text)', fontSize: '14px' }}>{s.category}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Only {s.count} competitors nearby</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ padding: '4px 12px', borderRadius: '100px', background: '#10b98120', color: '#34d399', fontSize: '11px', fontWeight: '700' }}>Low Risk</span>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>Score: {s.competitorScore?.toFixed(1)}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Saturated markets */}
          <div style={{ background: 'var(--surface)', border: '1px solid #ef444425', borderRadius: '20px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ef444420', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>⚠️</div>
              <div>
                <div style={{ fontWeight: '700', color: 'var(--text)', fontSize: '15px' }}>Saturated Markets</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>High competition — proceed carefully</div>
              </div>
            </div>
            {worst.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: 'var(--surface2)', borderRadius: '14px', marginBottom: '10px', border: '1px solid #ef444415' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${categoryColors[s.category] || '#6366f1'}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{categoryIcons[s.category] || '🏪'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', color: 'var(--text)', fontSize: '14px' }}>{s.category}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{s.count} competitors • ⭐ {s.avgRating}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ padding: '4px 12px', borderRadius: '100px', background: '#ef444420', color: '#f87171', fontSize: '11px', fontWeight: '700' }}>High Risk</span>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>Score: {s.competitorScore?.toFixed(1)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Market summary cards */}
        <div className="responsive-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
          {data.categoryStats?.map((s, i) => (
            <div key={i} style={{ background: 'var(--surface)', border: `1px solid ${(categoryColors[s.category] || '#6366f1')}20`, borderRadius: '16px', padding: '20px', textAlign: 'center', transition: 'transform 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>{categoryIcons[s.category] || '🏪'}</div>
              <div style={{ fontWeight: '700', color: 'var(--text)', fontSize: '14px', marginBottom: '6px' }}>{s.category}</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: categoryColors[s.category] || '#6366f1', marginBottom: '4px' }}>{s.count}</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>competitors</div>
              <div style={{ marginTop: '8px', padding: '6px', borderRadius: '8px', background: s.riskLevel === 'Low' ? '#10b98115' : s.riskLevel === 'Medium' ? '#f59e0b15' : '#ef444415', color: s.riskLevel === 'Low' ? '#34d399' : s.riskLevel === 'Medium' ? '#fbbf24' : '#f87171', fontSize: '11px', fontWeight: '700' }}>
                {s.riskLevel === 'Low' ? '🟢 Low Risk' : s.riskLevel === 'Medium' ? '🟡 Medium Risk' : '🔴 High Risk'}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '4px' }}>Risk Score: {s.riskScore ?? '—'}/100</div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
