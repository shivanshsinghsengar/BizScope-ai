export default function Skeleton({ width = '100%', height = '20px', radius = '8px', style = {} }) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: 'var(--surface2)',
      animation: 'shimmer 1.4s infinite',
      ...style,
    }} />
  );
}

export function PageSkeleton() {
  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px' }}>
      <style>{`
        @keyframes shimmer {
          0% { opacity: 0.5; }
          50% { opacity: 1; }
          100% { opacity: 0.5; }
        }
      `}</style>

      {/* Banner */}
      <Skeleton height="60px" radius="16px" style={{ marginBottom: '28px' }} />

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
        {[...Array(4)].map((_, i) => <Skeleton key={i} height="100px" radius="20px" />)}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '20px', marginBottom: '24px' }}>
        <Skeleton height="300px" radius="20px" />
        <Skeleton height="300px" radius="20px" />
      </div>

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px' }}>
        {[...Array(6)].map((_, i) => <Skeleton key={i} height="120px" radius="16px" />)}
      </div>
    </div>
  );
}
