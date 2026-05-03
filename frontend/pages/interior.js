import API_URL from '../utils/api';
import Head from 'next/head';
import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';

function renderMarkdown(text) {
  if (!text) return null;
  return text.split('\n').map((line, i) => {
    if (line.startsWith('## ')) return <h2 key={i} style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text)', margin: '20px 0 10px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>{line.replace(/^##\s*\*?\*?/, '').replace(/\*\*$/, '')}</h2>;
    if (line.startsWith('### ')) return <h3 key={i} style={{ fontSize: '14px', fontWeight: '700', color: '#3b82f6', margin: '16px 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{line.replace(/^###\s*\*?\*?/, '').replace(/\*\*$/, '')}</h3>;
    if (line.startsWith('- [ ] ')) return (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', fontSize: '13px', color: 'var(--text2)' }}>
        <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: '1px solid var(--border2)', flexShrink: 0 }} />
        <span dangerouslySetInnerHTML={{ __html: line.slice(6).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
      </div>
    );
    if (line.match(/^\d+\.\s\*\*/)) return (
      <div key={i} style={{ padding: '8px 12px', background: 'var(--surface2)', borderRadius: '10px', marginBottom: '6px', fontSize: '13px', color: 'var(--text2)', borderLeft: '3px solid #3b82f6' }}
        dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text)">$1</strong>') }} />
    );
    if (line.startsWith('**Total')) return <div key={i} style={{ marginTop: '10px', padding: '10px 14px', background: '#3b82f615', borderRadius: '10px', fontSize: '14px', fontWeight: '700', color: '#3b82f6' }}>{line.replace(/\*\*/g, '')}</div>;
    if (line.match(/^\*\*(.+)\*\*$/)) return <div key={i} style={{ fontWeight: '700', color: 'var(--text)', fontSize: '14px', margin: '8px 0 4px' }}>{line.replace(/\*\*/g, '')}</div>;
    if (!line.trim()) return <div key={i} style={{ height: '6px' }} />;
    return <div key={i} style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: '1.8' }} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text)">$1</strong>') }} />;
  });
}

const STYLES = ['Industrial Minimalism', 'Bohemian Chic', 'Modern Minimalist', 'Rustic Indian', 'Scandinavian'];
const EXAMPLES = [
  { name: 'SpiceBox', industry: 'Restaurant' },
  { name: 'CodeNest', industry: 'Co-working Space' },
  { name: 'GlowUp', industry: 'Beauty Salon' },
  { name: 'FitZone', industry: 'Gym' },
  { name: 'BookNook', industry: 'Bookstore Cafe' },
];

export default function InteriorPage() {
  const router = useRouter();
  const [form, setForm] = useState({ businessName: '', industry: '', style: 'Industrial Minimalism' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [imgLoaded, setImgLoaded] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setResult(null); setImgLoaded(false);
    try {
      const res = await fetch(`${API_URL}/api/interior-design`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Head>
        <title>Interior Design Planner — BizScope AI</title>
        <meta name="description" content="Get a budget-conscious interior design strategy and AI-generated space visualization for your business." />
      </Head>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 20px' }}>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '100px', padding: '5px 14px', fontSize: '12px', color: '#3b82f6', marginBottom: '14px' }}>
            🏠 Powered by AI + Pollinations Image Generator
          </div>
          <h1 style={{ fontSize: 'clamp(22px,4vw,34px)', fontWeight: '900', color: 'var(--text)', marginBottom: '8px', letterSpacing: '-0.5px' }}>
            Interior Design Planner
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: '1.7' }}>
            Get a budget-conscious design strategy + AI-generated space visualization for your business. No architect needed.
          </p>
        </div>

        {/* Form */}
        {!result && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '28px', marginBottom: '24px' }}>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Business Name *</label>
                  <input value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
                    placeholder="e.g. SpiceBox Cafe" required className="input-field" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Industry / Business Type *</label>
                  <input value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                    placeholder="e.g. Restaurant, Salon, Gym" required className="input-field" />
                </div>
              </div>

              {/* Style selector */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Design Style</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {STYLES.map(s => (
                    <button key={s} type="button" onClick={() => setForm(f => ({ ...f, style: s }))}
                      style={{ padding: '7px 14px', borderRadius: '100px', border: `1px solid ${form.style === s ? '#3b82f6' : 'var(--border2)'}`, background: form.style === s ? '#3b82f620' : 'var(--surface2)', color: form.style === s ? '#3b82f6' : 'var(--muted)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Examples */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--muted2)', marginBottom: '6px' }}>Try an example:</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {EXAMPLES.map(ex => (
                    <button key={ex.name} type="button" onClick={() => setForm(f => ({ ...f, businessName: ex.name, industry: ex.industry }))}
                      style={{ padding: '3px 10px', borderRadius: '100px', border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--muted)', fontSize: '11px', cursor: 'pointer' }}>
                      {ex.name} · {ex.industry}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '12px' }}>⚠️ {error}</p>}
              <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', fontSize: '15px' }}>
                {loading ? '⏳ Generating design + image...' : '🏠 Generate Interior Design Plan'}
              </button>
            </form>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '48px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏗️</div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', marginBottom: '8px' }}>Designing your space...</div>
            <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Creating strategy + generating AI visualization</div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,rgba(59,130,246,0.1),rgba(239,68,68,0.06))', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '16px', padding: '18px 22px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#3b82f6', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Design Plan Ready</div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)' }}>{result.businessName} · {result.industry}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>Style: {result.style}</div>
              </div>
              <button onClick={() => { setResult(null); setImgLoaded(false); }}
                style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid var(--border2)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: '13px' }}>
                ← New Design
              </button>
            </div>

            {/* AI Generated Image */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', overflow: 'hidden', marginBottom: '20px' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px' }}>🖼️</span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)' }}>AI Space Visualization</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Generated by Pollinations AI · {result.style}</div>
                </div>
              </div>
              <div style={{ position: 'relative', background: 'var(--surface2)', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {!imgLoaded && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '32px', animation: 'pulse 1.5s infinite' }}>🎨</div>
                    <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Rendering your space...</div>
                  </div>
                )}
                <img
                  src={result.imageUrl}
                  alt={`${result.businessName} interior design`}
                  onLoad={() => setImgLoaded(true)}
                  onError={e => { e.target.style.display = 'none'; }}
                  style={{ width: '100%', display: imgLoaded ? 'block' : 'none', maxHeight: '500px', objectFit: 'cover' }}
                />
              </div>
              <div style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--muted)', borderTop: '1px solid var(--border)' }}>
                💡 This is an AI visualization for inspiration. Actual implementation will vary based on your space.
              </div>
            </div>

            {/* Design Strategy */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '28px', marginBottom: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📋</span> Design Strategy
              </div>
              {renderMarkdown(result.design)}
            </div>

            {/* CTA */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '22px', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '14px' }}>Now analyze the market before you invest in your space</div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => router.push('/')} className="btn-primary" style={{ padding: '10px 22px', fontSize: '13px' }}>
                  🔍 Analyze Market
                </button>
                <button onClick={() => router.push('/strategy')}
                  style={{ padding: '10px 22px', borderRadius: '12px', border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                  ⚡ Get Business Strategy
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
