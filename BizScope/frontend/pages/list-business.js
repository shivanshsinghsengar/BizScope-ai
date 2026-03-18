import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const categories = ['Restaurant', 'Cafe', 'Grocery', 'Gym', 'Salon', 'Pharmacy', 'Bakery', 'Laundry', 'Retail', 'Electronics', 'Clothing', 'Jewellery', 'Hardware', 'Medical', 'Education', 'Finance', 'Hospitality', 'Other'];
const categoryIcons = { Restaurant: '🍽️', Cafe: '☕', Grocery: '🛒', Gym: '💪', Salon: '✂️', Pharmacy: '💊', Bakery: '🥐', Laundry: '👕', Retail: '🛍️', Electronics: '📱', Clothing: '👗', Jewellery: '💍', Hardware: '🔧', Medical: '🏥', Education: '📚', Finance: '🏦', Hospitality: '🏨', Other: '🏪' };

export default function ListBusiness() {
  const { user, token, logout } = useAuth();
  const router = useRouter();
  const [myBusinesses, setMyBusinesses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const emptyForm = { name: '', category: 'Restaurant', address: '', city: '', pincode: '', phone: '', website: '', description: '', latitude: '', longitude: '' };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    fetchMyBusinesses();
  }, [user]);

  const fetchMyBusinesses = async () => {
    const res = await fetch('http://localhost:5000/api/businesses/my', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setMyBusinesses(Array.isArray(data) ? data : []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      const url = editingId
        ? `http://localhost:5000/api/businesses/manual/${editingId}`
        : 'http://localhost:5000/api/businesses/manual';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSuccess(editingId ? 'Business updated!' : 'Business listed successfully!');
      setShowForm(false); setEditingId(null);
      setForm(emptyForm);
      fetchMyBusinesses();
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  const handleEdit = (b) => {
    setForm({ name: b.name, category: b.category, address: b.address || '', city: b.city || '', pincode: b.pincode || '', phone: b.phone || '', website: b.website || '', description: b.description || '', latitude: b.latitude || '', longitude: b.longitude || '' });
    setEditingId(b.id);
    setShowForm(true);
    setError(''); setSuccess('');
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this listing?')) return;
    await fetch(`http://localhost:5000/api/businesses/manual/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    fetchMyBusinesses();
  };

  const useMyLocation = () => {
    navigator.geolocation.getCurrentPosition(pos => {
      setForm(f => ({ ...f, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) }));
    });
  };

  if (!user) return null;

  return (
    <Layout>
      <Head><title>List Your Business — BizScope AI</title></Head>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text)', marginBottom: '6px' }}>🏪 My Business Listings</h1>
            <p style={{ color: 'var(--muted)' }}>Welcome, <span style={{ color: '#a78bfa' }}>{user.name}</span> — manage your business on the map</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => { setShowForm(!showForm); setError(''); setSuccess(''); setEditingId(null); setForm(emptyForm); }}
              className="btn-primary" style={{ padding: '10px 20px' }}>
              {showForm ? '✕ Cancel' : '+ Add Business'}
            </button>
            <button onClick={() => { logout(); router.push('/'); }}
              style={{ padding: '10px 20px', borderRadius: '12px', border: '1px solid var(--border2)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: '14px' }}>
              Sign Out
            </button>
          </div>
        </div>

        {success && <div style={{ background: '#10b98120', border: '1px solid #10b98140', borderRadius: '12px', padding: '14px 18px', color: '#34d399', marginBottom: '20px', fontSize: '14px' }}>✅ {success}</div>}

        {/* Add Business Form */}
        {showForm && (
          <div style={{ background: 'var(--surface)', border: '1px solid #4f46e530', borderRadius: '24px', padding: '28px', marginBottom: '28px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #6366f1, #a78bfa)' }} />
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text)', marginBottom: '24px' }}>{editingId ? '✏️ Edit Business' : '📝 Add Your Business'}</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                {[
                  { name: 'name', label: 'Business Name *', placeholder: 'e.g. Sharma General Store' },
                  { name: 'phone', label: 'Phone Number', placeholder: '+91 98765 43210' },
                  { name: 'address', label: 'Street Address *', placeholder: 'e.g. 12, MG Road' },
                  { name: 'city', label: 'City *', placeholder: 'e.g. Mumbai' },
                  { name: 'pincode', label: 'Pincode', placeholder: 'e.g. 400001' },
                  { name: 'website', label: 'Website', placeholder: 'https://...' },
                ].map(f => (
                  <div key={f.name}>
                    <label style={{ display: 'block', fontSize: '11px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>{f.label}</label>
                    <input value={form[f.name]} onChange={e => setForm({ ...form, [f.name]: e.target.value })} placeholder={f.placeholder} required={f.label.includes('*')} className="input-field" />
                  </div>
                ))}
              </div>

              {/* Category */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Category *</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {categories.map(cat => (
                    <button type="button" key={cat} onClick={() => setForm({ ...form, category: cat })}
                      style={{ padding: '7px 14px', borderRadius: '100px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: 'all 0.15s', background: form.category === cat ? '#6366f1' : 'var(--surface2)', color: form.category === cat ? 'white' : 'var(--muted)' }}>
                      {categoryIcons[cat]} {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description of your business..." rows={3}
                  style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
              </div>

              {/* Location */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Location Coordinates</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                  <div>
                    <input value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} placeholder="Latitude (e.g. 19.0760)" className="input-field" />
                  </div>
                  <div>
                    <input value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} placeholder="Longitude (e.g. 72.8777)" className="input-field" />
                  </div>
                  <button type="button" onClick={useMyLocation}
                    style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--muted)', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>
                    📍 Use My Location
                  </button>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--muted3)', marginTop: '6px' }}>Tip: Click "Use My Location" if you're at your business, or find coordinates on Google Maps</p>
              </div>

              {error && <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '16px' }}>⚠️ {error}</p>}
              <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%' }}>
                {loading ? 'Submitting...' : '🚀 List My Business'}
              </button>
            </form>
          </div>
        )}

        {/* My Listings */}
        {myBusinesses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏪</div>
            <div style={{ color: 'var(--text)', fontWeight: '600', fontSize: '18px', marginBottom: '8px' }}>No listings yet</div>
            <div style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px' }}>Add your business to appear in market analysis searches</div>
            <button onClick={() => setShowForm(true)} className="btn-primary">+ Add Your First Business</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '14px' }}>
            {myBusinesses.map(b => (
              <div key={b.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '22px', display: 'flex', gap: '16px', alignItems: 'flex-start', transition: 'border-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#6366f120', border: '1px solid #6366f130', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
                  {categoryIcons[b.category] || '🏪'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '700', color: 'var(--text)', fontSize: '16px' }}>{b.name}</span>
                    <span style={{ padding: '3px 10px', borderRadius: '100px', background: '#6366f120', color: '#a78bfa', fontSize: '11px', fontWeight: '600' }}>{b.category}</span>
                    <span style={{ padding: '3px 10px', borderRadius: '100px', background: b.verified ? '#10b98120' : '#f59e0b20', color: b.verified ? '#34d399' : '#fbbf24', fontSize: '11px', fontWeight: '600' }}>
                      {b.verified ? '✅ Verified' : '⏳ Pending'}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' }}>📍 {b.address}, {b.city} {b.pincode}</div>
                  {b.phone && <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' }}>📞 {b.phone}</div>}
                  {b.description && <div style={{ fontSize: '13px', color: 'var(--muted2)', marginTop: '6px' }}>{b.description}</div>}
                </div>
                <button onClick={() => handleDelete(b.id)}
                  style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #ef444430', background: '#ef444415', color: '#f87171', cursor: 'pointer', fontSize: '13px', flexShrink: 0 }}>
                  🗑️ Remove
                </button>
                <button onClick={() => handleEdit(b)}
                  style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #6366f130', background: '#6366f115', color: '#a78bfa', cursor: 'pointer', fontSize: '13px', flexShrink: 0 }}>
                  ✏️ Edit
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
