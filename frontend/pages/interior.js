import API_URL from '../utils/api';
import Head from 'next/head';
import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';

const SPACE_SCALES = ['Small', 'Medium', 'Large'];
const EXAMPLES = [
  { name: 'SpiceBox', industry: 'Cafe' },
  { name: 'GlowUp', industry: 'Beauty Salon' },
  { name: 'FitZone', industry: 'Gym' },
  { name: 'CodeNest', industry: 'Co-working Space' },
  { name: 'BookNook', industry: 'Bookstore' },
];

const CAT_COLORS = {
  'Biophilic': '#10b981',
  'Industrial': '#6b7280',
  'Dopamine Decor': '#f59e0b',
  'Warm Minimalist': '#d97706',
  'Dark Moody': '#8b5cf6',
  'Rustic Indian': '#b45309',
  'Tech Modern': '#3b82f6',
  'Vintage Retro': '#ef4444',
  'Scandinavian': '#06b6d4',
  'Color Drenching': '#ec4899',
};

function ConceptCard({ concept, onClick }) {
  const color = CAT_COLORS[concept.category] || '#3b82f6';
  return (
    <div onClick={() => onClick(concept)}
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = color + '60'; e.currentTarget.style.boxShadow = `0 12px 30px ${color}20`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}>
      {/* Image */}
      <div style={{ height: '140px', background: 'var(--surface2)', position: 'relative', overflow: 'hidden' }}>
        <img src={concept.imageUrl} alt={concept.themeName}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={e => { e.target.parentElement.style.background = `linear-gradient(135deg, ${color}20, var(--surface2))`; e.target.style.display = 'none'; }} />
        <div style={{ position: 'absolute', top: '8px', left: '8px', background: color + 'dd', color: 'white', padding: '3px 8px', borderRadius: '100px', fontSize: '10px', fontWeight: '700' }}>
          {concept.emoji} {concept.category}
        </div>
        <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '3px 8px', borderRadius: '100px', fontSize: '10px', fontWeight: '600' }}>
          {concept.estimatedCost}
        </div>
      </div>
      {/* Content */}
      <div style={{ padding: '14px' }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', marginBottom: '4px', lineHeight: '1.3' }}>{concept.themeName}</div>
        <div style={{ fontSize: '11px', color: color, fontWeight: '600', marginBottom: '8px' }}>{concept.vibe}</div>
        <div style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          💡 {concept.budgetHack}
        </div>
        <div style={{ marginTop: '10px', fontSize: '11px', color: color, fontWeight: '600' }}>View full concept →</div>
      </div>
    </div>
  );
}

