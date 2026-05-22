import Head from 'next/head';
import { useRouter } from 'next/router';
import { useTheme } from '../context/ThemeContext';

const plans = [
  {
    name: 'Free', price: '₹0', period: 'forever', color: '#3b82f6',
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
  const { dark, mounted, toggle } = useTheme();

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
            <button onClick={toggle} suppressHydrationWarning style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '16px' }}>{mounted ? (dark ? '☀️' : '🌙') : '��'}</button>
            <button onClick={() => router.push('/')} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px' }}>← Back</button>
          </div>
        </nav>

        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '60px 20px' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(200,240,58,0.1)', border: '1px solid rgba(200,240,58,0.3)', borderRadius: '100px', padding: '6px 16px', fontSize: '12px', color: '#c8f03a', marginBottom: '16px' }}>
              🎉 First 100 Pro subscribers get 3 months free
            </div>
            <h1 style={{ fontSize: 'clamp(28px,5vw,48px)', fontWeight: '900', color: 'var(--text)', marginBottom: '14px', letterSpacing: '-1px' }}>Simple, Transparent Pricing</h1>
            <p style={{ color: 'var(--muted)', fontSize: '16px', marginBottom: '16px' }}>Start free. Upgrade when you need more.</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
              {['✅ No credit card required', '🔒 Cancel anytime', '💰 30-day money-back guarantee'].map(t => (
                <span key={t} style={{ fontSize: '13px', color: 'var(--muted)' }}>{t}</span>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', alignItems: 'start' }}>
            {plans.map(p => (
              <div key={p.name} style={{ background: 'var(--surface)', border: `2px solid ${p.popular ? p.color : 'var(--border)'}`, borderRadius: '24px', padding: '32px', position: 'relative', transition: 'transform 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                {p.popular && (
                  <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#c8f03a,#a8d420)', color: '#ffffff', padding: '4px 18px', borderRadius: '100px', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap' }}>
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
                      <span style={{ color: '#3b82f6', fontSize: '16px' }}>✓</span> {f}
                    </div>
                  ))}
                  {p.missing.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', fontSize: '14px', color: 'var(--muted3)' }}>
                      <span style={{ fontSize: '16px' }}>✗</span> {f}
                    </div>
                  ))}
                </div>
                <a href={p.href}
                  style={{ display: 'block', textAlign: 'center', padding: '12px', borderRadius: '12px', background: p.popular ? 'linear-gradient(135deg,#c8f03a,#a8d420)' : 'var(--surface2)', color: p.popular ? '#ffffff' : 'var(--text)', fontWeight: '700', fontSize: '14px', textDecoration: 'none', border: p.popular ? 'none' : '1px solid var(--border2)', cursor: 'pointer' }}>
                  {p.cta}
                </a>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '48px', color: 'var(--muted)', fontSize: '13px' }}>
            All plans include free OSM data. No credit card required for Free plan. Cancel anytime.
          </div>

          {/* Guarantee */}
          <div style={{ marginTop: '48px', background: 'linear-gradient(135deg, #c8f03a10, #ef444410)', border: '1px solid #c8f03a30', borderRadius: '24px', padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🛡️</div>
            <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text)', marginBottom: '8px' }}>30-Day Money-Back Guarantee</h3>
            <p style={{ color: 'var(--muted)', fontSize: '14px', maxWidth: '480px', margin: '0 auto' }}>
              Not satisfied with Pro? Email us within 30 days for a full refund — no questions asked. We're confident you'll love it.
            </p>
          </div>

          {/* Testimonial */}
          <div style={{ marginTop: '32px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '24px', padding: '32px', maxWidth: '600px', margin: '32px auto 0' }}>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '14px' }}>
              {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize: '16px' }}>⭐</span>)}
            </div>
            <p style={{ fontSize: '15px', color: 'var(--text2)', lineHeight: '1.8', marginBottom: '16px', fontStyle: 'italic' }}>
              "The PDF export alone is worth the Pro price. I send BizScope reports to my investors and they're always impressed by the data quality."
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #c8f03a20, #ef444420)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>👨‍💼</div>
              <div>
                <div style={{ fontWeight: '700', color: 'var(--text)', fontSize: '14px' }}>Vikram Nair</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Serial Entrepreneur · Bangalore</div>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div style={{ marginTop: '64px', maxWidth: '680px', margin: '64px auto 0' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text)', marginBottom: '32px', textAlign: 'center' }}>Frequently Asked Questions</h2>
            {[
              { q: 'What\'s included in the Free plan?', a: 'Up to 5 market analyses per day, full competitor directory, basic charts, and public business listing. No credit card needed.' },
              { q: 'Can I cancel my Pro subscription anytime?', a: 'Yes, cancel anytime from your account settings. You\'ll keep Pro access until the end of your billing period.' },
              { q: 'What does PDF export include?', a: 'A full market analysis report with location summary, category breakdown table with risk scores, AI recommendations, top 15 businesses, and your branding.' },
              { q: 'Is the data accurate for small towns?', a: 'OpenStreetMap has excellent coverage for Indian cities and towns. Smaller villages may have less data, but we always show you exactly how many businesses were found.' },
              { q: 'Do you offer refunds?', a: 'Yes — 30-day money-back guarantee on Pro. Email shivanshsinghsengar8@gmail.com and we\'ll refund within 24 hours.' },
              { q: 'What is API access in the Business plan?', a: 'Direct REST API access to run analyses programmatically — useful for agencies, developers, or businesses that want to integrate market data into their own tools.' },
            ].map((f, i) => (
              <div key={i} style={{ borderBottom: '1px solid var(--border)', padding: '18px 0' }}>
                <details style={{ cursor: 'pointer' }}>
                  <summary style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {f.q} <span style={{ color: '#c8f03a', fontSize: '20px' }}>+</span>
                  </summary>
                  <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: '1.8', marginTop: '12px' }}>{f.a}</p>
                </details>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
