import API_URL from '../utils/api';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const PRO_FEATURES = [
  { icon: '📄', text: 'Unlimited PDF report exports' },
  { icon: '🔖', text: 'Unlimited saved searches' },
  { icon: '🤖', text: 'AI business recommendations' },
  { icon: '📊', text: 'Advanced trend charts' },
  { icon: '🏛️', text: 'Government circle rate data' },
  { icon: '⚡', text: 'Priority analysis (no queue)' },
  { icon: '🎯', text: 'Business Strategy Engine' },
  { icon: '🏠', text: 'Interior Design Planner' },
  { icon: '💬', text: 'Priority support' },
];

export default function UpgradePage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { dark, mounted, toggle } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  const handleUpgrade = async () => {
    if (!user) { router.push('/login?redirect=/upgrade'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/payment/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'BizScope AI',
        description: 'Pro Plan — 1 Month',
        order_id: data.orderId,
        prefill: { name: user.name, email: user.email },
        theme: { color: '#3b82f6' },
        handler: async (response) => {
          try {
            const verify = await fetch(`${API_URL}/api/payment/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify(response),
            });
            const vData = await verify.json();
            if (vData.success) {
              setSuccess('🎉 Welcome to BizScope Pro! Redirecting...');
              setTimeout(() => router.push('/analysis'), 2000);
            } else throw new Error('Verification failed');
          } catch (e) { setError('Payment verification failed. Contact support.'); }
        },
        modal: { ondismiss: () => setLoading(false) },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e) {
      setError(e.message || 'Payment failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Upgrade to Pro — BizScope AI</title>
        <meta name="description" content="Upgrade to BizScope AI Pro for unlimited analyses, PDF exports, and AI recommendations." />
      </Head>
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
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

        <div style={{ maxWidth: '520px', margin: '0 auto', padding: '60px 24px' }}>
          {success ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
              <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text)', marginBottom: '8px' }}>You're Pro!</h1>
              <p style={{ color: 'var(--muted)', fontSize: '15px' }}>{success}</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '100px', padding: '5px 14px', fontSize: '12px', color: '#3b82f6', marginBottom: '16px' }}>
                  ⚡ Upgrade to Pro
                </div>
                <h1 style={{ fontSize: 'clamp(28px,5vw,42px)', fontWeight: '900', color: 'var(--text)', marginBottom: '10px', letterSpacing: '-1px' }}>
                  Unlock Everything
                </h1>
                <p style={{ color: 'var(--muted)', fontSize: '15px', lineHeight: '1.7' }}>
                  One payment. Full access. No subscription traps.
                </p>
              </div>

              {/* Price card */}
              <div style={{ background: 'var(--surface)', border: '2px solid #3b82f6', borderRadius: '24px', padding: '32px', marginBottom: '20px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg,#3b82f6,#2563eb)' }} />
                <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: 'white', padding: '4px 18px', borderRadius: '100px', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                  Most Popular
                </div>

                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Pro</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', justifyContent: 'center' }}>
                    <span style={{ fontSize: '48px', fontWeight: '900', color: 'var(--text)' }}>₹499</span>
                    <span style={{ fontSize: '14px', color: 'var(--muted)' }}>/month</span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>Cancel anytime · 30-day money-back guarantee</div>
                </div>

                {/* Features */}
                <div style={{ marginBottom: '24px' }}>
                  {PRO_FEATURES.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: i < PRO_FEATURES.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <span style={{ fontSize: '16px' }}>{f.icon}</span>
                      <span style={{ fontSize: '14px', color: 'var(--text2)' }}>{f.text}</span>
                      <span style={{ marginLeft: 'auto', color: '#10b981', fontSize: '16px' }}>✓</span>
                    </div>
                  ))}
                </div>

                {error && <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '12px', textAlign: 'center' }}>⚠️ {error}</p>}

                <button onClick={handleUpgrade} disabled={loading}
                  style={{ width: '100%', padding: '16px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: 'white', fontSize: '16px', fontWeight: '800', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, boxShadow: '0 8px 24px rgba(59,130,246,0.4)', transition: 'all 0.15s' }}>
                  {loading ? '⏳ Opening payment...' : user ? '⚡ Upgrade to Pro — ₹499/month' : '🔐 Sign in to Upgrade'}
                </button>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '14px' }}>
                  {['🔒 Secure', '💳 Razorpay', '🏦 UPI/Cards/NetBanking'].map(t => (
                    <span key={t} style={{ fontSize: '11px', color: 'var(--muted)' }}>{t}</span>
                  ))}
                </div>
              </div>

              {/* Free plan comparison */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '8px' }}>Already on Free plan?</div>
                <div style={{ fontSize: '13px', color: 'var(--text2)' }}>5 analyses/day · Basic charts · No PDF export</div>
                <button onClick={() => router.push('/')}
                  style={{ marginTop: '12px', padding: '8px 20px', borderRadius: '10px', border: '1px solid var(--border2)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: '13px' }}>
                  Continue with Free →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
