import { useState } from 'react';
import { useRouter } from 'next/router';

const C = { bg: '#FFFFFF', border: '#E2E8F0', text: '#1E293B', muted: '#64748B', primary: '#1F6FEB' };

export default function CommandCenter({ onSearchClick }) {
  const router = useRouter();
  const [hov, setHov] = useState(false);

  const quickLinks = [
    { label: 'Competitors', href: '/competitors', icon: '📊' },
    { label: 'AI Insights',  href: '/insights',   icon: '💡' },
    { label: 'Properties',   href: '/properties',  icon: '🏢' },
    { label: 'Revenue Calc', href: '/revenue-calculator', icon: '🧮' },
    { label: 'Strategy',     href: '/strategy',    icon: '🎯' },
    { label: 'Map View',     href: '/map',          icon: '🗺️' },
  ];

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '8px 20px', borderBottom: `1px solid ${C.border}`,
      background: '#FAFBFC',
      /* never let this bar cause horizontal scroll */
      overflow: 'hidden',
      flexWrap: 'wrap',
      minHeight: '42px',
    }}>

      {/* Search trigger — fixed width so it never overflows */}
      <button
        onClick={onSearchClick}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '6px 12px', borderRadius: '7px',
          border: `1px solid ${hov ? '#94A3B8' : C.border}`,
          background: hov ? '#F1F5F9' : '#fff',
          color: C.muted, cursor: 'pointer', fontSize: '12px',
          fontFamily: "'Inter', sans-serif", transition: 'all 0.15s',
          flexShrink: 0, whiteSpace: 'nowrap',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        Search &amp; Command
        <kbd style={{
          fontSize: '10px', color: '#CBD5E1', background: '#F1F5F9',
          border: '1px solid #E2E8F0', borderRadius: '4px',
          padding: '1px 5px', fontFamily: 'monospace',
        }}>⌘K</kbd>
      </button>

      {/* Divider */}
      <div style={{ width: '1px', height: '18px', background: C.border, flexShrink: 0 }} />

      {/* Quick links — wrap naturally, no overflow */}
      {quickLinks.map(link => (
        <button key={link.href} onClick={() => router.push(link.href)} style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          padding: '5px 10px', borderRadius: '7px',
          border: `1px solid ${C.border}`, background: '#fff',
          color: C.muted, cursor: 'pointer', fontSize: '12px',
          fontWeight: '500', fontFamily: "'Inter', sans-serif",
          transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = '#94A3B8';
          e.currentTarget.style.color = C.text;
          e.currentTarget.style.background = C.primary + '08';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = C.border;
          e.currentTarget.style.color = C.muted;
          e.currentTarget.style.background = '#fff';
        }}>
          <span style={{ fontSize: '11px' }}>{link.icon}</span>
          {link.label}
        </button>
      ))}
    </div>
  );
}
