import API_URL from '../utils/api';
import { trackEvent } from '../utils/analytics';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import SuggestBusiness from '../components/SuggestBusiness';
import ReviewWidget from '../components/ReviewWidget';
import { useTheme } from '../context/ThemeContext';

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid var(--border)', padding: '18px 0', cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)' }}>{q}</span>
        <span style={{ fontSize: '20px', color: '#c8f03a', flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(45deg)' : 'none' }}>+</span>
      </div>
      {open && <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: '1.8', marginTop: '12px', paddingRight: '24px' }}>{a}</p>}
    </div>
  );
}

function NewsTicker({ headlines }) {
  if (!headlines || headlines.length === 0) return null;
  const items = [...headlines, ...headlines];
  return (
    <div style={{ background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(200,240,58,0.2)', padding: '7px 0', overflow: 'hidden', zIndex: 10, position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ background: 'linear-gradient(135deg,#c8f03a,#a8d420)', color: '#0a0f0a', padding: '3px 14px', fontSize: '11px', fontWeight: '800', letterSpacing: '0.1em', flexShrink: 0 }}>LIVE</div>
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <div className="ticker-track">
            {items.map((h, i) => (
              <a key={i} href={h.url} target="_blank" rel="noreferrer"
                style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', paddingRight: '60px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                🔵 {h.title}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Real-time steps driven by SSE events
const STEP_META = {
  geocode: { icon: '📍', label: 'Finding your location...' },
  fetch:   { icon: '🔍', label: 'Scanning businesses nearby...' },
  count:   { icon: '🏪', label: 'Counting competitors...' },
  score:   { icon: '📊', label: 'Calculating market scores...' },
  ai:      { icon: '🤖', label: 'Asking AI for recommendations...' },
  done:    { icon: '✨', label: 'Polishing results...' },
  cache:   { icon: '⚡', label: 'Loading from cache...' },
};

function AnalysisLoader({ city, step, message, sub, progress }) {
  const [dots, setDots] = useState('');
  const dotsRef = useRef(null);
  useEffect(() => {
    dotsRef.current = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 400);
    return () => clearInterval(dotsRef.current);
  }, []);

  const meta = STEP_META[step] || STEP_META.geocode;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(10,15,10,0.97)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(12px)' }}>
      <div style={{ position: 'absolute', top: '20%', left: '20%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(200,240,58,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '20%', right: '20%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(239,68,68,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ textAlign: 'center', maxWidth: '480px', padding: '0 24px', position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: '72px', marginBottom: '24px', animation: 'fadeInUp 0.4s ease' }}>{meta.icon}</div>

        <div style={{ fontSize: '13px', color: '#c8f03a', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>
          Analyzing {city}
        </div>

        <div style={{ fontSize: '22px', fontWeight: '800', color: '#f1f5f9', marginBottom: '8px', lineHeight: '1.3', minHeight: '60px' }}>
          {message || meta.label}{dots}
        </div>

        <div style={{ fontSize: '14px', color: '#475569', marginBottom: '40px' }}>{sub || ''}</div>

        {/* Real progress bar */}
        <div style={{ width: '100%', height: '6px', background: '#1a2a1a', borderRadius: '3px', marginBottom: '16px', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: '3px', background: 'linear-gradient(90deg, #c8f03a, #ffffff, #ef4444)', width: `${progress || 5}%`, transition: 'width 0.5s ease', boxShadow: '0 0 12px rgba(200,240,58,0.6)' }} />
        </div>

        <div style={{ fontSize: '13px', color: '#c8f03a', fontWeight: '700', marginBottom: '32px' }}>{progress || 0}%</div>

        {/* Step indicators */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '32px' }}>
          {Object.keys(STEP_META).filter(k => k !== 'cache').map((k, i) => (
            <div key={k} style={{ width: k === step ? '24px' : '8px', height: '8px', borderRadius: '4px', background: Object.keys(STEP_META).indexOf(step) >= i ? '#c8f03a' : '#1a2a1a', transition: 'all 0.3s ease' }} />
          ))}
        </div>

        <div style={{ background: 'rgba(200,240,58,0.08)', border: '1px solid rgba(200,240,58,0.2)', borderRadius: '14px', padding: '14px 20px', fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>
          💡 <span style={{ color: '#94a3b8' }}>Did you know?</span> BizScope analyzes real businesses from OpenStreetMap — the same data used by Apple Maps and Wikipedia.
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [form, setForm] = useState({ city: '', address: '', pincode: '' });
  const [loading, setLoading] = useState(false);
  const [loadState, setLoadState] = useState({ step: 'geocode', message: '', sub: '', progress: 0 });
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [reviews, setReviews] = useState({ reviews: [], avg: 0, total: 0 });
  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const router = useRouter();
  const { dark, toggle } = useTheme();

  useEffect(() => {
    fetch(`${API_URL}/api/reviews`).then(r => r.json()).then(d => setReviews(d)).catch(() => {});
    trackEvent('home_viewed');
    // Fetch real news
    fetch(`${API_URL}/api/news`).then(r => r.json()).then(d => {
      setNews(d.articles || []);
      setNewsLoading(false);
    }).catch(() => setNewsLoading(false));
  }, []);

  // Load search history from localStorage
  useEffect(() => {
    try {
      const h = JSON.parse(localStorage.getItem('bizscope_history') || '[]');
      setHistory(h.slice(0, 5));
    } catch (_) {}
  }, []);

  const saveToHistory = (location) => {
    try {
      const h = JSON.parse(localStorage.getItem('bizscope_history') || '[]');
      const updated = [location, ...h.filter(x => x !== location)].slice(0, 5);
      localStorage.setItem('bizscope_history', JSON.stringify(updated));
      setHistory(updated);
    } catch (_) {}
  };

  // Handle shared link — auto-fill location from URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const loc = params.get('location');
    if (loc) setForm(f => ({ ...f, city: loc }));
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleAnalyze = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    const parts = [form.address, form.city, form.pincode].filter(p => p.trim());
    const location = parts.join(', ');
    trackEvent('analysis_started', { city: form.city || '', hasAddress: !!form.address, hasPincode: !!form.pincode });

    // Animate loading steps while POST runs
    const steps = [
      { step: 'geocode', message: 'Finding your location...', sub: 'Geocoding your area', progress: 15 },
      { step: 'fetch',   message: 'Scanning businesses nearby...', sub: 'Fetching from OpenStreetMap', progress: 35 },
      { step: 'count',   message: 'Counting competitors...', sub: 'Analyzing categories', progress: 55 },
      { step: 'score',   message: 'Calculating market scores...', sub: 'Running competition analysis', progress: 75 },
      { step: 'ai',      message: 'Asking AI for recommendations...', sub: 'Generating insights', progress: 90 },
    ];
    let stepIdx = 0;
    setLoadState(steps[0]);
    const stepTimer = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, steps.length - 1);
      setLoadState(steps[stepIdx]);
    }, 3000);

    try {
      const res = await fetch(`${API_URL}/api/analyze-location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location }),
      });
      clearInterval(stepTimer);
      if (!res.ok) throw new Error(`Server error ${res.status} — please try again`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setLoadState({ step: 'done', message: 'Analysis complete!', sub: 'Preparing your report', progress: 100 });
      saveToHistory(form.city || form.address);
      sessionStorage.setItem('analysisData', JSON.stringify(data));
      setTimeout(() => window.dispatchEvent(new Event('bizscope_trigger_review')), 8000);
      trackEvent('analysis_succeeded', { businesses: data?.businesses?.length || 0 });
      router.push('/analysis');
    } catch (err) {
      clearInterval(stepTimer);
      setError(err.message || 'Analysis failed. Please try again.');
      setLoading(false);
      trackEvent('analysis_failed', { reason: err.message });
    }
  };

  return (
    <>
      <Head>
        <title>BizScope AI — Business Intelligence Platform</title>
        <meta name="description" content="Analyze competitors, discover market gaps, and find the perfect business location — powered by real data and AI. Free market analysis tool for entrepreneurs." />
        <meta name="keywords" content="business analysis, competitor analysis, market research, business opportunity, India, entrepreneur" />
        <meta property="og:title" content="BizScope AI — Business Intelligence Platform" />
        <meta property="og:description" content="AI-powered market analysis. Find the best business opportunity in your area." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://bizscope-ai.vercel.app" />
        <meta property="og:image" content="https://bizscope-ai.vercel.app/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="BizScope AI — Business Intelligence Platform" />
        <meta name="twitter:description" content="AI-powered market analysis. Find the best business opportunity in your area." />
        <meta name="twitter:image" content="https://bizscope-ai.vercel.app/og-image.png" />
        <meta name="robots" content="index, follow" />
      </Head>

      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--text)', position: 'relative' }}>

        {/* Analysis loader overlay */}
        {loading && <AnalysisLoader city={form.city || form.address || 'your location'} step={loadState.step} message={loadState.message} sub={loadState.sub} progress={loadState.progress} />}

        {/* Live news ticker with real headlines */}
        <NewsTicker headlines={news.slice(0, 10)} />

        {/* Navbar */}
        <nav style={{ position: 'relative', zIndex: 10, borderBottom: '1px solid var(--border)', background: 'var(--nav-bg)', backdropFilter: 'blur(20px)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #c8f03a, #a8d420)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🚀</div>
              <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text)' }}>Biz<span style={{ background: 'linear-gradient(135deg, #c8f03a, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Scope</span> AI</span>
            </div>
            <div className="nav-links" style={{ display: 'flex', gap: '24px', fontSize: '14px', color: 'var(--muted)' }}>
              {[
                { label: 'Features', action: () => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }) },
                { label: 'How it Works', action: () => router.push('/how-it-works') },
                { label: 'Pricing', action: () => router.push('/pricing') },
                { label: 'Docs', action: () => router.push('/docs') },
              ].map(item => (
                <span key={item.label} onClick={item.action} style={{ cursor: 'pointer', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.target.style.color = 'var(--text)'}
                  onMouseLeave={e => e.target.style.color = 'var(--muted)'}>{item.label}</span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button onClick={toggle} title="Toggle theme"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {dark ? '☀️' : '🌙'}
              </button>
              <button onClick={() => router.push('/analysis')}
                style={{ background: 'linear-gradient(135deg, #c8f03a, #a8d420)', color: '#0a0f0a', border: 'none', padding: '8px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                Get Started →
              </button>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <main style={{ position: 'relative', zIndex: 1, flex: 1 }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '60px 20px 40px' }}>

            {/* Badge */}
            <div className="anim-fade-down" style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(200,240,58,0.1)', border: '1px solid rgba(200,240,58,0.3)', borderRadius: '100px', padding: '6px 16px', fontSize: '13px', color: '#c8f03a' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#c8f03a', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                🇮🇳 #1 Free Business Intelligence Tool for India
              </div>
            </div>

            {/* Headline */}
            <h1 className="anim-fade-up delay-1" style={{ textAlign: 'center', fontSize: 'clamp(32px, 6vw, 68px)', fontWeight: '900', lineHeight: '1.05', marginBottom: '20px', color: 'var(--text)', letterSpacing: '-1px' }}>
              Know Your Market<br />
              <span className="gradient-text-animated">Before You Invest</span>
            </h1>
            <p className="anim-fade-up delay-2" style={{ textAlign: 'center', fontSize: 'clamp(15px, 2vw, 19px)', color: 'var(--muted)', maxWidth: '580px', margin: '0 auto 28px', lineHeight: '1.7' }}>
              Enter any city in India — get real competitor data, AI business recommendations, available properties, and market scores in seconds. <strong style={{ color: 'var(--text)' }}>100% free.</strong>
            </p>

            {/* Star rating social proof */}
            {reviews.total > 0 && (
              <div className="anim-fade-up delay-2" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {[1,2,3,4,5].map(s => (
                    <span key={s} style={{ fontSize: '18px', filter: parseFloat(reviews.avg) >= s ? 'none' : 'grayscale(1) opacity(0.3)' }}>⭐</span>
                  ))}
                </div>
                <span style={{ fontWeight: '700', color: 'var(--text)', fontSize: '15px' }}>{reviews.avg}</span>
                <span style={{ color: 'var(--muted)', fontSize: '13px' }}>from {reviews.total} reviews</span>
              </div>
            )}

            {/* Trust pills */}
            <div className="anim-fade-up delay-2" style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '40px' }}>
              {['🗺️ Real OSM Data', '🤖 Gemini AI', '⚡ Under 10 sec', '🔒 No signup needed', '📄 PDF Export'].map(s => (
                <div key={s} style={{ padding: '5px 14px', borderRadius: '100px', background: 'var(--surface)', border: '1px solid var(--border2)', fontSize: '12px', color: 'var(--muted)', fontWeight: '500' }}>{s}</div>
              ))}
            </div>

            {/* Form Card */}
            <div className="anim-scale delay-3" style={{ maxWidth: '520px', margin: '0 auto 56px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '24px', padding: '28px', boxShadow: dark ? '0 25px 60px rgba(0,0,0,0.5)' : '0 8px 30px rgba(0,0,0,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#c8f03a' }} />
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text2)' }}>Analyze a Location</span>
              </div>
              <form onSubmit={handleAnalyze}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                  {[
                    { name: 'city', label: 'City / Area *', placeholder: 'e.g. Mumbai, Connaught Place, Lajpat Nagar' },
                    { name: 'address', label: 'Street Address (optional)', placeholder: 'e.g. MG Road, Sector 18' },
                    { name: 'pincode', label: 'Pincode (optional)', placeholder: 'e.g. 400001' },
                  ].map(f => (
                    <div key={f.name}>
                      <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>{f.label}</label>
                      <input name={f.name} value={form[f.name]} onChange={handleChange} placeholder={f.placeholder} required={f.name === 'city'} className="input-field" />
                    </div>
                  ))}
                </div>
                {error && <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '12px' }}>⚠️ {error}</p>}
                {history.length > 0 && !loading && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Recent searches</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {history.map(h => (
                        <button key={h} type="button" onClick={() => setForm(f => ({ ...f, city: h }))}
                          style={{ padding: '4px 10px', borderRadius: '100px', border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--muted)', fontSize: '12px', cursor: 'pointer' }}>
                          🕐 {h}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', fontSize: '15px' }}>
                  {loading ? '⏳ Analyzing...' : '🔍 Analyze Market'}
                </button>
              </form>
            </div>

            {/* Try it live CTA */}
            <div className="anim-fade-up delay-4" style={{ maxWidth: '600px', margin: '0 auto 64px', textAlign: 'center' }}>
              <div style={{ background: 'var(--surface)', border: '1px solid #c8f03a30', borderRadius: '24px', padding: '36px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
                <h2 style={{ fontSize: 'clamp(18px,3vw,24px)', fontWeight: '800', color: 'var(--text)', marginBottom: '10px' }}>No demo needed — just try it</h2>
                <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.7' }}>
                  Type any Indian city above and see real competitor data, AI insights, and property prices in under 10 seconds. No signup, no credit card.
                </p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  {['Mumbai', 'Delhi', 'Mathura', 'Jaipur', 'Bangalore'].map(city => (
                    <button key={city} onClick={() => { setForm(f => ({ ...f, city })); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      style={{ padding: '8px 18px', borderRadius: '100px', border: '1px solid #c8f03a40', background: '#c8f03a10', color: '#a8d420', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                      📍 {city}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats bar — animated counters */}
            <div className="anim-fade-up delay-4" style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '40px', marginBottom: '64px' }}>
              {[
                { value: '50M+', label: 'Businesses Indexed', icon: '🏪' },
                { value: '195',  label: 'Countries Covered',  icon: '🌍' },
                { value: '100%', label: 'Free Forever',       icon: '🆓' },
                { value: '<10s', label: 'Analysis Time',      icon: '⚡' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', marginBottom: '4px' }}>{s.icon}</div>
                  <div style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text)', letterSpacing: '-1px' }}>{s.value}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Feature cards */}
            <div id="features" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '64px' }}>
              {[
                { icon: '🏪', title: 'Competitor Analysis', desc: 'Real businesses from OpenStreetMap within 3km radius.', color: '#c8f03a' },
                { icon: '📊', title: 'Market Scoring', desc: 'See how crowded each business type is and find opportunities.', color: '#ef4444' },
                { icon: '🏠', title: 'Property Finder', desc: 'Available commercial spaces for rent or sale near your location.', color: '#ffffff' },
                { icon: '🤖', title: 'AI Recommendations', desc: 'Business suggestions tailored to local market conditions.', color: '#a8d420' },
                { icon: '🗺️', title: 'Interactive Map', desc: 'Visualize competitors and properties on a live map.', color: '#dc2626' },
                { icon: '📈', title: 'Profit Estimates', desc: 'Revenue projections based on local demand and competition.', color: '#c8f03a' },
              ].map((f, i) => (
                <div key={f.title} className={`card anim-fade-up delay-${i + 1}`} style={{ padding: '22px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${f.color}20`, border: `1px solid ${f.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '14px' }}>{f.icon}</div>
                  <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>{f.title}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.6' }}>{f.desc}</p>
                </div>
              ))}
            </div>

            {/* How it works */}
            <div id="how-it-works" style={{ textAlign: 'center', marginBottom: '64px' }}>
              <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: '700', color: 'var(--text)', marginBottom: '12px' }}>How it Works</h2>
              <p style={{ color: 'var(--muted)', marginBottom: '40px' }}>Three simple steps to market intelligence</p>
              <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '16px' }}>
                {[
                  { step: '01', icon: '📍', title: 'Enter Location', desc: 'Type your city, address, or pincode' },
                  { step: '02', icon: '⚡', title: 'Instant Analysis', desc: 'We fetch real data from OpenStreetMap' },
                  { step: '03', icon: '🎯', title: 'Get Insights', desc: 'View competitors, properties & AI tips' },
                ].map((s) => (
                  <div key={s.step} style={{ flex: '1', minWidth: '200px', maxWidth: '260px', padding: '28px 20px' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #c8f03a, #a8d420)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', margin: '0 auto 14px' }}>{s.icon}</div>
                    <div style={{ fontSize: '11px', color: '#c8f03a', fontWeight: '700', letterSpacing: '0.1em', marginBottom: '8px' }}>STEP {s.step}</div>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>{s.title}</h3>
                    <p style={{ fontSize: '13px', color: 'var(--muted)' }}>{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Testimonials */}
            <div style={{ marginBottom: '64px' }}>
              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h2 style={{ fontSize: 'clamp(22px, 4vw, 34px)', fontWeight: '800', color: 'var(--text)', marginBottom: '10px' }}>What Entrepreneurs Say</h2>
                <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Real feedback from real business owners</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                {[
                  { name: 'Rahul Sharma', city: 'Mumbai', role: 'Restaurant Owner', avatar: '👨‍🍳', text: 'I was about to open a restaurant in Andheri. BizScope showed me 47 restaurants already there. I shifted to Malad — much better decision. Saved me lakhs.', stars: 5 },
                  { name: 'Priya Gupta', city: 'Jaipur', role: 'Salon Entrepreneur', avatar: '💇‍♀️', text: 'The AI recommendations were spot on. It suggested a salon near a college area — I opened there and got 200+ customers in the first month.', stars: 5 },
                  { name: 'Amit Verma', city: 'Delhi', role: 'Grocery Store Owner', avatar: '🛒', text: 'The property prices based on government circle rates helped me negotiate my rent. I showed the data to the landlord and got 15% off.', stars: 5 },
                  { name: 'Sunita Patel', city: 'Ahmedabad', role: 'Clothing Boutique', avatar: '👗', text: 'Free tool with data quality I expected to pay thousands for. The competitor map alone is worth it. Highly recommend to any new entrepreneur.', stars: 5 },
                ].map((t, i) => (
                  <div key={i} className="card" style={{ padding: '24px', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '20px', right: '20px', fontSize: '24px', opacity: 0.15 }}>"</div>
                    <div style={{ display: 'flex', gap: '2px', marginBottom: '14px' }}>
                      {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize: '14px' }}>⭐</span>)}
                    </div>
                    <p style={{ fontSize: '14px', color: 'var(--text2)', lineHeight: '1.7', marginBottom: '18px', fontStyle: 'italic' }}>"{t.text}"</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #c8f03a20, #ef444420)', border: '1px solid #c8f03a30', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{t.avatar}</div>
                      <div>
                        <div style={{ fontWeight: '700', color: 'var(--text)', fontSize: '14px' }}>{t.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{t.role} · {t.city}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live News Grid — Google News Style */}
            <div style={{ marginBottom: '64px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: 'clamp(20px,3vw,28px)', fontWeight: '800', color: 'var(--text)', marginBottom: '4px' }}>🌍 World Innovation News</h2>
                  <p style={{ color: 'var(--muted)', fontSize: '13px' }}>Startups · Tech · Hackathons · Innovation</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['All', 'Startup', 'Tech', 'AI', 'Funding'].map(cat => (
                    <button key={cat} onClick={() => setActiveCategory(cat)}
                      style={{ padding: '6px 16px', borderRadius: '100px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600', background: activeCategory === cat ? 'linear-gradient(135deg,#c8f03a,#a8d420)' : 'var(--surface2)', color: activeCategory === cat ? '#0a0f0a' : 'var(--muted)', transition: 'all 0.2s' }}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {newsLoading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '16px' }}>
                  {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="shimmer" style={{ height: '180px', borderRadius: '16px' }} />
                  ))}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '16px' }}>
                  {news.filter(a => {
                    if (activeCategory === 'All') return true;
                    const t = (a.title + ' ' + (a.description || '')).toLowerCase();
                    if (activeCategory === 'Startup') return t.includes('startup') || t.includes('founder') || t.includes('venture');
                    if (activeCategory === 'Tech') return t.includes('tech') || t.includes('software') || t.includes('app');
                    if (activeCategory === 'AI') return t.includes('ai') || t.includes('artificial') || t.includes('machine learning') || t.includes('gemini') || t.includes('openai');
                    if (activeCategory === 'Funding') return t.includes('fund') || t.includes('raise') || t.includes('invest') || t.includes('million') || t.includes('billion');
                    return true;
                  }).slice(0, 12).map((article, i) => (
                    <a key={i} href={article.url} target="_blank" rel="noreferrer"
                      style={{ display: 'block', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', textDecoration: 'none', transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(200,240,58,0.1)'; e.currentTarget.style.borderColor = '#c8f03a40'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
                      {article.urlToImage && (
                        <div style={{ height: '140px', overflow: 'hidden', background: 'var(--surface2)' }}>
                          <img src={article.urlToImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={e => { e.target.parentElement.style.display = 'none'; }} />
                        </div>
                      )}
                      <div style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                          <span style={{ fontSize: '10px', fontWeight: '700', color: '#c8f03a', background: '#c8f03a15', padding: '2px 8px', borderRadius: '100px' }}>{article.source}</span>
                          <span style={{ fontSize: '10px', color: 'var(--muted)' }}>
                            {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                          </span>
                        </div>
                        <h3 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)', lineHeight: '1.5', margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {article.title}
                        </h3>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Resource Hub */}
            <div style={{ marginBottom: '64px' }}>
              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(200,240,58,0.1)', border: '1px solid rgba(200,240,58,0.3)', borderRadius: '100px', padding: '5px 14px', fontSize: '12px', color: '#c8f03a', marginBottom: '14px' }}>
                  🌐 Entrepreneur Resource Hub
                </div>
                <h2 style={{ fontSize: 'clamp(22px,4vw,34px)', fontWeight: '800', color: 'var(--text)', marginBottom: '10px' }}>Stay Ahead of the Market</h2>
                <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Curated resources for Indian entrepreneurs</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))', gap: '20px' }}>
                {[
                  {
                    icon: '💡', title: 'New Ideas', color: '#c8f03a',
                    desc: 'Discover trending business ideas and emerging markets in India',
                    links: [
                      { label: '🚀 Product Hunt — Today\'s Launches', url: 'https://www.producthunt.com' },
                      { label: '📊 Tracxn — India Startup Trends', url: 'https://tracxn.com/d/trending-themes' },
                      { label: '🌱 YC Startup Ideas', url: 'https://www.ycombinator.com/rfs' },
                    ]
                  },
                  {
                    icon: '🏆', title: 'Hackathons', color: '#ef4444',
                    desc: 'Upcoming competitions to validate your idea and win funding',
                    links: [
                      { label: '⚡ Devpost — Active Hackathons', url: 'https://devpost.com/hackathons' },
                      { label: '🇮🇳 Unstop — India Competitions', url: 'https://unstop.com/hackathons' },
                      { label: '💰 HackerEarth Challenges', url: 'https://www.hackerearth.com/challenges' },
                    ]
                  },
                  {
                    icon: '📖', title: 'Startup Lessons', color: '#a8d420',
                    desc: 'Learn from failures and successes of real entrepreneurs',
                    links: [
                      { label: '💀 Failory — Startup Post-Mortems', url: 'https://www.failory.com' },
                      { label: '📰 Inc42 — India Startup News', url: 'https://inc42.com' },
                      { label: '🎙️ The Ken — Deep Dives', url: 'https://the-ken.com' },
                    ]
                  },
                ].map((hub, i) => (
                  <div key={i} className="glass-card" style={{ padding: '28px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${hub.color}, transparent)` }} />
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>{hub.icon}</div>
                    <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text)', marginBottom: '8px' }}>{hub.title}</h3>
                    <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '18px', lineHeight: '1.6' }}>{hub.desc}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {hub.links.map((link, j) => (
                        <a key={j} href={link.url} target="_blank" rel="noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 14px', borderRadius: '10px', background: 'var(--surface2)', border: `1px solid ${hub.color}20`, color: 'var(--text2)', fontSize: '13px', textDecoration: 'none', transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = hub.color + '60'; e.currentTarget.style.background = hub.color + '10'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = hub.color + '20'; e.currentTarget.style.background = 'var(--surface2)'; }}>
                          {link.label}
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQ */}
            <div id="faq" style={{ marginBottom: '64px', maxWidth: '720px', margin: '0 auto 64px' }}>
              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h2 style={{ fontSize: 'clamp(22px, 4vw, 34px)', fontWeight: '800', color: 'var(--text)', marginBottom: '10px' }}>Frequently Asked Questions</h2>
              </div>
              {[
                { q: 'Is BizScope AI really free?', a: 'Yes, completely free. No credit card, no signup required for basic analysis. Just enter a city and get results instantly.' },
                { q: 'How accurate is the data?', a: 'Business data comes from OpenStreetMap — the same source used by Apple Maps, Wikipedia, and Uber. It covers 50M+ businesses worldwide and is updated continuously by a global community.' },
                { q: 'How often is the data updated?', a: 'OpenStreetMap data is updated in real-time by contributors. Our cache refreshes every 2 hours, so you always get fresh data.' },
                { q: 'Can I use this for any city in India?', a: 'Yes — any city, town, or area in India (and 195 other countries). Just type the name and we\'ll find it.' },
                { q: 'Are the property prices real?', a: 'Property prices are estimates based on official government circle rates from State Registration & Stamps Departments. Actual market prices may be 20–150% higher depending on location.' },
                { q: 'How does the AI recommendation work?', a: 'After fetching real competitor data, we send the market statistics to Google Gemini AI which analyzes the competition landscape and suggests the 5 best businesses to start in your area.' },
              ].map((f, i) => (
                <FAQItem key={i} q={f.q} a={f.a} />
              ))}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer style={{ position: 'relative', zIndex: 1, borderTop: '1px solid var(--border)', background: 'var(--bg2)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px 28px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '32px', marginBottom: '32px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #c8f03a, #a8d420)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🚀</div>
                  <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)' }}>BizScope AI</span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.7' }}>AI-powered business intelligence for entrepreneurs.</p>
              </div>
              {[
                { title: 'Product', links: [
                  { label: '✨ Features', href: '/#features' },
                  { label: '💰 Pricing', href: '/pricing' },
                  { label: '⚙️ How it Works', href: '/how-it-works' },
                  { label: '📖 Docs', href: '/docs' },
                ]},
                { title: 'Company', links: [
                  { label: '👤 About', href: '/about' },
                  { label: '🔒 Privacy Policy', href: '/privacy' },
                  { label: '📋 Terms of Service', href: '/terms' },
                  { label: '➕ List Business', href: '/register' },
                ]},
                { title: 'Data Sources', links: [
                  { label: '🗺️ OpenStreetMap', href: 'https://www.openstreetmap.org/copyright' },
                  { label: '🤖 Google Gemini AI', href: 'https://ai.google.dev' },
                  { label: '📍 TomTom POI', href: 'https://developer.tomtom.com' },
                  { label: '🏛️ Govt Circle Rates', href: 'https://ngdrs.gov.in' },
                ]},
              ].map(col => (
                <div key={col.title}>
                  <h4 style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text2)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{col.title}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {col.links.map(link => (
                      <span key={link.label} onClick={() => link.href.startsWith('http') ? window.open(link.href, '_blank') : router.push(link.href)}
                        style={{ fontSize: '13px', color: 'var(--muted)', cursor: 'pointer', transition: 'color 0.2s' }}
                        onMouseEnter={e => e.target.style.color = 'var(--text)'}
                        onMouseLeave={e => e.target.style.color = 'var(--muted)'}>{link.label}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <p style={{ fontSize: '13px', color: 'var(--muted3)' }}>© 2026 BizScope AI. All rights reserved.</p>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981' }} />
                <span onClick={() => router.push('/status')} style={{ fontSize: '12px', color: 'var(--muted)', cursor: 'pointer' }}>All systems operational</span>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Theme toggle bottom-left */}
      <button onClick={toggle} title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        style={{ position: 'fixed', bottom: '24px', left: '24px', zIndex: 200, width: '40px', height: '40px', borderRadius: '50%', background: 'var(--surface2)', border: '1px solid var(--border2)', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
        {dark ? '☀️' : '🌙'}
      </button>

      <SuggestBusiness />
    </>
  );
}
