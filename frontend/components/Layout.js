import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import SuggestBusiness from './SuggestBusiness';
import Logo from './Logo';

const navItems = [
  { href: '/analysis',      label: 'Dashboard' },
  { href: '/competitors',   label: 'Competitors' },
  { href: '/insights',      label: 'AI Insights' },
  { href: '/properties',    label: 'Properties' },
  { href: '/trends',        label: 'Trends' },
  { href: '/strategy',      label: 'Strategy' },
  { href: '/sparks',        label: 'SparkLab' },
  { href: '/business-plan', label: 'Business Plan' },
  { href: '/track',         label: 'Track' },
  { href: '/franchises',    label: 'Franchises' },
  { href: '/loans',         label: 'Loans' },
  { href: '/cofounder',     label: 'Co-founder' },
  { href: '/list-business', label: 'List Business' },
  { href: '/saved',         label: 'Saved' },
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
        <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)', animation: 'blobFloat 14s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(239,68,68,0.05) 0%, transparent 70%)', animation: 'blobFloat2 17s ease-in-out infinite' }} />
      </div>

      {/* Topbar */}
      <nav className="anim-fade-down" style={{ position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid var(--border)', background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', padding: '0 20px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

        {/* Logo */}
        <div onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flexShrink: 0 }}>
          <Logo size={34} textSize={17} />
        </div>

        {/* Desktop nav links */}
        <div className="nav-links" style={{ display: 'flex', gap: '2px', overflowX: 'auto' }}>
          {navItems.map(n => (
            <button key={n.href} onClick={() => router.push(n.href)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: router.pathname === n.href ? '600' : '500', whiteSpace: 'nowrap', transition: 'all 0.15s', background: router.pathname === n.href ? 'var(--surface2)' : 'transparent', color: router.pathname === n.href ? 'var(--text)' : 'var(--muted)' }}
              onMouseEnter={e => { if (router.pathname !== n.href) { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text2)'; } }}
              onMouseLeave={e => { if (router.pathname !== n.href) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)'; } }}>
              {n.label}
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
              <button onClick={() => router.push('/upgrade')} className="hide-mobile"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#ffffff', border: 'none', padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', boxShadow: '0 4px 14px rgba(59,130,246,0.3)' }}>
                ⚡ Go Pro
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
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500', textAlign: 'left', background: router.pathname === n.href ? 'var(--surface2)' : 'transparent', color: router.pathname === n.href ? 'var(--text)' : 'var(--muted)', borderLeft: router.pathname === n.href ? '2px solid var(--accent)' : '2px solid transparent' }}>
              {n.label}
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
      <footer style={{ position: 'relative', zIndex: 1, borderTop: '1px solid var(--border)', background: 'var(--bg2)', padding: '32px 24px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '32px', marginBottom: '28px' }}>
            {/* Brand */}
            <div style={{ maxWidth: '260px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #4f8ef7, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>B</div>
                <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)' }}>BizScope AI</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.7', margin: 0 }}>
                Free market intelligence for Indian entrepreneurs. Know your market before you invest.
              </p>
            </div>
            {/* Links */}
            <div style={{ display: 'flex', gap: '48px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Product</div>
                {[['How it Works', '/how-it-works'], ['Pricing', '/pricing'], ['Docs', '/docs'], ['Changelog', '/changelog']].map(([l, h]) => (
                  <div key={l} onClick={() => router.push(h)} style={{ fontSize: '13px', color: 'var(--muted)', cursor: 'pointer', marginBottom: '8px', transition: 'color 0.15s' }}
                    onMouseEnter={e => e.target.style.color = 'var(--text)'}
                    onMouseLeave={e => e.target.style.color = 'var(--muted)'}>{l}</div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Company</div>
                {[['About', '/about'], ['Feedback', '/feedback'], ['Privacy', '/privacy'], ['Terms', '/terms']].map(([l, h]) => (
                  <div key={l} onClick={() => router.push(h)} style={{ fontSize: '13px', color: 'var(--muted)', cursor: 'pointer', marginBottom: '8px', transition: 'color 0.15s' }}
                    onMouseEnter={e => e.target.style.color = 'var(--text)'}
                    onMouseLeave={e => e.target.style.color = 'var(--muted)'}>{l}</div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <span style={{ fontSize: '12px', color: 'var(--muted2)' }}>© 2026 BizScope AI · Built by Shivansh Singh Sengar</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
              <span style={{ fontSize: '12px', color: 'var(--muted2)' }}>All systems operational</span>
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
