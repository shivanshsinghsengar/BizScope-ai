import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import SuggestBusiness from './SuggestBusiness';
import Logo from './Logo';
import Header from './Header';
import Sidebar from './Sidebar';
import CommandCenter from './CommandCenter';
import CommandPalette from './CommandPalette';

/* Routes that get the full dashboard shell (sidebar + command center) */
const DASHBOARD_ROUTES = [
  '/analysis', '/competitors', '/insights', '/trends', '/properties',
  '/revenue-calculator', '/scorecard', '/compare', '/alerts', '/strategy',
  '/map', '/saved', '/sparks', '/business-plan', '/track', '/franchises',
  '/loans', '/cofounder', '/list-business', '/admin',
  '/interior', '/news', '/suggestions',
];

const SIDEBAR_WIDTH = 200;

export default function Layout({ children }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  const isDashboard = DASHBOARD_ROUTES.some(r =>
    router.pathname === r || router.pathname.startsWith(r + '/')
  );

  /* Global Ctrl+K */
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(o => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  /* Close sidebar on navigation */
  useEffect(() => {
    setSidebarOpen(false);
  }, [router.pathname]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0d0e12',
      color: '#eef0f8',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Ambient blobs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', top: '-10%', right: '-5%',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(79,142,247,0.05) 0%, transparent 70%)',
          animation: 'blobFloat 16s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '-10%', left: '-5%',
          width: '400px', height: '400px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 70%)',
          animation: 'blobFloat2 20s ease-in-out infinite',
        }} />
      </div>

      {/* Command Palette (global) */}
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />

      {/* ── TOP HEADER ── */}
      <Header
        onMenuToggle={() => setSidebarOpen(o => !o)}
        cmdOpen={cmdOpen}
        setCmdOpen={setCmdOpen}
      />

      {/* ── BODY ── */}
      <div style={{ display: 'flex', flex: 1, position: 'relative', zIndex: 1 }}>

        {/* Sidebar — dashboard pages only */}
        {isDashboard && (
          <Sidebar
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        )}

        {/* Main area */}
        <div
          className={isDashboard ? 'main-shell' : ''}
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            marginLeft: isDashboard ? `${SIDEBAR_WIDTH}px` : '0',
            transition: 'margin-left 0.26s cubic-bezier(.16,1,.3,1)',
          }}
        >
          {/* Command Center bar — dashboard only */}
          {isDashboard && (
            <CommandCenter onSearchClick={() => setCmdOpen(true)} />
          )}

          <main style={{ flex: 1 }}>
            {children}
          </main>
        </div>
      </div>

      <SuggestBusiness />

      {/* Theme toggle */}
      <button
        onClick={toggle}
        title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        suppressHydrationWarning
        className={isDashboard ? 'theme-btn-dashboard' : ''}
        style={{
          position: 'fixed',
          bottom: '20px',
          left: isDashboard ? `${SIDEBAR_WIDTH + 12}px` : '20px',
          zIndex: 200,
          width: '36px', height: '36px',
          borderRadius: '50%',
          background: '#161b27',
          border: '1px solid #1e2438',
          fontSize: '15px',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = '#4f8ef7'}
        onMouseLeave={e => e.currentTarget.style.borderColor = '#1e2438'}
      >
        {dark ? '☀️' : '🌙'}
      </button>

      {/* ── FOOTER ── */}
      <footer
        className={isDashboard ? 'footer-shell' : ''}
        style={{
          position: 'relative', zIndex: 1,
          borderTop: '1px solid #1a1d28',
          background: '#080a0f',
          padding: '32px 24px',
          marginLeft: isDashboard ? `${SIDEBAR_WIDTH}px` : '0',
          transition: 'margin-left 0.26s cubic-bezier(.16,1,.3,1)',
        }}
      >
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'flex-start', flexWrap: 'wrap', gap: '28px', marginBottom: '24px',
          }}>
            <div style={{ maxWidth: '220px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Logo size={24} textSize={13} />
              </div>
              <p style={{ fontSize: '11.5px', color: '#2a3350', lineHeight: '1.7', margin: 0 }}>
                Free market intelligence for Indian entrepreneurs. Know your market before you invest.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
              {[
                { heading: 'Product', links: [['How it Works', '/how-it-works'], ['Pricing', '/pricing'], ['Docs', '/docs'], ['Changelog', '/changelog']] },
                { heading: 'Company', links: [['About', '/about'], ['Feedback', '/feedback'], ['Privacy', '/privacy'], ['Terms', '/terms']] },
              ].map(col => (
                <div key={col.heading}>
                  <div style={{ fontSize: '9.5px', fontWeight: '700', color: '#2a3350', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
                    {col.heading}
                  </div>
                  {col.links.map(([label, href]) => (
                    <div
                      key={label}
                      onClick={() => router.push(href)}
                      style={{ fontSize: '11.5px', color: '#2a3350', cursor: 'pointer', marginBottom: '7px', transition: 'color 0.14s' }}
                      onMouseEnter={e => e.target.style.color = '#eef0f8'}
                      onMouseLeave={e => e.target.style.color = '#2a3350'}
                    >
                      {label}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div style={{
            borderTop: '1px solid #1a1d28', paddingTop: '16px',
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', flexWrap: 'wrap', gap: '10px',
          }}>
            <span style={{ fontSize: '11px', color: '#2a3350' }}>
              © 2026 BizScope AI · Built by Shivansh Singh Sengar
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 5px rgba(34,197,94,0.6)' }} />
              <span style={{ fontSize: '11px', color: '#2a3350' }}>All systems operational</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Responsive overrides ── */}
      <style>{`
        @media (max-width: 768px) {
          .main-shell    { margin-left: 0 !important; }
          .footer-shell  { margin-left: 0 !important; }
          .theme-btn-dashboard { left: 20px !important; }
        }
      `}</style>
    </div>
  );
}
