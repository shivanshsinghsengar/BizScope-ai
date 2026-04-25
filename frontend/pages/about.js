import Head from 'next/head';
import { useRouter } from 'next/router';
import { useTheme } from '../context/ThemeContext';

export default function About() {
  const router = useRouter();
  const { dark, toggle } = useTheme();

  return (
    <>
      <Head>
        <title>About — BizScope AI</title>
        <meta name="description" content="BizScope AI — built by Shivansh Singh Sengar to help Indian entrepreneurs make smarter business decisions." />
      </Head>
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>

        {/* Navbar */}
        <nav style={{ borderBottom: '1px solid var(--border)', background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
          <div onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg,#c8f03a,#a8d420)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🚀</div>
            <span style={{ fontWeight: '700', fontSize: '18px', color: 'var(--text)' }}>Biz<span style={{ background: 'linear-gradient(135deg,#c8f03a,#ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Scope</span> AI</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={toggle} style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{dark ? '☀️' : '🌙'}</button>
            <button onClick={() => router.push('/')} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px' }}>← Back</button>
          </div>
        </nav>

        <div style={{ maxWidth: '860px', margin: '0 auto', padding: '60px 24px' }}>

          {/* Hero */}
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'linear-gradient(135deg, #c8f03a, #a8d420)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', margin: '0 auto 24px' }}>🚀</div>
            <h1 style={{ fontSize: 'clamp(28px,5vw,48px)', fontWeight: '900', color: 'var(--text)', marginBottom: '16px', letterSpacing: '-1px' }}>About BizScope AI</h1>
            <p style={{ fontSize: '17px', color: 'var(--muted)', lineHeight: '1.8', maxWidth: '600px', margin: '0 auto' }}>
              A free, open market intelligence platform built to help Indian entrepreneurs make smarter business decisions — before they invest a single rupee.
            </p>
          </div>

          {/* Who built it */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '24px', padding: '36px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #c8f03a, #ef4444)' }} />
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: 'linear-gradient(135deg, #c8f03a20, #ef444420)', border: '1px solid #c8f03a30', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', flexShrink: 0 }}>👨‍💻</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: '#c8f03a', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>Built by</div>
                <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text)', marginBottom: '8px' }}>Shivansh Singh Sengar</h2>
                <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: '1.8', marginBottom: '16px' }}>
                  A developer from Mathura, Uttar Pradesh — passionate about building tools that solve real problems for real people. BizScope AI was built out of a personal frustration: there was no free, easy way for small business owners in India to understand their local market before opening a shop.
                </p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {['Next.js', 'Node.js', 'PostgreSQL', 'OpenStreetMap', 'Gemini AI', 'TomTom API'].map(t => (
                    <span key={t} style={{ padding: '4px 12px', borderRadius: '100px', background: '#c8f03a15', border: '1px solid #c8f03a30', fontSize: '12px', color: '#a8d420', fontWeight: '600' }}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* What it does */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '24px', padding: '36px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text)', marginBottom: '20px' }}>What BizScope AI Does</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              {[
                { icon: '🏪', title: 'Competitor Analysis', desc: 'Shows every business within 5km of your location using real OpenStreetMap data — the same source used by Apple Maps.' },
                { icon: '📊', title: 'Market Scoring', desc: 'Calculates a risk score for each business category based on competitor count, ratings, and popularity.' },
                { icon: '🤖', title: 'AI Recommendations', desc: 'Uses Google Gemini AI to suggest the 5 best businesses to start in your area based on real market data.' },
                { icon: '🏠', title: 'Property Finder', desc: 'Shows available commercial spaces with prices based on official government circle rates for your city.' },
                { icon: '🗺️', title: 'Interactive Map', desc: 'Visualize all competitors and properties on a live map with category filters and popups.' },
                { icon: '📄', title: 'PDF Reports', desc: 'Export a full market analysis report as a PDF — shareable with partners, investors, or banks.' },
              ].map(f => (
                <div key={f.title} style={{ background: 'var(--surface2)', borderRadius: '16px', padding: '20px' }}>
                  <div style={{ fontSize: '28px', marginBottom: '10px' }}>{f.icon}</div>
                  <div style={{ fontWeight: '700', color: 'var(--text)', fontSize: '14px', marginBottom: '6px' }}>{f.title}</div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.7' }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Why it exists */}
          <div style={{ background: 'var(--surface)', border: '1px solid #c8f03a25', borderRadius: '24px', padding: '36px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text)', marginBottom: '16px' }}>Why It Exists</h2>
            <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: '1.9', marginBottom: '14px' }}>
              Every year, thousands of small businesses in India fail within the first year — not because the owner lacked skill or effort, but because they opened in the wrong location, in an already-saturated market, without knowing what was around them.
            </p>
            <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: '1.9', marginBottom: '14px' }}>
              Tools like this exist for large corporations with research budgets. BizScope AI makes the same intelligence available to anyone — a chai shop owner in Mathura, a salon entrepreneur in Jaipur, a restaurant founder in Mumbai — completely free.
            </p>
            <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: '1.9' }}>
              The data comes from OpenStreetMap (50M+ businesses worldwide), Google Gemini AI, TomTom, and official government circle rate data from State Registration & Stamps Departments.
            </p>
          </div>

          {/* Tech stack */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '24px', padding: '36px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text)', marginBottom: '20px' }}>Tech Stack</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {[
                { layer: 'Frontend', tech: 'Next.js 14, React, Chart.js, Leaflet' },
                { layer: 'Backend', tech: 'Node.js, Express, Sequelize ORM' },
                { layer: 'Database', tech: 'PostgreSQL (Neon serverless)' },
                { layer: 'Business Data', tech: 'OpenStreetMap Overpass API + TomTom POI' },
                { layer: 'Geocoding', tech: 'Nominatim (OpenStreetMap)' },
                { layer: 'AI Engine', tech: 'Google Gemini 1.5 Flash (OpenAI fallback)' },
                { layer: 'Property Pricing', tech: 'Govt circle rates (70 Indian cities)' },
                { layer: 'Hosting', tech: 'Vercel (frontend) + Render (backend)' },
              ].map(r => (
                <div key={r.layer} style={{ background: 'var(--surface2)', borderRadius: '12px', padding: '14px 16px' }}>
                  <div style={{ fontSize: '11px', color: '#c8f03a', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{r.layer}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text2)' }}>{r.tech}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div style={{ textAlign: 'center', padding: '32px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '24px' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📬</div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text)', marginBottom: '8px' }}>Get in Touch</h2>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '20px' }}>Questions, feedback, or partnership enquiries</p>
            <a href="mailto:shivanshsinghsengar@gmail.com"
              style={{ display: 'inline-block', padding: '12px 28px', borderRadius: '12px', background: 'linear-gradient(135deg, #c8f03a, #a8d420)', color: '#0a0f0a', fontWeight: '700', fontSize: '14px', textDecoration: 'none' }}>
              shivanshsinghsengar@gmail.com
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
