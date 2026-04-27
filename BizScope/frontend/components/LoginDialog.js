import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginDialog({ onClose, onSuccess }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      login(data.token, data.user);
      onSuccess && onSuccess();
      onClose();
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 8000, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.2s ease' }} />

      {/* Dialog */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 8001,
        width: '400px', background: 'var(--surface)',
        border: '1px solid var(--border2)', borderRadius: '24px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        overflow: 'hidden', animation: 'slideInUp 0.3s cubic-bezier(.34,1.56,.64,1)',
      }}>
        {/* Header */}
        <div style={{ padding: '24px 24px 0 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔐</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text)', marginBottom: '4px' }}>Sign In</div>
          <div style={{ fontSize: '14px', color: 'var(--muted)' }}>Access your BizScope account</div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {error && <div style={{ color: '#ef4444', fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>{error}</div>}

          <input
            name="email"
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={handleChange}
            required
            style={{
              width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: '14px', marginBottom: '12px', outline: 'none'
            }}
          />

          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
            style={{
              width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: '14px', marginBottom: '20px', outline: 'none'
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white', fontWeight: '600', fontSize: '14px', border: 'none', cursor: 'pointer'
            }}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        {/* Footer */}
        <div style={{ padding: '0 24px 24px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Don't have an account? <a href="/register" style={{ color: 'var(--link)', textDecoration: 'none' }}>Sign up</a>
          </div>
        </div>
      </div>
    </>
  );
}