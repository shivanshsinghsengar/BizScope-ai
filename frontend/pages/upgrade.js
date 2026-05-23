import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';

const ALL_FEATURES = [
  { icon: '📊', text: 'Unlimited market analyses' },
  { icon: '🏪', text: 'Full competitor directory' },
  { icon: '📄', text: 'PDF report export' },
  { icon: '🔖', text: 'Unlimited saved searches' },
  { icon: '🤖', text: 'AI business recommendations' },
  { icon: '📈', text: 'Advanced trend charts' },
  { icon: '💰', text: 'Revenue calculator' },
  { icon: '📋', text: 'Score card & city compare' },
  { icon: '🗺️', text: 'Interactive map view' },
  { icon: '➕', text: 'Public business listing' },
];

export default function UpgradePage() {
  const router = useRouter();

  return (
    <Layout>
      <Head>
        <title>All Features Free — BizScope AI</title>
        <meta name="description" content="Every BizScope AI feature is free during early access. No credit card required." />
      </Head>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '48px 20px', textAlign: 'center' }}>

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.3)',
          borderRadius: '100px', padding: '6px 16px',
          fontSize: '12px', color: '#4f8ef7', marginBottom: '24px',
          fontWeight: '700', letterSpacing: '0.04em',
        }}>
          🎉 Early Access — Everything Free
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: 'clamp(26px,5vw,40px)', fontWeight: '900',
          color: '#eef0f8', letterSpacing: '-0.03em',
          marginBottom: '12px', lineHeight: '1.15',
        }}>
          All Features Are Free
        </h1>
        <p style={{ fontSize: '15px', color: '#5a6480', lineHeight: '1.7', marginBottom: '36px' }}>
          No credit card. No trial. No limits. Every feature is fully unlocked while we're in early access.
        </p>

        {/* Feature list */}
        <div style={{
          background: '#161b27',
          border: '1px solid #1e2438',
          borderRadius: '18px',
          padding: '28px 24px',
          marginBottom: '28px',
          textAlign: 'left',
        }}>
          <div style={{
            fontSize: '10px', fontWeight: '700', color: '#2a3350',
            letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '16px',
          }}>
            What's included
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {ALL_FEATURES.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15px' }}>{f.icon}</span>
                <span style={{ fontSize: '12.5px', color: '#c8cfe0', fontWeight: '500' }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => router.push('/analysis')}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #4f8ef7, #6366f1)',
            color: '#fff', border: 'none',
            padding: '15px', borderRadius: '12px',
            fontSize: '15px', fontWeight: '800',
            cursor: 'pointer',
            boxShadow: '0 6px 24px rgba(79,142,247,0.4)',
            transition: 'opacity 0.15s, transform 0.15s',
            marginBottom: '14px',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          Start Analysing Free →
        </button>

        <p style={{ fontSize: '12px', color: '#2a3350' }}>
          No sign-up required · Works instantly
        </p>
      </div>
    </Layout>
  );
}
