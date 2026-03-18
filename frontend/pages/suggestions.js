import API_URL from '../utils/api';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import Head from 'next/head';

export default function Suggestions() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    fetch(`${API_URL}/api/suggestions`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => { setError('Could not load suggestions'); setLoading(false); });
  }, [user]);

  if (!user) return null;

  return (
    <Layout>
      <Head><title>Public Suggestions — BizScope</title></Head>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text)', marginBottom: '6px' }}>📬 Public Business Suggestions</h1>
        <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '28px' }}>Businesses submitted by visitors — no login required on their end.</p>

        {loading && <p style={{ color: 'var(--muted)' }}>Loading...</p>}
        {error && <p style={{ color: '#f87171' }}>⚠️ {error}</p>}

        {!loading && data.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
            <div style={{ color: 'var(--text)', fontWeight: '600' }}>No suggestions yet</div>
            <div style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '6px' }}>When someone submits a business via the ＋ button, it'll appear here.</div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {data.map((s, i) => (
            <div key={s.id || i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '18px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <span style={{ fontWeight: '700', color: 'var(--text)', fontSize: '15px' }}>{s.name}</span>
                  <span style={{ marginLeft: '10px', padding: '2px 10px', borderRadius: '100px', background: '#6366f120', color: '#a78bfa', fontSize: '11px', fontWeight: '600' }}>{s.category}</span>
                  <span style={{ marginLeft: '8px', padding: '2px 10px', borderRadius: '100px', background: '#f59e0b20', color: '#fbbf24', fontSize: '11px' }}>{s.status}</span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--muted3)' }}>{new Date(s.createdAt).toLocaleString()}</span>
              </div>
              <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--muted)', display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                {s.city && <span>📍 {s.address ? `${s.address}, ` : ''}{s.city} {s.pincode}</span>}
                {s.phone && <span>📞 {s.phone}</span>}
                {s.submitterName && <span>👤 {s.submitterName}</span>}
              </div>
              {s.description && <div style={{ marginTop: '6px', fontSize: '13px', color: 'var(--muted2)' }}>{s.description}</div>}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
