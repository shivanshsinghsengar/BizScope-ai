export default function Logo({ size = 34, showText = true, textSize = 18 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {/* Logo image */}
      <div style={{
        width: size, height: size, borderRadius: Math.round(size * 0.2) + 'px',
        overflow: 'hidden', flexShrink: 0,
        background: '#ffffff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <img
          src="/logo.svg"
          alt="BizScope AI Logo"
          width={size}
          height={size}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
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
