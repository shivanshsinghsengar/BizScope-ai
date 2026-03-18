import API_URL from '../utils/api';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

export default function SavedSearches() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [searches, setSearches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    fetch(`${API_URL}/api/searches`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setSearches(Array.isArray(d) ? d : []); setLoading(false); });
  }, [user]);

  const load = async (id) => {
    const res = await fetch(`${API_URL}/api/searches/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    const s = await res.json();
    if (s.data) {
      sessionStorage.setItem('analysisData', JSON.stringify(s.data));
      router.push('/analysis');
    }
  };

  const remove = async (id) => {
    await fetch(`${API_URL}/api/searches/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setSearches(s => s.filter(x => x.id !== id));
  };

  if (!user) return null;

  return (
    <Layout>
      <Head><title>Saved Searches — BizScope AI</title></Head>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text)', marginBottom: '6px' }}>🔖 Saved Searches</h1>
        <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '28px' }}>Your recent market analyses — click to reload any.</p>

        {loading && <p style={{ color: 'var(--muted)' }}>Loading...</p>}

        {!loading && searches.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
            <div style={{ color: 'var(--text)', fontWeight: '600' }}>No saved searches yet</div>
            <div style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '6px', marginBottom: '20px' }}>Run an analysis and click "Save Search" to bookmark it.</div>
            <button onClick={() => router.push('/')} className="btn-primary" style={{ padding: '10px 24px' }}>Analyze a Location</button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {searches.map(s => (
            <div key={s.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: '600', color: 'var(--text)', fontSize: '15px' }}>📍 {s.displayName}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>Saved {new Date(s.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => load(s.id)}
                  style={{ padding: '8px 18px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                  Load →
                </button>
                <button onClick={() => remove(s.id)}
                  style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--border2)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: '13px' }}>
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
