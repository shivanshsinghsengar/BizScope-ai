import { useState } from 'react';

const LOGO_URL = 'https://image.pollinations.ai/prompt/minimalist%20high-tech%20vector%20logo%20letter%20S%20architectural%20blueprint%20style%2C%20isometric%20lines%2C%20glowing%20cyan%20nodes%2C%20deep%20navy%20background%2C%20cyan%20to%20royal%20blue%20gradient%2C%20geometric%20precise%2C%20no%20text%2C%20vector%20art?width=128&height=128&nologo=true&model=flux&seed=99';

export default function Logo({ size = 34, showText = true, textSize = 18 }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {/* Logo image with fallback */}
      <div style={{
        width: size, height: size, borderRadius: Math.round(size * 0.28) + 'px',
        overflow: 'hidden', flexShrink: 0,
        background: 'linear-gradient(135deg, #1e3a5f, #0b1929)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {!imgError ? (
          <img
            src={LOGO_URL}
            alt="BizScope AI Logo"
            width={size}
            height={size}
            onError={() => setImgError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          // SVG fallback — geometric S
          <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 24 24" fill="none">
            <path d="M17 6H9a3 3 0 000 6h6a3 3 0 010 6H7" stroke="url(#grad)" strokeWidth="2.5" strokeLinecap="round"/>
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#06b6d4"/>
                <stop offset="100%" stopColor="#3b82f6"/>
              </linearGradient>
            </defs>
            <circle cx="17" cy="6" r="1.5" fill="#06b6d4"/>
            <circle cx="7" cy="18" r="1.5" fill="#3b82f6"/>
            <circle cx="12" cy="12" r="1" fill="#60a5fa"/>
          </svg>
        )}
      </div>

      {showText && (
        <span style={{ fontSize: textSize + 'px', fontWeight: '800', color: 'var(--text)', letterSpacing: '-0.3px' }}>
          Biz<span style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Scope</span>
          <span style={{ fontSize: (textSize * 0.65) + 'px', color: 'var(--muted)', fontWeight: '500', marginLeft: '3px' }}>AI</span>
        </span>
      )}
    </div>
  );
}
