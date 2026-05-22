import { useState } from 'react';

/**
 * CommandCenter — the horizontal bar shown at the top of dashboard pages.
 * Contains: label | search trigger | edit icon | settings icon
 */
export default function CommandCenter({ onSearchClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px 20px',
      borderBottom: '1px solid #1a1d28',
      background: '#0d0e12',
    }}>
      {/* Label */}
      <span style={{
        fontSize: '10px',
        fontWeight: '700',
        color: '#2a3350',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        flexShrink: 0,
        whiteSpace: 'nowrap',
      }}>
        Command Center
      </span>

      {/* Search bar */}
      <button
        onClick={onSearchClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          flex: 1,
          maxWidth: '480px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: hovered ? 'rgba(79,142,247,0.06)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${hovered ? 'rgba(79,142,247,0.3)' : '#1e2235'}`,
          borderRadius: '8px',
          padding: '7px 12px',
          cursor: 'pointer',
          transition: 'all 0.18s',
          textAlign: 'left',
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3a4560" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span style={{ flex: 1, fontSize: '12px', color: '#3a4560', fontWeight: '400' }}>
          AI-Powered Market &amp; Cmd Search (Ctrl+K)
        </span>
      </button>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Edit icon */}
      <button
        style={{
          background: 'transparent',
          border: '1px solid #1a1d28',
          color: '#3a4560',
          width: '30px', height: '30px',
          borderRadius: '7px',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
          flexShrink: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#2e3d60'; e.currentTarget.style.color = '#c8cfe0'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a1d28'; e.currentTarget.style.color = '#3a4560'; }}
        title="Edit"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>

      {/* Settings icon */}
      <button
        style={{
          background: 'transparent',
          border: '1px solid #1a1d28',
          color: '#3a4560',
          width: '30px', height: '30px',
          borderRadius: '7px',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
          flexShrink: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#2e3d60'; e.currentTarget.style.color = '#c8cfe0'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a1d28'; e.currentTarget.style.color = '#3a4560'; }}
        title="Settings"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
    </div>
  );
}
