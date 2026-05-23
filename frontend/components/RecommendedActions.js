import { useRef, useState } from 'react';
import { useRouter } from 'next/router';

/* ── Card data ──────────────────────────────────────────────────────────────── */
const ACTIONS = [
  {
    id: 'competitors',
    icon: TargetIcon,
    iconColor: '#ef4444',
    iconBg: 'rgba(239,68,68,0.15)',
    title: 'Target Top Competitors',
    description: 'Identify and analyze the highest-threat businesses in your market radius.',
    cta: 'Target Top Competitors →',
    ctaStyle: 'solid',
    href: '/competitors',
  },
  {
    id: 'strategy',
    icon: BrainNetIcon,
    iconColor: '#a78bfa',
    iconBg: 'rgba(167,139,250,0.15)',
    title: 'AI Strategy Planner',
    description: 'Get a personalized go-to-market plan powered by real competitor data.',
    cta: 'Open AI Strategy →',
    ctaStyle: 'outline',
    href: '/strategy',
  },
  {
    id: 'properties',
    icon: HouseIcon,
    iconColor: '#34d399',
    iconBg: 'rgba(52,211,153,0.15)',
    title: 'Browse Prime Properties',
    description: 'Discover high-footfall commercial spaces near your target location.',
    cta: 'Browse Prime Properties →',
    ctaStyle: 'outline',
    href: '/properties',
  },
  {
    id: 'report',
    icon: DocumentIcon,
    iconColor: '#60a5fa',
    iconBg: 'rgba(96,165,250,0.15)',
    title: 'Generate Final Report',
    description: 'Export a full PDF market analysis report ready to share with investors.',
    cta: 'Generate Final Report →',
    ctaStyle: 'outline',
    href: '/analysis',
  },
];

/* ── Icons ──────────────────────────────────────────────────────────────────── */

function TargetIcon({ size = 22, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function BrainNetIcon({ size = 22, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="2" />
      <circle cx="5" cy="14" r="2" />
      <circle cx="19" cy="14" r="2" />
      <circle cx="12" cy="19" r="2" />
      <line x1="12" y1="7" x2="5" y2="12" />
      <line x1="12" y1="7" x2="19" y2="12" />
      <line x1="5" y1="16" x2="12" y2="17" />
      <line x1="19" y1="16" x2="12" y2="17" />
      <line x1="5" y1="14" x2="19" y2="14" />
    </svg>
  );
}

function HouseIcon({ size = 22, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function DocumentIcon({ size = 22, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

/* ── Action Card ────────────────────────────────────────────────────────────── */

function ActionCard({ action, index }) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const Icon = action.icon;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => router.push(action.href)}
      style={{
        background: hovered ? '#1c2030' : '#161b27',
        border: `1px solid ${hovered ? '#2a3252' : '#1e2438'}`,
        borderRadius: '14px',
        padding: '18px 16px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(.16,1,.3,1)',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hovered
          ? '0 12px 32px rgba(0,0,0,0.4)'
          : '0 2px 6px rgba(0,0,0,0.25)',
        minHeight: '180px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle top shimmer on hover */}
      {hovered && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(79,142,247,0.4), transparent)',
          pointerEvents: 'none',
        }} />
      )}

      {/* Icon */}
      <div style={{
        width: '40px', height: '40px',
        borderRadius: '10px',
        background: action.iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        transition: 'transform 0.2s',
        transform: hovered ? 'scale(1.06)' : 'scale(1)',
      }}>
        <Icon size={19} color={action.iconColor} />
      </div>

      {/* Title + description */}
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: '13.5px',
          fontWeight: '700',
          color: '#eef0f8',
          marginBottom: '5px',
          letterSpacing: '-0.02em',
          lineHeight: '1.3',
        }}>
          {action.title}
        </div>
        <div style={{
          fontSize: '11.5px',
          color: '#3a4560',
          lineHeight: '1.55',
        }}>
          {action.description}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={e => { e.stopPropagation(); router.push(action.href); }}
        style={{
          alignSelf: 'flex-start',
          padding: '6px 12px',
          borderRadius: '7px',
          fontSize: '11.5px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'all 0.15s',
          whiteSpace: 'nowrap',
          ...(action.ctaStyle === 'solid'
            ? {
                background: 'linear-gradient(135deg, #4f8ef7, #2563eb)',
                color: '#fff',
                border: 'none',
                boxShadow: '0 3px 10px rgba(79,142,247,0.35)',
              }
            : {
                background: 'transparent',
                color: '#5a6480',
                border: '1px solid #1e2438',
              }
          ),
        }}
        onMouseEnter={e => {
          if (action.ctaStyle === 'outline') {
            e.currentTarget.style.borderColor = '#2e3d60';
            e.currentTarget.style.color = '#c8cfe0';
          }
        }}
        onMouseLeave={e => {
          if (action.ctaStyle === 'outline') {
            e.currentTarget.style.borderColor = '#1e2438';
            e.currentTarget.style.color = '#5a6480';
          }
        }}
      >
        {action.cta}
      </button>
    </div>
  );
}

/* ── Main export ────────────────────────────────────────────────────────────── */

export default function RecommendedActions() {
  const gridRef = useRef(null);

  const scroll = (dir) => {
    if (!gridRef.current) return;
    gridRef.current.scrollBy({ left: dir * 260, behavior: 'smooth' });
  };

  return (
    <section style={{ marginBottom: '20px' }}>
      {/* Header row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '10px',
      }}>
        <span style={{
          fontSize: '10px',
          fontWeight: '700',
          color: '#2a3350',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}>
          Recommended Actions
        </span>

        {/* Scroll arrows */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {[
            { arrow: '‹', dir: -1 },
            { arrow: '›', dir: 1 },
          ].map(({ arrow, dir }) => (
            <button
              key={arrow}
              onClick={() => scroll(dir)}
              style={{
                width: '24px', height: '24px',
                borderRadius: '6px',
                background: 'transparent',
                border: '1px solid #1a1d28',
                color: '#3a4560',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.14s',
                lineHeight: 1,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#2e3d60'; e.currentTarget.style.color = '#c8cfe0'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a1d28'; e.currentTarget.style.color = '#3a4560'; }}
            >
              {arrow}
            </button>
          ))}
        </div>
      </div>

      {/* 4-column grid */}
      <div
        ref={gridRef}
        className="rec-actions-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
        }}
      >
        {ACTIONS.map((action, i) => (
          <ActionCard key={action.id} action={action} index={i} />
        ))}
      </div>

      <style>{`
        @media (max-width: 1100px) {
          .rec-actions-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 600px) {
          .rec-actions-grid {
            display: flex !important;
            overflow-x: auto !important;
            scroll-snap-type: x mandatory;
            -webkit-overflow-scrolling: touch;
            gap: 10px !important;
            padding-bottom: 6px;
          }
          .rec-actions-grid > * {
            min-width: 220px;
            flex-shrink: 0;
            scroll-snap-align: start;
          }
        }
      `}</style>
    </section>
  );
}
