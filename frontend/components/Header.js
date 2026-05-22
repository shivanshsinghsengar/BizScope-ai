import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import CommandPalette from './CommandPalette';

export default function Header({ onMenuToggle, cmdOpen, setCmdOpen, marketName }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [cartHover, setCartHover] = useState(false);

  return (
    <>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />

      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        height: '58px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        background: '#0d0e12',
        borderBottom: '1px solid #1a1d28',
        gap: '12px',
      }}>

        {/* ── LEFT: Hamburger (mobile) + Logo ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {/* Mobile hamburger */}
          <button
            onClick={onMenuToggle}
            className="sidebar-toggle"
            style={{
              display: 'none',
              background: 'transparent',
              border: '1px solid #1a1d28',
              color: '#5a6480',
              width: '32px', height: '32px',
              borderRadius: '7px',
              cursor: 'pointer',
              fontSize: '15px',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            ☰
          </button>

          {/* Logo */}
          <div
            onClick={() => router.push('/')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flexShrink: 0 }}
          >
            <div style={{
              width: '30px', height: '30px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #4f8ef7 0%, #6366f1 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '15px',
              boxShadow: '0 0 12px rgba(79,142,247,0.3)',
            }}>
              🚀
            </div>
            <span style={{
              fontSize: '15px', fontWeight: '800',
              color: '#eef0f8', letterSpacing: '-0.03em',
              whiteSpace: 'nowrap',
            }}>
              Biz<span style={{
                background: 'linear-gradient(135deg, #4f8ef7, #a78bfa)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>Scope</span> AI
            </span>
          </div>
        </div>

        {/* ── CENTER: Market Name (large, prominent) ── */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}>
          <span style={{ fontSize: '18px', lineHeight: 1 }}>📍</span>
          <span style={{
            fontSize: '18px',
            fontWeight: '700',
            color: '#eef0f8',
            letterSpacing: '-0.02em',
            whiteSpace: 'nowrap',
          }}>
            {marketName || 'New Delhi Market'}
          </span>
        </div>

        {/* ── RIGHT: Sign In + Cart + Go Pro ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {user ? (
            <>
              <div
                className="hide-on-mobile"
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid #1a1d28',
                  borderRadius: '100px',
                  padding: '4px 10px 4px 6px',
                  cursor: 'pointer',
                }}
                onClick={() => router.push('/admin')}
              >
                <div style={{
                  width: '20px', height: '20px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4f8ef7, #6366f1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', color: '#fff', fontWeight: '700',
                }}>
                  {user.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <span style={{ fontSize: '12px', color: '#c8cfe0', fontWeight: '500' }}>
                  {user.name?.split(' ')[0] || 'Account'}
                </span>
              </div>
              <button
                onClick={() => { logout(); router.push('/'); }}
                style={{
                  background: 'transparent', border: '1px solid #1a1d28',
                  color: '#5a6480', padding: '5px 10px', borderRadius: '7px',
                  cursor: 'pointer', fontSize: '12px', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#c8cfe0'; e.currentTarget.style.borderColor = '#2e3d60'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#5a6480'; e.currentTarget.style.borderColor = '#1a1d28'; }}
              >
                Sign Out
              </button>
            </>
          ) : (
            <button
              onClick={() => router.push('/login')}
              style={{
                background: 'transparent', border: 'none',
                color: '#8a93a8', padding: '5px 8px',
                borderRadius: '7px', cursor: 'pointer',
                fontSize: '13px', fontWeight: '500',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#eef0f8'}
              onMouseLeave={e => e.currentTarget.style.color = '#8a93a8'}
            >
              Sign In
            </button>
          )}

          {/* Cart */}
          <button
            style={{
              background: 'transparent',
              border: '1px solid ' + (cartHover ? '#2e3d60' : '#1a1d28'),
              color: cartHover ? '#c8cfe0' : '#5a6480',
              width: '32px', height: '32px',
              borderRadius: '8px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={() => setCartHover(true)}
            onMouseLeave={() => setCartHover(false)}
            title="Cart"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </button>

          {/* Go Pro */}
          <button
            onClick={() => router.push('/upgrade')}
            style={{
              background: 'linear-gradient(135deg, #4f8ef7 0%, #6366f1 100%)',
              color: '#fff', border: 'none',
              padding: '6px 13px', borderRadius: '8px',
              cursor: 'pointer', fontSize: '12px', fontWeight: '700',
              display: 'flex', alignItems: 'center', gap: '4px',
              boxShadow: '0 3px 12px rgba(79,142,247,0.35)',
              transition: 'opacity 0.15s, transform 0.15s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <span style={{ fontSize: '11px' }}>⚡</span>
            <span className="hide-on-mobile">Go Pro</span>
          </button>
        </div>
      </header>

      <style>{`
        @media (max-width: 768px) {
          .sidebar-toggle { display: flex !important; }
          .hide-on-mobile { display: none !important; }
        }
      `}</style>
    </>
  );
}
