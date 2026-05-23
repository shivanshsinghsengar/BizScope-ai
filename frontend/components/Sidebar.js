import { useRouter } from 'next/router';

const NAV_SECTIONS = [
  {
    label: 'MAIN HUB',
    items: [
      { href: '/analysis', icon: GridIcon, label: 'Dashboard' },
    ],
  },
  {
    label: 'ANALYTICS',
    items: [
      { href: '/competitors',        icon: BarChartIcon,  label: 'Competitors' },
      { href: '/insights',           icon: LightbulbIcon, label: 'AI Insights' },
      { href: '/trends',             icon: TrendIcon,     label: 'Trends' },
      { href: '/properties',         icon: BuildingIcon,  label: 'Properties' },
      { href: '/revenue-calculator', icon: CalcIcon,      label: 'Revenue Calc' },
    ],
  },
  {
    label: 'TOOLS',
    items: [
      { href: '/scorecard', icon: ScoreIcon,   label: 'Score Card' },
      { href: '/compare',   icon: CompareIcon, label: 'Compare Cities' },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { href: '/alerts',   icon: BellIcon,     label: 'Alerts',   badge: 3 },
      { href: '/strategy', icon: StrategyIcon, label: 'Strategy' },
      { href: '/map',      icon: MapIcon,      label: 'Map View' },
    ],
  },
];

/* ── SVG Icons ─────────────────────────────────────────────────────────────── */

function GridIcon({ size = 15, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function BarChartIcon({ size = 15, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  );
}

function LightbulbIcon({ size = 15, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="9" y1="18" x2="15" y2="18" />
      <line x1="10" y1="22" x2="14" y2="22" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
    </svg>
  );
}

function TrendIcon({ size = 15, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function BuildingIcon({ size = 15, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01M12 14h.01" />
    </svg>
  );
}

function CalcIcon({ size = 15, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="10" x2="10" y2="10" />
      <line x1="14" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="10" y2="14" />
      <line x1="14" y1="14" x2="16" y2="14" />
      <line x1="8" y1="18" x2="16" y2="18" />
    </svg>
  );
}

function ScoreIcon({ size = 15, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

function CompareIcon({ size = 15, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3" />
      <path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" />
      <line x1="12" y1="3" x2="12" y2="21" />
    </svg>
  );
}

function BellIcon({ size = 15, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function StrategyIcon({ size = 15, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
    </svg>
  );
}

function MapIcon({ size = 15, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
      <line x1="9" y1="3" x2="9" y2="18" />
      <line x1="15" y1="6" x2="15" y2="21" />
    </svg>
  );
}

/* ── Sidebar ────────────────────────────────────────────────────────────────── */

export default function Sidebar({ open, onClose }) {
  const router = useRouter();

  const isActive = (href) => router.pathname === href;

  const navigate = (href) => {
    router.push(href);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 148,
          }}
        />
      )}

      <aside
        className="sidebar-root"
        style={{
          position: 'fixed',
          top: '58px',
          left: 0,
          bottom: 0,
          width: '200px',
          background: '#0d0e12',
          borderRight: '1px solid #1a1d28',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 149,
          overflowY: 'auto',
          overflowX: 'hidden',
          transition: 'transform 0.26s cubic-bezier(.16,1,.3,1)',
        }}
      >
        <nav style={{ padding: '14px 8px 8px', flex: 1 }}>
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} style={{ marginBottom: '20px' }}>
              {/* Section label */}
              <div style={{
                fontSize: '9.5px',
                fontWeight: '700',
                color: '#2a3350',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                padding: '0 8px',
                marginBottom: '4px',
              }}>
                {section.label}
              </div>

              {/* Items */}
              {section.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <button
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '9px',
                      padding: '7px 8px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '12.5px',
                      fontWeight: active ? '600' : '500',
                      color: active ? '#eef0f8' : '#4e5870',
                      background: active
                        ? 'rgba(79,142,247,0.12)'
                        : 'transparent',
                      transition: 'all 0.14s',
                      textAlign: 'left',
                      position: 'relative',
                      marginBottom: '1px',
                    }}
                    onMouseEnter={e => {
                      if (!active) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        e.currentTarget.style.color = '#c8cfe0';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!active) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#4e5870';
                      }
                    }}
                  >
                    {/* Active indicator bar */}
                    {active && (
                      <div style={{
                        position: 'absolute',
                        left: 0, top: '18%', bottom: '18%',
                        width: '3px',
                        borderRadius: '0 3px 3px 0',
                        background: 'linear-gradient(180deg, #4f8ef7, #6366f1)',
                        boxShadow: '0 0 6px rgba(79,142,247,0.5)',
                      }} />
                    )}

                    <span style={{
                      color: active ? '#4f8ef7' : 'inherit',
                      display: 'flex', alignItems: 'center', flexShrink: 0,
                    }}>
                      <Icon size={15} color="currentColor" />
                    </span>

                    <span style={{ flex: 1 }}>{item.label}</span>

                    {/* Alert badge */}
                    {item.badge && (
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        color: '#fff',
                        background: '#ef4444',
                        borderRadius: '100px',
                        padding: '1px 5px',
                        minWidth: '17px',
                        textAlign: 'center',
                        boxShadow: '0 0 6px rgba(239,68,68,0.45)',
                        flexShrink: 0,
                      }}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Free access banner */}
        <div style={{ padding: '8px 8px 16px' }}>
          <div style={{
            background: 'rgba(79,142,247,0.08)',
            border: '1px solid rgba(79,142,247,0.15)',
            borderRadius: '10px',
            padding: '12px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '18px', marginBottom: '4px' }}>🎉</div>
            <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#eef0f8', marginBottom: '3px' }}>
              All Features Free
            </div>
            <div style={{ fontSize: '10.5px', color: '#3a4560', lineHeight: '1.5' }}>
              Early access — no credit card needed.
            </div>
          </div>
        </div>
      </aside>

      <style>{`
        @media (max-width: 768px) {
          .sidebar-root {
            transform: ${open ? 'translateX(0)' : 'translateX(-100%)'} !important;
          }
        }
        @media (min-width: 769px) {
          .sidebar-root {
            transform: translateX(0) !important;
          }
        }
      `}</style>
    </>
  );
}
