import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import SuggestBusiness from './SuggestBusiness';

const navItems = [
  { href: '/analysis', icon: '📊', label: 'Dashboard' },
  { href: '/competitors', icon: '🏪', label: 'Competitors' },
  { href: '/properties', icon: '🏠', label: 'Properties' },
  { href: '/insights', icon: '🤖', label: 'AI Insights' },
  { href: '/trends', icon: '📈', label: 'Trends' },
  { href: '/list-business', icon: '➕', label: 'List Business' },
  { href: '/saved', icon: '🔖', label: 'Saved' },
];

export default function Layout({ children }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const v = (d, l) => dark ? d : l;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', display: 'flex', flexDirection: 'column' }}>

      {/* Ambient blobs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(200,240,58,0.07) 0%, transparent 70%)', animation: 'blobFloat 14s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(239,68,68,0.06) 0%, transparent 70%)', animation: 'blobFloat2 17s ease-in-out infinite' }} />
      </div>

      {/* Topbar */}
      <nav className="anim-fade-down" style={{ position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid var(--border)', background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', padding: '0 20px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

        {/* Logo */}
        <div onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flexShrink: 0 }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'linear-gradient(135deg, #c8f03a, #a8d420)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🚀</div>
          <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text)' }}>Biz<span style={{ background: 'linear-gradient(135deg, #c8f03a, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Scope</span> AI</span>
        </div>

        {/* Desktop nav links */}
        <div className="nav-links" style={{ display: 'flex', gap: '2px', overflowX: 'auto' }}>
          {navItems.map(n => (
            <button key={n.href} onClick={() => router.push(n.href)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap', transition: 'all 0.2s', background: router.pathname === n.href ? 'linear-gradient(135deg, #c8f03a, #a8d420)' : 'transparent', color: router.pathname === n.href ? '#0a0f0a' : 'var(--muted)' }}
              onMouseEnter={e => { if (router.pathname !== n.href) { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text)'; } }}
              onMouseLeave={e => { if (router.pathname !== n.href) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)'; } }}>
              <span>{n.icon}</span><span>{n.label}</span>
            </button>
          ))}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
          {user ? (
            <>
              <div className="hide-mobile" style={{ fontSize: '13px', color: 'var(--muted)' }}>👤 {user.name}</div>
              <button onClick={() => router.push('/admin')}
                style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--muted2)', padding: '7px 12px', borderRadius: '10px', cursor: 'pointer', fontSize: '12px' }}>
                🔐 <span className="hide-mobile">Admin</span>
              </button>
              <button onClick={() => { logout(); router.push('/'); }}
                style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', padding: '7px 12px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px' }}>
                <span className="hide-mobile">Sign Out</span><span style={{ display: 'none' }} className="show-mobile">↩</span>
              </button>
            </>
          ) : (
            <>
              <button onClick={() => router.push('/admin')}
                style={{ background: 'transparent', border: 'none', color: 'var(--muted3)', padding: '7px 8px', borderRadius: '10px', cursor: 'pointer', fontSize: '14px' }}>🔐</button>
              <button onClick={() => router.push('/login')}
                style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text2)', padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px' }}>
                Sign In
              </button>
              <button onClick={() => router.push('/register')} className="btn-primary hide-mobile" style={{ padding: '8px 14px', fontSize: '13px' }}>
                List Business
              </button>
            </>
          )}

          {/* Hamburger for mobile */}
          <button className="show-mobile" onClick={() => setMenuOpen(o => !o)}
            style={{ display: 'none', background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', padding: '7px 10px', borderRadius: '10px', cursor: 'pointer', fontSize: '16px' }}>
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div style={{ position: 'fixed', top: '64px', left: 0, right: 0, zIndex: 99, background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map(n => (
            <button key={n.href} onClick={() => { router.push(n.href); setMenuOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500', textAlign: 'left', background: router.pathname === n.href ? 'linear-gradient(135deg, #c8f03a, #a8d420)' : 'transparent', color: router.pathname === n.href ? '#0a0f0a' : 'var(--text)' }}>
              <span>{n.icon}</span><span>{n.label}</span>
            </button>
          ))}
        </div>
      )}

      <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
        {children}
      </div>

      <SuggestBusiness />

      {/* Theme toggle — bottom left */}
      <button
        onClick={toggle}
        title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        style={{
          position: 'fixed', bottom: '24px', left: '24px', zIndex: 200,
          width: '40px', height: '40px', borderRadius: '50%',
          background: 'var(--surface2)', border: '1px solid var(--border2)',
          fontSize: '18px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = '#6366f1'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border2)'}
      >
        {dark ? '☀️' : '🌙'}
      </button>

      {/* Footer */}
      <footer style={{ position: 'relative', zIndex: 1, borderTop: '1px solid var(--border)', background: 'var(--bg2)', padding: '20px 24px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'linear-gradient(135deg, #c8f03a, #a8d420)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>🚀</div>
            <span style={{ fontSize: '13px', color: 'var(--muted3)' }}>© 2026 BizScope AI · Built by Shivansh Singh Sengar</span>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            {[
              { label: 'About', href: '/about' },
              { label: 'Docs', href: '/docs' },
              { label: 'Pricing', href: '/pricing' },
              { label: 'How it Works', href: '/how-it-works' },
              { label: 'Privacy', href: '/privacy' },
              { label: 'Terms', href: '/terms' },
            ].map(l => (
              <span key={l.label} onClick={() => router.push(l.href)}
                style={{ fontSize: '12px', color: 'var(--muted3)', cursor: 'pointer', transition: 'color 0.2s' }}
                onMouseEnter={e => e.target.style.color = 'var(--text)'}
                onMouseLeave={e => e.target.style.color = 'var(--muted3)'}>{l.label}</span>
            ))}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981' }} />
              <span style={{ fontSize: '12px', color: 'var(--muted3)' }}>All systems operational</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile show helper */}
      <style>{`
        @media (max-width: 768px) {
          .show-mobile { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
