import Head from 'next/head';
import { useRouter } from 'next/router';
import { useTheme } from '../context/ThemeContext';

export default function Terms() {
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
        <title>Terms of Service — BizScope AI</title>
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
          <h1 style={{ fontSize: 'clamp(24px,4vw,36px)', fontWeight: '900', color: 'var(--text)', marginBottom: '8px' }}>Terms of Service</h1>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '48px' }}>Last updated: April 2026</p>

          <Section title="1. Acceptance">
            <p>By using BizScope AI ("the Service"), you agree to these terms. If you do not agree, do not use the Service.</p>
          </Section>

          <Section title="2. What the Service Provides">
            <p>BizScope AI provides market intelligence data for informational purposes only. This includes:</p>
            <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
              <li style={{ marginBottom: '6px' }}>Competitor data sourced from OpenStreetMap (community-maintained, may be incomplete)</li>
              <li style={{ marginBottom: '6px' }}>AI-generated business recommendations (for guidance only, not financial advice)</li>
              <li style={{ marginBottom: '6px' }}>Property price estimates based on government circle rates (not actual market listings)</li>
              <li style={{ marginBottom: '6px' }}>Market trend data (simulated from real category statistics)</li>
            </ul>
          </Section>

          <Section title="3. No Financial Advice">
            <p>Nothing on BizScope AI constitutes financial, investment, or business advice. All data is for informational purposes only. Always conduct your own due diligence before making any business or investment decision. BizScope AI is not liable for any losses arising from decisions made based on this data.</p>
          </Section>

          <Section title="4. Data Accuracy">
            <p>Business data comes from OpenStreetMap, TomTom, and community submissions — it may be outdated, incomplete, or inaccurate. Property prices are estimates based on government circle rates and may not reflect actual market prices. We make no guarantees about data accuracy.</p>
          </Section>

          <Section title="5. User Accounts">
            <p>You are responsible for maintaining the security of your account. Do not share your password. We reserve the right to suspend accounts that violate these terms or submit false/spam business listings.</p>
          </Section>

          <Section title="6. Community Submissions">
            <p>By submitting a business listing, property listing, or suggestion, you confirm the information is accurate to the best of your knowledge. Submissions are reviewed by admins before appearing publicly. We reserve the right to reject or remove any submission.</p>
          </Section>

          <Section title="7. Intellectual Property">
            <p>BizScope AI's code, design, and branding are owned by Shivansh Singh Sengar. OpenStreetMap data is © OpenStreetMap contributors, licensed under ODbL. You may not scrape, copy, or redistribute BizScope AI's interface or data without permission.</p>
          </Section>

          <Section title="8. Limitation of Liability">
            <p>BizScope AI is provided "as is" without warranty of any kind. We are not liable for any direct, indirect, or consequential damages arising from use of the Service.</p>
          </Section>

          <Section title="9. Changes">
            <p>We may update these terms at any time. Continued use of the Service after changes constitutes acceptance of the new terms.</p>
          </Section>

          <Section title="10. Contact">
            <p>Questions about these terms: <a href="mailto:shivanshsinghsengar@gmail.com" style={{ color: '#c8f03a' }}>shivanshsinghsengar@gmail.com</a></p>
          </Section>
        </div>
      </div>
    </>
  );
}
