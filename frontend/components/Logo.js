import { useState } from 'react';

export default function Logo({ size = 34, showText = true, textSize = 18 }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {/* Logo image */}
      <div style={{
        width: size, height: size, borderRadius: Math.round(size * 0.2) + 'px',
        overflow: 'hidden', flexShrink: 0,
        background: '#ffffff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {!imgError ? (
          <img
            src="/logo.png"
            alt="BizScope AI Logo"
            width={size}
            height={size}
            onError={() => setImgError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : (
          // SVG fallback — geometric S in red/black
          <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 24 24" fill="none">
            <path d="M17 6H9a3 3 0 000 6h6a3 3 0 010 6H7" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="17" cy="6" r="1.5" fill="#ef4444"/>
            <circle cx="7" cy="18" r="1.5" fill="#1a1a1a"/>
          </svg>
        )}
      </div>

      {showText && (
        <span style={{ fontSize: textSize + 'px', fontWeight: '800', color: 'var(--text)', letterSpacing: '-0.3px' }}>
          Biz<span style={{ background: 'linear-gradient(135deg, #ef4444, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Scope</span>
          <span style={{ fontSize: (textSize * 0.65) + 'px', color: 'var(--muted)', fontWeight: '500', marginLeft: '3px' }}>AI</span>
        </span>
      )}
    </div>
  );
}
