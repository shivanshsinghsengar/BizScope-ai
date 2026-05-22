import API_URL from '../utils/api';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useTheme } from '../context/ThemeContext';

export default function StatusPage() {
  const router = useRouter();
  const { dark, mounted, toggle } = useTheme();
  const [health, setHealth] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/api/health`);
        const data = await res.json();
        setHealth(data);
      } catch (e) {
        setError('Could not fetch system status.');
      }
    };
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, []);

  const ok = health?.status === 'ok';

  return (
    <>
      <Head>
        <title>System Status — BizScope AI</title>
        <meta name="description" content="Live health status for BizScope AI services." />
      </Head>
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
        <nav style={{ borderBottom: '1px solid var(--border)', background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg,#c8f03a,#a8d420)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🚀</div>
            <span style={{ fontWeight: '700', fontSize: '18px', color: 'var(--text)' }}>BizScope AI</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={toggle} suppressHydrationWarning style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '16px' }}>{mounted ? (dark ? '☀️' : '🌙') : '��'}</button>
            <button onClick={() => router.push('/')} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px' }}>← Back</button>
          </div>
        </nav>

        <div style={{ maxWidth: '760px', margin: '0 auto', padding: '56px 20px' }}>
          <h1 style={{ fontSize: '34px', fontWeight: '800', marginBottom: '8px' }}>System Status</h1>
          <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>Live status refreshed every 30 seconds.</p>

          <div style={{ background: 'var(--surface)', border: `1px solid ${ok ? '#10b98155' : '#ef444455'}`, borderRadius: '18px', padding: '22px' }}>
            {error && <div style={{ color: '#f87171', fontSize: '14px' }}>{error}</div>}
            {!health && !error && <div style={{ color: 'var(--muted)' }}>Loading health data...</div>}
            {health && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: ok ? '#10b981' : '#ef4444' }} />
                  <span style={{ fontWeight: '700', color: ok ? '#34d399' : '#f87171', textTransform: 'uppercase', fontSize: '12px' }}>
                    {health.status}
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text2)', lineHeight: '1.8' }}>
                  <div>Database: <strong>{health.database}</strong></div>
                  <div>Environment: <strong>{health.env}</strong></div>
                  <div>Uptime: <strong>{Math.floor((health.uptimeSeconds || 0) / 60)} min</strong></div>
                  <div>Total Requests: <strong>{health.metrics?.totalRequests ?? 0}</strong></div>
                  <div>Slow Requests: <strong>{health.metrics?.slowRequests ?? 0}</strong></div>
                  <div>Updated: <strong>{health.timestamp}</strong></div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
