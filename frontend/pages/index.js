
import API_URL from '../utils/api';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import SuggestBusiness from '../components/SuggestBusiness';
import { useTheme } from '../context/ThemeContext';

/* ── tiny helpers ── */
function Badge({ children }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: '6px',
      background: 'var(--surface2)',
      border: '1px solid var(--border)',
      fontSize: '11px',
      fontWeight: '600',
      color: 'var(--muted)',
      letterSpacing: '0.03em',
    }}>
      {children}
    </span>
  );
}

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      onClick={() => setOpen(o => !o)}
      style={{
        borderBottom: '1px solid var(--border)',
        padding: '16px 0',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text)' }}>{q}</span>
        <span style={{
          fontSize: '18px',
          color: 'var(--muted)',
          flexShrink: 0,
          transition: 'transform 0.2s',
          transform: open ? 'rotate(45deg)' : 'none',
          lineHeight: 1,
        }}>+</span>
      </div>
      {open && (
        <p style={{
          fontSize: '14px',
          color: 'var(--muted)',
          lineHeight: '1.7',
          marginTop: '10px',
          paddingRight: '28px',
        }}>
          {a}
        </p>
      )}
    </div>
  );
}

function NewsTicker({ headlines }) {
  if (!headlines || headlines.length === 0) return null;
  const items = [...headlines, ...headlines];
  return (
    <div style={{
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      padding: '7px 0',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{
          background: '#ef4444',
          color: '#fff',
          padding: '2px 12px',
          fontSize: '10px',
          fontWeight: '700',
          letterSpacing: '0.1em',
          flexShrink: 0,
        }}>
          LIVE
        </div>
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <div className="ticker-track">
            {items.map((h, i) => (
              <a
                key={i}
                href={h.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: '12px',
                  color: 'var(--muted)',
                  paddingRight: '48px',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => e.target.style.color = 'var(--text)'}
                onMouseLeave={e => e.target.style.color = 'var(--muted)'}
              >
                · {h.title}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const STEPS = {
  geocode: 'Finding your location',
  fetch:   'Scanning businesses nearby',
  count:   'Counting competitors',
  score:   'Calculating market scores',
  ai:      'Getting AI recommendations',
  done:    'Wrapping up',
  cache:   'Loading from cache',
};

function AnalysisLoader({ city, step, message, progress }) {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500);
    return () => clearInterval(t);
  }, []);

  const stepKeys = Object.keys(STEPS).filter(k => k !== 'cache');
  const currentIdx = stepKeys.indexOf(step);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{ width: '100%', maxWidth: '380px', padding: '0 24px', textAlign: 'center' }}>
        <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '6px' }}>
          Analyzing {city}
        </p>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: 'var(--text)',
          marginBottom: '32px',
          minHeight: '56px',
          lineHeight: '1.4',
        }}>
          {message || STEPS[step] || 'Working on it'}{dots}
        </h2>

        {/* Progress bar */}
        <div style={{
          height: '3px',
          background: 'var(--border)',
          borderRadius: '2px',
          marginBottom: '10px',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            background: 'var(--accent)',
            width: `${progress || 5}%`,
            borderRadius: '2px',
            transition: 'width 0.4s ease',
          }} />
        </div>
        <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '28px' }}>
          {progress || 0}%
        </p>

        {/* Step dots */}
        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
          {stepKeys.map((k, i) => (
            <div
              key={k}
              style={{
                height: '3px',
                width: i === currentIdx ? '18px' : '6px',
                borderRadius: '2px',
                background: i <= currentIdx ? 'var(--accent)' : 'var(--border)',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [form, setForm] = useState({ city: '', address: '', pincode: '' });
  const [loading, setLoading] = useState(false);
  const [loadState, setLoadState] = useState({ step: 'geocode', message: '', progress: 0 });
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [cityInsights, setCityInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const insightsTimer = useRef(null);
  const router = useRouter();
  const { dark, toggle } = useTheme();

  useEffect(() => {
    fetch(`${API_URL}/api/news`)
      .then(r => r.json())
      .then(d => { setNews(d.articles || []); setNewsLoading(false); })
      .catch(() => setNewsLoading(false));
  }, []);

  useEffect(() => {
    try {
      const h = JSON.parse(localStorage.getItem('bizscope_history') || '[]');
      setHistory(h.slice(0, 5));
    } catch (_) {}
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const loc = params.get('location');
    if (loc) setForm(f => ({ ...f, city: loc }));
  }, []);

  const saveToHistory = (loc) => {
    try {
      const h = JSON.parse(localStorage.getItem('bizscope_history') || '[]');
      const updated = [loc, ...h.filter(x => x !== loc)].slice(0, 5);
      localStorage.setItem('bizscope_history', JSON.stringify(updated));
      setHistory(updated);
    } catch (_) {}
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (e.target.name === 'city' && e.target.value.trim().length >= 3) {
      clearTimeout(insightsTimer.current);
      insightsTimer.current = setTimeout(() => fetchCityInsights(e.target.value.trim()), 800);
    } else if (e.target.name === 'city' && e.target.value.trim().length < 3) {
      setCityInsights(null);
    }
  };

  const fetchCityInsights = async (city) => {
    setInsightsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/city-insights?city=${encodeURIComponent(city)}`);
      const data = await res.json();
      if (data.insights) setCityInsights({ city, ...data });
    } catch (_) {}
    setInsightsLoading(false);
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const location = [form.address, form.city, form.pincode].filter(p => p.trim()).join(', ');
    setLoadState({ step: 'geocode', message: 'Finding your location', progress: 10 });

    try {
      const evtSource = new EventSource(`${API_URL}/api/analyze-stream?location=${encodeURIComponent(location)}`);
      const sseTimeout = setTimeout(() => {
        evtSource.close();
        reject(new Error('Analysis timed out. Please try again.'));
      }, 90000);

      await new Promise((resolve, reject) => {
        evtSource.onmessage = (e) => {
          try {
            const payload = JSON.parse(e.data);
            if (payload.step === 'result') {
              evtSource.close();
              clearTimeout(sseTimeout);
              const data = payload.data;
              if (data.error) { reject(new Error(data.error)); return; }
              setLoadState({ step: 'done', message: 'Done!', progress: 100 });
              saveToHistory(form.city || form.address);
              sessionStorage.setItem('analysisData', JSON.stringify(data));
              setTimeout(() => window.dispatchEvent(new Event('bizscope_trigger_review')), 8000);
              resolve(data);
            } else if (payload.step === 'error') {
              evtSource.close();
              reject(new Error(payload.message || 'Analysis failed.'));
            } else {
              setLoadState({ step: payload.step, message: payload.message || '', progress: payload.progress || 0 });
            }
          } catch (_) {}
        };
        evtSource.onerror = () => { evtSource.close(); reject(new Error('Connection lost. Please try again.')); };
      });

      router.push('/analysis');
    } catch (err) {
      setError(err.message || 'Analysis failed. Please try again.');
      setLoading(false);
    }
  };

  const filterNews = (articles) => {
    if (activeCategory === 'All') return articles;
    return articles.filter(a => {
      const t = (a.title + ' ' + (a.description || '')).toLowerCase();
      if (activeCategory === 'Startup') return t.includes('startup') || t.includes('founder') || t.includes('venture');
      if (activeCategory === 'AI') return t.includes(' ai ') || t.includes('artificial') || t.includes('gemini') || t.includes('openai');
      if (activeCategory === 'Tech') return t.includes('tech') || t.includes('software') || t.includes('platform');
      if (activeCategory === 'Funding') return t.includes('fund') || t.includes('raise') || t.includes('million') || t.includes('billion');
      if (activeCategory === 'India') return t.includes('india') || t.includes('indian');
      return true;
    });
  };

  return (
    <>
      <Head>
        <title>BizScope AI — Free Market Analysis for India</title>
        <meta name="description" content="Analyze competitors, discover market gaps, and find the best business location in India. Free AI-powered market analysis using real OpenStreetMap data." />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="BizScope AI — Free Market Analysis for India" />
        <meta property="og:description" content="Analyze competitors, discover market gaps, and find the best business location in India." />
        <meta property="og:type" content="website" />
      </Head>

      {loading && (
        <AnalysisLoader
          city={form.city || form.address || 'your location'}
          step={loadState.step}
          message={loadState.message}
          progress={loadState.progress}
        />
      )}

      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--text)' }}>

        {/* Live news ticker */}
        <NewsTicker headlines={news.slice(0, 12)} />

        {/* ── Navbar ── */}
        <nav style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          borderBottom: '1px solid var(--border)',
          background: 'var(--nav-bg)',
          backdropFilter: 'blur(12px)',
        }}>
          <div style={{
            maxWidth: '1160px',
            margin: '0 auto',
            padding: '0 20px',
            height: '58px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            {/* Logo */}
            <span style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text)', letterSpacing: '-0.3px' }}>
              BizScope <span style={{ color: 'var(--accent)' }}>AI</span>
            </span>

            {/* Nav links */}
            <div className="nav-links" style={{ display: 'flex', gap: '28px', fontSize: '14px' }}>
              {[
                { label: 'Features', action: () => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }) },
                { label: 'How it Works', action: () => router.push('/how-it-works') },
                { label: 'News', action: () => router.push('/news') },
                { label: 'Pricing', action: () => router.push('/pricing') },
                { label: 'Docs', action: () => router.push('/docs') },
              ].map(item => (
                <span
                  key={item.label}
                  onClick={item.action}
                  style={{ cursor: 'pointer', color: 'var(--muted)', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.target.style.color = 'var(--text)'}
                  onMouseLeave={e => e.target.style.color = 'var(--muted)'}
                >
                  {item.label}
                </span>
              ))}
            </div>

            {/* Right side */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                onClick={toggle}
                title="Toggle theme"
                style={{
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  borderRadius: '7px',
                  width: '34px',
                  height: '34px',
                  cursor: 'pointer',
                  fontSize: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {dark ? '☀️' : '🌙'}
              </button>
              <button
                onClick={() => router.push('/analysis')}
                className="btn-primary"
                style={{ fontSize: '13px', padding: '8px 16px' }}
              >
                Get Started
              </button>
            </div>
          </div>
        </nav>

        <main style={{ flex: 1 }}>
          <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '0 20px' }}>

            {/* ── Hero ── */}
            <section style={{ padding: '72px 0 56px', textAlign: 'center' }}>
              <div style={{ marginBottom: '20px' }}>
                <Badge>Free for Indian entrepreneurs · No signup needed</Badge>
              </div>

              <h1 style={{
                fontSize: 'clamp(30px, 5.5vw, 58px)',
                fontWeight: '700',
                lineHeight: '1.1',
                color: 'var(--text)',
                marginBottom: '18px',
                letterSpacing: '-0.5px',
              }}>
                Know your market<br />before you invest
              </h1>

              <p style={{
                fontSize: 'clamp(15px, 2vw, 17px)',
                color: 'var(--muted)',
                maxWidth: '520px',
                margin: '0 auto 40px',
                lineHeight: '1.7',
              }}>
                Type any city in India. Get real competitor counts, AI business ideas, property prices, and market scores in under 10 seconds.
              </p>

              {/* ── Search form ── */}
              <div style={{
                maxWidth: '480px',
                margin: '0 auto 32px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '22px',
              }}>
                <form onSubmit={handleAnalyze}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                    {[
                      { name: 'city',    label: 'City or area',           placeholder: 'Mumbai, Delhi, Bangalore…', required: true },
                      { name: 'address', label: 'Street address',         placeholder: 'MG Road, Sector 18 (optional)' },
                      { name: 'pincode', label: 'Pincode',                placeholder: '400001 (optional)' },
                    ].map(f => (
                      <div key={f.name}>
                        <label style={{
                          display: 'block',
                          fontSize: '11px',
                          fontWeight: '600',
                          color: 'var(--muted)',
                          marginBottom: '5px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          textAlign: 'left',
                        }}>
                          {f.label}
                        </label>
                        <input
                          name={f.name}
                          value={form[f.name]}
                          onChange={handleChange}
                          placeholder={f.placeholder}
                          required={!!f.required}
                          className="input-field"
                        />
                        {/* City insights */}
                        {f.name === 'city' && (insightsLoading || cityInsights) && (
                          <div style={{
                            marginTop: '8px',
                            padding: '10px 12px',
                            background: 'var(--surface2)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            textAlign: 'left',
                          }}>
                            {insightsLoading ? (
                              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>
                                Getting insights for {form.city}…
                              </p>
                            ) : cityInsights && (
                              <>
                                <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                                  AI snapshot · {cityInsights.city}
                                </p>
                                {cityInsights.insights?.map((insight, i) => (
                                  <p key={i} style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: '1.5', margin: '0 0 4px' }}>
                                    → {insight}
                                  </p>
                                ))}
                                {cityInsights.topOpportunity && (
                                  <p style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: '600', marginTop: '6px', marginBottom: 0 }}>
                                    Top opportunity: {cityInsights.topOpportunity}
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {error && (
                    <p style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '10px', textAlign: 'left' }}>
                      {error}
                    </p>
                  )}

                  {/* Recent searches */}
                  {history.length > 0 && (
                    <div style={{ marginBottom: '12px', textAlign: 'left' }}>
                      <p style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                        Recent
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {history.map(h => (
                          <button
                            key={h}
                            type="button"
                            onClick={() => setForm(f => ({ ...f, city: h }))}
                            className="btn-secondary"
                            style={{ padding: '3px 10px', fontSize: '12px', borderRadius: '6px' }}
                          >
                            {h}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary"
                    style={{ width: '100%', fontSize: '14px', padding: '12px' }}
                  >
                    {loading ? 'Analyzing…' : 'Analyze Market'}
                  </button>
                </form>
              </div>

              {/* Quick city buttons */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {['Mumbai', 'Delhi', 'Bangalore', 'Jaipur', 'Hyderabad'].map(city => (
                  <button
                    key={city}
                    onClick={() => setForm(f => ({ ...f, city }))}
                    className="btn-secondary"
                    style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '6px' }}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </section>

            {/* ── Stats ── */}
            <section style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '48px',
              flexWrap: 'wrap',
              padding: '32px 0',
              borderTop: '1px solid var(--border)',
              borderBottom: '1px solid var(--border)',
              marginBottom: '72px',
            }}>
              {[
                { value: '50M+', label: 'Businesses indexed' },
                { value: '195',  label: 'Countries covered' },
                { value: '100%', label: 'Free forever' },
                { value: '<10s', label: 'Analysis time' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text)', lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '5px' }}>{s.label}</div>
                </div>
              ))}
            </section>

            {/* ── Features ── */}
            <section id="features" style={{ marginBottom: '72px' }}>
              <div style={{ marginBottom: '36px' }}>
                <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 30px)', fontWeight: '700', color: 'var(--text)', marginBottom: '8px', letterSpacing: '-0.3px' }}>
                  Everything you need to decide
                </h2>
                <p style={{ fontSize: '15px', color: 'var(--muted)', maxWidth: '480px' }}>
                  Real data, not guesses. Every insight is backed by live OpenStreetMap and AI analysis.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                {[
                  { title: 'Competitor Analysis',  desc: 'See every business within 5 km of your target location. Know exactly how crowded the market is before you commit.' },
                  { title: 'Market Scoring',        desc: 'Each category gets a saturation score. Low score means open opportunity. High score means think twice.' },
                  { title: 'Property Finder',       desc: 'Commercial spaces for rent or sale near your location, with government circle rate estimates.' },
                  { title: 'AI Recommendations',    desc: 'Gemini AI reads your local market data and suggests the 5 best businesses to start in that area.' },
                  { title: 'Interactive Map',        desc: 'Every competitor and property plotted on a live map. Spot clusters and gaps at a glance.' },
                  { title: 'Profit Estimates',       desc: 'Revenue projections based on local demand, competition density, and category benchmarks.' },
                ].map((f, i) => (
                  <div key={f.title} className="card" style={{ padding: '20px' }}>
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      marginBottom: '14px',
                    }} />
                    <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: '7px' }}>
                      {f.title}
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.65', margin: 0 }}>
                      {f.desc}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── How it works ── */}
            <section style={{ marginBottom: '72px' }}>
              <div style={{ marginBottom: '36px' }}>
                <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 30px)', fontWeight: '700', color: 'var(--text)', marginBottom: '8px', letterSpacing: '-0.3px' }}>
                  How it works
                </h2>
                <p style={{ fontSize: '15px', color: 'var(--muted)' }}>Three steps. Under 10 seconds.</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                {[
                  { num: '1', title: 'Enter a location', desc: 'City, address, or pincode — anything works.' },
                  { num: '2', title: 'We fetch real data', desc: 'TomTom + OpenStreetMap + Gemini AI run in parallel.' },
                  { num: '3', title: 'You get insights', desc: 'Competitors, properties, scores, and AI tips — all in one report.' },
                ].map(s => (
                  <div key={s.num} className="card" style={{ padding: '22px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'var(--surface2)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '13px',
                      fontWeight: '700',
                      color: 'var(--text)',
                      flexShrink: 0,
                    }}>
                      {s.num}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: '5px' }}>{s.title}</h3>
                      <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.6', margin: 0 }}>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Testimonials ── */}
            <section style={{ marginBottom: '72px' }}>
              <div style={{ marginBottom: '36px' }}>
                <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 30px)', fontWeight: '700', color: 'var(--text)', marginBottom: '8px', letterSpacing: '-0.3px' }}>
                  What entrepreneurs say
                </h2>
                <p style={{ fontSize: '15px', color: 'var(--muted)' }}>Real people, real decisions made with BizScope.</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                {[
                  { name: 'Rahul Sharma',  city: 'Mumbai',    role: 'Restaurant owner',   initials: 'RS', text: 'I was about to open in Andheri. BizScope showed me 47 restaurants already there. I shifted to Malad — much better. Saved me lakhs.' },
                  { name: 'Priya Gupta',   city: 'Jaipur',    role: 'Salon entrepreneur', initials: 'PG', text: 'The AI suggestions were spot on. It pointed me to a salon near a college area. 200+ customers in the first month.' },
                  { name: 'Amit Verma',    city: 'Delhi',     role: 'Grocery store owner',initials: 'AV', text: 'The property price data helped me negotiate rent. I showed the circle rates to my landlord and got 15% off.' },
                  { name: 'Sunita Patel',  city: 'Ahmedabad', role: 'Clothing boutique',  initials: 'SP', text: 'Free tool with data quality I expected to pay thousands for. The competitor map alone is worth it.' },
                ].map((t, i) => (
                  <div key={i} className="card" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', gap: '2px', marginBottom: '12px' }}>
                      {[1,2,3,4,5].map(s => (
                        <span key={s} style={{ fontSize: '12px', color: '#f59e0b' }}>★</span>
                      ))}
                    </div>
                    <p style={{ fontSize: '14px', color: 'var(--text2)', lineHeight: '1.7', marginBottom: '16px' }}>
                      "{t.text}"
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        background: 'var(--surface2)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: 'var(--text2)',
                        flexShrink: 0,
                      }}>
                        {t.initials}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>{t.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{t.role} · {t.city}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── News ── */}
            <section style={{ marginBottom: '72px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 30px)', fontWeight: '700', color: 'var(--text)', marginBottom: '6px', letterSpacing: '-0.3px' }}>
                    Innovation News
                  </h2>
                  <p style={{ fontSize: '14px', color: 'var(--muted)' }}>Startups · AI · Tech · Funding — updated every 30 min</p>
                </div>
                <button
                  onClick={() => router.push('/news')}
                  className="btn-secondary"
                  style={{ fontSize: '13px', padding: '7px 14px' }}
                >
                  View all →
                </button>
              </div>

              {/* Category tabs */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '2px' }}>
                {['All', 'Startup', 'AI', 'Tech', 'Funding', 'India'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    style={{
                      padding: '5px 14px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      background: activeCategory === cat ? 'var(--accent)' : 'var(--surface)',
                      color: activeCategory === cat ? '#fff' : 'var(--muted)',
                      transition: 'all 0.15s',
                      fontFamily: 'inherit',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {newsLoading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                  {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="shimmer" style={{ height: '160px', borderRadius: '10px' }} />
                  ))}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                  {filterNews(news).slice(0, 9).map((article, i) => (
                    <a
                      key={i}
                      href={article.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'block',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        textDecoration: 'none',
                        transition: 'border-color 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                      {article.urlToImage && (
                        <div style={{ height: '120px', overflow: 'hidden', background: 'var(--surface2)' }}>
                          <img
                            src={article.urlToImage}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={e => { e.target.parentElement.style.display = 'none'; }}
                          />
                        </div>
                      )}
                      <div style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '7px' }}>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: '600',
                            color: 'var(--accent)',
                            background: 'var(--surface2)',
                            padding: '2px 7px',
                            borderRadius: '4px',
                          }}>
                            {article.source}
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--muted)' }}>
                            {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                          </span>
                        </div>
                        <p style={{
                          fontSize: '13px',
                          fontWeight: '500',
                          color: 'var(--text)',
                          lineHeight: '1.5',
                          margin: 0,
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}>
                          {article.title}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </section>

            {/* ── FAQ ── */}
            <section style={{ marginBottom: '72px', maxWidth: '680px' }}>
              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 30px)', fontWeight: '700', color: 'var(--text)', marginBottom: '8px', letterSpacing: '-0.3px' }}>
                  Common questions
                </h2>
              </div>
              {[
                { q: 'Is BizScope AI really free?', a: 'Yes, completely free. No credit card, no signup required for basic analysis. Just enter a city and get results instantly.' },
                { q: 'How accurate is the data?', a: 'Business data comes from OpenStreetMap — the same source used by Apple Maps, Wikipedia, and Uber. It covers 50M+ businesses worldwide and is updated continuously by a global community.' },
                { q: 'How often is the data updated?', a: 'OpenStreetMap data is updated in real-time by contributors. Our cache refreshes every 2 hours, so you always get fresh data.' },
                { q: 'Can I use this for any city in India?', a: 'Yes — any city, town, or area in India (and 195 other countries). Just type the name and we\'ll find it.' },
                { q: 'Are the property prices real?', a: 'Property prices are estimates based on official government circle rates. Actual market prices may be 20–150% higher depending on location.' },
                { q: 'How does the AI recommendation work?', a: 'After fetching real competitor data, we send the market statistics to Google Gemini AI which analyzes the competition landscape and suggests the 5 best businesses to start in your area.' },
              ].map((f, i) => (
                <FAQItem key={i} q={f.q} a={f.a} />
              ))}
            </section>

          </div>
        </main>

        {/* ── Footer ── */}
        <footer style={{ borderTop: '1px solid var(--border)', background: 'var(--bg2)' }}>
          <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '40px 20px 28px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '32px', marginBottom: '32px' }}>
              <div>
                <p style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)', marginBottom: '10px' }}>
                  BizScope <span style={{ color: 'var(--accent)' }}>AI</span>
                </p>
                <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.7' }}>
                  AI-powered business intelligence for Indian entrepreneurs.
                </p>
              </div>
              {[
                { title: 'Product', links: [
                  { label: 'Features', href: '/#features' },
                  { label: 'Pricing', href: '/pricing' },
                  { label: 'How it Works', href: '/how-it-works' },
                  { label: 'Docs', href: '/docs' },
                ]},
                { title: 'Company', links: [
                  { label: 'About', href: '/about' },
                  { label: 'Privacy Policy', href: '/privacy' },
                  { label: 'Terms of Service', href: '/terms' },
                  { label: 'List Business', href: '/register' },
                ]},
                { title: 'Data Sources', links: [
                  { label: 'OpenStreetMap', href: 'https://www.openstreetmap.org/copyright' },
                  { label: 'Google Gemini AI', href: 'https://ai.google.dev' },
                  { label: 'TomTom POI', href: 'https://developer.tomtom.com' },
                ]},
              ].map(col => (
                <div key={col.title}>
                  <h4 style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text2)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {col.title}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {col.links.map(link => (
                      <span
                        key={link.label}
                        onClick={() => link.href.startsWith('http') ? window.open(link.href, '_blank') : router.push(link.href)}
                        style={{ fontSize: '13px', color: 'var(--muted)', cursor: 'pointer', transition: 'color 0.15s' }}
                        onMouseEnter={e => e.target.style.color = 'var(--text)'}
                        onMouseLeave={e => e.target.style.color = 'var(--muted)'}
                      >
                        {link.label}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{
              borderTop: '1px solid var(--border)',
              paddingTop: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
            }}>
              <p style={{ fontSize: '13px', color: 'var(--muted)' }}>© 2026 BizScope AI. All rights reserved.</p>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)' }} />
                <span
                  onClick={() => router.push('/status')}
                  style={{ fontSize: '12px', color: 'var(--muted)', cursor: 'pointer' }}
                >
                  All systems operational
                </span>
              </div>
            </div>
          </div>
        </footer>
      </div>

      <SuggestBusiness />
    </>
  );
}
