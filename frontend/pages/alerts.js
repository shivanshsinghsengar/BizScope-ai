import Head from 'next/head';
import { useState, useEffect } from 'react';
import API_URL from '../utils/api';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

const BUSINESS_TYPES = [
  'Restaurant', 'Cafe', 'Grocery', 'Gym', 'Salon', 'Pharmacy', 'Bakery',
  'Laundry', 'Hospital', 'Clothing', 'Electronics', 'Hardware', 'Furniture',
  'Education', 'Jewellery', 'Automotive', 'Finance', 'Hotel', 'Retail', 'Other',
];

const categoryIcons = {
  Restaurant: '🍽️', Cafe: '☕', Grocery: '🛒', Gym: '💪',
  Salon: '✂️', Pharmacy: '💊', Bakery: '🥐', Laundry: '👕',
  Hospital: '🏥', Clothing: '👗', Electronics: '📱',
  Hardware: '🔧', Furniture: '🛋️', Education: '🎓',
  Jewellery: '💍', Automotive: '🚗', Finance: '🏦',
  Hotel: '🏩', Retail: '🛍️', Other: '🏪',
};

export default function Alerts() {
  const { user, token } = useAuth();
  const [city, setCity] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [email, setEmail] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkLoading, setCheckLoading] = useState(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [checkResult, setCheckResult] = useState(null);

  // Load saved alerts from localStorage — only after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    try {
      const stored = JSON.parse(localStorage.getItem('bizscope_alerts') || '[]');
      setAlerts(stored);
    } catch (_) {}
    if (user?.email) setEmail(user.email);
  }, [user]);

  const saveAlert = (e) => {
    e.preventDefault();
    if (!city.trim() || !businessType || !email.trim()) return;
    setError('');

    const newAlert = {
      id: Date.now(),
      city: city.trim(),
      businessType,
      email: email.trim(),
      createdAt: new Date().toISOString(),
      lastChecked: null,
      newCount: 0,
    };

    const updated = [newAlert, ...alerts];
    setAlerts(updated);
    localStorage.setItem('bizscope_alerts', JSON.stringify(updated));
    setSaved(true);
    setCity('');
    setBusinessType('');
    setTimeout(() => setSaved(false), 3000);
  };

  const deleteAlert = (id) => {
    const updated = alerts.filter(a => a.id !== id);
    setAlerts(updated);
    localStorage.setItem('bizscope_alerts', JSON.stringify(updated));
  };

  const checkNow = async (alert) => {
    setCheckLoading(alert.id);
    setCheckResult(null);
    try {
      const res = await fetch(`${API_URL}/api/competitor-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: alert.city, businessType: alert.businessType }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`Backend unavailable (status ${res.status}). Make sure the server is running on port 5000.`);
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Update alert with last checked time and count
      const updated = alerts.map(a =>
        a.id === alert.id
          ? { ...a, lastChecked: new Date().toISOString(), newCount: data.newCount || 0, totalCount: data.totalCount }
          : a
      );
      setAlerts(updated);
      localStorage.setItem('bizscope_alerts', JSON.stringify(updated));
      setCheckResult({ alertId: alert.id, ...data });
    } catch (err) {
      setError(err.message || 'Check failed. Please try again.');
    }
    setCheckLoading(null);
  };

  const formatDate = (iso) => {
    if (!iso) return 'Never';
    // Use a locale-neutral format to avoid SSR/client mismatch
    const d = new Date(iso);
    const day = d.getDate();
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  return (
    <Layout>
      <Head>
        <title>Competitor Alerts — BizScope AI</title>
        <meta name="description" content="Get notified when new competitors open in your city. Track new cafes, gyms, restaurants and more." />
      </Head>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text)', marginBottom: '8px' }}>
            🔔 Competitor Alert System
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '15px' }}>
            Save your city + business type. We'll check for new competitors using live OSM data and show you what's new.
          </p>
        </div>

        {/* How it works */}
        <div style={{ background: 'linear-gradient(135deg, #3b82f615, #8b5cf610)', border: '1px solid #3b82f630', borderRadius: '20px', padding: '20px 24px', marginBottom: '28px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {[
            { icon: '📍', title: 'Set Your Area', desc: 'Enter city + business type you want to monitor' },
            { icon: '🔍', title: 'Live OSM Scan', desc: 'We scan OpenStreetMap for new businesses in real-time' },
            { icon: '📊', title: 'See New Entries', desc: 'Get a count of new competitors added this month' },
            { icon: '📧', title: 'Email Alerts', desc: 'Save your email to receive monthly digest notifications' },
          ].map(s => (
            <div key={s.title} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flex: '1 1 180px' }}>
              <span style={{ fontSize: '24px', flexShrink: 0 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', marginBottom: '2px' }}>{s.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Create alert form */}
        <form onSubmit={saveAlert}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '24px', padding: '28px', marginBottom: '28px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #f59e0b, #ef4444, #8b5cf6)' }} />
            <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', marginBottom: '20px' }}>
              ➕ Create New Alert
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                  📍 City *
                </label>
                <input
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="e.g. Koramangala, Bangalore"
                  required
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                  🏪 Business Type *
                </label>
                <select
                  value={businessType}
                  onChange={e => setBusinessType(e.target.value)}
                  required
                  className="input-field"
                  style={{ width: '100%' }}
                >
                  <option value="">Select type...</option>
                  {BUSINESS_TYPES.map(t => (
                    <option key={t} value={t}>{categoryIcons[t] || '🏪'} {t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                  📧 Alert Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <button
              type="submit"
              style={{
                width: '100%', padding: '13px', borderRadius: '12px', border: 'none',
                background: saved ? '#22c55e' : 'linear-gradient(135deg, #f59e0b, #ef4444)',
                color: 'white', fontWeight: '700', fontSize: '14px', cursor: 'pointer',
                transition: 'all 0.3s',
              }}
            >
              {saved ? '✅ Alert Saved!' : '🔔 Save Alert'}
            </button>

            {error && (
              <div style={{ marginTop: '12px', padding: '10px 14px', background: '#ef444415', border: '1px solid #ef444440', borderRadius: '10px', color: '#f87171', fontSize: '13px' }}>
                ⚠️ {error}
              </div>
            )}
          </div>
        </form>

        {/* Saved alerts */}
        {!mounted ? null : alerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '24px' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>🔕</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text)', marginBottom: '8px' }}>No alerts yet</div>
            <div style={{ fontSize: '14px', color: 'var(--muted)' }}>Create your first alert above to start monitoring competitors</div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', marginBottom: '16px' }}>
              📋 Your Alerts ({alerts.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {alerts.map(alert => {
                const result = checkResult?.alertId === alert.id ? checkResult : null;
                return (
                  <div key={alert.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '22px', position: 'relative', overflow: 'hidden' }}>
                    {alert.newCount > 0 && (
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #ef4444, #f59e0b)' }} />
                    )}

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                      {/* Icon */}
                      <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#f59e0b20', border: '1px solid #f59e0b40', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', flexShrink: 0 }}>
                        {categoryIcons[alert.businessType] || '🏪'}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)', marginBottom: '4px' }}>
                          {alert.businessType} in {alert.city}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>
                          📧 {alert.email} · Created {formatDate(alert.createdAt)}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ padding: '3px 10px', borderRadius: '100px', background: '#3b82f615', color: '#60a5fa', fontSize: '11px', fontWeight: '600' }}>
                            Last checked: {formatDate(alert.lastChecked)}
                          </span>
                          {alert.totalCount !== undefined && (
                            <span style={{ padding: '3px 10px', borderRadius: '100px', background: '#8b5cf615', color: '#a78bfa', fontSize: '11px', fontWeight: '600' }}>
                              {alert.totalCount} total in area
                            </span>
                          )}
                          {alert.newCount > 0 && (
                            <span style={{ padding: '3px 10px', borderRadius: '100px', background: '#ef444420', color: '#f87171', fontSize: '11px', fontWeight: '700' }}>
                              🆕 {alert.newCount} new this month
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        <button
                          onClick={() => checkNow(alert)}
                          disabled={checkLoading === alert.id}
                          style={{
                            padding: '9px 18px', borderRadius: '10px', border: 'none',
                            background: checkLoading === alert.id ? '#1e293b' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                            color: checkLoading === alert.id ? '#475569' : 'white',
                            fontWeight: '700', fontSize: '13px', cursor: checkLoading === alert.id ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {checkLoading === alert.id ? '⏳ Checking...' : '🔍 Check Now'}
                        </button>
                        <button
                          onClick={() => deleteAlert(alert.id)}
                          style={{ padding: '9px 14px', borderRadius: '10px', border: '1px solid #ef444440', background: 'transparent', color: '#f87171', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* Check result */}
                    {result && (
                      <div style={{ marginTop: '16px', padding: '16px', background: 'var(--surface2)', borderRadius: '14px', border: '1px solid #3b82f630' }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', marginBottom: '10px' }}>
                          📊 Latest Check Results
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
                          {[
                            { label: 'Total Found', value: result.totalCount, color: '#3b82f6' },
                            { label: 'New This Month', value: result.newCount, color: result.newCount > 0 ? '#ef4444' : '#22c55e' },
                            { label: 'Avg Rating', value: result.avgRating ? `⭐ ${result.avgRating}` : 'N/A', color: '#f59e0b' },
                          ].map(s => (
                            <div key={s.label} style={{ background: 'var(--surface)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                              <div style={{ fontSize: '20px', fontWeight: '800', color: s.color, marginBottom: '2px' }}>{s.value}</div>
                              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{s.label}</div>
                            </div>
                          ))}
                        </div>
                        {result.newCount > 0 && (
                          <div style={{ padding: '10px 14px', background: '#ef444415', border: '1px solid #ef444430', borderRadius: '10px', fontSize: '13px', color: '#f87171', fontWeight: '600' }}>
                            🚨 {result.newCount} new {alert.businessType.toLowerCase()}
                            {result.newCount !== 1 ? 's' : ''} opened in {alert.city} this month!
                          </div>
                        )}
                        {result.newCount === 0 && (
                          <div style={{ padding: '10px 14px', background: '#22c55e15', border: '1px solid #22c55e30', borderRadius: '10px', fontSize: '13px', color: '#4ade80', fontWeight: '600' }}>
                            ✅ No new {alert.businessType.toLowerCase()}s detected in {alert.city} this month.
                          </div>
                        )}
                        {result.businesses && result.businesses.length > 0 && (
                          <div style={{ marginTop: '10px' }}>
                            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>Recent entries:</div>
                            {result.businesses.slice(0, 3).map((b, i) => (
                              <div key={i} style={{ fontSize: '12px', color: 'var(--text2)', padding: '6px 10px', background: 'var(--surface)', borderRadius: '8px', marginBottom: '4px' }}>
                                {categoryIcons[alert.businessType] || '🏪'} {b.name} — {b.address || 'Address not available'}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Info note */}
        <div style={{ marginTop: '28px', padding: '16px 20px', background: 'var(--surface2)', borderRadius: '14px', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--muted)', lineHeight: '1.7' }}>
          ℹ️ <strong style={{ color: 'var(--text)' }}>How alerts work:</strong> Click "Check Now" to scan live OpenStreetMap data for the latest businesses in your area. The "new this month" count estimates businesses added in the last 30 days based on OSM metadata. Email notifications are stored locally — in a future update, we'll send automated monthly digests.
        </div>
      </div>
    </Layout>
  );
}
