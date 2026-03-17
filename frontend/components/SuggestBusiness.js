import { useState } from 'react';

const categories = ['Restaurant','Cafe','Grocery','Gym','Salon','Pharmacy','Bakery','Laundry','Retail','Electronics','Clothing','Hardware','Medical','Education','Finance','Hospitality','Other'];

export default function SuggestBusiness() {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', category: 'Other', address: '', city: '', pincode: '', phone: '', description: '', submitterName: '' });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('http://localhost:5000/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDone(true);
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  const reset = () => { setOpen(false); setDone(false); setError(''); setForm({ name: '', category: 'Other', address: '', city: '', pincode: '', phone: '', description: '', submitterName: '' }); };

  return (
    <>
      {/* Floating trigger — bottom-right corner, subtle */}
      <button
        onClick={() => setOpen(true)}
        title="Know a local business? Add it"
        style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 200,
          width: '40px', height: '40px', borderRadius: '50%',
          background: 'var(--surface2)', border: '1px solid var(--border2)',
          color: 'var(--muted)', fontSize: '18px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          transition: 'border-color 0.2s, color 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#4f46e5'; e.currentTarget.style.color = '#a78bfa'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#64748b'; }}
      >
        ＋
      </button>

      {/* Overlay */}
      {open && (
        <div
          onClick={reset}
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        />
      )}

      {/* Panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: '72px', right: '24px', zIndex: 400,
          width: '340px', background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '20px', padding: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          maxHeight: '80vh', overflowY: 'auto',
        }}>
          {done ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>✅</div>
              <div style={{ color: 'white', fontWeight: '600', marginBottom: '6px' }}>Thanks for the tip!</div>
              <div style={{ color: '#475569', fontSize: '13px', marginBottom: '20px' }}>We'll review and add it to the map.</div>
              <button onClick={reset} style={{ background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', padding: '8px 20px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px' }}>Close</button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <span style={{ color: 'white', fontWeight: '600', fontSize: '14px' }}>Know a local business?</span>
                <button onClick={reset} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>×</button>
              </div>
              <p style={{ color: '#475569', fontSize: '12px', marginBottom: '16px', lineHeight: '1.5' }}>
                Help us map local businesses. No account needed.
              </p>
              <form onSubmit={handleSubmit}>
                {[
                  { k: 'name', label: 'Business Name *', placeholder: 'e.g. Sharma Kirana Store' },
                  { k: 'address', label: 'Address', placeholder: 'Street / Area' },
                  { k: 'city', label: 'City *', placeholder: 'e.g. Delhi' },
                  { k: 'pincode', label: 'Pincode', placeholder: '110001' },
                  { k: 'phone', label: 'Phone', placeholder: '+91 ...' },
                  { k: 'submitterName', label: 'Your Name (optional)', placeholder: 'Anonymous' },
                ].map(f => (
                  <div key={f.k} style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', fontSize: '10px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>{f.label}</label>
                    <input
                      value={form[f.k]} onChange={e => set(f.k, e.target.value)}
                      placeholder={f.placeholder} required={f.label.includes('*')}
                      style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '9px 12px', borderRadius: '10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                ))}

                {/* Category */}
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontSize: '10px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>Category</label>
                  <select value={form.category} onChange={e => set('category', e.target.value)}
                    style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '9px 12px', borderRadius: '10px', fontSize: '13px', outline: 'none' }}>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Description */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '10px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>Short Description</label>
                  <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} placeholder="What do they sell / offer?"
                    style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '9px 12px', borderRadius: '10px', fontSize: '13px', outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>

                {error && <p style={{ color: '#f87171', fontSize: '12px', marginBottom: '10px' }}>⚠️ {error}</p>}

                <button type="submit" disabled={loading}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: 'none', background: loading ? '#1e293b' : 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: loading ? '#475569' : 'white', fontWeight: '600', fontSize: '13px', cursor: loading ? 'not-allowed' : 'pointer' }}>
                  {loading ? 'Submitting...' : 'Submit Business'}
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
