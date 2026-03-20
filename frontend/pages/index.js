import API_URL from '../utils/api';
import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import SuggestBusiness from '../components/SuggestBusiness';
import { useTheme } from '../context/ThemeContext';

export default function Home() {
  const [form, setForm] = useState({ city: '', address: '', pincode: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { dark, toggle } = useTheme();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleAnalyze = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      // Build location string — skip empty fields
      const parts = [form.address, form.city, form.pincode].filter(p => p.trim());
      const location = parts.join(', ');
      const res = await fetch(`${API_URL}/api/analyze-location`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location, nocache: true }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      sessionStorage.setItem('analysisData', JSON.stringify(data));
      router.push('/analysis');
    } catch (err) {
      setError(err.message || 'Location not found. Try a different city or area name.');
      setLoading(false);
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
        <meta name="robots" content="index, follow" />
      </Head>

      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--text)' }}>

        {/* Blobs — dark only */}
        {dark && (
          <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
            <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)' }} />
            <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)' }} />
          </div>
        )}

        {/* Navbar */}
        <nav style={{ position: 'relative', zIndex: 10, borderBottom: '1px solid var(--border)', background: 'var(--nav-bg)', backdropFilter: 'blur(20px)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🚀</div>
              <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text)' }}>Biz<span style={{ background: 'linear-gradient(135deg, #6366f1, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Scope</span> AI</span>
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
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white', border: 'none', padding: '8px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                Get Started →
              </button>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <main style={{ position: 'relative', zIndex: 1, flex: 1 }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '60px 20px 40px' }}>

            {/* Badge */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '100px', padding: '6px 16px', fontSize: '13px', color: '#a78bfa' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6366f1', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                Powered by OpenStreetMap + AI
              </div>
            </div>

            {/* Headline */}
            <h1 style={{ textAlign: 'center', fontSize: 'clamp(32px, 6vw, 64px)', fontWeight: '800', lineHeight: '1.1', marginBottom: '20px', color: 'var(--text)' }}>
              Find Your Next<br />
              <span style={{ background: 'linear-gradient(135deg, #6366f1, #a78bfa, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Business Opportunity
              </span>
            </h1>
            <p style={{ textAlign: 'center', fontSize: 'clamp(14px, 2vw, 18px)', color: 'var(--muted)', maxWidth: '560px', margin: '0 auto 40px', lineHeight: '1.7' }}>
              Analyze competitors, discover market gaps, and find the perfect location — all powered by real data and AI.
            </p>

            {/* Form Card */}
            <div style={{ maxWidth: '520px', margin: '0 auto 56px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '24px', padding: '28px', boxShadow: dark ? '0 25px 60px rgba(0,0,0,0.5)' : '0 8px 30px rgba(0,0,0,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1' }} />
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
                <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', fontSize: '15px' }}>
                  {loading ? '⏳ Analyzing Market...' : '🔍 Analyze Market'}
                </button>
              </form>
            </div>

            {/* Stats bar */}
            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '32px', marginBottom: '64px' }}>
              {[
                { value: '50M+', label: 'Businesses Indexed' },
                { value: '195', label: 'Countries Covered' },
                { value: 'Free', label: 'No API Key Needed' },
                { value: 'Real-time', label: 'Live OSM Data' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text)' }}>{s.value}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Feature cards */}
            <div id="features" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '64px' }}>
              {[
                { icon: '🏪', title: 'Competitor Analysis', desc: 'Real businesses from OpenStreetMap within 3km radius.', color: '#4f46e5' },
                { icon: '📊', title: 'Market Scoring', desc: 'See how crowded each business type is and find opportunities.', color: '#7c3aed' },
                { icon: '🏠', title: 'Property Finder', desc: 'Available commercial spaces for rent or sale near your location.', color: '#ec4899' },
                { icon: '🤖', title: 'AI Recommendations', desc: 'Business suggestions tailored to local market conditions.', color: '#f59e0b' },
                { icon: '🗺️', title: 'Interactive Map', desc: 'Visualize competitors and properties on a live map.', color: '#10b981' },
                { icon: '📈', title: 'Profit Estimates', desc: 'Revenue projections based on local demand and competition.', color: '#3b82f6' },
              ].map(f => (
                <div key={f.title} className="card" style={{ padding: '22px' }}>
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
                    <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', margin: '0 auto 14px' }}>{s.icon}</div>
                    <div style={{ fontSize: '11px', color: '#4f46e5', fontWeight: '700', letterSpacing: '0.1em', marginBottom: '8px' }}>STEP {s.step}</div>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>{s.title}</h3>
                    <p style={{ fontSize: '13px', color: 'var(--muted)' }}>{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer style={{ position: 'relative', zIndex: 1, borderTop: '1px solid var(--border)', background: 'var(--bg2)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px 28px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '32px', marginBottom: '32px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🚀</div>
                  <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)' }}>BizScope AI</span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.7' }}>AI-powered business intelligence for entrepreneurs.</p>
              </div>
              {[
                { title: 'Product', links: ['Features', 'Pricing', 'Changelog'] },
                { title: 'Resources', links: ['Docs', 'API', 'Support'] },
                { title: 'Company', links: ['About', 'Privacy', 'Terms'] },
              ].map(col => (
                <div key={col.title}>
                  <h4 style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text2)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{col.title}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {col.links.map(link => (
                      <span key={link} style={{ fontSize: '13px', color: 'var(--muted)', cursor: 'pointer' }}>{link}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <p style={{ fontSize: '13px', color: 'var(--muted3)' }}>© 2026 BizScope AI. All rights reserved.</p>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981' }} />
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>All systems operational</span>
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
