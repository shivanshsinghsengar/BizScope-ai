import Head from 'next/head';
import { useRouter } from 'next/router';
import { useTheme } from '../context/ThemeContext';

const plans = [
  {
    name: 'Free', price: '₹0', period: 'forever', color: '#10b981',
    features: ['5 market analyses/day', 'Competitor directory', 'Basic charts', 'Public business listing', 'Dark/Light theme'],
    missing: ['PDF export', 'Saved searches', 'AI recommendations', 'Priority support'],
    cta: 'Get Started Free', href: '/',
  },
  {
    name: 'Pro', price: '₹499', period: '/month', color: '#c8f03a', popular: true,
    features: ['Unlimited analyses', 'PDF report export', 'Saved searches (unlimited)', 'AI business recommendations', 'Full competitor data', 'Priority support', 'Advanced trend charts'],
    missing: ['White-label reports', 'API access'],
    cta: 'Start Pro', href: '/register',
  },
  {
    name: 'Business', price: '₹1,999', period: '/month', color: '#ef4444',
    features: ['Everything in Pro', 'White-label PDF reports', 'API access', 'Multiple team members', 'Custom branding', 'Dedicated support', 'Bulk location analysis'],
    missing: [],
    cta: 'Contact Us', href: 'mailto:hello@bizscope.ai',
  },
];

export default function Pricing() {
  const router = useRouter();
  const { dark, toggle } = useTheme();

  return (
    <>
      <Head>
        <title>Pricing — BizScope AI</title>
        <meta name="description" content="Simple, transparent pricing for BizScope AI market analysis platform." />
      </Head>
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>

        {/* Navbar */}
        <nav style={{ borderBottom: '1px solid var(--border)', background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg,#c8f03a,#a8d420)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🚀</div>
            <span style={{ fontWeight: '700', fontSize: '18px', color: 'var(--text)' }}>Biz<span style={{ background: 'linear-gradient(135deg,#c8f03a,#ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Scope</span> AI</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={toggle} style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '16px' }}>{dark ? '☀️' : '🌙'}</button>
            <button onClick={() => router.push('/')} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px' }}>← Back</button>
          </div>
        </nav>

        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '60px 20px' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h1 style={{ fontSize: 'clamp(28px,5vw,48px)', fontWeight: '800', color: 'var(--text)', marginBottom: '14px' }}>Simple, Transparent Pricing</h1>
            <p style={{ color: 'var(--muted)', fontSize: '16px' }}>Start free. Upgrade when you need more.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', alignItems: 'start' }}>
            {plans.map(p => (
              <div key={p.name} style={{ background: 'var(--surface)', border: `2px solid ${p.popular ? p.color : 'var(--border)'}`, borderRadius: '24px', padding: '32px', position: 'relative', transition: 'transform 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                {p.popular && (
                  <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#c8f03a,#a8d420)', color: '#0a0f0a', padding: '4px 18px', borderRadius: '100px', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                    Most Popular
                  </div>
                )}
                <div style={{ fontSize: '13px', fontWeight: '700', color: p.color, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>{p.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '40px', fontWeight: '800', color: 'var(--text)' }}>{p.price}</span>
                  <span style={{ fontSize: '14px', color: 'var(--muted)' }}>{p.period}</span>
                </div>
                <div style={{ height: '1px', background: 'var(--border)', margin: '20px 0' }} />
                <div style={{ marginBottom: '20px' }}>
                  {p.features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', fontSize: '14px', color: 'var(--text2)' }}>
                      <span style={{ color: '#10b981', fontSize: '16px' }}>✓</span> {f}
                    </div>
                  ))}
                  {p.missing.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', fontSize: '14px', color: 'var(--muted3)' }}>
                      <span style={{ fontSize: '16px' }}>✗</span> {f}
                    </div>
                  ))}
                </div>
                <a href={p.href}
                  style={{ display: 'block', textAlign: 'center', padding: '12px', borderRadius: '12px', background: p.popular ? 'linear-gradient(135deg,#c8f03a,#a8d420)' : 'var(--surface2)', color: p.popular ? '#0a0f0a' : 'var(--text)', fontWeight: '700', fontSize: '14px', textDecoration: 'none', border: p.popular ? 'none' : '1px solid var(--border2)', cursor: 'pointer' }}>
                  {p.cta}
                </a>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '48px', color: 'var(--muted)', fontSize: '13px' }}>
            All plans include free OSM data. No credit card required for Free plan. Cancel anytime.
          </div>
        </div>
      </div>
    </>
  );
}
