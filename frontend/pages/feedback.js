import API_URL from '../utils/api';
import Head from 'next/head';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { useTheme } from '../context/ThemeContext';

const TYPES = [
  { id: 'bug', label: '🐛 Bug Report', desc: 'Something is broken', color: '#ef4444' },
  { id: 'feature', label: '💡 Feature Request', desc: 'I want this added', color: '#3b82f6' },
  { id: 'improvement', label: '⚡ Improvement', desc: 'Make this better', color: '#f59e0b' },
  { id: 'general', label: '💬 General Feedback', desc: 'Other thoughts', color: '#10b981' },
];

const PAGES = ['Homepage', 'Analysis Dashboard', 'Competitors', 'Properties', 'AI Insights', 'Trends', 'Strategy Engine', 'SparkLab', 'Interior Design', 'News', 'Other'];

export default function FeedbackPage() {
  const router = useRouter();
  const { dark, mounted, toggle } = useTheme();
  const [form, setForm] = useState({ type: 'general', page: 'Homepage', title: '', message: '', email: '', rating: 0 });
  const [hover, setHover] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.message.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Feedback — BizScope AI</title>
        <meta name="description" content="Share your feedback, report bugs, or suggest features for BizScope AI." />
      </Head>
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
        {/* Navbar */}
        <nav style={{ borderBottom: '1px solid var(--border)', background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
          <div onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🚀</div>
            <span style={{ fontWeight: '700', fontSize: '18px', color: 'var(--text)' }}>Biz<span style={{ background: 'linear-gradient(135deg,#3b82f6,#ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Scope</span> AI</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={toggle} suppressHydrationWarning style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{mounted ? (dark ? '☀️' : '🌙') : '��'}</button>
            <button onClick={() => router.push('/')} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px' }}>← Back</button>
          </div>
        </nav>

        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '48px 24px' }}>
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>🙏</div>
              <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text)', marginBottom: '12px' }}>Thank you!</h1>
              <p style={{ color: 'var(--muted)', fontSize: '15px', lineHeight: '1.7', marginBottom: '28px' }}>
                Your feedback has been received. We read every single submission and use it to make BizScope better.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => router.push('/')} className="btn-primary" style={{ padding: '12px 24px' }}>
                  🔍 Analyze a Market
                </button>
                <button onClick={() => { setSubmitted(false); setForm({ type: 'general', page: 'Homepage', title: '', message: '', email: '', rating: 0 }); }}
                  style={{ padding: '12px 24px', borderRadius: '12px', border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                  Submit More Feedback
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: 'clamp(24px,4vw,36px)', fontWeight: '900', color: 'var(--text)', marginBottom: '8px', letterSpacing: '-0.5px' }}>
                  Share Your Feedback
                </h1>
                <p style={{ color: 'var(--muted)', fontSize: '15px', lineHeight: '1.7' }}>
                  Help us build a better BizScope. Every piece of feedback is read by the founder personally.
                </p>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Rating */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)', marginBottom: '12px' }}>Overall Experience</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[1,2,3,4,5].map(s => (
                      <button key={s} type="button"
                        onClick={() => setForm(f => ({ ...f, rating: s }))}
                        onMouseEnter={() => setHover(s)}
                        onMouseLeave={() => setHover(0)}
                        style={{ fontSize: '28px', background: 'none', border: 'none', cursor: 'pointer', transition: 'transform 0.15s', transform: (hover || form.rating) >= s ? 'scale(1.2)' : 'scale(1)', filter: (hover || form.rating) >= s ? 'none' : 'grayscale(1) opacity(0.3)' }}>
                        ⭐
                      </button>
                    ))}
                    {form.rating > 0 && (
                      <span style={{ fontSize: '13px', color: 'var(--muted)', alignSelf: 'center', marginLeft: '8px' }}>
                        {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent! 🎉'][form.rating]}
                      </span>
                    )}
                  </div>
                </div>

                {/* Type */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Feedback Type</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {TYPES.map(t => (
                      <button key={t.id} type="button" onClick={() => setForm(f => ({ ...f, type: t.id }))}
                        style={{ padding: '12px', borderRadius: '12px', border: `1px solid ${form.type === t.id ? t.color : 'var(--border)'}`, background: form.type === t.id ? t.color + '15' : 'var(--surface)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: form.type === t.id ? t.color : 'var(--text)' }}>{t.label}</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Page */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Which page?</label>
                  <select value={form.page} onChange={e => setForm(f => ({ ...f, page: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: '13px', outline: 'none', cursor: 'pointer' }}>
                    {PAGES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                {/* Title */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Subject</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Brief summary of your feedback"
                    className="input-field" style={{ fontSize: '14px' }} />
                </div>

                {/* Message */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Details *</label>
                  <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Tell us exactly what happened, what you expected, or what you'd like to see..."
                    rows={5} required
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: '14px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = '#3b82f6'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                </div>

                {/* Email */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Email (optional — for follow-up)</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="your@email.com"
                    className="input-field" style={{ fontSize: '14px' }} />
                </div>

                {error && <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '12px' }}>⚠️ {error}</p>}

                <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', fontSize: '15px' }}>
                  {loading ? '⏳ Submitting...' : '📨 Submit Feedback'}
                </button>

                <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--muted)', marginTop: '12px' }}>
                  Read by Shivansh Singh Sengar personally · Usually responds within 24h
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}
