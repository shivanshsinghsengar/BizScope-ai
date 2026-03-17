import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('http://localhost:5000/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      sessionStorage.setItem('adminToken', data.token);
      router.push('/admin');
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  return (
    <>
      <Head><title>Admin — BizScope</title></Head>
      <div style={{ minHeight: '100vh', background: '#080c14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '340px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '20px', padding: '32px' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>🔐</div>
            <div style={{ color: 'white', fontWeight: '700', fontSize: '18px' }}>Admin Panel</div>
            <div style={{ color: '#475569', fontSize: '13px', marginTop: '4px' }}>BizScope AI</div>
          </div>
          <form onSubmit={handleSubmit}>
            <label style={{ display: 'block', fontSize: '11px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Enter admin password" required autoFocus
              style={{ width: '100%', background: '#0a0f1a', border: '1px solid #1e293b', color: 'white', padding: '11px 14px', borderRadius: '12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: '14px' }}
            />
            {error && <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '12px' }}>⚠️ {error}</p>}
            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '11px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white', fontWeight: '600', fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Checking...' : 'Enter'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
