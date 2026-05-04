import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import API_URL from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function TrackPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [tracked, setTracked] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState({});
  const [error, setError] = useState('');
  const [addLocation, setAddLocation] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchTracked();
  }, [user]);

  const fetchTracked = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/track`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setTracked(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load tracked locations.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!addLocation.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`${API_URL}/api/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ location: addLocation.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add');
      setAddLocation('');
      fetchTracked();
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleCheck = async (id) => {
    setChecking(c => ({ ...c, [id]: true }));
    try {
      const res = await fetch(`${API_URL}/api/track/check?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Check failed');
      setTracked(t => t.map(item => item.id === id ? { ...item, ...data } : item));
    } catch (err) {
      setError(err.message);
    } finally {
      setChecking(c => ({ ...c, [id]: false }));
    }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`${API_URL}/api/track/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setTracked(t => t.filter(item => item.id !== id));
    } catch {
      setError('Failed to remove.');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  if (!user) {
    return (
      <Layout>
        <div style={{ maxWidth: '500px', margin: '80px auto', padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <h2 style={{ color: '#f3f4f6', fontSize: '22px', fontWeight: '700', marginBottom: '10px' }}>Sign in to track locations</h2>
          <p style={{ color: '#9ca3af', marginBottom: '24px' }}>Competitor tracking requires a free account.</p>
          <button onClick={() => router.push('/login')} className="btn-primary">Sign In</button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Competitor Tracking — BizScope AI</title>
        <meta name="description" content="Track competitor locations and get notified of changes." />
      </Head>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>
        {/* Header */}
        <div className="anim-fade-up" style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
            <div style={{ fontSize: '36px' }}>📡</div>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#f3f4f6', margin: 0 }}>Competitor Tracking</h1>
              <p style={{ color: '#9ca3af', fontSize: '14px', margin: '4px 0 0' }}>Monitor business changes in your target locations</p>
            </div>
          </div>
        </div>

        {/* Add location form */}
        <div className="card anim-fade-up delay-1" style={{ padding: '24px', marginBottom: '28px' }}>
          <div style={{ fontSize: '13px', color: '#9ca3af', fontWeight: '600', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            ➕ Track a New Location
          </div>
          <form onSubmit={handleAdd} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input
              value={addLocation}
              onChange={e => setAddLocation(e.target.value)}
              placeholder="e.g. Koramangala, Bangalore"
              className="input-field"
              style={{ flex: 1, minWidth: '200px' }}
            />
            <button type="submit" className="btn-primary" disabled={adding} style={{ padding: '12px 24px', whiteSpace: 'nowrap' }}>
              {adding ? '⏳ Adding...' : '📡 Start Tracking'}
            </button>
          </form>
        </div>

        {error && (
          <div style={{ background: '#ef444415', border: '1px solid #ef444440', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', color: '#f87171', fontSize: '14px' }}>
            ⚠️ {error}
            <button onClick={() => setError('')} style={{ marginLeft: '12px', background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '16px' }}>✕</button>
          </div>
        )}

        {/* Tracked list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px', animation: 'pulse 1.5s infinite' }}>📡</div>
            Loading tracked locations...
          </div>
        ) : tracked.length === 0 ? (
          <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📍</div>
            <div style={{ color: '#f3f4f6', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>No locations tracked yet</div>
            <div style={{ color: '#9ca3af', fontSize: '14px' }}>Add a location above to start monitoring competitor activity.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {tracked.map((item, i) => {
              const newCount = item.newBusinesses || 0;
              const closedCount = item.closedBusinesses || 0;
              const hasChanges = newCount > 0 || closedCount > 0;
              return (
                <div key={item.id} className="card anim-fade-up" style={{ padding: '24px', animationDelay: `${i * 0.05}s` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '20px' }}>📍</span>
                        <span style={{ fontSize: '16px', fontWeight: '700', color: '#f3f4f6' }}>{item.location}</span>
                        <span style={{ padding: '3px 10px', borderRadius: '100px', background: '#3b82f615', border: '1px solid #3b82f630', color: '#3b82f6', fontSize: '11px', fontWeight: '700' }}>
                          TRACKING
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '13px', color: '#9ca3af' }}>
                        <span>🕐 Last checked: <strong style={{ color: '#d1d5db' }}>{formatDate(item.lastChecked)}</strong></span>
                        <span>🏪 Businesses: <strong style={{ color: '#d1d5db' }}>{item.businessCount || 0}</strong></span>
                      </div>

                      {hasChanges && (
                        <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
                          {newCount > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '100px', background: '#3b82f615', border: '1px solid #3b82f630' }}>
                              <span style={{ color: '#34d399', fontWeight: '700', fontSize: '14px' }}>+{newCount}</span>
                              <span style={{ color: '#9ca3af', fontSize: '12px' }}>new businesses</span>
                            </div>
                          )}
                          {closedCount > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '100px', background: '#ef444415', border: '1px solid #ef444430' }}>
                              <span style={{ color: '#f87171', fontWeight: '700', fontSize: '14px' }}>-{closedCount}</span>
                              <span style={{ color: '#9ca3af', fontSize: '12px' }}>closed</span>
                            </div>
                          )}
                        </div>
                      )}

                      {!hasChanges && item.lastChecked && (
                        <div style={{ marginTop: '10px', fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                          No changes since last check
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <button
                        onClick={() => handleCheck(item.id)}
                        disabled={checking[item.id]}
                        style={{ padding: '9px 18px', borderRadius: '10px', border: '1px solid #3b82f640', background: '#3b82f615', color: '#3b82f6', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                      >
                        {checking[item.id] ? '⏳' : '🔄'} {checking[item.id] ? 'Checking...' : 'Check Now'}
                      </button>
                      <button
                        onClick={() => router.push(`/?location=${encodeURIComponent(item.location)}`)}
                        style={{ padding: '9px 18px', borderRadius: '10px', border: '1px solid #2d3748', background: 'transparent', color: '#9ca3af', cursor: 'pointer', fontSize: '13px' }}
                      >
                        📊 Analyze
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        style={{ padding: '9px 14px', borderRadius: '10px', border: '1px solid #ef444430', background: 'transparent', color: '#f87171', cursor: 'pointer', fontSize: '13px' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Info box */}
        <div style={{ marginTop: '32px', background: '#3b82f608', border: '1px solid #3b82f620', borderRadius: '16px', padding: '20px 24px' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#3b82f6', marginBottom: '8px' }}>ℹ️ How Tracking Works</div>
          <div style={{ fontSize: '13px', color: '#9ca3af', lineHeight: '1.7' }}>
            When you click "Check Now", BizScope re-runs a live analysis of that location and compares the business count with the last saved snapshot. New businesses and closures are highlighted automatically.
          </div>
        </div>
      </div>
    </Layout>
  );
}
