import Head from 'next/head';
import { useRouter } from 'next/router';
import { useTheme } from '../context/ThemeContext';

const plans = [
  {
    name: 'Free — Forever', price: '₹0', period: 'forever', color: '#4f8ef7', popular: true,
    features: [
      'Unlimited market analyses',
      'Full competitor directory',
      'PDF report export',
      'Saved searches',
      'AI business recommendations',
      'Advanced trend charts',
      'Revenue calculator',
      'Score card & city compare',
      'Interactive map view',
      'Public business listing',
      'Dark / Light theme',
    ],
    missing: [],
    cta: 'Start Analysing Free →', href: '/',
  },
];

export default function Pricing() {
  const router = useRouter();
  const { dark, mounted, toggle } = useTheme();

  return (
    <>
      <Head>
        <title>Pricing — BizScope AI | 100% Free Market Analysis Tool</title>
        <meta name="description" content="BizScope AI is completely free — unlimited market analyses, competitor research, AI recommendations, PDF exports, and more. No credit card required." />
        <link rel="canonical" href="https://biz-scope-ai.vercel.app/pricing" />
        <meta property="og:title" content="Pricing — BizScope AI | 100% Free Market Analysis Tool" />
        <meta property="og:description" content="BizScope AI is completely free — unlimited market analyses, competitor research, AI recommendations, PDF exports, and more. No credit card required." />
        <meta property="og:url" content="https://biz-scope-ai.vercel.app/pricing" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://biz-scope-ai.vercel.app/og-image.svg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="BizScope AI Pricing — 100% Free" />
        <meta name="twitter:image" content="https://biz-scope-ai.vercel.app/og-image.svg" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            { "@type": "Question", "name": "Is BizScope AI really free?", "acceptedAnswer": { "@type": "Answer", "text": "Yes — 100% free during early access. No credit card, no hidden limits, no trial period. Every feature is fully unlocked." } },
            { "@type": "Question", "name": "Will it stay free forever?", "acceptedAnswer": { "@type": "Answer", "text": "We plan to introduce paid plans in the future, but early users will always get a generous free tier." } },
            { "@type": "Question", "name": "How many analyses can I run?", "acceptedAnswer": { "@type": "Answer", "text": "Unlimited. Run as many market analyses as you need — there are no daily or monthly caps right now." } },
            { "@type": "Question", "name": "Do I need to create an account?", "acceptedAnswer": { "@type": "Answer", "text": "No account needed for market analysis. Sign up only if you want to save searches or list your business." } }
          ]
        })}} />
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
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.3)', borderRadius: '100px', padding: '6px 16px', fontSize: '12px', color: '#4f8ef7', marginBottom: '16px' }}>
              🎉 Everything is free — no credit card, no limits
            </div>
            <h1 style={{ fontSize: 'clamp(28px,5vw,48px)', fontWeight: '900', color: 'var(--text)', marginBottom: '14px', letterSpacing: '-1px' }}>100% Free. No Catch.</h1>
            <p style={{ color: 'var(--muted)', fontSize: '16px', marginBottom: '16px' }}>Every feature is free while we're in early access. No credit card. No limits.</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
              {['✅ No credit card required', '🔓 All features unlocked', '♾️ Unlimited analyses'].map(t => (
                <span key={t} style={{ fontSize: '13px', color: 'var(--muted)' }}>{t}</span>
              ))}
            </div>
          </div>

          <div style={{ maxWidth: '480px', margin: '0 auto' }}>
            {plans.map(p => (
              <div key={p.name} style={{ background: 'var(--surface)', border: `2px solid ${p.color}`, borderRadius: '24px', padding: '32px', position: 'relative', transition: 'transform 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', padding: '4px 18px', borderRadius: '100px', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                  Early Access — All Free
                </div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: p.color, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>{p.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '40px', fontWeight: '800', color: 'var(--text)' }}>{p.price}</span>
                  <span style={{ fontSize: '14px', color: 'var(--muted)' }}>{p.period}</span>
                </div>
                <div style={{ height: '1px', background: 'var(--border)', margin: '20px 0' }} />
                <div style={{ marginBottom: '24px' }}>
                  {p.features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', fontSize: '14px', color: 'var(--text2)' }}>
                      <span style={{ color: '#4f8ef7', fontSize: '16px' }}>✓</span> {f}
                    </div>
                  ))}
                </div>
                <a href={p.href}
                  style={{ display: 'block', textAlign: 'center', padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', fontWeight: '700', fontSize: '15px', textDecoration: 'none', cursor: 'pointer', boxShadow: '0 6px 20px rgba(79,142,247,0.35)' }}>
                  {p.cta}
                </a>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '48px', color: 'var(--muted)', fontSize: '13px' }}>
            All features are free during early access. No credit card required. Ever.
          </div>

          {/* FAQ */}
          <div style={{ marginTop: '64px', maxWidth: '680px', margin: '64px auto 0' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text)', marginBottom: '32px', textAlign: 'center' }}>Frequently Asked Questions</h2>
            {[
              { q: 'Is it really free?', a: 'Yes — 100% free during early access. No credit card, no hidden limits, no trial period. Every feature is fully unlocked.' },
              { q: 'Will it stay free forever?', a: 'We plan to introduce paid plans in the future, but early users will always get a generous free tier. We\'ll give plenty of notice before any changes.' },
              { q: 'How many analyses can I run?', a: 'Unlimited. Run as many market analyses as you need — there are no daily or monthly caps right now.' },
              { q: 'Is the data accurate for small towns?', a: 'OpenStreetMap has excellent coverage for Indian cities and towns. Smaller villages may have less data, but we always show you exactly how many businesses were found.' },
              { q: 'Do I need to create an account?', a: 'No account needed for market analysis. Sign up only if you want to save searches or list your business.' },
              { q: 'How do I give feedback?', a: 'Use the Feedback page or email shivanshsinghsengar8@gmail.com. We read every message and ship improvements fast.' },
            ].map((f, i) => (
              <div key={i} style={{ borderBottom: '1px solid var(--border)', padding: '18px 0' }}>
                <details style={{ cursor: 'pointer' }}>
                  <summary style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {f.q} <span style={{ color: '#4f8ef7', fontSize: '20px' }}>+</span>
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
