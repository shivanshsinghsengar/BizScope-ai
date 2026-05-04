import API_URL from '../utils/api';
import Head from 'next/head';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Auth() {
  const [tab, setTab] = useState('login');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [regForm, setRegForm] = useState({ name: '', email: '', password: '', businessName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { login } = useAuth();
  const { dark, toggle } = useTheme();
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      login(data.token, data.user);
      router.push('/analysis');
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regForm),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      login(data.token, data.user);
      router.push('/list-business');
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  const switchTab = (t) => { setTab(t); setError(''); };

  return (
    <>
      <Head>
        <title>{tab === 'login' ? 'Sign In' : 'Create Account'} — BizScope AI</title>
      </Head>
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', color: 'var(--text)' }}>

        {/* Left panel — branding */}
        <div className="auth-left" style={{ flex: 1, background: 'linear-gradient(135deg, #3b82f6, #2563eb)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px', position: 'relative', overflow: 'hidden' }}>
          {/* Decorative blobs */}
          <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '250px', height: '250px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>🚀</div>
              <span style={{ fontSize: '22px', fontWeight: '800', color: 'white' }}>BizScope AI</span>
            </div>

            <h2 style={{ fontSize: 'clamp(28px,3vw,40px)', fontWeight: '800', color: 'white', lineHeight: '1.2', marginBottom: '16px' }}>
              Your market intelligence<br />starts here
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '15px', lineHeight: '1.7', marginBottom: '48px', maxWidth: '380px' }}>
              Analyze competitors, discover business opportunities, and get AI-powered recommendations — all from real OpenStreetMap data.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { icon: '📊', text: 'Competitor analysis within 5km' },
                { icon: '🤖', text: 'AI business recommendations' },
                { icon: '📄', text: 'PDF market reports' },
                { icon: '🔖', text: 'Save and reload analyses' },
              ].map(f => (
                <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>{f.icon}</div>
                  <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px' }}>{f.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel — form */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px 32px', position: 'relative', minWidth: 0 }}>

          {/* Top bar */}
          <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', gap: '8px' }}>
            <button onClick={toggle} style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {dark ? '☀️' : '🌙'}
            </button>
            <button onClick={() => router.push('/')} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px' }}>
              ← Home
            </button>
          </div>

          <div style={{ width: '100%', maxWidth: '400px' }}>

            {/* Mobile logo */}
            <div className="auth-mobile-logo" style={{ display: 'none', alignItems: 'center', gap: '10px', marginBottom: '32px', justifyContent: 'center' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🚀</div>
              <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text)' }}>BizScope AI</span>
            </div>

            {/* Tab switcher */}
            <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: '14px', padding: '4px', marginBottom: '28px', border: '1px solid var(--border)' }}>
              {['login', 'register'].map(t => (
                <button key={t} onClick={() => switchTab(t)}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s', background: tab === t ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : 'transparent', color: tab === t ? 'white' : 'var(--muted)', boxShadow: tab === t ? '0 4px 12px rgba(59,130,246,0.3)' : 'none' }}>
                  {t === 'login' ? 'Sign In' : 'Register'}
                </button>
              ))}
            </div>

            {/* Heading */}
            <div style={{ marginBottom: '24px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text)', marginBottom: '6px' }}>
                {tab === 'login' ? 'Welcome back 👋' : 'Create your account'}
              </h1>
              <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
                {tab === 'login' ? 'Sign in to access your dashboard' : 'Free forever — no credit card needed'}
              </p>
            </div>

            {/* Login Form */}
            {tab === 'login' && (
              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Email</label>
                  <input type="email" placeholder="you@example.com" value={loginForm.email}
                    onChange={e => setLoginForm({ ...loginForm, email: e.target.value })} required className="input-field" />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPass ? 'text' : 'password'} placeholder="••••••••" value={loginForm.password}
                      onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} required className="input-field" style={{ paddingRight: '44px' }} />
                    <button type="button" onClick={() => setShowPass(p => !p)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--muted)' }}>
                      {showPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                {error && <div style={{ background: '#ef444415', border: '1px solid #ef444430', borderRadius: '10px', padding: '10px 14px', color: '#f87171', fontSize: '13px', marginBottom: '16px' }}>⚠️ {error}</div>}
                <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', fontSize: '15px' }}>
                  {loading ? '⏳ Signing in...' : 'Sign In →'}
                </button>
              </form>
            )}

            {/* Register Form */}
            {tab === 'register' && (
              <form onSubmit={handleRegister}>
                {[
                  { key: 'name', label: 'Full Name', type: 'text', placeholder: 'John Doe', required: true },
                  { key: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com', required: true },
                  { key: 'businessName', label: 'Business Name (optional)', type: 'text', placeholder: 'My Shop', required: false },
                ].map(f => (
                  <div key={f.key} style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>{f.label}</label>
                    <input type={f.type} placeholder={f.placeholder} value={regForm[f.key]}
                      onChange={e => setRegForm({ ...regForm, [f.key]: e.target.value })} required={f.required} className="input-field" />
                  </div>
                ))}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPass ? 'text' : 'password'} placeholder="Min 6 characters" value={regForm.password}
                      onChange={e => setRegForm({ ...regForm, password: e.target.value })} required className="input-field" style={{ paddingRight: '44px' }} />
                    <button type="button" onClick={() => setShowPass(p => !p)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--muted)' }}>
                      {showPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                {error && <div style={{ background: '#ef444415', border: '1px solid #ef444430', borderRadius: '10px', padding: '10px 14px', color: '#f87171', fontSize: '13px', marginBottom: '16px' }}>⚠️ {error}</div>}
                <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', fontSize: '15px' }}>
                  {loading ? '⏳ Creating account...' : 'Create Account →'}
                </button>
              </form>
            )}

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>or</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            </div>

            <button onClick={() => router.push('/')}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text2)', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
              Continue without account
            </button>

            <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--muted)', marginTop: '20px' }}>
              {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <span onClick={() => switchTab(tab === 'login' ? 'register' : 'login')}
                style={{ color: '#3b82f6', cursor: 'pointer', fontWeight: '600' }}>
                {tab === 'login' ? 'Register free' : 'Sign in'}
              </span>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .auth-left { display: none !important; }
          .auth-mobile-logo { display: flex !important; }
        }
      `}</style>
    </>
  );
}
