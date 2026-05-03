import API_URL from '../utils/api';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTheme } from '../context/ThemeContext';

const CATEGORIES = ['All', 'Startup', 'AI', 'Tech', 'Funding', 'Hackathon', 'India'];

const FALLBACK = [
  { title: 'India startup ecosystem raises $8.9B in 2025 — record year for founders', url: 'https://inc42.com', source: 'Inc42', publishedAt: new Date().toISOString(), urlToImage: null, description: 'Indian startups attracted record funding across fintech, healthtech and SaaS sectors.' },
  { title: 'OpenAI launches GPT-5 with advanced reasoning and multimodal capabilities', url: 'https://openai.com', source: 'OpenAI', publishedAt: new Date().toISOString(), urlToImage: null, description: 'The latest model shows significant improvements in coding, math and creative tasks.' },
  { title: 'Zepto raises $350M at $5B valuation — quick commerce boom continues', url: 'https://techcrunch.com', source: 'TechCrunch', publishedAt: new Date().toISOString(), urlToImage: null, description: 'The 10-minute delivery startup expands to 100 new cities across India.' },
  { title: 'Google Gemini 2.0 Flash now free for all developers worldwide', url: 'https://ai.google.dev', source: 'Google AI', publishedAt: new Date().toISOString(), urlToImage: null, description: 'Google opens access to its fastest AI model with no rate limits for developers.' },
  { title: 'Y Combinator W26 batch — 40% Indian founders, highest ever', url: 'https://ycombinator.com', source: 'YC', publishedAt: new Date().toISOString(), urlToImage: null, description: 'Silicon Valley accelerator sees surge in applications from Indian entrepreneurs.' },
  { title: 'Devpost announces $1M hackathon prize pool for 2026 season', url: 'https://devpost.com', source: 'Devpost', publishedAt: new Date().toISOString(), urlToImage: null, description: 'Over 200 hackathons planned globally with focus on AI and sustainability.' },
  { title: 'PhonePe crosses 500M registered users — fintech dominance grows', url: 'https://inc42.com', source: 'Inc42', publishedAt: new Date().toISOString(), urlToImage: null, description: 'The Walmart-backed payments giant now processes 50% of all UPI transactions.' },
  { title: 'HealthTech funding up 120% — telemedicine and AI diagnostics lead', url: 'https://techcrunch.com', source: 'TechCrunch', publishedAt: new Date().toISOString(), urlToImage: null, description: 'Investors pour money into digital health as post-pandemic adoption accelerates.' },
  { title: 'Meesho hits 150M users — social commerce dominates Tier 2 India', url: 'https://inc42.com', source: 'Inc42', publishedAt: new Date().toISOString(), urlToImage: null, description: 'The SoftBank-backed platform sees 3x growth in smaller Indian cities.' },
  { title: 'India becomes 3rd largest startup ecosystem globally — NASSCOM report', url: 'https://nasscom.in', source: 'NASSCOM', publishedAt: new Date().toISOString(), urlToImage: null, description: 'Over 100,000 startups registered in India with 110 unicorns as of 2026.' },
  { title: 'Ola Electric IPO oversubscribed 4x — EV revolution accelerates', url: 'https://inc42.com', source: 'Inc42', publishedAt: new Date().toISOString(), urlToImage: null, description: 'Strong investor appetite for electric vehicle companies in India.' },
  { title: 'Microsoft invests $3B in India AI infrastructure over 2 years', url: 'https://techcrunch.com', source: 'TechCrunch', publishedAt: new Date().toISOString(), urlToImage: null, description: 'The investment will fund data centers and AI skilling programs across India.' },
];

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NewsPage() {
  const router = useRouter();
  const { dark, toggle } = useTheme();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/api/news`)
      .then(r => r.json())
      .then(d => { setNews(d.articles?.length ? d.articles : FALLBACK); setLoading(false); })
      .catch(() => { setNews(FALLBACK); setLoading(false); });
  }, []);

  const filtered = news.filter(a => {
    const text = (a.title + ' ' + (a.description || '')).toLowerCase();
    const matchCat = category === 'All' ||
      (category === 'Startup' && (text.includes('startup') || text.includes('founder') || text.includes('venture'))) ||
      (category === 'AI' && (text.includes(' ai ') || text.includes('artificial') || text.includes('gemini') || text.includes('openai') || text.includes('machine learning'))) ||
      (category === 'Tech' && (text.includes('tech') || text.includes('software') || text.includes('app') || text.includes('platform'))) ||
      (category === 'Funding' && (text.includes('fund') || text.includes('raise') || text.includes('invest') || text.includes('million') || text.includes('billion'))) ||
      (category === 'Hackathon' && (text.includes('hackathon') || text.includes('competition') || text.includes('challenge'))) ||
      (category === 'India' && (text.includes('india') || text.includes('indian') || text.includes('bengaluru') || text.includes('mumbai')));
    const matchSearch = !search || text.includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <>
      <Head>
        <title>Innovation News — BizScope AI</title>
        <meta name="description" content="Latest startup, tech, AI and hackathon news for Indian entrepreneurs." />
      </Head>

      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>

        {/* Navbar */}
        <nav style={{ position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid var(--border)', background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => router.push('/')}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg,#c8f03a,#a8d420)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🚀</div>
            <span style={{ fontWeight: '800', fontSize: '17px', color: 'var(--text)' }}>
              Biz<span style={{ background: 'linear-gradient(135deg,#c8f03a,#ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Scope</span>
              <span style={{ color: 'var(--muted)', fontWeight: '400', fontSize: '13px', marginLeft: '6px' }}>News</span>
            </span>
          </div>

          {/* Search */}
          <div style={{ flex: 1, maxWidth: '400px' }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Search news..."
              className="input-field"
              style={{ padding: '8px 16px', fontSize: '13px' }} />
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={toggle}
              style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {dark ? '☀️' : '🌙'}
            </button>
            {/* CTA */}
            <button onClick={() => router.push('/')}
              style={{ background: 'linear-gradient(135deg,#c8f03a,#a8d420)', color: '#ffffff', border: 'none', padding: '9px 18px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '800', whiteSpace: 'nowrap', boxShadow: '0 4px 14px rgba(200,240,58,0.35)' }}>
              🔍 Analyze Market
            </button>
          </div>
        </nav>

        {/* Category tabs */}
        <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg2)', padding: '0 24px', overflowX: 'auto' }}>
          <div style={{ display: 'flex', gap: '0', maxWidth: '1200px', margin: '0 auto' }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                style={{ padding: '14px 20px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', fontWeight: category === cat ? '700' : '500', color: category === cat ? '#c8f03a' : 'var(--muted)', borderBottom: category === cat ? '2px solid #c8f03a' : '2px solid transparent', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
              <div className="shimmer" style={{ height: '400px', borderRadius: '20px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[1,2,3,4].map(i => <div key={i} className="shimmer" style={{ height: '80px', borderRadius: '12px' }} />)}
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px', color: 'var(--muted)' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📰</div>
              <div style={{ fontSize: '16px', fontWeight: '600' }}>No news found</div>
              <div style={{ fontSize: '13px', marginTop: '6px' }}>Try a different category or search term</div>
            </div>
          ) : (
            <>
              {/* Featured + sidebar layout */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '28px', marginBottom: '40px' }} className="responsive-grid-2">

                {/* Featured article */}
                {featured && (
                  <a href={featured.url} target="_blank" rel="noreferrer"
                    style={{ display: 'block', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', overflow: 'hidden', textDecoration: 'none', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(200,240,58,0.12)'; e.currentTarget.style.borderColor = '#c8f03a40'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
                    {featured.urlToImage ? (
                      <div style={{ height: '260px', overflow: 'hidden', background: 'var(--surface2)' }}>
                        <img src={featured.urlToImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={e => { e.target.parentElement.style.background = 'linear-gradient(135deg,var(--surface2),var(--surface))'; e.target.style.display = 'none'; }} />
                      </div>
                    ) : (
                      <div style={{ height: '200px', background: 'linear-gradient(135deg,rgba(200,240,58,0.08),rgba(239,68,68,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '64px' }}>📰</div>
                    )}
                    <div style={{ padding: '24px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#c8f03a', background: '#c8f03a15', padding: '3px 10px', borderRadius: '100px' }}>{featured.source}</span>
                        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{timeAgo(featured.publishedAt)}</span>
                        <span style={{ fontSize: '11px', color: '#c8f03a', fontWeight: '600', marginLeft: 'auto' }}>Featured →</span>
                      </div>
                      <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text)', lineHeight: '1.4', marginBottom: '10px' }}>{featured.title}</h2>
                      {featured.description && <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: '1.7' }}>{featured.description}</p>}
                    </div>
                  </a>
                )}

                {/* Sidebar — top stories */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Top Stories</div>
                  {rest.slice(0, 5).map((a, i) => (
                    <a key={i} href={a.url} target="_blank" rel="noreferrer"
                      style={{ display: 'flex', gap: '12px', padding: '14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', textDecoration: 'none', transition: 'all 0.15s', alignItems: 'flex-start' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#c8f03a40'; e.currentTarget.style.background = 'var(--surface2)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)'; }}>
                      {a.urlToImage ? (
                        <img src={a.urlToImage} alt="" style={{ width: '64px', height: '64px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
                          onError={e => { e.target.style.display = 'none'; }} />
                      ) : (
                        <div style={{ width: '64px', height: '64px', borderRadius: '10px', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>📰</div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '5px' }}>
                          <span style={{ fontSize: '10px', fontWeight: '700', color: '#c8f03a' }}>{a.source}</span>
                          <span style={{ fontSize: '10px', color: 'var(--muted)' }}>{timeAgo(a.publishedAt)}</span>
                        </div>
                        <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)', lineHeight: '1.4', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.title}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              {/* More news grid */}
              {rest.length > 5 && (
                <>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>More Stories</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '16px', marginBottom: '48px' }}>
                    {rest.slice(5).map((a, i) => (
                      <a key={i} href={a.url} target="_blank" rel="noreferrer"
                        style={{ display: 'block', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', textDecoration: 'none', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = '#c8f03a40'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
                        {a.urlToImage && (
                          <div style={{ height: '130px', overflow: 'hidden', background: 'var(--surface2)' }}>
                            <img src={a.urlToImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={e => { e.target.parentElement.style.display = 'none'; }} />
                          </div>
                        )}
                        <div style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '10px', fontWeight: '700', color: '#c8f03a', background: '#c8f03a15', padding: '2px 8px', borderRadius: '100px' }}>{a.source}</span>
                            <span style={{ fontSize: '10px', color: 'var(--muted)' }}>{timeAgo(a.publishedAt)}</span>
                          </div>
                          <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)', lineHeight: '1.5', margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.title}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* BizScope CTA Banner */}
          <div style={{ background: 'linear-gradient(135deg,rgba(200,240,58,0.12),rgba(239,68,68,0.08))', border: '1px solid rgba(200,240,58,0.3)', borderRadius: '24px', padding: '40px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(200,240,58,0.15) 0%,transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚀</div>
            <h2 style={{ fontSize: 'clamp(20px,3vw,28px)', fontWeight: '900', color: 'var(--text)', marginBottom: '10px', letterSpacing: '-0.5px' }}>
              Ready to find your next business opportunity?
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '15px', marginBottom: '28px', maxWidth: '500px', margin: '0 auto 28px' }}>
              Analyze real competitor data, get AI recommendations, and discover commercial properties — all in under 10 seconds.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => router.push('/')}
                style={{ background: 'linear-gradient(135deg,#c8f03a,#a8d420)', color: '#ffffff', border: 'none', padding: '14px 32px', borderRadius: '14px', cursor: 'pointer', fontSize: '15px', fontWeight: '800', boxShadow: '0 8px 24px rgba(200,240,58,0.4)', transition: 'transform 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                🔍 Analyze a Market Now — Free
              </button>
              <button onClick={() => router.push('/analysis')}
                style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', padding: '14px 24px', borderRadius: '14px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                View Dashboard →
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
