import Head from 'next/head';
import { useRouter } from 'next/router';
import { useTheme } from '../context/ThemeContext';

export default function Privacy() {
  const router = useRouter();
  const { dark, toggle } = useTheme();

  const Section = ({ title, children }) => (
    <div style={{ marginBottom: '32px' }}>
      <h2 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text)', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>{title}</h2>
      <div style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: '1.9' }}>{children}</div>
    </div>
  );

  return (
    <>
      <Head>
        <title>Privacy Policy — BizScope AI</title>
      </Head>
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
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

        <div style={{ maxWidth: '760px', margin: '0 auto', padding: '60px 24px' }}>
          <h1 style={{ fontSize: 'clamp(24px,4vw,36px)', fontWeight: '900', color: 'var(--text)', marginBottom: '8px' }}>Privacy Policy</h1>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '48px' }}>Last updated: April 2026</p>

          <Section title="1. What We Collect">
            <p>BizScope AI collects minimal data to operate the service:</p>
            <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
              <li style={{ marginBottom: '6px' }}><strong style={{ color: 'var(--text2)' }}>Location searches</strong> — the city/address you type is sent to our backend to fetch market data. We do not store your search history on our servers unless you are logged in and click "Save Search".</li>
              <li style={{ marginBottom: '6px' }}><strong style={{ color: 'var(--text2)' }}>Account data</strong> — if you register, we store your name, email, and hashed password. We never store plain-text passwords.</li>
              <li style={{ marginBottom: '6px' }}><strong style={{ color: 'var(--text2)' }}>Reviews</strong> — if you submit a rating or review, we store your name (optional) and review text.</li>
              <li style={{ marginBottom: '6px' }}><strong style={{ color: 'var(--text2)' }}>Property enquiries</strong> — name, email, phone, and message you submit via the enquiry form.</li>
            </ul>
          </Section>

          <Section title="2. What We Don't Collect">
            <ul style={{ paddingLeft: '20px' }}>
              <li style={{ marginBottom: '6px' }}>We do not use cookies for tracking</li>
              <li style={{ marginBottom: '6px' }}>We do not sell your data to third parties</li>
              <li style={{ marginBottom: '6px' }}>We do not run ads or ad tracking</li>
              <li style={{ marginBottom: '6px' }}>We do not collect payment information (the service is free)</li>
            </ul>
          </Section>

          <Section title="3. Third-Party Services">
            <p>BizScope AI uses the following third-party services to operate:</p>
            <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
              <li style={{ marginBottom: '6px' }}><strong style={{ color: 'var(--text2)' }}>OpenStreetMap / Nominatim</strong> — your location query is sent to OSM servers for geocoding. See <a href="https://wiki.osmfoundation.org/wiki/Privacy_Policy" target="_blank" rel="noreferrer" style={{ color: '#c8f03a' }}>OSM Privacy Policy</a>.</li>
              <li style={{ marginBottom: '6px' }}><strong style={{ color: 'var(--text2)' }}>Google Gemini AI</strong> — market data (not your personal info) is sent to Gemini to generate business recommendations. See <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" style={{ color: '#c8f03a' }}>Google Privacy Policy</a>.</li>
              <li style={{ marginBottom: '6px' }}><strong style={{ color: 'var(--text2)' }}>TomTom</strong> — your location coordinates are sent to TomTom to fetch nearby business data. See <a href="https://www.tomtom.com/privacy/" target="_blank" rel="noreferrer" style={{ color: '#c8f03a' }}>TomTom Privacy Policy</a>.</li>
              <li style={{ marginBottom: '6px' }}><strong style={{ color: 'var(--text2)' }}>Neon (PostgreSQL)</strong> — your account data is stored in a Neon serverless PostgreSQL database hosted on AWS.</li>
            </ul>
          </Section>

          <Section title="4. Data Retention">
            <p>Saved searches are retained until you delete them (max 10 per account). Account data is retained until you request deletion. Reviews are retained indefinitely unless removed by an admin.</p>
          </Section>

          <Section title="5. Your Rights">
            <p>You can request deletion of your account and all associated data at any time by emailing <a href="mailto:shivanshsinghsengar8@gmail.com" style={{ color: '#c8f03a' }}>shivanshsinghsengar8@gmail.com</a>. We will process deletion requests within 7 days.</p>
          </Section>

          <Section title="6. Contact">
            <p>For any privacy concerns, contact: <a href="mailto:shivanshsinghsengar8@gmail.com" style={{ color: '#c8f03a' }}>shivanshsinghsengar8@gmail.com</a></p>
          </Section>
        </div>
      </div>
    </>
  );
}
