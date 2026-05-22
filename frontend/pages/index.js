import API_URL from '../utils/api';
import { trackEvent } from '../utils/analytics';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import SuggestBusiness from '../components/SuggestBusiness';
import { useTheme } from '../context/ThemeContext';
import ParticleBackground from '../components/ParticleBackground';

const COUNTRIES = [
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'AE', name: 'UAE', flag: '🇦🇪' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid var(--border)', padding: '18px 0', cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)' }}>{q}</span>
        <span style={{ fontSize: '20px', color: '#3b82f6', flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(45deg)' : 'none' }}>+</span>
      </div>
      {open && <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: '1.8', marginTop: '12px', paddingRight: '24px' }}>{a}</p>}
    </div>
  );
}

function NewsTicker({ headlines }) {
  if (!headlines || headlines.length === 0) return null;
  const items = [...headlines, ...headlines];
  return (
    <div style={{ background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(59,130,246,0.2)', padding: '7px 0', overflow: 'hidden', zIndex: 10, position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#ffffff', padding: '3px 14px', fontSize: '11px', fontWeight: '800', letterSpacing: '0.1em', flexShrink: 0 }}>LIVE</div>
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <div className="ticker-track">
            {items.map((h, i) => (
              <a key={i} href={h.url} target="_blank" rel="noreferrer"
                style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', paddingRight: '60px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                📰 {h.title}
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
  count:   { icon: '🏆', label: 'Counting competitors...' },
  score:   { icon: '📈', label: 'Calculating market scores...' },
  ai:      { icon: '🏪', label: 'Asking AI for recommendations...' },
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
      <div style={{ position: 'absolute', top: '20%', left: '20%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '20%', right: '20%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(239,68,68,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ textAlign: 'center', maxWidth: '480px', padding: '0 24px', position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: '72px', marginBottom: '24px', animation: 'fadeInUp 0.4s ease' }}>{meta.icon}</div>

        <div style={{ fontSize: '13px', color: '#3b82f6', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>
          Analyzing {city}
        </div>

        <div style={{ fontSize: '22px', fontWeight: '800', color: '#f1f5f9', marginBottom: '8px', lineHeight: '1.3', minHeight: '60px' }}>
          {message || meta.label}{dots}
        </div>

        <div style={{ fontSize: '14px', color: '#475569', marginBottom: '40px' }}>{sub || ''}</div>

        {/* Real progress bar */}
        <div style={{ width: '100%', height: '6px', background: '#1c2130', borderRadius: '3px', marginBottom: '16px', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: '3px', background: 'linear-gradient(90deg, #3b82f6, #ffffff, #ef4444)', width: `${progress || 5}%`, transition: 'width 0.5s ease', boxShadow: '0 0 12px rgba(59,130,246,0.6)' }} />
        </div>

        <div style={{ fontSize: '13px', color: '#3b82f6', fontWeight: '700', marginBottom: '32px' }}>{progress || 0}%</div>

        {/* Step indicators */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '32px' }}>
          {Object.keys(STEP_META).filter(k => k !== 'cache').map((k, i) => (
            <div key={k} style={{ width: k === step ? '24px' : '8px', height: '8px', borderRadius: '4px', background: Object.keys(STEP_META).indexOf(step) >= i ? '#3b82f6' : '#1c2130', transition: 'all 0.3s ease' }} />
          ))}
        </div>

        <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '14px', padding: '14px 20px', fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>
          💡 <span style={{ color: '#94a3b8' }}>Did you know?</span> BizScope fuses <strong style={{ color: '#3b82f6' }}>TomTom</strong> + <strong style={{ color: '#3b82f6' }}>OpenStreetMap</strong> data for the most complete business coverage in India.
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [form, setForm] = useState({ country: 'IN', city: '', address: '', pincode: '' });
  const [loading, setLoading] = useState(false);
  const [loadState, setLoadState] = useState({ step: 'geocode', message: '', sub: '', progress: 0 });
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [reviews, setReviews] = useState({ reviews: [], avg: 0, total: 0 });
  const [news, setNews] = useState([
    { title: 'India startup ecosystem raises $8.9B in 2025', url: 'https://inc42.com', source: 'Inc42', publishedAt: '2025-05-18T00:00:00.000Z' },
    { title: 'OpenAI launches GPT-5 with advanced reasoning', url: 'https://openai.com', source: 'OpenAI', publishedAt: '2025-05-18T00:00:00.000Z' },
    { title: 'Zepto raises $350M — quick commerce boom continues', url: 'https://techcrunch.com', source: 'TechCrunch', publishedAt: '2025-05-18T00:00:00.000Z' },
    { title: 'Google Gemini 2.0 now free for all developers', url: 'https://ai.google.dev', source: 'Google AI', publishedAt: '2025-05-18T00:00:00.000Z' },
    { title: 'Y Combinator W26 batch — 40% Indian founders', url: 'https://ycombinator.com', source: 'YC', publishedAt: '2025-05-18T00:00:00.000Z' },
    { title: 'India becomes 3rd largest startup ecosystem globally', url: 'https://inc42.com', source: 'Inc42', publishedAt: '2025-05-18T00:00:00.000Z' },
    { title: 'Devpost announces $1M hackathon prize pool for 2026', url: 'https://devpost.com', source: 'Devpost', publishedAt: '2025-05-18T00:00:00.000Z' },
    { title: 'PhonePe crosses 500M registered users milestone', url: 'https://inc42.com', source: 'Inc42', publishedAt: '2025-05-18T00:00:00.000Z' },
    { title: 'HealthTech funding up 120% — telemedicine leads growth', url: 'https://techcrunch.com', source: 'TechCrunch', publishedAt: '2025-05-18T00:00:00.000Z' },
    { title: 'Meesho hits 150M users — social commerce dominates Tier 2', url: 'https://inc42.com', source: 'Inc42', publishedAt: '2025-05-18T00:00:00.000Z' },
  ]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [cityInsights, setCityInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const insightsTimer = useRef(null);
  const router = useRouter();
  const { dark, mounted, toggle } = useTheme();

  useEffect(() => {
    fetch(`${API_URL}/api/reviews`).then(r => r.json()).then(d => setReviews(d)).catch(() => {});
    trackEvent('home_viewed');
    // Fetch real news in background — page already shows fallback instantly
    fetch(`${API_URL}/api/news`).then(r => r.json()).then(d => {
      if (d.articles && d.articles.length > 0) setNews(d.articles);
    }).catch(() => {});
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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    // Fetch AI insights when city has 3+ chars
    if (e.target.name === 'city' && e.target.value.trim().length >= 3) {
      clearTimeout(insightsTimer.current);
      insightsTimer.current = setTimeout(() => {
        fetchCityInsights(e.target.value.trim());
      }, 800);
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
    setLoading(true); setError('');
    // Only use city + address + pincode — country is sent separately as code
    const parts = [form.address, form.city, form.pincode].filter(p => p.trim());
    const location = parts.join(', ');
    trackEvent('analysis_started', { city: form.city || '', hasAddress: !!form.address, hasPincode: !!form.pincode });

    setLoadState({ step: 'geocode', message: 'Finding your location...', sub: 'Geocoding your area', progress: 10 });

    try {
      const streamUrl = `${API_URL}/api/analyze-stream?location=${encodeURIComponent(location)}&country=${encodeURIComponent(form.country)}`;
      const evtSource = new EventSource(streamUrl);

      await new Promise((resolve, reject) => {
        // 90s timeout
        const sseTimeout = setTimeout(() => {
          evtSource.close();
          reject(new Error('Analysis timed out. Please try again.'));
        }, 90000);
        evtSource.onmessage = (e) => {
          try {
            const payload = JSON.parse(e.data);
            if (payload.step === 'result') {
              evtSource.close();
              clearTimeout(sseTimeout);
              const data = payload.data;
              if (data.error) { reject(new Error(data.error)); return; }
              setLoadState({ step: 'done', message: 'Analysis complete!', sub: 'Preparing your report', progress: 100 });
              saveToHistory(form.city || form.address);
              sessionStorage.setItem('analysisData', JSON.stringify(data));
              setTimeout(() => window.dispatchEvent(new Event('bizscope_trigger_review')), 8000);
              trackEvent('analysis_succeeded', { businesses: data?.businesses?.length || 0 });
              resolve(data);
            } else if (payload.step === 'error') {
              evtSource.close();
              reject(new Error(payload.message || 'Analysis failed. Please try again.'));
            } else {
              // Real-time step updates from backend
              setLoadState({
                step: payload.step,
                message: payload.message || '',
                sub: payload.sub || '',
                progress: payload.progress || 0,
              });
            }
          } catch (_) {}
        };
        evtSource.onerror = () => {
          evtSource.close();
          reject(new Error('Connection lost. Please try again.'));
        };
      });

      router.push('/analysis');
    } catch (err) {
      setError(err.message || 'Analysis failed. Please try again.');
      setLoading(false);
      trackEvent('analysis_failed', { reason: err.message });
    }
  };

  return (
    <>
      <Head>
        <title>BizScope AI — Free Market Analysis & Competitor Research Tool</title>
        <meta name="description" content="Analyze competitors, discover market gaps, and find the best business location anywhere in the world. Free AI-powered market analysis using real OpenStreetMap data. Get results in under 10 seconds." />
        <meta name="keywords" content="market analysis tool, competitor analysis, business opportunity finder, startup market research, free business intelligence, business location finder, market gap analysis, global market research" />
        <link rel="canonical" href="https://biz-scope-ai.vercel.app" />
        <meta property="og:title" content="BizScope AI — Free Market Analysis & Competitor Research Tool" />
        <meta property="og:description" content="Analyze competitors, discover market gaps, and find the best business location anywhere in the world. Free AI-powered market analysis using real OpenStreetMap data. Get results in under 10 seconds." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://biz-scope-ai.vercel.app" />
        <meta property="og:image" content="https://biz-scope-ai.vercel.app/og-image.png" />
        <meta property="og:locale" content="en_IN" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="BizScope AI — Free Market Analysis & Competitor Research Tool" />
        <meta name="twitter:description" content="Analyze competitors, discover market gaps, and find the best business location anywhere in the world. Free AI-powered market analysis using real OpenStreetMap data." />
        <meta name="twitter:image" content="https://biz-scope-ai.vercel.app/og-image.png" />
        <meta name="robots" content="index, follow" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "BizScope AI",
              "url": "https://biz-scope-ai.vercel.app",
              "description": "Free AI-powered market analysis and competitor research tool for Indian entrepreneurs. Analyze competitors, discover market gaps, and find the best business location in India using real OpenStreetMap data.",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "INR"
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.9",
                "reviewCount": "500",
                "bestRating": "5"
              },
              "featureList": [
                "Competitor Analysis",
                "Market Gap Analysis",
                "Business Location Finder",
                "AI Business Recommendations",
                "Property Price Estimates",
                "Interactive Competitor Map"
              ],
              "screenshot": "https://biz-scope-ai.vercel.app/og-image.png",
              "softwareVersion": "2.0",
              "author": {
                "@type": "Organization",
                "name": "BizScope AI",
                "url": "https://biz-scope-ai.vercel.app"
              }
            })
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": "Is BizScope AI really free?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Yes, completely free. No credit card, no signup required for basic analysis. Just enter a city and get results instantly."
                  }
                },
                {
                  "@type": "Question",
                  "name": "How accurate is the data?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Business data comes from OpenStreetMap — the same source used by Apple Maps, Wikipedia, and Uber. It covers 50M+ businesses worldwide and is updated continuously by a global community."
                  }
                },
                {
                  "@type": "Question",
                  "name": "How often is the data updated?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "OpenStreetMap data is updated in real-time by contributors. Our cache refreshes every 2 hours, so you always get fresh data."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Can I use this for any city in the world?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Yes — any city, town, or area in 195 countries. Just type the name and we'll find it."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Are the property prices real?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Property prices are estimates based on official government circle rates from State Registration & Stamps Departments. Actual market prices may be 20–150% higher depending on location."
                  }
                },
                {
                  "@type": "Question",
                  "name": "How does the AI recommendation work?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "After fetching real competitor data, we send the market statistics to Google Gemini AI which analyzes the competition landscape and suggests the 5 best businesses to start in your area."
                  }
                }
              ]
            })
          }}
        />
      </Head>

      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--text)', position: 'relative' }}>

        {/* Particle canvas background */}
        <ParticleBackground count={50} />

        {/* Ambient orbs */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          <div className="particle-orb" style={{ top: '10%', left: '5%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(79,142,247,0.09) 0%, transparent 70%)', animation: 'orbFloat1 18s ease-in-out infinite' }} />
          <div className="particle-orb" style={{ bottom: '15%', right: '8%', width: '420px', height: '420px', background: 'radial-gradient(circle, rgba(239,68,68,0.06) 0%, transparent 70%)', animation: 'orbFloat2 22s ease-in-out infinite' }} />
          <div className="particle-orb" style={{ top: '50%', right: '20%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)', animation: 'orbFloat3 26s ease-in-out infinite' }} />
        </div>

        {/* Analysis loader overlay */}
        {loading && <AnalysisLoader city={form.city || form.address || 'your location'} step={loadState.step} message={loadState.message} sub={loadState.sub} progress={loadState.progress} />}

        {/* Live news ticker with real headlines */}
        <NewsTicker headlines={news.slice(0, 10)} />

        {/* Navbar */}
        <nav style={{ position: 'relative', zIndex: 10, borderBottom: '1px solid var(--border)', background: 'var(--nav-bg)', backdropFilter: 'blur(20px)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🚀</div>
              <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text)' }}>Biz<span style={{ background: 'linear-gradient(135deg, #3b82f6, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Scope</span> AI</span>
            </div>
            <div className="nav-links" style={{ display: 'flex', gap: '24px', fontSize: '14px', color: 'var(--muted)' }}>
              {[
                { label: 'Features', action: () => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }) },
                { label: 'How it Works', action: () => router.push('/how-it-works') },
                { label: '📰 News', action: () => router.push('/news') },
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
                suppressHydrationWarning
                style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {mounted ? (dark ? '☀️' : '🌙') : '��'}
              </button>
              <button onClick={() => router.push('/analysis')}
                style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#ffffff', border: 'none', padding: '8px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                Get Started →
              </button>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <main style={{ position: 'relative', zIndex: 1, flex: 1 }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 20px 40px' }}>

            {/* ── WORLD INNOVATION NEWS — TOP SECTION ── */}
            <div style={{ marginBottom: '56px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: 'clamp(20px,3vw,26px)', fontWeight: '900', color: 'var(--text)', marginBottom: '4px', letterSpacing: '-0.5px' }}>
                    🌍 World Innovation News
                  </h2>
                  <p style={{ color: 'var(--muted)', fontSize: '13px' }}>Startups · AI · Tech · Hackathons — updated every 30 min</p>
                </div>
                <button onClick={() => router.push('/news')}
                  style={{ padding: '8px 18px', borderRadius: '100px', border: '1px solid #3b82f640', background: '#3b82f610', color: '#3b82f6', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                  Full News Feed →
                </button>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
                {['All', 'Startup', 'AI', 'Tech', 'Funding', 'Hackathon', 'India'].map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)}
                    style={{ padding: '6px 16px', borderRadius: '100px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap', background: activeCategory === cat ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : 'var(--surface2)', color: activeCategory === cat ? '#ffffff' : 'var(--muted)', transition: 'all 0.2s', flexShrink: 0 }}>
                    {cat}
                  </button>
                ))}
              </div>
              {(() => {
                const filtered = news.filter(a => {
                  if (activeCategory === 'All') return true;
                  const t = (a.title + ' ' + (a.description || '')).toLowerCase();
                  if (activeCategory === 'Startup') return t.includes('startup') || t.includes('founder') || t.includes('venture');
                  if (activeCategory === 'AI') return t.includes(' ai ') || t.includes('artificial') || t.includes('gemini') || t.includes('openai');
                  if (activeCategory === 'Tech') return t.includes('tech') || t.includes('software') || t.includes('platform');
                  if (activeCategory === 'Funding') return t.includes('fund') || t.includes('raise') || t.includes('million') || t.includes('billion');
                  if (activeCategory === 'Hackathon') return t.includes('hackathon') || t.includes('competition') || t.includes('challenge');
                  if (activeCategory === 'India') return t.includes('india') || t.includes('indian');
                  return true;
                });
                const featured = filtered[0];
                const rest = filtered.slice(1, 7);
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '16px' }} className="responsive-grid-2">
                    {featured && (
                      <a href={featured.url} target="_blank" rel="noreferrer"
                        style={{ display: 'block', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', overflow: 'hidden', textDecoration: 'none', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = '#3b82f650'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(59,130,246,0.1)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}>
                        {featured.urlToImage ? (
                          <div style={{ height: '200px', overflow: 'hidden', background: 'var(--surface2)' }}>
                            <img src={featured.urlToImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.parentElement.style.display = 'none'; }} />
                          </div>
                        ) : (
                          <div style={{ height: '140px', background: 'linear-gradient(135deg,rgba(59,130,246,0.08),rgba(239,68,68,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>🚀</div>
                        )}
                        <div style={{ padding: '20px' }}>
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                            <span style={{ fontSize: '10px', fontWeight: '700', color: '#3b82f6', background: '#3b82f615', padding: '2px 8px', borderRadius: '100px' }}>{featured.source}</span>
                            <span style={{ fontSize: '10px', color: 'var(--muted)' }}>{featured.publishedAt ? new Date(featured.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}</span>
                          </div>
                          <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text)', lineHeight: '1.4', marginBottom: '8px' }}>{featured.title}</h3>
                          {featured.description && <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.6', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{featured.description}</p>}
                        </div>
                      </a>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {rest.map((a, i) => (
                        <a key={i} href={a.url} target="_blank" rel="noreferrer"
                          style={{ display: 'flex', gap: '12px', padding: '12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', textDecoration: 'none', transition: 'all 0.15s', alignItems: 'flex-start' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f640'; e.currentTarget.style.background = 'var(--surface2)'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)'; }}>
                          {a.urlToImage ? (
                            <img src={a.urlToImage} alt="" style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} onError={e => { e.target.style.display = 'none'; }} />
                          ) : (
                            <div style={{ width: '56px', height: '56px', borderRadius: '8px', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>📰</div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '10px', fontWeight: '700', color: '#3b82f6', marginBottom: '4px' }}>{a.source}</div>
                            <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text)', lineHeight: '1.4', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.title}</p>
                          </div>
                        </a>
                      ))}
                      <button onClick={() => router.push('/news')}
                        style={{ padding: '12px', borderRadius: '14px', border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.06)', color: '#3b82f6', cursor: 'pointer', fontSize: '13px', fontWeight: '700', textAlign: 'center' }}>
                        📰 View All Innovation News →
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* ── DIVIDER ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '48px' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 20px', borderRadius: '100px', background: 'linear-gradient(135deg,#3b82f615,#ef444410)', border: '1px solid #3b82f630' }}>
                <span style={{ fontSize: '16px' }}>🚀</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>BizScope AI — Market Analysis</span>
              </div>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            </div>

            {/* Badge */}
            <div className="anim-fade-down" style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <div className="badge-live" style={{ fontSize: '13px' }}>
                Free for entrepreneurs worldwide · No signup needed
              </div>
            </div>

            {/* Headline */}
            <h1 className="anim-fade-up delay-1" style={{ textAlign: 'center', fontSize: 'clamp(34px, 6vw, 66px)', fontWeight: '900', lineHeight: '1.06', marginBottom: '22px', color: 'var(--text)', letterSpacing: '-2px' }}>
              Know your market<br />
              <span className="gradient-text-animated">before you invest.</span>
            </h1>
            <p className="anim-fade-up delay-2" style={{ textAlign: 'center', fontSize: 'clamp(15px, 2vw, 18px)', color: 'var(--muted)', maxWidth: '520px', margin: '0 auto 32px', lineHeight: '1.75', fontWeight: '400' }}>
              Type any city in the world. Get real competitor counts, AI business ideas, available properties, and market scores — in under 10 seconds.
            </p>

            {/* Star rating social proof */}
            {reviews.total > 0 && (
              <div className="anim-fade-up delay-2" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {[1,2,3,4,5].map(s => (
                    <span key={s} style={{ fontSize: '16px', filter: parseFloat(reviews.avg) >= s ? 'none' : 'grayscale(1) opacity(0.3)' }}>⭐</span>
                  ))}
                </div>
                <span style={{ fontWeight: '700', color: 'var(--text)', fontSize: '14px' }}>{reviews.avg}</span>
                <span style={{ color: 'var(--muted)', fontSize: '13px' }}>{reviews.total} reviews</span>
              </div>
            )}

            {/* Trust pills */}
            <div className="anim-fade-up delay-2" style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '44px' }}>
              {['TomTom + OSM data', 'Gemini AI', 'Under 10 sec', 'No signup', 'PDF export'].map(s => (
                <div key={s} style={{ padding: '5px 14px', borderRadius: '100px', background: 'var(--surface)', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--muted)', fontWeight: '500' }}>{s}</div>
              ))}
            </div>

            {/* Form Card */}
            <div className="anim-scale delay-3" style={{ maxWidth: '500px', margin: '0 auto 56px' }}>
              <div className="glass-card border-glow-anim" style={{ padding: '32px', boxShadow: dark ? '0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)' : '0 12px 48px rgba(37,99,235,0.1)' }}>
              <form onSubmit={handleAnalyze}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>

                  {/* Country selector */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>Country</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', pointerEvents: 'none', zIndex: 1 }}>
                        {COUNTRIES.find(c => c.code === form.country)?.flag || '🌍'}
                      </span>
                      <select
                        value={form.country}
                        onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                        className="input-field"
                        style={{ paddingLeft: '42px', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none' }}
                      >
                        {COUNTRIES.map(c => (
                          <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                        ))}
                      </select>
                      <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'var(--muted)', pointerEvents: 'none' }}>▼</span>
                    </div>
                  </div>

                  {[
                    { name: 'city', label: 'City or area', placeholder: 'New York, London, Mumbai, Dubai, Lagos...' },
                    { name: 'address', label: 'Street address', placeholder: 'MG Road, Sector 18 (optional)' },
                    { name: 'pincode', label: 'Pincode / ZIP', placeholder: '400001, 10001 (optional)' },
                  ].map(f => (
                    <div key={f.name}>
                      <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>{f.label}</label>
                      <input name={f.name} value={form[f.name]} onChange={handleChange} placeholder={f.placeholder} required={f.name === 'city'} className="input-field" />

                      {/* Country reminder below city field */}
                      {f.name === 'city' && form.city.trim().length > 0 && (
                        <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--muted)', padding: '5px 10px', background: 'var(--surface2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                          <span>{COUNTRIES.find(c => c.code === form.country)?.flag || '🌍'}</span>
                          <span>Searching in <strong style={{ color: 'var(--text)' }}>{COUNTRIES.find(c => c.code === form.country)?.name || form.country}</strong></span>
                          <span style={{ color: 'var(--muted)', marginLeft: 'auto', fontSize: '11px' }}>← change above if wrong</span>
                        </div>
                      )}

                      {/* AI insights below city field */}
                      {f.name === 'city' && (insightsLoading || cityInsights) && (
                        <div style={{ marginTop: '8px', background: 'var(--surface2)', border: '1px solid rgba(79,142,247,0.2)', borderRadius: '12px', padding: '12px 14px', animation: 'fadeInUp 0.3s ease' }}>
                          {insightsLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--muted)' }}>
                              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#4f8ef7', display: 'inline-block', animation: 'pulse 1s infinite' }} />
                              Getting insights for {form.city}...
                            </div>
                          ) : cityInsights && (
                            <>
                              <div style={{ fontSize: '11px', fontWeight: '700', color: '#4f8ef7', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>AI snapshot · {cityInsights.city}</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                {cityInsights.insights?.map((insight, i) => (
                                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: 'var(--text2)', lineHeight: '1.5' }}>
                                    <span style={{ color: '#4f8ef7', flexShrink: 0, marginTop: '1px' }}>→</span>
                                    <span>{insight}</span>
                                  </div>
                                ))}
                              </div>
                              {cityInsights.topOpportunity && (
                                <div style={{ marginTop: '8px', padding: '6px 10px', background: 'rgba(79,142,247,0.08)', borderRadius: '8px', fontSize: '11px', color: '#4f8ef7', fontWeight: '600' }}>
                                  Top opportunity: {cityInsights.topOpportunity}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {error && <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '12px' }}>⚠️ {error}</p>}
                {history.length > 0 && !loading && (
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--muted2)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '7px' }}>Recent</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {history.map(h => (
                        <button key={h} type="button" onClick={() => setForm(f => ({ ...f, city: h }))}
                          style={{ padding: '4px 12px', borderRadius: '100px', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--muted)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                          {h}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', fontSize: '15px', letterSpacing: '-0.01em' }}>
                  {loading ? 'Analyzing...' : 'Analyze market →'}
                </button>
              </form>
            </div>
            </div>

            {/* Try it live CTA */}
            <div className="anim-fade-up delay-4" style={{ maxWidth: '600px', margin: '0 auto 64px', textAlign: 'center' }}>
              <div className="glass-card" style={{ padding: '40px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
                <h2 style={{ fontSize: 'clamp(18px,3vw,24px)', fontWeight: '800', color: 'var(--text)', marginBottom: '10px' }}>No demo needed — just try it</h2>
                <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.7' }}>
                  Type any Indian city above and see real competitor data, AI insights, and property prices in under 10 seconds. No signup, no credit card.
                </p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  {['New York', 'London', 'Dubai', 'Mumbai', 'Singapore'].map(city => (
                    <button key={city} onClick={() => { setForm(f => ({ ...f, city })); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      style={{ padding: '8px 18px', borderRadius: '100px', border: '1px solid #3b82f640', background: '#3b82f610', color: '#2563eb', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                      📍 {city}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats bar */}
            <div className="anim-fade-up delay-4" style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '48px', marginBottom: '72px' }}>
              {[
                { value: '50M+', label: 'Businesses indexed' },
                { value: '195+', label: 'Countries covered' },
                { value: '100%', label: 'Free forever' },
                { value: '<10s', label: 'Analysis time' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--text)', letterSpacing: '-1.5px', lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '6px', fontWeight: '500' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Feature cards */}
            <div id="features" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '72px' }}>
              {[
                { title: 'Competitor Analysis', desc: 'Real businesses from TomTom + OpenStreetMap within 5 km. See exactly how crowded your market is.', color: '#4f8ef7' },
                { title: 'Market Scoring', desc: 'Each category gets a competition score. Low score = open opportunity. High score = think twice.', color: '#ef4444' },
                { title: 'Property Finder', desc: 'Commercial spaces for rent or sale near your location, with government circle rate estimates.', color: '#a78bfa' },
                { title: 'AI Recommendations', desc: 'Gemini AI reads your local market data and suggests the 5 best businesses to start there.', color: '#34d399' },
                { title: 'Interactive Map', desc: 'Every competitor and property plotted on a live map. Spot clusters and gaps at a glance.', color: '#f59e0b' },
                { title: 'Profit Estimates', desc: 'Revenue projections based on local demand, competition density, and category benchmarks.', color: '#4f8ef7' },
              ].map((f, i) => (
                <div key={f.title} className={`card anim-fade-up delay-${i + 1}`} style={{ padding: '24px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: f.color, marginBottom: '16px', boxShadow: `0 0 8px ${f.color}60` }} />
                  <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', marginBottom: '8px', letterSpacing: '-0.3px' }}>{f.title}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.65', margin: 0 }}>{f.desc}</p>
                </div>
              ))}
            </div>

            {/* How it works */}
            <div id="how-it-works" style={{ textAlign: 'center', marginBottom: '72px' }}>
              <h2 style={{ fontSize: 'clamp(22px, 4vw, 34px)', fontWeight: '800', color: 'var(--text)', marginBottom: '10px', letterSpacing: '-0.5px' }}>How it works</h2>
              <p style={{ color: 'var(--muted)', marginBottom: '48px', fontSize: '15px' }}>Three steps. Under 10 seconds.</p>
              <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '0' }}>
                {[
                  { step: '1', title: 'Enter a location', desc: 'City, address, or pincode — anything works.' },
                  { step: '2', title: 'We fetch real data', desc: 'TomTom + OpenStreetMap + AI run in parallel.' },
                  { step: '3', title: 'You get insights', desc: 'Competitors, properties, scores, and AI tips.' },
                ].map((s, i) => (
                  <div key={s.step} style={{ flex: '1', minWidth: '200px', maxWidth: '280px', padding: '32px 24px', position: 'relative' }}>
                    {i < 2 && <div style={{ position: 'absolute', top: '44px', right: '-1px', width: '2px', height: '24px', background: 'var(--border)', display: 'none' }} className="hide-mobile" />}
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: '800', color: 'var(--text)', margin: '0 auto 16px', letterSpacing: '-0.5px' }}>{s.step}</div>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)', marginBottom: '8px', letterSpacing: '-0.3px' }}>{s.title}</h3>
                    <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.6', margin: 0 }}>{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Testimonials */}
            <div style={{ marginBottom: '72px' }}>
              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h2 style={{ fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: '800', color: 'var(--text)', marginBottom: '8px', letterSpacing: '-0.5px' }}>What entrepreneurs say</h2>
                <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Real people, real decisions made with BizScope</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {[
                  { name: 'Rahul Sharma', city: 'Mumbai', role: 'Restaurant owner', initials: 'RS', color: '#4f8ef7', text: 'I was about to open in Andheri. BizScope showed me 47 restaurants already there. I shifted to Malad — much better. Saved me lakhs.' },
                  { name: 'Priya Gupta', city: 'Jaipur', role: 'Salon entrepreneur', initials: 'PG', color: '#a78bfa', text: 'The AI suggestions were accurate. It pointed me to a salon near a college area. 200+ customers in the first month.' },
                  { name: 'Amit Verma', city: 'Delhi', role: 'Grocery store owner', initials: 'AV', color: '#34d399', text: 'The property price data helped me negotiate rent. I showed the circle rates to my landlord and got 15% off.' },
                  { name: 'Sunita Patel', city: 'Ahmedabad', role: 'Clothing boutique', initials: 'SP', color: '#f59e0b', text: 'Free tool with data quality I expected to pay thousands for. The competitor map alone is worth it.' },
                ].map((t, i) => (
                  <div key={i} className="card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', gap: '2px', marginBottom: '16px' }}>
                      {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize: '13px' }}>⭐</span>)}
                    </div>
                    <p style={{ fontSize: '14px', color: 'var(--text2)', lineHeight: '1.7', marginBottom: '20px', margin: '0 0 20px' }}>"{t.text}"</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `${t.color}18`, border: `1px solid ${t.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: t.color, flexShrink: 0 }}>{t.initials}</div>
                      <div>
                        <div style={{ fontWeight: '700', color: 'var(--text)', fontSize: '13px' }}>{t.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{t.role} · {t.city}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resource Hub */}
            <div style={{ marginBottom: '64px' }}>
              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '100px', padding: '5px 14px', fontSize: '12px', color: '#3b82f6', marginBottom: '14px' }}>
                  🌐 Entrepreneur Resource Hub
                </div>
                <h2 style={{ fontSize: 'clamp(22px,4vw,34px)', fontWeight: '800', color: 'var(--text)', marginBottom: '10px' }}>Stay Ahead of the Market</h2>
                <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Curated resources for entrepreneurs worldwide</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))', gap: '20px' }}>
                {[
                  {
                    icon: '💡', title: 'New Ideas', color: '#3b82f6',
                    desc: 'Discover trending business ideas and emerging markets in India',
                    links: [
                      { label: '🚀 Product Hunt — Today\'s Launches', url: 'https://www.producthunt.com' },
                      { label: '📈 Tracxn — India Startup Trends', url: 'https://tracxn.com/d/trending-themes' },
                      { label: '🌱 YC Startup Ideas', url: 'https://www.ycombinator.com/rfs' },
                    ]
                  },
                  {
                    icon: '🏅', title: 'Hackathons', color: '#ef4444',
                    desc: 'Upcoming competitions to validate your idea and win funding',
                    links: [
                      { label: '⚡ Devpost — Active Hackathons', url: 'https://devpost.com/hackathons' },
                      { label: '🇮🇳 Unstop — India Competitions', url: 'https://unstop.com/hackathons' },
                      { label: '💰 HackerEarth Challenges', url: 'https://www.hackerearth.com/challenges' },
                    ]
                  },
                  {
                    icon: '📖', title: 'Startup Lessons', color: '#2563eb',
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

            {/* Why BizScope AI — SEO content section */}
            <div style={{ marginBottom: '64px', maxWidth: '860px', margin: '0 auto 64px' }}>
              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: '800', color: 'var(--text)', marginBottom: '12px' }}>
                  Why BizScope AI for Market Analysis in India?
                </h2>
                <p style={{ color: 'var(--muted)', fontSize: '15px', lineHeight: '1.8', maxWidth: '680px', margin: '0 auto' }}>
                  India has over 63 million MSMEs — and most fail because founders skip market research. BizScope AI gives every Indian entrepreneur free, instant access to the same business intelligence that large corporations pay lakhs for.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
                {[
                  {
                    icon: '🏆',
                    title: 'Competitor Analysis for Any Indian City',
                    desc: 'Instantly see every competitor within 3 km of your target location — from Mumbai\'s Dharavi to Delhi\'s Connaught Place. Our competitor analysis tool pulls real business data from OpenStreetMap, the same database powering Apple Maps and Wikipedia. Know exactly how saturated a market is before you invest a single rupee.',
                  },
                  {
                    icon: '🎯',
                    title: 'Find Business Opportunities & Market Gaps',
                    desc: 'Our business opportunity finder scans local demand signals and competitor density to surface underserved niches. Whether you\'re looking for a gap in Tier-1 metros or Tier-2 cities like Jaipur, Surat, or Lucknow, BizScope AI identifies where demand outpaces supply — your next big opportunity.',
                  },
                  {
                    icon: '📈',
                    title: 'Startup Market Research in Under 10 Seconds',
                    desc: 'Traditional startup market research takes weeks and costs thousands. BizScope AI delivers a full market intelligence report — competitor count, market saturation score, AI-recommended business types, and nearby property prices — in under 10 seconds. Built for entrepreneurs, students, and first-time founders worldwide.',
                  },
                  {
                    icon: '🏪',
                    title: 'AI-Powered Business Intelligence, 100% Free',
                    desc: 'Powered by Google Gemini AI and real-time OpenStreetMap data, BizScope AI provides free business intelligence that was previously only available to funded startups. No subscription, no credit card, no signup. Just enter your city and get actionable insights instantly.',
                  },
                  {
                    icon: '🗺️',
                    title: 'Location Intelligence for Indian Markets',
                    desc: 'Location is everything in Indian retail and services. Our location intelligence engine analyzes foot traffic patterns, competitor clustering, and commercial property availability to help you pick the perfect spot. From street-level analysis in Chandni Chowk to suburb mapping in Pune\'s Hinjewadi.',
                  },
                  {
                    icon: '📈',
                    title: 'Market Trends & Demand Forecasting',
                    desc: 'Stay ahead of market trends with our real-time business intelligence dashboard. Track which business categories are growing in your city, monitor competitor openings and closures, and get AI-driven demand forecasts tailored to Indian consumer behavior and seasonal patterns.',
                  },
                ].map((item, i) => (
                  <div key={i} className="card" style={{ padding: '24px' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>{item.icon}</div>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', marginBottom: '10px', lineHeight: '1.4' }}>{item.title}</h3>
                    <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.7' }}>{item.desc}</p>
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
                { q: 'Can I use this for any city in the world?', a: 'Yes — any city, town, or area in India (and 195 other countries). Just type the name and we\'ll find it.' },
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
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🚀</div>
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
                  { label: '🏪 Google Gemini AI', href: 'https://ai.google.dev' },
                  { label: '📍 TomTom POI', href: 'https://developer.tomtom.com' },
                  { label: '📊 Govt Circle Rates', href: 'https://ngdrs.gov.in' },
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
              <p style={{ fontSize: '13px', color: 'var(--muted3)' }}>┬⌐ 2026 BizScope AI. All rights reserved.</p>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#3b82f6' }} />
                <span onClick={() => router.push('/status')} style={{ fontSize: '12px', color: 'var(--muted)', cursor: 'pointer' }}>All systems operational</span>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Theme toggle bottom-left */}
      <button onClick={toggle} title="Toggle theme"
        suppressHydrationWarning
        style={{ position: 'fixed', bottom: '24px', left: '24px', zIndex: 200, width: '40px', height: '40px', borderRadius: '50%', background: 'var(--surface2)', border: '1px solid var(--border2)', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
        {mounted ? (dark ? '☀️' : '🌙') : '��'}
      </button>

      <SuggestBusiness />
    </>
  );
}
