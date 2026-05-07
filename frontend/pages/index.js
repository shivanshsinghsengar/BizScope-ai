
import API_URL from '../utils/api';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import SuggestBusiness from '../components/SuggestBusiness';
import { useTheme } from '../context/ThemeContext';

/* ─── Loader overlay ─── */
const STEPS = ['geocode','fetch','count','score','ai','done'];
const STEP_LABEL = {
  geocode: 'Locating your area',
  fetch:   'Pulling business data',
  count:   'Counting competitors',
  score:   'Scoring the market',
  ai:      'Running AI analysis',
  done:    'Finishing up',
};

function Loader({ city, step, message, progress }) {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 480);
    return () => clearInterval(t);
  }, []);
  const idx = STEPS.indexOf(step);
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 0,
    }}>
      <div style={{ width: 320, textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
          Analyzing · {city}
        </p>
        <p style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink)', marginBottom: 32, minHeight: 52, lineHeight: 1.4 }}>
          {message || STEP_LABEL[step] || 'Working'}{dots}
        </p>
        <div style={{ height: 2, background: 'var(--line)', borderRadius: 1, overflow: 'hidden', marginBottom: 8 }}>
          <div style={{ height: '100%', background: 'var(--blue)', width: `${progress || 4}%`, transition: 'width 0.5s ease', borderRadius: 1 }} />
        </div>
        <p style={{ fontSize: 11, color: 'var(--ink-4)', marginBottom: 28 }}>{progress || 0}%</p>
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          {STEPS.map((k, i) => (
            <div key={k} style={{
              height: 2, borderRadius: 1,
              width: i === idx ? 20 : 6,
              background: i <= idx ? 'var(--blue)' : 'var(--line)',
              transition: 'all 0.3s',
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Ticker ─── */
function Ticker({ items }) {
  if (!items?.length) return null;
  const doubled = [...items, ...items];
  return (
    <div style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--line)', height: 32, overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
      <span style={{ background: 'var(--red)', color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', padding: '0 10px', height: '100%', display: 'flex', alignItems: 'center', flexShrink: 0 }}>LIVE</span>
      <div style={{ overflow: 'hidden', flex: 1 }}>
        <div className="ticker-track">
          {doubled.map((h, i) => (
            <a key={i} href={h.url} target="_blank" rel="noreferrer"
              style={{ fontSize: 12, color: 'var(--ink-3)', paddingRight: 40, textDecoration: 'none', whiteSpace: 'nowrap' }}
              onMouseEnter={e => e.target.style.color = 'var(--ink)'}
              onMouseLeave={e => e.target.style.color = 'var(--ink-3)'}
            >
              {h.title}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── FAQ row ─── */
function FAQ({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div onClick={() => setOpen(o => !o)} style={{ borderBottom: '1px solid var(--line)', padding: '16px 0', cursor: 'pointer', userSelect: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{q}</span>
        <span style={{ color: 'var(--ink-3)', fontSize: 18, lineHeight: 1, transition: 'transform 0.2s', transform: open ? 'rotate(45deg)' : 'none', flexShrink: 0 }}>+</span>
      </div>
      {open && <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.7, marginTop: 10, paddingRight: 24 }}>{a}</p>}
    </div>
  );
}

export default function Home() {
  const [form, setForm]           = useState({ city: '', address: '', pincode: '' });
  const [loading, setLoading]     = useState(false);
  const [ls, setLs]               = useState({ step: 'geocode', message: '', progress: 0 });
  const [error, setError]         = useState('');
  const [history, setHistory]     = useState([]);
  const [news, setNews]           = useState([]);
  const [newsLoading, setNL]      = useState(true);
  const [cat, setCat]             = useState('All');
  const [insights, setInsights]   = useState(null);
  const [iLoading, setIL]         = useState(false);
  const timer                     = useRef(null);
  const router                    = useRouter();
  const { dark, toggle }          = useTheme();

  useEffect(() => {
    fetch(`${API_URL}/api/news`).then(r => r.json())
      .then(d => { setNews(d.articles || []); setNL(false); })
      .catch(() => setNL(false));
    try { setHistory(JSON.parse(localStorage.getItem('bizscope_history') || '[]').slice(0, 5)); } catch (_) {}
    const p = new URLSearchParams(window.location.search).get('location');
    if (p) setForm(f => ({ ...f, city: p }));
  }, []);

  const saveHistory = loc => {
    try {
      const h = JSON.parse(localStorage.getItem('bizscope_history') || '[]');
      const u = [loc, ...h.filter(x => x !== loc)].slice(0, 5);
      localStorage.setItem('bizscope_history', JSON.stringify(u));
      setHistory(u);
    } catch (_) {}
  };

  const onChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (e.target.name === 'city') {
      clearTimeout(timer.current);
      if (e.target.value.trim().length >= 3) {
        timer.current = setTimeout(() => fetchInsights(e.target.value.trim()), 800);
      } else { setInsights(null); }
    }
  };

  const fetchInsights = async city => {
    setIL(true);
    try {
      const d = await fetch(`${API_URL}/api/city-insights?city=${encodeURIComponent(city)}`).then(r => r.json());
      if (d.insights) setInsights({ city, ...d });
    } catch (_) {}
    setIL(false);
  };

  const onSubmit = async e => {
    e.preventDefault();
    setLoading(true); setError('');
    const loc = [form.address, form.city, form.pincode].filter(p => p.trim()).join(', ');
    setLs({ step: 'geocode', message: '', progress: 8 });
    try {
      const src = new EventSource(`${API_URL}/api/analyze-stream?location=${encodeURIComponent(loc)}`);
      const timeout = setTimeout(() => { src.close(); }, 90000);
      await new Promise((res, rej) => {
        src.onmessage = ev => {
          try {
            const p = JSON.parse(ev.data);
            if (p.step === 'result') {
              src.close(); clearTimeout(timeout);
              if (p.data.error) { rej(new Error(p.data.error)); return; }
              setLs({ step: 'done', message: 'Done!', progress: 100 });
              saveHistory(form.city || form.address);
              sessionStorage.setItem('analysisData', JSON.stringify(p.data));
              setTimeout(() => window.dispatchEvent(new Event('bizscope_trigger_review')), 8000);
              res(p.data);
            } else if (p.step === 'error') {
              src.close(); rej(new Error(p.message || 'Analysis failed.'));
            } else {
              setLs({ step: p.step, message: p.message || '', progress: p.progress || 0 });
            }
          } catch (_) {}
        };
        src.onerror = () => { src.close(); rej(new Error('Connection lost. Please try again.')); };
      });
      router.push('/analysis');
    } catch (err) {
      setError(err.message || 'Analysis failed. Please try again.');
      setLoading(false);
    }
  };

  const filtered = news.filter(a => {
    if (cat === 'All') return true;
    const t = (a.title + ' ' + (a.description || '')).toLowerCase();
    if (cat === 'Startup') return t.includes('startup') || t.includes('founder');
    if (cat === 'AI')      return t.includes(' ai ') || t.includes('openai') || t.includes('gemini');
    if (cat === 'Tech')    return t.includes('tech') || t.includes('software');
    if (cat === 'Funding') return t.includes('fund') || t.includes('million') || t.includes('billion');
    if (cat === 'India')   return t.includes('india') || t.includes('indian');
    return true;
  });

  /* ─── RENDER ─── */
  return (
    <>
      <Head>
        <title>BizScope AI — Free Market Analysis for India</title>
        <meta name="description" content="Analyze competitors, discover market gaps, and find the best business location in India. Free AI-powered market analysis." />
        <meta name="robots" content="index, follow" />
      </Head>

      {loading && <Loader city={form.city || form.address || 'your location'} step={ls.step} message={ls.message} progress={ls.progress} />}

      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--ink)' }}>

        <Ticker items={news.slice(0, 10)} />

        {/* ══════════════ NAV ══════════════ */}
        <header style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid var(--line)', background: 'var(--nav-bg)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
          <div className="container" style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

            {/* Brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 10 L7 3 L12 10" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M4.5 10 L7 6.5 L9.5 10" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
                </svg>
              </div>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.2px' }}>BizScope</span>
            </div>

            {/* Links */}
            <nav className="nav-links" style={{ display: 'flex', gap: 4 }}>
              {[
                { label: 'Features',    fn: () => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }) },
                { label: 'How it works',fn: () => router.push('/how-it-works') },
                { label: 'News',        fn: () => router.push('/news') },
                { label: 'Pricing',     fn: () => router.push('/pricing') },
              ].map(({ label, fn }) => (
                <button key={label} onClick={fn} className="btn-ghost" style={{ fontSize: 13, padding: '6px 12px', border: 'none', background: 'transparent' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--panel)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >{label}</button>
              ))}
            </nav>

            {/* Right */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={toggle} style={{ width: 32, height: 32, borderRadius: 7, border: '1px solid var(--line)', background: 'var(--panel)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {dark ? '☀️' : '🌙'}
              </button>
              <button onClick={() => router.push('/analysis')} className="btn-primary" style={{ fontSize: 13, padding: '7px 14px' }}>
                Open App
              </button>
            </div>
          </div>
        </header>

        <main style={{ flex: 1 }}>

          {/* ══════════════ HERO ══════════════ */}
          <section style={{ padding: '80px 0 64px', borderBottom: '1px solid var(--line)' }}>
            <div className="container">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 64, alignItems: 'center' }} className="responsive-grid-2">

                {/* Left — copy */}
                <div>
                  <div className="badge" style={{ marginBottom: 20, width: 'fit-content' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                    Free · No signup · Real data
                  </div>

                  <h1 style={{ fontSize: 'clamp(32px, 4.5vw, 52px)', fontWeight: 700, lineHeight: 1.08, color: 'var(--ink)', letterSpacing: '-1px', marginBottom: 20 }}>
                    Know your market<br />
                    <span style={{ color: 'var(--blue)' }}>before you invest.</span>
                  </h1>

                  <p style={{ fontSize: 17, color: 'var(--ink-2)', lineHeight: 1.7, maxWidth: 460, marginBottom: 36 }}>
                    Type any city in India. Get real competitor counts, AI business ideas, property prices, and market scores — in under 10 seconds.
                  </p>

                  {/* Stats row */}
                  <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                    {[
                      { n: '50M+', l: 'Businesses indexed' },
                      { n: '195',  l: 'Countries' },
                      { n: '<10s', l: 'Analysis time' },
                    ].map(s => (
                      <div key={s.l}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>{s.n}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right — form card */}
                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--line)', borderRadius: 14, padding: 24 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 16 }}>Analyze a location</p>
                  <form onSubmit={onSubmit}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                      {[
                        { name: 'city',    ph: 'City or area  e.g. Mumbai',       req: true },
                        { name: 'address', ph: 'Street address  (optional)' },
                        { name: 'pincode', ph: 'Pincode  (optional)' },
                      ].map(f => (
                        <div key={f.name}>
                          <input name={f.name} value={form[f.name]} onChange={onChange}
                            placeholder={f.ph} required={!!f.req} className="input-field"
                            style={{ fontSize: 13 }}
                          />
                          {f.name === 'city' && (iLoading || insights) && (
                            <div style={{ marginTop: 6, padding: '8px 10px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 7 }}>
                              {iLoading
                                ? <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: 0 }}>Getting insights…</p>
                                : insights && <>
                                    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>AI snapshot · {insights.city}</p>
                                    {insights.insights?.slice(0, 3).map((ins, i) => (
                                      <p key={i} style={{ fontSize: 12, color: 'var(--ink-2)', margin: '0 0 3px', lineHeight: 1.5 }}>· {ins}</p>
                                    ))}
                                  </>
                              }
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {error && <p style={{ fontSize: 13, color: 'var(--red)', marginBottom: 10 }}>{error}</p>}

                    {history.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <p style={{ fontSize: 11, color: 'var(--ink-4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Recent</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {history.map(h => (
                            <button key={h} type="button" onClick={() => setForm(f => ({ ...f, city: h }))} className="btn-secondary" style={{ fontSize: 12, padding: '3px 9px' }}>{h}</button>
                          ))}
                        </div>
                      </div>
                    )}

                    <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px 0', fontSize: 14 }}>
                      {loading ? 'Analyzing…' : 'Analyze Market →'}
                    </button>
                  </form>

                  {/* Quick picks */}
                  <div style={{ marginTop: 12, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {['Mumbai', 'Delhi', 'Bangalore', 'Jaipur', 'Pune'].map(c => (
                      <button key={c} onClick={() => setForm(f => ({ ...f, city: c }))} className="btn-secondary" style={{ fontSize: 11, padding: '3px 8px' }}>{c}</button>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </section>

          {/* ══════════════ FEATURES ══════════════ */}
          <section id="features" style={{ padding: '72px 0', borderBottom: '1px solid var(--line)' }}>
            <div className="container">
              <div style={{ marginBottom: 48 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Features</p>
                <h2 style={{ fontSize: 'clamp(24px, 3vw, 34px)', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.5px', marginBottom: 12 }}>
                  Everything you need to decide
                </h2>
                <p style={{ fontSize: 16, color: 'var(--ink-2)', maxWidth: 480 }}>
                  Real data, not guesses. Every insight is backed by live OpenStreetMap and Gemini AI.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--line)', borderRadius: 12, overflow: 'hidden' }} className="responsive-grid-3">
                {[
                  { icon: '◎', title: 'Competitor Analysis',  desc: 'See every business within 5 km. Know exactly how crowded the market is before you commit a rupee.' },
                  { icon: '◈', title: 'Market Scoring',       desc: 'Each category gets a saturation score. Low = open opportunity. High = think twice.' },
                  { icon: '⬡', title: 'Property Finder',      desc: 'Commercial spaces for rent or sale near your location, with government circle rate estimates.' },
                  { icon: '◇', title: 'AI Recommendations',   desc: 'Gemini AI reads your local market data and suggests the 5 best businesses to start there.' },
                  { icon: '◉', title: 'Interactive Map',      desc: 'Every competitor and property plotted on a live map. Spot clusters and gaps instantly.' },
                  { icon: '◌', title: 'Profit Estimates',     desc: 'Revenue projections based on local demand, competition density, and category benchmarks.' },
                ].map((f) => (
                  <div key={f.title} style={{ background: 'var(--bg)', padding: '28px 24px', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--bg)'}
                  >
                    <div style={{ fontSize: 20, color: 'var(--blue)', marginBottom: 14, lineHeight: 1 }}>{f.icon}</div>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>{f.title}</h3>
                    <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.65 }}>{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ══════════════ HOW IT WORKS ══════════════ */}
          <section style={{ padding: '72px 0', borderBottom: '1px solid var(--line)' }}>
            <div className="container">
              <div style={{ marginBottom: 48 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Process</p>
                <h2 style={{ fontSize: 'clamp(24px, 3vw, 34px)', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.5px' }}>
                  Three steps. Under 10 seconds.
                </h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }} className="responsive-grid-3">
                {[
                  { n: '01', title: 'Enter a location',   desc: 'City, address, or pincode — anything works. We geocode it precisely.' },
                  { n: '02', title: 'We fetch real data', desc: 'TomTom + OpenStreetMap + Gemini AI run in parallel to build your report.' },
                  { n: '03', title: 'You get insights',   desc: 'Competitors, properties, market scores, and AI tips — all in one clean report.' },
                ].map((s, i) => (
                  <div key={s.n} style={{ position: 'relative' }}>
                    {i < 2 && (
                      <div style={{ position: 'absolute', top: 20, left: 'calc(100% + 12px)', width: 24, height: 1, background: 'var(--line)' }} className="hide-mobile" />
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 9, border: '1px solid var(--line)', background: 'var(--panel)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', flexShrink: 0 }}>{s.n}</div>
                      <div style={{ height: 1, flex: 1, background: 'var(--line)' }} />
                    </div>
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>{s.title}</h3>
                    <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.65 }}>{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ══════════════ TESTIMONIALS ══════════════ */}
          <section style={{ padding: '72px 0', borderBottom: '1px solid var(--line)' }}>
            <div className="container">
              <div style={{ marginBottom: 48 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Reviews</p>
                <h2 style={{ fontSize: 'clamp(24px, 3vw, 34px)', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.5px' }}>
                  What entrepreneurs say
                </h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }} className="responsive-grid-2">
                {[
                  { name: 'Rahul Sharma',  city: 'Mumbai',    role: 'Restaurant owner',    initials: 'RS', text: 'I was about to open in Andheri. BizScope showed me 47 restaurants already there. I shifted to Malad — much better. Saved me lakhs.' },
                  { name: 'Priya Gupta',   city: 'Jaipur',    role: 'Salon entrepreneur',  initials: 'PG', text: 'The AI suggestions were spot on. It pointed me to a salon near a college area. 200+ customers in the first month.' },
                  { name: 'Amit Verma',    city: 'Delhi',     role: 'Grocery store owner', initials: 'AV', text: 'The property price data helped me negotiate rent. I showed the circle rates to my landlord and got 15% off.' },
                  { name: 'Sunita Patel',  city: 'Ahmedabad', role: 'Clothing boutique',   initials: 'SP', text: 'Free tool with data quality I expected to pay thousands for. The competitor map alone is worth it.' },
                ].map((t) => (
                  <div key={t.name} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--line)', borderRadius: 12, padding: '22px 24px' }}>
                    <div style={{ display: 'flex', gap: 2, marginBottom: 14 }}>
                      {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize: 12, color: 'var(--amber)' }}>★</span>)}
                    </div>
                    <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.7, marginBottom: 18 }}>"{t.text}"</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--panel)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', flexShrink: 0 }}>{t.initials}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{t.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{t.role} · {t.city}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ══════════════ NEWS ══════════════ */}
          <section style={{ padding: '72px 0', borderBottom: '1px solid var(--line)' }}>
            <div className="container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Innovation News</p>
                  <h2 style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.5px' }}>
                    What's happening in tech
                  </h2>
                </div>
                <button onClick={() => router.push('/news')} className="btn-ghost">View all →</button>
              </div>

              {/* Category tabs */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 24, overflowX: 'auto', paddingBottom: 2 }}>
                {['All', 'Startup', 'AI', 'Tech', 'Funding', 'India'].map(c => (
                  <button key={c} onClick={() => setCat(c)} style={{
                    padding: '5px 13px', borderRadius: 6, border: '1px solid var(--line)',
                    cursor: 'pointer', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0,
                    background: cat === c ? 'var(--blue)' : 'var(--panel)',
                    color: cat === c ? '#fff' : 'var(--ink-3)',
                    fontFamily: 'inherit', transition: 'all 0.15s',
                  }}>{c}</button>
                ))}
              </div>

              {newsLoading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                  {[1,2,3,4,5,6].map(i => <div key={i} className="shimmer" style={{ height: 140, borderRadius: 10 }} />)}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                  {filtered.slice(0, 9).map((a, i) => (
                    <a key={i} href={a.url} target="_blank" rel="noreferrer"
                      style={{ display: 'block', background: 'var(--bg-elevated)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden', textDecoration: 'none', transition: 'border-color 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--line-strong)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--line)'}
                    >
                      {a.urlToImage && (
                        <div style={{ height: 110, overflow: 'hidden', background: 'var(--panel)' }}>
                          <img src={a.urlToImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.parentElement.style.display = 'none'; }} />
                        </div>
                      )}
                      <div style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--blue)', background: 'var(--blue-dim)', padding: '2px 6px', borderRadius: 4 }}>{a.source}</span>
                          <span style={{ fontSize: 10, color: 'var(--ink-4)' }}>
                            {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                          </span>
                        </div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.5, margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {a.title}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ══════════════ FAQ ══════════════ */}
          <section style={{ padding: '72px 0', borderBottom: '1px solid var(--line)' }}>
            <div className="container">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'start' }} className="responsive-grid-2">
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>FAQ</p>
                  <h2 style={{ fontSize: 'clamp(24px, 3vw, 34px)', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.5px', marginBottom: 16 }}>
                    Common questions
                  </h2>
                  <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.7 }}>
                    Everything you need to know about BizScope AI. Can't find an answer? Reach out to us.
                  </p>
                </div>
                <div>
                  {[
                    { q: 'Is BizScope AI really free?', a: 'Yes, completely free. No credit card, no signup required for basic analysis. Just enter a city and get results instantly.' },
                    { q: 'How accurate is the data?', a: 'Business data comes from OpenStreetMap — the same source used by Apple Maps, Wikipedia, and Uber. It covers 50M+ businesses worldwide.' },
                    { q: 'How often is the data updated?', a: 'OpenStreetMap data is updated in real-time by contributors. Our cache refreshes every 2 hours.' },
                    { q: 'Can I use this for any city in India?', a: 'Yes — any city, town, or area in India (and 195 other countries). Just type the name and we\'ll find it.' },
                    { q: 'How does the AI recommendation work?', a: 'After fetching real competitor data, we send the market statistics to Google Gemini AI which suggests the 5 best businesses to start in your area.' },
                  ].map((f, i) => <FAQ key={i} q={f.q} a={f.a} />)}
                </div>
              </div>
            </div>
          </section>

          {/* ══════════════ CTA BANNER ══════════════ */}
          <section style={{ padding: '72px 0' }}>
            <div className="container">
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--line)', borderRadius: 16, padding: '48px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
                <div>
                  <h2 style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.5px', marginBottom: 8 }}>
                    Ready to find your opportunity?
                  </h2>
                  <p style={{ fontSize: 15, color: 'var(--ink-2)' }}>Free. No signup. Results in under 10 seconds.</p>
                </div>
                <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="btn-primary" style={{ fontSize: 14, padding: '11px 24px' }}>
                  Analyze a city →
                </button>
              </div>
            </div>
          </section>

        </main>

        {/* ══════════════ FOOTER ══════════════ */}
        <footer style={{ borderTop: '1px solid var(--line)', background: 'var(--bg-elevated)' }}>
          <div className="container" style={{ padding: '40px 24px 28px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 32, marginBottom: 32 }} className="responsive-grid-2">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                      <path d="M2 10 L7 3 L12 10" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>BizScope AI</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.7, maxWidth: 240 }}>
                  AI-powered business intelligence for Indian entrepreneurs. Free forever.
                </p>
              </div>
              {[
                { title: 'Product', links: [{ l: 'Features', h: '/#features' }, { l: 'Pricing', h: '/pricing' }, { l: 'How it Works', h: '/how-it-works' }, { l: 'Docs', h: '/docs' }] },
                { title: 'Company', links: [{ l: 'About', h: '/about' }, { l: 'Privacy', h: '/privacy' }, { l: 'Terms', h: '/terms' }, { l: 'List Business', h: '/register' }] },
                { title: 'Data', links: [{ l: 'OpenStreetMap', h: 'https://www.openstreetmap.org/copyright' }, { l: 'Google Gemini', h: 'https://ai.google.dev' }, { l: 'TomTom POI', h: 'https://developer.tomtom.com' }] },
              ].map(col => (
                <div key={col.title}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>{col.title}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {col.links.map(link => (
                      <span key={link.l} onClick={() => link.h.startsWith('http') ? window.open(link.h, '_blank') : router.push(link.h)}
                        style={{ fontSize: 13, color: 'var(--ink-3)', cursor: 'pointer', transition: 'color 0.15s' }}
                        onMouseEnter={e => e.target.style.color = 'var(--ink)'}
                        onMouseLeave={e => e.target.style.color = 'var(--ink-3)'}
                      >{link.l}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <p style={{ fontSize: 12, color: 'var(--ink-4)' }}>© 2026 BizScope AI. All rights reserved.</p>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
                <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>All systems operational</span>
              </div>
            </div>
          </div>
        </footer>

      </div>

      <SuggestBusiness />
    </>
  );
}
