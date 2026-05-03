import API_URL from '../utils/api';
import Head from 'next/head';
import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';

// ── Parse sections from markdown output ──────────────────────────────────────
function parseSections(text) {
  const sections = [];
  const parts = text.split(/\n## /);
  parts.forEach((part, i) => {
    if (i === 0 && !part.startsWith('#')) return;
    const lines = (i === 0 ? part : '## ' + part).split('\n');
    const title = lines[0].replace(/^##\s*/, '').trim();
    const content = lines.slice(1).join('\n').trim();
    if (title) sections.push({ title, content });
  });
  return sections;
}

// ── Extract scores from verdict section ──────────────────────────────────────
function parseScores(content) {
  const scores = [];
  const lines = content.split('\n');
  lines.forEach(line => {
    const m = line.match(/^(Market Demand|Competition Level|Execution Difficulty|Profit Potential):\s*(\d+)\/10\s*\|\s*(.+)/);
    if (m) scores.push({ label: m[1], score: parseInt(m[2]), reason: m[3].trim() });
  });
  return scores;
}

function ScoreBar({ label, score, reason }) {
  const color = score <= 4 ? '#ef4444' : score <= 7 ? '#f59e0b' : '#10b981';
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>{label}</span>
        <span style={{ fontSize: '13px', fontWeight: '800', color }}>{score}/10</span>
      </div>
      <div style={{ height: '6px', background: 'var(--surface2)', borderRadius: '3px', marginBottom: '4px' }}>
        <div style={{ height: '100%', borderRadius: '3px', background: color, width: `${score * 10}%`, transition: 'width 1s ease' }} />
      </div>
      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{reason}</div>
    </div>
  );
}

// ── Render section content ────────────────────────────────────────────────────
function SectionContent({ title, content }) {
  const isVerdict = title.includes('IDEA VERDICT');
  const isRisk = title.includes('RISK RADAR');
  const is90Day = title.includes('90-DAY');
  const isExpansion = title.includes('EXPANSION');
  const isCompetitor = title.includes('COMPETITOR');

  if (isVerdict) {
    const scores = parseScores(content);
    const verdict = content.split('\n')[0];
    return (
      <div>
        <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', marginBottom: '20px', padding: '14px', background: 'var(--surface2)', borderRadius: '12px', borderLeft: '3px solid #10b981' }}>
          {verdict}
        </div>
        {scores.length > 0 ? scores.map((s, i) => <ScoreBar key={i} {...s} />) : (
          <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.8', whiteSpace: 'pre-line' }}>{content}</div>
        )}
      </div>
    );
  }

  if (isRisk) {
    const risks = [];
    const blocks = content.split(/\n(?=Risk:)/);
    blocks.forEach(block => {
      const riskM = block.match(/Risk:\s*(.+)/);
      const probM = block.match(/Probability:\s*(Low|Medium|High)/i);
      const killM = block.match(/Kill move:\s*(.+)/);
      if (riskM) risks.push({ risk: riskM[1], prob: probM?.[1] || 'Medium', kill: killM?.[1] || '' });
    });
    if (risks.length > 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {risks.map((r, i) => {
            const probColor = r.prob === 'Low' ? '#10b981' : r.prob === 'High' ? '#ef4444' : '#f59e0b';
            return (
              <div key={i} style={{ background: 'var(--surface2)', borderRadius: '12px', padding: '14px', borderLeft: `3px solid ${probColor}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)', flex: 1 }}>{r.risk}</span>
                  <span style={{ fontSize: '10px', fontWeight: '700', color: probColor, background: probColor + '20', padding: '2px 8px', borderRadius: '100px', flexShrink: 0, marginLeft: '8px' }}>{r.prob}</span>
                </div>
                {r.kill && <div style={{ fontSize: '12px', color: '#10b981' }}>🛡️ {r.kill}</div>}
              </div>
            );
          })}
        </div>
      );
    }
  }

  if (isExpansion) {
    const angles = [];
    const blocks = content.split(/\n(?=[A-Z][A-Z\s]+—)/);
    blocks.forEach(block => {
      const titleM = block.match(/^([A-Z][A-Z\s]+—.+)/);
      const whyM = block.match(/Why it works:\s*(.+)/);
      const howM = block.match(/How to test it:\s*(.+)/);
      const revM = block.match(/Revenue potential:\s*(Low|Medium|High|Moonshot)/i);
      if (titleM) angles.push({ title: titleM[1], why: whyM?.[1], how: howM?.[1], rev: revM?.[1] });
    });
    if (angles.length > 0) {
      const revColors = { Low: '#64748b', Medium: '#f59e0b', High: '#10b981', Moonshot: '#a78bfa' };
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '12px' }}>
          {angles.map((a, i) => (
            <div key={i} style={{ background: 'var(--surface2)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text)', marginBottom: '8px', lineHeight: '1.4' }}>{a.title}</div>
              {a.why && <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '6px' }}>💡 {a.why}</div>}
              {a.how && <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '8px' }}>🧪 {a.how}</div>}
              {a.rev && <span style={{ fontSize: '10px', fontWeight: '700', color: revColors[a.rev] || '#64748b', background: (revColors[a.rev] || '#64748b') + '20', padding: '2px 8px', borderRadius: '100px' }}>{a.rev}</span>}
            </div>
          ))}
        </div>
      );
    }
  }

  // Default: render as formatted text
  return (
    <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: '1.9', whiteSpace: 'pre-line' }}>
      {content.split('\n').map((line, i) => {
        if (line.startsWith('### ') || line.startsWith('PHASE ') || line.startsWith('BOOTSTRAP') || line.startsWith('FUNDED')) {
          return <div key={i} style={{ fontWeight: '700', color: '#10b981', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '16px', marginBottom: '6px' }}>{line.replace(/^###\s*/, '')}</div>;
        }
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return <div key={i} style={{ paddingLeft: '16px', marginBottom: '4px', color: 'var(--text2)' }}>• {line.slice(2)}</div>;
        }
        if (line.match(/^\d+\./)) {
          return <div key={i} style={{ paddingLeft: '8px', marginBottom: '6px', color: 'var(--text2)' }}>{line}</div>;
        }
        if (line.startsWith('**') && line.endsWith('**')) {
          return <div key={i} style={{ fontWeight: '700', color: 'var(--text)', marginTop: '8px' }}>{line.replace(/\*\*/g, '')}</div>;
        }
        if (line.trim() === '---') return <hr key={i} style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '16px 0' }} />;
        if (!line.trim()) return <div key={i} style={{ height: '6px' }} />;
        return <div key={i}>{line}</div>;
      })}
    </div>
  );
}

function CollapsibleCard({ section, index }) {
  const [open, setOpen] = useState(index < 2);
  const icons = { '🎯': '#10b981', '🌍': '#60a5fa', '⚔️': '#ef4444', '🚀': '#10b981', '💰': '#f59e0b', '🆕': '#a78bfa', '⚠️': '#f87171', '📅': '#06b6d4', '💬': '#10b981' };
  const sectionImages = {
    'IDEA VERDICT':     'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
    'MARKET REALITY':   'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    'COMPETITOR':       'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80',
    'GO-TO-MARKET':     'https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=800&q=80',
    'FINANCIAL':        'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80',
    'EXPANSION':        'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&q=80',
    'RISK':             'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&q=80',
    '90-DAY':           'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&q=80',
    'FOUNDER':          'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=800&q=80',
  };
  const emoji = section.title.match(/[\u{1F300}-\u{1FFFF}]|[\u{2600}-\u{26FF}]/u)?.[0] || '📌';
  const accentColor = icons[emoji] || '#10b981';
  const imgKey = Object.keys(sectionImages).find(k => section.title.toUpperCase().includes(k));
  const imgUrl = sectionImages[imgKey] || null;

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', marginBottom: '12px', transition: 'border-color 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = accentColor + '60'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
      {/* Section image */}
      {imgUrl && open && (
        <div style={{ height: '140px', overflow: 'hidden', position: 'relative' }}>
          <img src={imgUrl} alt={section.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.5)' }}
            onError={e => { e.target.parentElement.style.display = 'none'; }} />
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to right, ${accentColor}30, transparent)` }} />
          <div style={{ position: 'absolute', bottom: '12px', left: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: accentColor + '30', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>{emoji}</div>
            <span style={{ fontSize: '15px', fontWeight: '800', color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{section.title.replace(/^[^\w]*/, '').trim()}</span>
          </div>
        </div>
      )}
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        {!open || !imgUrl ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: accentColor + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>{emoji}</div>
            <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)' }}>{section.title.replace(/^[^\w]*/, '').trim()}</span>
          </div>
        ) : <div />}
        <span style={{ color: 'var(--muted)', fontSize: '18px', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>⌄</span>
      </button>
      {open && (
        <div style={{ padding: '0 20px 20px' }}>
          <div style={{ height: '1px', background: 'var(--border)', marginBottom: '16px' }} />
          <SectionContent title={section.title} content={section.content} />
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StrategyPage() {
  const router = useRouter();
  const [form, setForm] = useState({ idea: '', city: '', budget: 'Bootstrap (< ₹10k)', background: 'Student', timeline: '3 months' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [sections, setSections] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.idea.trim()) return;
    setLoading(true); setError(''); setResult(null); setSections([]);

    try {
      const res = await fetch(`${API_URL}/api/strategy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      setSections(parseSections(data.strategy));
    } catch (err) {
      setError(err.message || 'Strategy generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const EXAMPLES = [
    'Tiffin delivery for PG students in Noida',
    'AI tools for kirana shops in Tier 2 cities',
    'Hyperlocal skill swap app for college students',
    'Online tutoring for JEE/NEET aspirants',
    'Rent-a-professional for 1 hour',
  ];

  return (
    <Layout>
      <Head>
        <title>Business Strategy Engine — BizScope AI</title>
        <meta name="description" content="Get a complete McKinsey-level business strategy for your idea — market analysis, GTM plan, financial blueprint, and 90-day roadmap." />
      </Head>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 20px' }}>

        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '100px', padding: '5px 14px', fontSize: '12px', color: '#10b981', marginBottom: '14px' }}>
            ⚡ Powered by Gemini AI
          </div>
          <h1 style={{ fontSize: 'clamp(24px,4vw,36px)', fontWeight: '900', color: 'var(--text)', marginBottom: '10px', letterSpacing: '-0.5px' }}>
            Business Strategy Engine
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '15px', lineHeight: '1.7' }}>
            From idea to execution plan in 60 seconds. Get a complete market analysis, GTM strategy, financial blueprint, and 90-day roadmap — powered by AI.
          </p>
        </div>

        {/* Input Form */}
        {!result && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '28px', marginBottom: '24px' }}>
            <form onSubmit={handleSubmit}>
              {/* Idea input */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Your Business Idea *</label>
                <textarea value={form.idea} onChange={e => setForm(f => ({ ...f, idea: e.target.value }))}
                  placeholder="e.g. Tiffin delivery service for working professionals in PG accommodations..."
                  rows={3} required
                  style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', transition: 'border-color 0.2s' }}
                  onFocus={e => e.target.style.borderColor = '#10b981'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                {/* Example ideas */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {EXAMPLES.map(ex => (
                    <button key={ex} type="button" onClick={() => setForm(f => ({ ...f, idea: ex }))}
                      style={{ padding: '3px 10px', borderRadius: '100px', border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--muted)', fontSize: '11px', cursor: 'pointer' }}>
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4 dropdowns */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '12px', marginBottom: '20px' }}>
                {[
                  { key: 'city', label: 'Target City/Region', placeholder: 'e.g. Mumbai, Noida, Jaipur', type: 'text' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>{f.label}</label>
                    <input value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder} className="input-field" style={{ fontSize: '13px' }} />
                  </div>
                ))}
                {[
                  { key: 'budget', label: 'Budget Range', options: ['Bootstrap (< ₹10k)', '₹10k–50k', '₹50k–2L', '₹2L+'] },
                  { key: 'background', label: 'Your Background', options: ['Student', 'Working Professional', 'Entrepreneur', 'No Experience'] },
                  { key: 'timeline', label: 'Timeline', options: ['1 month', '3 months', '6 months', '1 year'] },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>{f.label}</label>
                    <select value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '10px 14px', borderRadius: '12px', fontSize: '13px', outline: 'none', cursor: 'pointer' }}>
                      {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              {error && <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '12px' }}>⚠️ {error}</p>}

              <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', fontSize: '15px' }}>
                {loading ? '⏳ Generating your strategy...' : '⚡ Generate Full Strategy'}
              </button>
            </form>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '48px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'pulse 1.5s infinite' }}>🧠</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)', marginBottom: '8px' }}>Analyzing your idea...</div>
            <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Building market analysis, GTM strategy, financial blueprint, and 90-day roadmap</div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '20px' }}>
              {['Market Research', 'Competitor Analysis', 'GTM Strategy', 'Financial Model', '90-Day Plan'].map((s, i) => (
                <div key={i} style={{ padding: '4px 10px', borderRadius: '100px', background: 'var(--surface2)', border: '1px solid var(--border)', fontSize: '11px', color: 'var(--muted)' }}>{s}</div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {result && sections.length > 0 && (
          <div>
            {/* Result header */}
            <div style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.1),rgba(239,68,68,0.06))', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '16px', padding: '20px 24px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#10b981', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Strategy Generated</div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)' }}>{result.idea}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{result.city} · {result.budget} · {result.timeline}</div>
              </div>
              <button onClick={() => { setResult(null); setSections([]); }}
                style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid var(--border2)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: '13px' }}>
                ← New Strategy
              </button>
            </div>

            {/* Collapsible sections */}
            {sections.map((section, i) => (
              <CollapsibleCard key={i} section={section} index={i} />
            ))}

            {/* Bottom CTA */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', textAlign: 'center', marginTop: '20px' }}>
              <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '14px' }}>Now validate this strategy with real competitor data</div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => router.push(`/?location=${encodeURIComponent(result.city || '')}`)} className="btn-primary" style={{ padding: '10px 22px', fontSize: '13px' }}>
                  🔍 Analyze {result.city || 'Market'} on BizScope
                </button>
                <button onClick={() => { setResult(null); setSections([]); }}
                  style={{ padding: '10px 22px', borderRadius: '12px', border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                  ⚡ Try Another Idea
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
