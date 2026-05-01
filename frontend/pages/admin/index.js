import API_URL from '../../utils/api';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const TABS = ['Overview', 'Suggestions', 'Enquiries', 'Properties', 'Users', 'Analytics', 'System Health'];

export default function AdminPanel() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [tab, setTab] = useState('Overview');
  const [suggestions, setSuggestions] = useState([]);
  const [users, setUsers] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [listedProps, setListedProps] = useState([]);
  const [events, setEvents] = useState([]);
  const [errors, setErrors] = useState([]);
  const [health, setHealth] = useState([]);
  const [healthChecking, setHealthChecking] = useState(false);
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
      fetch(`${API_URL}/api/admin/suggestions`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => []),
      fetch(`${API_URL}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => []),
      fetch(`${API_URL}/api/admin/enquiries`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => []),
      fetch(`${API_URL}/api/admin/properties`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => []),
      fetch(`${API_URL}/api/admin/events`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => []),
      fetch(`${API_URL}/api/admin/errors`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => []),
      fetch(`${API_URL}/api/admin/health`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => []),
    ]).then(([s, u, e, p, ev, err, h]) => {
      setSuggestions(Array.isArray(s) ? s : []);
      setUsers(Array.isArray(u) ? u : []);
      setEnquiries(Array.isArray(e) ? e : []);
      setListedProps(Array.isArray(p) ? p : []);
      setEvents(Array.isArray(ev) ? ev : []);
      setErrors(Array.isArray(err) ? err : []);
      setHealth(Array.isArray(h) ? h : []);
      setLoading(false);
    }).catch(() => router.push('/admin/login'));
  }, [token]);

  const updateStatus = async (id, status) => {
    await fetch(`${API_URL}/api/admin/suggestions/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    setSuggestions(s => s.map(x => x.id === id ? { ...x, status } : x));
  };

  const deleteSuggestion = async (id) => {
    if (!confirm('Delete this suggestion?')) return;
    await fetch(`${API_URL}/api/admin/suggestions/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setSuggestions(s => s.filter(x => x.id !== id));
  };

  const updatePropStatus = async (id, status) => {
    await fetch(`${API_URL}/api/admin/properties/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    setListedProps(p => p.map(x => x.id === id ? { ...x, status } : x));
  };

  const deleteProp = async (id) => {
    if (!confirm('Delete this listing?')) return;
    await fetch(`${API_URL}/api/admin/properties/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setListedProps(p => p.filter(x => x.id !== id));
  };

  const updateEnquiryStatus = async (id, status) => {
    await fetch(`${API_URL}/api/admin/enquiries/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    setEnquiries(e => e.map(x => x.id === id ? { ...x, status } : x));
  };

  const deleteEnquiry = async (id) => {
    if (!confirm('Delete this enquiry?')) return;
    await fetch(`${API_URL}/api/admin/enquiries/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setEnquiries(e => e.filter(x => x.id !== id));
  };

  const logout = () => { sessionStorage.removeItem('adminToken'); router.push('/admin/login'); };

  const statusColor = { pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444' };

  if (!token) return null;

  const pending = suggestions.filter(s => s.status === 'pending').length;
  const newEnquiries = enquiries.filter(e => e.status === 'new').length;
  const pendingProps = listedProps.filter(p => p.status === 'pending').length;

  const stats = [
    { label: 'Suggestions', value: suggestions.length, sub: `${pending} pending`, color: '#6366f1', icon: '💡', tab: 'Suggestions' },
    { label: 'Enquiries', value: enquiries.length, sub: `${newEnquiries} new`, color: '#38bdf8', icon: '📬', tab: 'Enquiries' },
    { label: 'Properties', value: listedProps.length, sub: `${pendingProps} pending`, color: '#f59e0b', icon: '🏪', tab: 'Properties' },
    { label: 'Users', value: users.length, sub: 'registered', color: '#a78bfa', icon: '👥', tab: 'Users' },
  ];

  return (
    <>
      <Head><title>Admin Panel — BizScope AI</title></Head>
      <div style={{ minHeight: '100vh', background: '#05080f', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>

        {/* Sidebar */}
        <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: '220px', background: '#080d18', borderRight: '1px solid #0f1f35', display: 'flex', flexDirection: 'column', zIndex: 100 }}>
          <div style={{ padding: '24px 20px', borderBottom: '1px solid #0f1f35' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🚀</div>
              <div>
                <div style={{ fontWeight: '800', fontSize: '15px', color: 'white' }}>BizScope</div>
                <div style={{ fontSize: '10px', color: '#4f46e5', fontWeight: '600', letterSpacing: '0.1em' }}>ADMIN PANEL</div>
              </div>
            </div>
          </div>

          <nav style={{ padding: '16px 12px', flex: 1 }}>
            {TABS.map(t => {
              const icons = { Overview: '📊', Suggestions: '💡', Enquiries: '📬', Properties: '🏪', Users: '👥', Analytics: '📈', 'System Health': '🛡️' };
              const badges = { Suggestions: pending, Enquiries: newEnquiries, Properties: pendingProps, 'System Health': errors.filter(e => !e.resolved).length };
              const active = tab === t;
              return (
                <button key={t} onClick={() => setTab(t)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', border: 'none', cursor: 'pointer', marginBottom: '4px', background: active ? 'linear-gradient(135deg,#4f46e520,#7c3aed20)' : 'transparent', color: active ? 'white' : '#475569', borderLeft: active ? '3px solid #6366f1' : '3px solid transparent', transition: 'all 0.15s', textAlign: 'left', fontSize: '13px', fontWeight: active ? '700' : '500' }}>
                  <span style={{ fontSize: '16px' }}>{icons[t]}</span>
                  <span style={{ flex: 1 }}>{t}</span>
                  {badges[t] > 0 && <span style={{ background: t === 'Enquiries' ? '#38bdf8' : '#f59e0b', color: '#000', borderRadius: '100px', fontSize: '10px', fontWeight: '800', padding: '1px 7px' }}>{badges[t]}</span>}
                </button>
              );
            })}
          </nav>

          <div style={{ padding: '16px 12px', borderTop: '1px solid #0f1f35' }}>
            <button
              onClick={() => router.push('/analysis')}
              style={{ width: '100%', padding: '9px', borderRadius: '10px', border: '1px solid #1e293b', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}
            >
              ← Dashboard
            </button>
            <button onClick={logout} style={{ width: '100%', padding: '9px', borderRadius: '10px', border: '1px solid #1e293b', background: 'transparent', color: '#475569', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
              🚪 Sign Out
            </button>
          </div>
        </div>

        {/* Main content */}
        <div style={{ marginLeft: '220px', padding: '32px' }}>

          {/* Topbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'white', margin: 0 }}>{tab}</h1>
              <p style={{ color: '#334155', fontSize: '13px', margin: '4px 0 0' }}>
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            {(pending > 0 || newEnquiries > 0) && (
              <div style={{ display: 'flex', gap: '8px' }}>
                {pending > 0 && <span style={{ background: '#f59e0b20', color: '#fbbf24', padding: '6px 14px', borderRadius: '100px', fontSize: '12px', fontWeight: '700' }}>⚠️ {pending} pending suggestions</span>}
                {newEnquiries > 0 && <span style={{ background: '#38bdf820', color: '#38bdf8', padding: '6px 14px', borderRadius: '100px', fontSize: '12px', fontWeight: '700' }}>📬 {newEnquiries} new enquiries</span>}
              </div>
            )}
          </div>

          {/* Stats cards — always visible, clickable */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '32px' }}>
            {stats.map(s => (
              <div key={s.label} onClick={() => setTab(s.tab)}
                style={{ background: '#080d18', border: `1px solid ${s.color}25`, borderRadius: '16px', padding: '20px', cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = s.color + '60'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 30px ${s.color}15`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = s.color + '25'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${s.color}, transparent)` }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '32px', fontWeight: '900', color: s.color, lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#94a3b8', marginTop: '6px' }}>{s.label}</div>
                    <div style={{ fontSize: '11px', color: '#334155', marginTop: '2px' }}>{s.sub}</div>
                  </div>
                  <div style={{ fontSize: '28px', opacity: 0.6 }}>{s.icon}</div>
                </div>
              </div>
            ))}
          </div>

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px', color: '#334155' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚙️</div>
                <div>Loading data...</div>
              </div>
            </div>
          )}

          {/* Overview Tab */}
          {!loading && tab === 'Overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Recent Enquiries */}
              <div style={{ background: '#080d18', border: '1px solid #0f1f35', borderRadius: '16px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ fontWeight: '700', color: 'white', fontSize: '14px' }}>📬 Recent Enquiries</div>
                  <button onClick={() => setTab('Enquiries')} style={{ fontSize: '11px', color: '#38bdf8', background: 'none', border: 'none', cursor: 'pointer' }}>View all →</button>
                </div>
                {enquiries.slice(0, 4).map(e => (
                  <div key={e.id} style={{ padding: '10px 0', borderBottom: '1px solid #0f1f35', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>{e.name}</div>
                      <div style={{ fontSize: '11px', color: '#475569' }}>{e.propertyAddress}</div>
                    </div>
                    <span style={{ padding: '2px 8px', borderRadius: '100px', fontSize: '10px', fontWeight: '700', background: e.status === 'new' ? '#38bdf820' : '#10b98120', color: e.status === 'new' ? '#38bdf8' : '#34d399' }}>{e.status}</span>
                  </div>
                ))}
                {enquiries.length === 0 && <div style={{ color: '#334155', fontSize: '13px', textAlign: 'center', padding: '20px' }}>No enquiries yet</div>}
              </div>

              {/* Recent Suggestions */}
              <div style={{ background: '#080d18', border: '1px solid #0f1f35', borderRadius: '16px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ fontWeight: '700', color: 'white', fontSize: '14px' }}>💡 Recent Suggestions</div>
                  <button onClick={() => setTab('Suggestions')} style={{ fontSize: '11px', color: '#a78bfa', background: 'none', border: 'none', cursor: 'pointer' }}>View all →</button>
                </div>
                {suggestions.slice(0, 4).map(s => (
                  <div key={s.id} style={{ padding: '10px 0', borderBottom: '1px solid #0f1f35', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>{s.name}</div>
                      <div style={{ fontSize: '11px', color: '#475569' }}>{s.city}</div>
                    </div>
                    <span style={{ padding: '2px 8px', borderRadius: '100px', fontSize: '10px', fontWeight: '700', background: statusColor[s.status] + '20', color: statusColor[s.status] }}>{s.status}</span>
                  </div>
                ))}
                {suggestions.length === 0 && <div style={{ color: '#334155', fontSize: '13px', textAlign: 'center', padding: '20px' }}>No suggestions yet</div>}
              </div>

              {/* Recent Users */}
              <div style={{ background: '#080d18', border: '1px solid #0f1f35', borderRadius: '16px', padding: '20px', gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ fontWeight: '700', color: 'white', fontSize: '14px' }}>👥 Recent Users</div>
                  <button onClick={() => setTab('Users')} style={{ fontSize: '11px', color: '#a78bfa', background: 'none', border: 'none', cursor: 'pointer' }}>View all →</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: '10px' }}>
                  {users.slice(0, 6).map(u => (
                    <div key={u.id} style={{ background: '#0a1020', borderRadius: '10px', padding: '12px 14px', border: '1px solid #0f1f35' }}>
                      <div style={{ fontWeight: '600', color: '#e2e8f0', fontSize: '13px' }}>{u.name}</div>
                      <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>{u.email}</div>
                      {u.businessName && <div style={{ fontSize: '11px', color: '#6366f1', marginTop: '2px' }}>🏪 {u.businessName}</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Suggestions Tab */}
          {!loading && tab === 'Suggestions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {suggestions.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px', background: '#080d18', border: '1px solid #0f1f35', borderRadius: '16px' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
                  <div style={{ color: '#475569' }}>No suggestions yet</div>
                </div>
              )}
              {suggestions.map(s => (
                <div key={s.id} style={{ background: '#080d18', border: '1px solid #0f1f35', borderRadius: '14px', padding: '18px 22px', transition: 'border-color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#1e3a5f'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#0f1f35'}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: '700', color: 'white', fontSize: '15px' }}>{s.name}</span>
                      <span style={{ padding: '2px 9px', borderRadius: '100px', background: '#6366f120', color: '#a78bfa', fontSize: '11px' }}>{s.category}</span>
                      <span style={{ padding: '2px 9px', borderRadius: '100px', background: statusColor[s.status] + '20', color: statusColor[s.status], fontSize: '11px', fontWeight: '700' }}>{s.status}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#334155' }}>{new Date(s.createdAt).toLocaleString()}</span>
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '13px', color: '#475569', display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                    {s.city && <span>📍 {s.address ? `${s.address}, ` : ''}{s.city} {s.pincode}</span>}
                    {s.phone && <span>📞 {s.phone}</span>}
                    {s.submitterName && <span>👤 {s.submitterName}</span>}
                  </div>
                  {s.description && <div style={{ marginTop: '6px', fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>"{s.description}"</div>}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                    <button onClick={() => updateStatus(s.id, 'approved')} disabled={s.status === 'approved'}
                      style={{ padding: '6px 16px', borderRadius: '8px', border: 'none', background: s.status === 'approved' ? '#1e293b' : '#10b98125', color: s.status === 'approved' ? '#334155' : '#34d399', cursor: s.status === 'approved' ? 'default' : 'pointer', fontSize: '12px', fontWeight: '700' }}>
                      ✅ Approve
                    </button>
                    <button onClick={() => updateStatus(s.id, 'rejected')} disabled={s.status === 'rejected'}
                      style={{ padding: '6px 16px', borderRadius: '8px', border: 'none', background: s.status === 'rejected' ? '#1e293b' : '#ef444425', color: s.status === 'rejected' ? '#334155' : '#f87171', cursor: s.status === 'rejected' ? 'default' : 'pointer', fontSize: '12px', fontWeight: '700' }}>
                      ✕ Reject
                    </button>
                    <button onClick={() => deleteSuggestion(s.id)}
                      style={{ padding: '6px 16px', borderRadius: '8px', border: '1px solid #1e293b', background: 'transparent', color: '#475569', cursor: 'pointer', fontSize: '12px' }}>
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Enquiries Tab */}
          {!loading && tab === 'Enquiries' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {enquiries.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px', background: '#080d18', border: '1px solid #0f1f35', borderRadius: '16px' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>📬</div>
                  <div style={{ color: '#475569' }}>No enquiries yet</div>
                </div>
              )}
              {enquiries.map(e => (
                <div key={e.id} style={{ background: '#080d18', border: '1px solid #0f1f35', borderRadius: '14px', padding: '18px 22px', transition: 'border-color 0.2s' }}
                  onMouseEnter={el => el.currentTarget.style.borderColor = '#1e3a5f'}
                  onMouseLeave={el => el.currentTarget.style.borderColor = '#0f1f35'}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: '700', color: 'white', fontSize: '15px' }}>{e.name}</span>
                      <span style={{ padding: '2px 9px', borderRadius: '100px', background: e.propertyType === 'rent' ? '#3b82f620' : '#10b98120', color: e.propertyType === 'rent' ? '#60a5fa' : '#34d399', fontSize: '11px', fontWeight: '700' }}>
                        {e.propertyType === 'rent' ? 'RENT' : 'PURCHASE'}
                      </span>
                      <span style={{ padding: '2px 9px', borderRadius: '100px', background: e.status === 'new' ? '#38bdf820' : '#10b98120', color: e.status === 'new' ? '#38bdf8' : '#34d399', fontSize: '11px', fontWeight: '700' }}>
                        {e.status}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#334155' }}>{new Date(e.createdAt).toLocaleString()}</span>
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '13px', color: '#475569', display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                    <span>🏪 {e.propertyAddress}</span>
                    <span style={{ color: '#38bdf8', fontWeight: '600' }}>Rs.{e.propertyPrice?.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '13px', color: '#475569', display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                    <span>✉️ {e.email}</span>
                    {e.phone && <span>📞 {e.phone}</span>}
                  </div>
                  {e.message && <div style={{ marginTop: '6px', fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>"{e.message}"</div>}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                    <button onClick={() => updateEnquiryStatus(e.id, 'contacted')} disabled={e.status === 'contacted'}
                      style={{ padding: '6px 16px', borderRadius: '8px', border: 'none', background: e.status === 'contacted' ? '#1e293b' : '#10b98125', color: e.status === 'contacted' ? '#334155' : '#34d399', cursor: e.status === 'contacted' ? 'default' : 'pointer', fontSize: '12px', fontWeight: '700' }}>
                      ✅ Mark Contacted
                    </button>
                    <a href={`mailto:${e.email}?subject=Re: Property Enquiry - ${e.propertyAddress}`}
                      style={{ padding: '6px 16px', borderRadius: '8px', border: 'none', background: '#3b82f625', color: '#60a5fa', fontSize: '12px', fontWeight: '700', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      ✉️ Reply
                    </a>
                    <button onClick={() => deleteEnquiry(e.id)}
                      style={{ padding: '6px 16px', borderRadius: '8px', border: '1px solid #1e293b', background: 'transparent', color: '#475569', cursor: 'pointer', fontSize: '12px' }}>
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Properties Tab */}
          {!loading && tab === 'Properties' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {listedProps.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px', background: '#080d18', border: '1px solid #0f1f35', borderRadius: '16px' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏪</div>
                  <div style={{ color: '#475569' }}>No property listings yet</div>
                </div>
              )}
              {listedProps.map(p => {
                const sc = { pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444' };
                return (
                  <div key={p.id} style={{ background: '#080d18', border: '1px solid #0f1f35', borderRadius: '14px', padding: '18px 22px' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#1e3a5f'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#0f1f35'}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: '700', color: 'white', fontSize: '15px' }}>{p.address}, {p.city}</span>
                        <span style={{ padding: '2px 9px', borderRadius: '100px', background: p.type === 'rent' ? '#3b82f620' : '#10b98120', color: p.type === 'rent' ? '#60a5fa' : '#34d399', fontSize: '11px', fontWeight: '700' }}>{p.type === 'rent' ? 'RENT' : 'SALE'}</span>
                        <span style={{ padding: '2px 9px', borderRadius: '100px', background: sc[p.status] + '20', color: sc[p.status], fontSize: '11px', fontWeight: '700' }}>{p.status}</span>
                      </div>
                      <span style={{ fontSize: '11px', color: '#334155' }}>{new Date(p.createdAt).toLocaleString()}</span>
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '13px', color: '#475569', display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                      <span style={{ color: '#38bdf8', fontWeight: '700' }}>₹{parseFloat(p.price)?.toLocaleString('en-IN')}{p.type === 'rent' ? '/mo' : ''}</span>
                      {p.size > 0 && <span>📐 {p.size} sqft</span>}
                      {p.phone && <span>📞 {p.phone}</span>}
                      {p.pincode && <span>📮 {p.pincode}</span>}
                    </div>
                    <div style={{ marginTop: '4px', fontSize: '13px', color: '#475569', display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                      <span>👤 {p.submitterName}</span>
                      {p.submitterEmail && <span>✉️ {p.submitterEmail}</span>}
                    </div>
                    {p.description && <div style={{ marginTop: '6px', fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>"{p.description}"</div>}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                      <button onClick={() => updatePropStatus(p.id, 'approved')} disabled={p.status === 'approved'}
                        style={{ padding: '6px 16px', borderRadius: '8px', border: 'none', background: p.status === 'approved' ? '#1e293b' : '#10b98125', color: p.status === 'approved' ? '#334155' : '#34d399', cursor: p.status === 'approved' ? 'default' : 'pointer', fontSize: '12px', fontWeight: '700' }}>
                        ✅ Approve
                      </button>
                      <button onClick={() => updatePropStatus(p.id, 'rejected')} disabled={p.status === 'rejected'}
                        style={{ padding: '6px 16px', borderRadius: '8px', border: 'none', background: p.status === 'rejected' ? '#1e293b' : '#ef444425', color: p.status === 'rejected' ? '#334155' : '#f87171', cursor: p.status === 'rejected' ? 'default' : 'pointer', fontSize: '12px', fontWeight: '700' }}>
                        ✕ Reject
                      </button>
                      <button onClick={() => deleteProp(p.id)}
                        style={{ padding: '6px 16px', borderRadius: '8px', border: '1px solid #1e293b', background: 'transparent', color: '#475569', cursor: 'pointer', fontSize: '12px' }}>
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Users Tab */}
          {!loading && tab === 'Users' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {users.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px', background: '#080d18', border: '1px solid #0f1f35', borderRadius: '16px' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>👥</div>
                  <div style={{ color: '#475569' }}>No users yet</div>
                </div>
              )}
              {users.map((u, i) => (
                <div key={u.id} style={{ background: '#080d18', border: '1px solid #0f1f35', borderRadius: '14px', padding: '16px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#1e3a5f'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#0f1f35'}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: `hsl(${(i * 47) % 360}, 60%, 35%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '15px', color: 'white' }}>
                      {u.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', color: 'white', fontSize: '14px' }}>{u.name}</div>
                      <div style={{ fontSize: '12px', color: '#475569' }}>{u.email}</div>
                      {u.businessName && <div style={{ fontSize: '11px', color: '#6366f1', marginTop: '2px' }}>🏪 {u.businessName}</div>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: '#334155' }}>Joined</div>
                    <div style={{ fontSize: '12px', color: '#475569' }}>{new Date(u.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Analytics Tab */}
          {!loading && tab === 'Analytics' && (() => {
            const toNum = (v) => parseInt(v, 10) || 0;
            const getEventCount = (name) => {
              const row = events.find((e) => e.event === name);
              return row ? toNum(row.count) : 0;
            };
            const started = getEventCount('analysis_started');
            const succeeded = getEventCount('analysis_succeeded');
            const failed = getEventCount('analysis_failed');
            const conversion = started > 0 ? Math.round((succeeded / started) * 100) : 0;

            return (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
                  {[
                    { label: 'Analysis Started', value: started, color: '#60a5fa', icon: '🚀' },
                    { label: 'Analysis Succeeded', value: succeeded, color: '#34d399', icon: '✅' },
                    { label: 'Analysis Failed', value: failed, color: '#f87171', icon: '⚠️' },
                    { label: 'Conversion Rate', value: `${conversion}%`, color: '#a78bfa', icon: '🎯' },
                  ].map((s) => (
                    <div key={s.label} style={{ background: '#080d18', border: `1px solid ${s.color}30`, borderRadius: '14px', padding: '16px' }}>
                      <div style={{ fontSize: '22px' }}>{s.icon}</div>
                      <div style={{ fontSize: '28px', fontWeight: '900', color: s.color, lineHeight: 1.1, marginTop: '6px' }}>{s.value}</div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ background: '#080d18', border: '1px solid #0f1f35', borderRadius: '14px', padding: '18px' }}>
                  <div style={{ fontWeight: '700', color: 'white', fontSize: '14px', marginBottom: '12px' }}>Top Tracked Events</div>
                  {events.length === 0 && <div style={{ color: '#475569', fontSize: '13px' }}>No analytics events yet.</div>}
                  {events.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                      {events.map((e, i) => (
                        <div key={`${e.event}_${i}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0a1020', border: '1px solid #0f1f35', borderRadius: '10px', padding: '10px 12px' }}>
                          <span style={{ color: '#cbd5e1', fontSize: '13px', fontWeight: '600' }}>{e.event}</span>
                          <span style={{ color: '#60a5fa', fontSize: '13px', fontWeight: '800' }}>{toNum(e.count)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* System Health Tab */}
          {!loading && tab === 'System Health' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Service Health Cards */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ fontWeight: '700', color: 'white', fontSize: '15px' }}>🛡️ Service Status</div>
                  <button
                    onClick={async () => {
                      setHealthChecking(true);
                      try {
                        const r = await fetch(`${API_URL}/api/admin/health/check`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
                        const d = await r.json();
                        if (d.results) setHealth(d.results);
                      } catch (_) {}
                      setHealthChecking(false);
                    }}
                    style={{ padding: '7px 16px', borderRadius: '10px', border: '1px solid #1e293b', background: healthChecking ? '#1e293b' : '#0f1f35', color: healthChecking ? '#475569' : '#94a3b8', cursor: healthChecking ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: '600' }}>
                    {healthChecking ? '⏳ Checking...' : '🔄 Run Health Check'}
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: '12px' }}>
                  {['overpass', 'nominatim', 'gemini', 'database'].map(svc => {
                    const h = health.find(x => x.service === svc);
                    const statusColor = { ok: '#10b981', degraded: '#f59e0b', down: '#ef4444' };
                    const statusIcon = { ok: '✅', degraded: '⚠️', down: '🔴' };
                    const svcIcon = { overpass: '🗺️', nominatim: '📍', gemini: '🤖', database: '🗄️' };
                    const status = h?.status || 'unknown';
                    const color = statusColor[status] || '#64748b';
                    return (
                      <div key={svc} style={{ background: '#080d18', border: `1px solid ${color}30`, borderRadius: '14px', padding: '18px', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: color }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                          <span style={{ fontSize: '24px' }}>{svcIcon[svc]}</span>
                          <span style={{ fontSize: '18px' }}>{statusIcon[status] || '❓'}</span>
                        </div>
                        <div style={{ fontWeight: '700', color: 'white', fontSize: '14px', textTransform: 'capitalize', marginBottom: '4px' }}>{svc}</div>
                        <div style={{ fontSize: '12px', fontWeight: '700', color, marginBottom: '4px' }}>{status.toUpperCase()}</div>
                        {h?.latencyMs > 0 && <div style={{ fontSize: '11px', color: '#475569' }}>{h.latencyMs}ms latency</div>}
                        {h?.detail && <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>{h.detail}</div>}
                        {!h && <div style={{ fontSize: '11px', color: '#334155' }}>No data — run health check</div>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Error Log */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ fontWeight: '700', color: 'white', fontSize: '15px' }}>
                    🚨 Error Log
                    {errors.filter(e => !e.resolved).length > 0 && (
                      <span style={{ marginLeft: '8px', background: '#ef444420', color: '#f87171', padding: '2px 8px', borderRadius: '100px', fontSize: '11px', fontWeight: '800' }}>
                        {errors.filter(e => !e.resolved).length} unresolved
                      </span>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      await fetch(`${API_URL}/api/admin/errors/resolved`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
                      setErrors(e => e.filter(x => !x.resolved));
                    }}
                    style={{ padding: '7px 16px', borderRadius: '10px', border: '1px solid #1e293b', background: 'transparent', color: '#475569', cursor: 'pointer', fontSize: '12px' }}>
                    🗑️ Clear Resolved
                  </button>
                </div>

                {errors.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '48px', background: '#080d18', border: '1px solid #0f1f35', borderRadius: '16px' }}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
                    <div style={{ color: '#10b981', fontWeight: '700', fontSize: '15px' }}>No errors logged</div>
                    <div style={{ color: '#334155', fontSize: '13px', marginTop: '4px' }}>System is running clean</div>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {errors.map(err => {
                    const sevColor = { info: '#60a5fa', warning: '#f59e0b', error: '#ef4444', critical: '#dc2626' };
                    const color = sevColor[err.severity] || '#64748b';
                    let ctx = {};
                    try { ctx = JSON.parse(err.context || '{}'); } catch (_) {}
                    return (
                      <div key={err.id} style={{ background: '#080d18', border: `1px solid ${err.resolved ? '#0f1f35' : color + '40'}`, borderRadius: '12px', padding: '16px 18px', opacity: err.resolved ? 0.5 : 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ padding: '2px 8px', borderRadius: '100px', background: color + '20', color, fontSize: '10px', fontWeight: '800', textTransform: 'uppercase' }}>{err.severity}</span>
                            <span style={{ padding: '2px 8px', borderRadius: '100px', background: '#1e293b', color: '#94a3b8', fontSize: '10px', fontWeight: '700' }}>{err.type}</span>
                            {err.autoFixed && <span style={{ padding: '2px 8px', borderRadius: '100px', background: '#10b98120', color: '#34d399', fontSize: '10px', fontWeight: '700' }}>🔧 Auto-Fixed</span>}
                            {err.resolved && <span style={{ padding: '2px 8px', borderRadius: '100px', background: '#10b98120', color: '#34d399', fontSize: '10px', fontWeight: '700' }}>✅ Resolved</span>}
                          </div>
                          <span style={{ fontSize: '11px', color: '#334155', flexShrink: 0 }}>{new Date(err.createdAt).toLocaleString('en-IN')}</span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#e2e8f0', marginTop: '8px', fontWeight: '500' }}>{err.message}</div>
                        {err.fixNote && <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>🔧 {err.fixNote}</div>}
                        {Object.keys(ctx).length > 0 && (
                          <div style={{ fontSize: '11px', color: '#334155', marginTop: '6px', fontFamily: 'monospace', background: '#0a1020', padding: '6px 10px', borderRadius: '6px' }}>
                            {Object.entries(ctx).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                          </div>
                        )}
                        {!err.resolved && (
                          <button
                            onClick={async () => {
                              await fetch(`${API_URL}/api/admin/errors/${err.id}/resolve`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                body: JSON.stringify({ fixNote: 'Manually resolved by admin' }),
                              });
                              setErrors(e => e.map(x => x.id === err.id ? { ...x, resolved: true, fixNote: 'Manually resolved by admin' } : x));
                            }}
                            style={{ marginTop: '10px', padding: '5px 14px', borderRadius: '8px', border: 'none', background: '#10b98120', color: '#34d399', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}>
                            ✅ Mark Resolved
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Actions */}
              <div style={{ background: '#080d18', border: '1px solid #0f1f35', borderRadius: '16px', padding: '20px' }}>
                <div style={{ fontWeight: '700', color: 'white', fontSize: '14px', marginBottom: '14px' }}>⚡ Quick Actions</div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {[
                    { label: '🗑️ Clear Cache', action: async () => { await fetch(`${API_URL}/api/admin/clear-cache`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }); alert('Cache cleared!'); } },
                    { label: '🔄 Refresh Data', action: () => window.location.reload() },
                  ].map(a => (
                    <button key={a.label} onClick={a.action}
                      style={{ padding: '9px 18px', borderRadius: '10px', border: '1px solid #1e293b', background: '#0a1020', color: '#94a3b8', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