function DetailModal({ concept, onClose }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const color = CAT_COLORS[concept.category] || '#3b82f6';
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 1001, width: '90%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto', background: 'var(--surface)', borderRadius: '24px', border: `1px solid ${color}40`, boxShadow: `0 30px 80px rgba(0,0,0,0.6)` }}>
        {/* Top accent */}
        <div style={{ height: '3px', background: `linear-gradient(90deg, ${color}, transparent)`, borderRadius: '24px 24px 0 0' }} />

        {/* AI Image */}
        <div style={{ height: '260px', background: 'var(--surface2)', position: 'relative', overflow: 'hidden' }}>
          {!imgLoaded && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '32px', animation: 'pulse 1.5s infinite' }}>🎨</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Rendering visualization...</div>
            </div>
          )}
          <img src={concept.imageUrl} alt={concept.themeName}
            onLoad={() => setImgLoaded(true)}
            onError={e => { e.target.style.display = 'none'; }}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: imgLoaded ? 'block' : 'none' }} />
          <button onClick={onClose} style={{ position: 'absolute', top: '12px', right: '12px', width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <div style={{ fontSize: '11px', color, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{concept.emoji} {concept.category}</div>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text)', marginBottom: '4px' }}>{concept.themeName}</h2>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{concept.vibe}</div>
            </div>
            <div style={{ padding: '8px 16px', borderRadius: '100px', background: color + '20', color, fontSize: '14px', fontWeight: '800' }}>{concept.estimatedCost}</div>
          </div>

          {/* Details grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            {[
              { label: '💡 Budget Hack', value: concept.budgetHack, color: '#f59e0b' },
              { label: '✨ Hero Feature', value: concept.heroFeature, color: '#a78bfa' },
              { label: '📐 Space Optimization', value: concept.spaceOptimization, color: '#10b981' },
            ].map(item => (
              <div key={item.label} style={{ background: 'var(--surface2)', borderRadius: '12px', padding: '14px', borderLeft: `3px solid ${item.color}` }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: item.color, marginBottom: '6px' }}>{item.label}</div>
                <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: '1.6' }}>{item.value}</div>
              </div>
            ))}
            {/* Image keywords */}
            <div style={{ background: 'var(--surface2)', borderRadius: '12px', padding: '14px', borderLeft: '3px solid #3b82f6' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#3b82f6', marginBottom: '6px' }}>🖼️ Image Keywords</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'monospace', lineHeight: '1.6' }}>{concept.imageKeywords}</div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <a href={`https://image.pollinations.ai/prompt/${encodeURIComponent(concept.imageKeywords + ', photorealistic, 8k, cinematic')}?width=1200&height=800&nologo=true`}
              target="_blank" rel="noreferrer"
              style={{ flex: 1, padding: '10px', borderRadius: '12px', background: `linear-gradient(135deg, ${color}, ${color}99)`, color: 'white', textAlign: 'center', textDecoration: 'none', fontSize: '13px', fontWeight: '700' }}>
              🖼️ Generate Full Image
            </a>
            <button onClick={onClose}
              style={{ padding: '10px 20px', borderRadius: '12px', border: '1px solid var(--border2)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: '13px' }}>
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function InteriorPage() {
  const router = useRouter();
  const [form, setForm] = useState({ businessName: '', industry: '', spaceScale: 'Small' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [filterCat, setFilterCat] = useState('All');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setResult(null);
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

  const categories = result ? ['All', ...new Set(result.concepts.map(c => c.category))] : [];
  const filtered = result?.concepts?.filter(c => filterCat === 'All' || c.category === filterCat) || [];

  return (
    <Layout>
      <Head>
        <title>Interior Design Planner — BizScope AI</title>
        <meta name="description" content="10 budget-conscious interior design concepts with AI visualizations for your business." />
      </Head>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 20px' }}>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '100px', padding: '5px 14px', fontSize: '12px', color: '#3b82f6', marginBottom: '14px' }}>
            🏠 AI Interior Design · Pollinations Image Generator
          </div>
          <h1 style={{ fontSize: 'clamp(22px,4vw,34px)', fontWeight: '900', color: 'var(--text)', marginBottom: '8px', letterSpacing: '-0.5px' }}>
            Interior Design Planner
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
            Get 10 distinct low-budget design concepts with AI visualizations. Click any card for full details.
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
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Business Type *</label>
                  <input value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                    placeholder="e.g. Cafe, Salon, Gym, Office" required className="input-field" />
                </div>
              </div>

              {/* Space scale */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Space Scale</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {SPACE_SCALES.map(s => (
                    <button key={s} type="button" onClick={() => setForm(f => ({ ...f, spaceScale: s }))}
                      style={{ flex: 1, padding: '10px', borderRadius: '12px', border: `1px solid ${form.spaceScale === s ? '#3b82f6' : 'var(--border2)'}`, background: form.spaceScale === s ? '#3b82f620' : 'var(--surface2)', color: form.spaceScale === s ? '#3b82f6' : 'var(--muted)', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s' }}>
                      {s === 'Small' ? '🏠 Small' : s === 'Medium' ? '🏢 Medium' : '🏗️ Large'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Examples */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--muted2)', marginBottom: '6px' }}>Quick examples:</div>
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
                {loading ? '⏳ Generating 10 concepts...' : '🏠 Generate 10 Design Concepts'}
              </button>
            </form>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏗️</div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', marginBottom: '8px' }}>Designing 10 concepts...</div>
            <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '20px' }}>AI is creating unique themes from Biophilic to Tech Modern</div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {['🌿 Biophilic', '🏗️ Industrial', '🎨 Dopamine', '☕ Minimalist', '⚡ Tech'].map(t => (
                <span key={t} style={{ padding: '4px 10px', borderRadius: '100px', background: 'var(--surface2)', border: '1px solid var(--border)', fontSize: '11px', color: 'var(--muted)' }}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div>
            {/* Result header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#3b82f6', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>10 Concepts Generated</div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)' }}>{result.businessName} · {result.industry} · {result.spaceScale}</div>
              </div>
              <button onClick={() => setResult(null)}
                style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid var(--border2)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: '13px' }}>
                ← New Design
              </button>
            </div>

            {/* Category filter */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
              {categories.map(cat => (
                <button key={cat} onClick={() => setFilterCat(cat)}
                  style={{ padding: '6px 14px', borderRadius: '100px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600', background: filterCat === cat ? '#3b82f6' : 'var(--surface2)', color: filterCat === cat ? 'white' : 'var(--muted)', transition: 'all 0.15s' }}>
                  {cat}
                </button>
              ))}
            </div>

            {/* 10 concept cards grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {filtered.map(concept => (
                <ConceptCard key={concept.id} concept={concept} onClick={setSelected} />
              ))}
            </div>

            {/* Bottom CTA */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '22px', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '14px' }}>Validate your business before investing in the space</div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => router.push('/')} className="btn-primary" style={{ padding: '10px 22px', fontSize: '13px' }}>🔍 Analyze Market</button>
                <button onClick={() => router.push('/strategy')}
                  style={{ padding: '10px 22px', borderRadius: '12px', border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                  ⚡ Business Strategy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Detail modal */}
        {selected && <DetailModal concept={selected} onClose={() => setSelected(null)} />}
      </div>
    </Layout>
  );
}
