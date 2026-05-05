import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import API_URL from '../utils/api';

const STORAGE_KEY = 'bizscope_tracked_locations';

function loadTracked() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function saveTracked(items) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
}

export default function TrackPage() {
  const router = useRouter();
  const [tracked, setTracked] = useState([]);
  const [checking, setChecking] = useState({});
  const [error, setError] = useState('');
  const [addLocation, setAddLocation] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const items = loadTracked();
    // Fix any items that have wrong baselines (baselineCount missing or 0)
    const fixed = items.map(item => ({
      ...item,
      baselineCount: item.baselineCount || item.businessCount || 0,
      newBusinesses: 0,  // reset changes on load — fresh start
      closedBusinesses: 0,
    }));
    setTracked(fixed);
    saveTracked(fixed);
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    const loc = addLocation.trim();
    if (!loc) return;
    if (tracked.find(t => t.location.toLowerCase() === loc.toLowerCase())) {
      setError('Already tracking this location.');
      return;
    }
    setAdding(true); setError('');
    try {
      // Quick geocode check
      const res = await fetch(`${API_URL}/api/analyze-location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: loc }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const count = data.businesses?.length || 0;
      const newItem = {
        id: Date.now(),
        location: loc,
        displayName: data.location?.displayName?.split(',').slice(0, 2).join(', ') || loc,
        businessCount: count,
        baselineCount: count, // locked baseline — never changes
        categoryStats: data.categoryStats || [],
        lastChecked: new Date().toISOString(),
        newBusinesses: 0,
        closedBusinesses: 0,
        checksCount: 0,
      };
      const updated = [newItem, ...tracked];
      setTracked(updated);
      saveTracked(updated);
      setAddLocation('');
    } catch (err) {
      setError(err.message === 'Failed to fetch' 
        ? 'Backend is waking up — please wait 30 seconds and try again.' 
        : err.message || 'Could not find this location. Try a city name like "Mumbai".');
    } finally {
      setAdding(false);
    }
  };

  const handleCheck = async (id) => {
    const item = tracked.find(t => t.id === id);
    if (!item) return;
    setChecking(c => ({ ...c, [id]: true })); setError('');
    try {
      const res = await fetch(`${API_URL}/api/analyze-location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: item.location }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const currentCount = data.businesses?.length || 0;

      // Use the locked baseline — never change it after first set
      // This prevents API noise from showing as fake changes
      const baseline = item.baselineCount ?? item.businessCount ?? currentCount;
      const diff = currentCount - baseline;

      // Only flag as real change if >10% AND at least 5 businesses different
      const threshold = Math.max(5, Math.floor(baseline * 0.10));
      const isRealChange = Math.abs(diff) >= threshold;

      const updated = tracked.map(t => t.id === id ? {
        ...t,
        businessCount: currentCount,
        baselineCount: baseline, // keep baseline locked
        categoryStats: data.categoryStats || t.categoryStats,
        lastChecked: new Date().toISOString(),
        // Only show changes if genuinely significant
        newBusinesses: (isRealChange && diff > 0) ? diff : 0,
        closedBusinesses: (isRealChange && diff < 0) ? Math.abs(diff) : 0,
        checksCount: (t.checksCount || 0) + 1,
      } : t);
      setTracked(updated);
      saveTracked(updated);
    } catch (err) {
      setError(err.message === 'Failed to fetch'
        ? 'Backend is waking up — please wait 30 seconds and try again.'
        : err.message || 'Check failed. Try again.');
    } finally {
      setChecking(c => ({ ...c, [id]: false }));
    }
  };

  const handleDelete = (id) => {
    const updated = tracked.filter(t => t.id !== id);
    setTracked(updated);
    saveTracked(updated);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <Layout>
      <Head>
        <title>Competitor Tracking — BizScope AI</title>
        <meta name="description" content="Track competitor locations and monitor business changes over time." />
      </Head>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
            <div style={{ fontSize: '36px' }}>📡</div>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text)', margin: 0 }}>Competitor Tracking</h1>
              <p style={{ color: 'var(--muted)', fontSize: '14px', margin: '4px 0 0' }}>
                Monitor business changes in your target locations — no login required
              </p>
            </div>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#3b82f615', border: '1px solid #3b82f630', borderRadius: '100px', padding: '4px 12px', fontSize: '11px', color: '#3b82f6', fontWeight: '700' }}>
            💾 Saved locally in your browser
          </div>
        </div>

        {/* Add location form */}
        <div className="card" style={{ padding: '24px', marginBottom: '28px' }}>
          <div style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: '600', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            ➕ Track a New Location
          </div>
          <form onSubmit={handleAdd} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input
              value={addLocation}
              onChange={e => setAddLocation(e.target.value)}
              placeholder="e.g. Koramangala Bangalore, Connaught Place Delhi"
              className="input-field"
              style={{ flex: 1, minWidth: '200px' }}
            />
            <button type="submit" className="btn-primary" disabled={adding} style={{ padding: '12px 24px', whiteSpace: 'nowrap' }}>
              {adding ? '⏳ Adding...' : '📡 Start Tracking'}
            </button>
          </form>
          {/* Quick add examples */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
            {['Mumbai', 'Mathura', 'Connaught Place Delhi', 'Koramangala Bangalore'].map(loc => (
              <button key={loc} type="button" onClick={() => setAddLocation(loc)}
                style={{ padding: '3px 10px', borderRadius: '100px', border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--muted)', fontSize: '11px', cursor: 'pointer' }}>
                📍 {loc}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ background: '#ef444415', border: '1px solid #ef444440', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', color: '#f87171', fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>⚠️ {error}</span>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '16px' }}>✕</button>
          </div>
        )}

        {/* Tracked list */}
        {tracked.length === 0 ? (
          <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📍</div>
            <div style={{ color: 'var(--text)', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>No locations tracked yet</div>
            <div style={{ color: 'var(--muted)', fontSize: '14px' }}>Add a city above to start monitoring competitor activity.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {tracked.map((item, i) => {
              return (
                <div key={item.id} className="card" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      {/* Location name */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '18px' }}>📍</span>
                        <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)' }}>{item.displayName || item.location}</span>
                        <span style={{ padding: '3px 10px', borderRadius: '100px', background: '#3b82f615', border: '1px solid #3b82f630', color: '#3b82f6', fontSize: '11px', fontWeight: '700' }}>
                          TRACKING
                        </span>
                      </div>

                      {/* Stats row */}
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--muted)', marginBottom: '12px' }}>
                        <span>🏪 <strong style={{ color: 'var(--text)' }}>{item.baselineCount || item.businessCount}</strong> businesses</span>
                        <span>🕐 <strong style={{ color: 'var(--text)' }}>{formatDate(item.lastChecked)}</strong></span>
                      </div>

                      {/* Market insights cards */}
                      {item.categoryStats?.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                          {/* Most competitive */}
                          <div style={{ background: '#ef444415', border: '1px solid #ef444430', borderRadius: '12px', padding: '12px' }}>
                            <div style={{ fontSize: '10px', color: '#f87171', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>🔴 Most Competitive</div>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)' }}>{item.categoryStats[0]?.category}</div>
                            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{item.categoryStats[0]?.count} businesses</div>
                          </div>
                          {/* Best opportunity */}
                          {item.categoryStats.length > 1 && (
                            <div style={{ background: '#10b98115', border: '1px solid #10b98130', borderRadius: '12px', padding: '12px' }}>
                              <div style={{ fontSize: '10px', color: '#34d399', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>🟢 Best Opportunity</div>
                              <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)' }}>{item.categoryStats[item.categoryStats.length - 1]?.category}</div>
                              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Only {item.categoryStats[item.categoryStats.length - 1]?.count} competitors</div>
                            </div>
                          )}
                          {/* Total categories */}
                          <div style={{ background: '#3b82f615', border: '1px solid #3b82f630', borderRadius: '12px', padding: '12px' }}>
                            <div style={{ fontSize: '10px', color: '#3b82f6', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>📊 Market Size</div>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)' }}>{item.baselineCount || item.businessCount} total</div>
                            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{item.categoryStats.length} categories</div>
                          </div>
                        </div>
                      )}

                      {/* Change indicators — only show if significant */}
                      {(item.newBusinesses > 0 || item.closedBusinesses > 0) && (
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                          {item.newBusinesses > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '100px', background: '#10b98115', border: '1px solid #10b98130' }}>
                              <span style={{ color: '#34d399', fontWeight: '700' }}>+{item.newBusinesses}</span>
                              <span style={{ color: 'var(--muted)', fontSize: '12px' }}>significant increase detected</span>
                            </div>
                          )}
                          {item.closedBusinesses > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '100px', background: '#ef444415', border: '1px solid #ef444430' }}>
                              <span style={{ color: '#f87171', fontWeight: '700' }}>-{item.closedBusinesses}</span>
                              <span style={{ color: 'var(--muted)', fontSize: '12px' }}>significant decrease detected</span>
                            </div>
                          )}
                        </div>
                      )}
                      {!item.newBusinesses && !item.closedBusinesses && item.lastChecked && (
                        <div style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                          Market stable — no significant changes
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
                      <button onClick={() => handleCheck(item.id)} disabled={checking[item.id]}
                        style={{ padding: '9px 16px', borderRadius: '10px', border: '1px solid #3b82f640', background: '#3b82f615', color: '#3b82f6', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                        {checking[item.id] ? '⏳' : '🔄'} {checking[item.id] ? 'Checking...' : 'Check Now'}
                      </button>
                      <button onClick={() => router.push(`/?location=${encodeURIComponent(item.location)}`)}
                        style={{ padding: '9px 16px', borderRadius: '10px', border: '1px solid var(--border2)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: '13px' }}>
                        📊 Analyze
                      </button>
                      <button onClick={() => handleDelete(item.id)}
                        style={{ padding: '9px 12px', borderRadius: '10px', border: '1px solid #ef444430', background: 'transparent', color: '#f87171', cursor: 'pointer', fontSize: '13px' }}>
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Info */}
        <div style={{ marginTop: '32px', background: '#3b82f608', border: '1px solid #3b82f620', borderRadius: '16px', padding: '20px 24px' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#3b82f6', marginBottom: '8px' }}>ℹ️ How Tracking Works</div>
          <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.7' }}>
            Tracked locations are saved in your browser. Click "Check Now" to re-run a live analysis and see if the business count has changed since your last check. Data is stored locally — clearing browser data will remove your tracked locations.
          </div>
        </div>
      </div>
    </Layout>
  );
}
