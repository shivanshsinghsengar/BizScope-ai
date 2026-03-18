import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const TABS = ['Suggestions', 'Users'];

export default function AdminPanel() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [tab, setTab] = useState('Suggestions');
  const [suggestions, setSuggestions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = sessionStorage.getItem('adminToken');
    if (!t) { router.push('/admin/login'); return; }
    setToken(t);
  }, []);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      fetch('http://localhost:5000/api/admin/suggestions', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('http://localhost:5000/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([s, u]) => {
      setSuggestions(Array.isArray(s) ? s : []);
      setUsers(Array.isArray(u) ? u : []);
      setLoading(false);
    }).catch(() => { router.push('/admin/login'); });
  }, [token]);

  const updateStatus = async (id, status) => {
    await fetch(`http://localhost:5000/api/admin/suggestions/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    setSuggestions(s => s.map(x => x.id === id ? { ...x, status } : x));
  };

  const deleteSuggestion = async (id) => {
    if (!confirm('Delete this suggestion?')) return;
    await fetch(`http://localhost:5000/api/admin/suggestions/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setSuggestions(s => s.filter(x => x.id !== id));
  };

  const logout = () => { sessionStorage.removeItem('adminToken'); router.push('/admin/login'); };

  const statusColor = { pending: '#fbbf24', approved: '#34d399', rejected: '#f87171' };

  if (!token) return null;

  return (
    <>
      <Head><title>Admin Panel — BizScope</title></Head>
      <div style={{ minHeight: '100vh', background: '#080c14', color: '#f1f5f9' }}>

        {/* Topbar */}
        <div style={{ borderBottom: '1px solid #1e293b', background: '#0a0f1a', padding: '0 32px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>🚀</div>
            <span style={{ fontWeight: '700', color: 'white' }}>BizScope <span style={{ color: '#6366f1' }}>Admin</span></span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#334155' }}>
              {suggestions.filter(s => s.status === 'pending').length} pending
            </span>
            <button onClick={logout} style={{ background: 'transparent', border: '1px solid #334155', color: '#64748b', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>Sign Out</button>
          </div>
        </div>

        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '32px' }}>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '28px' }}>
            {[
              { label: 'Total Suggestions', value: suggestions.length, color: '#6366f1' },
              { label: 'Pending', value: suggestions.filter(s => s.status === 'pending').length, color: '#f59e0b' },
              { label: 'Approved', value: suggestions.filter(s => s.status === 'approved').length, color: '#10b981' },
              { label: 'Registered Users', value: users.length, color: '#a78bfa' },
            ].map(s => (
              <div key={s.label} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '14px', padding: '18px' }}>
                <div style={{ fontSize: '26px', fontWeight: '800', color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding: '8px 18px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', background: tab === t ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : '#1e293b', color: tab === t ? 'white' : '#64748b' }}>
                {t}
              </button>
            ))}
          </div>

          {loading && <p style={{ color: '#475569' }}>Loading...</p>}

          {/* Suggestions Tab */}
          {!loading && tab === 'Suggestions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {suggestions.length === 0 && (
                <div style={{ textAlign: 'center', padding: '48px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px' }}>
                  <div style={{ fontSize: '36px', marginBottom: '10px' }}>📭</div>
                  <div style={{ color: '#475569' }}>No suggestions yet</div>
                </div>
              )}
              {suggestions.map(s => (
                <div key={s.id} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '14px', padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <span style={{ fontWeight: '700', color: 'white', fontSize: '15px' }}>{s.name}</span>
                      <span style={{ marginLeft: '8px', padding: '2px 9px', borderRadius: '100px', background: '#6366f120', color: '#a78bfa', fontSize: '11px' }}>{s.category}</span>
                      <span style={{ marginLeft: '6px', padding: '2px 9px', borderRadius: '100px', background: `${statusColor[s.status]}20`, color: statusColor[s.status], fontSize: '11px', fontWeight: '600' }}>{s.status}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#334155' }}>{new Date(s.createdAt).toLocaleString()}</span>
                  </div>
                  <div style={{ marginTop: '6px', fontSize: '13px', color: '#475569', display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
                    {s.city && <span>📍 {s.address ? `${s.address}, ` : ''}{s.city} {s.pincode}</span>}
                    {s.phone && <span>📞 {s.phone}</span>}
                    {s.submitterName && <span>👤 {s.submitterName}</span>}
                  </div>
                  {s.description && <div style={{ marginTop: '5px', fontSize: '13px', color: '#64748b' }}>{s.description}</div>}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button onClick={() => updateStatus(s.id, 'approved')} disabled={s.status === 'approved'}
                      style={{ padding: '5px 14px', borderRadius: '8px', border: 'none', background: s.status === 'approved' ? '#1e293b' : '#10b98120', color: s.status === 'approved' ? '#334155' : '#34d399', cursor: s.status === 'approved' ? 'default' : 'pointer', fontSize: '12px', fontWeight: '600' }}>
                      ✅ Approve
                    </button>
                    <button onClick={() => updateStatus(s.id, 'rejected')} disabled={s.status === 'rejected'}
                      style={{ padding: '5px 14px', borderRadius: '8px', border: 'none', background: s.status === 'rejected' ? '#1e293b' : '#ef444420', color: s.status === 'rejected' ? '#334155' : '#f87171', cursor: s.status === 'rejected' ? 'default' : 'pointer', fontSize: '12px', fontWeight: '600' }}>
                      ✕ Reject
                    </button>
                    <button onClick={() => deleteSuggestion(s.id)}
                      style={{ padding: '5px 14px', borderRadius: '8px', border: '1px solid #334155', background: 'transparent', color: '#475569', cursor: 'pointer', fontSize: '12px' }}>
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Users Tab */}
          {!loading && tab === 'Users' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {users.map(u => (
                <div key={u.id} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '14px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <span style={{ fontWeight: '600', color: 'white', fontSize: '14px' }}>{u.name}</span>
                    <span style={{ marginLeft: '10px', fontSize: '13px', color: '#475569' }}>{u.email}</span>
                    {u.businessName && <span style={{ marginLeft: '10px', fontSize: '12px', color: '#6366f1' }}>🏪 {u.businessName}</span>}
                  </div>
                  <span style={{ fontSize: '11px', color: '#334155' }}>{new Date(u.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
