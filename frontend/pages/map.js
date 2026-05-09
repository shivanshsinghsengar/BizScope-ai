import API_URL from '../utils/api';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';

// Leaflet must be loaded client-side only
const MapView = dynamic(() => import('../components/MapView'), { ssr: false });
const ReviewWidget = dynamic(() => import('../components/ReviewWidget'), { ssr: false });

const CATEGORY_COLORS = {
  restaurant: '#ef4444', cafe: '#f97316', retail: '#8b5cf6',
  grocery: '#10b981', pharmacy: '#3b82f6', gym: '#ec4899',
  salon: '#f59e0b', hotel: '#06b6d4', bakery: '#f97316',
  hospital: '#ef4444', clothing: '#a855f7', electronics: '#0ea5e9',
  hardware: '#78716c', furniture: '#d97706', education: '#14b8a6',
  jewellery: '#eab308', automotive: '#64748b', finance: '#22c55e',
  hospitality: '#f43f5e', wholesale: '#0891b2', office: '#6366f1',
  default: '#64748b',
};

export default function MapPage() {
  const [center, setCenter] = useState({ lat: 28.6139, lng: 77.2090 });
  const [businesses, setBusinesses] = useState([]);
  const [properties, setProperties] = useState([]);
  const [radiusKm, setRadiusKm] = useState(5);
  const [loading, setLoading] = useState(false);
  const [locationName, setLocationName] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const lat = parseFloat(urlParams.get('lat'));
    const lng = parseFloat(urlParams.get('lng'));
    const name = urlParams.get('name') || '';
    if (lat && lng) {
      setCenter({ lat, lng });
      setLocationName(name);
      loadMapData(lat, lng, radiusKm);
    } else {
      // Try to load from last analysis
      try {
        const cached = JSON.parse(sessionStorage.getItem('analysisData') || '{}');
        if (cached.lat && cached.lng) {
          setCenter({ lat: cached.lat, lng: cached.lng });
          setLocationName(cached.location || '');
          loadMapData(cached.lat, cached.lng, radiusKm);
        }
      } catch (_) {}
    }
  }, []);

  const loadMapData = async (lat, lng, radius = 5) => {
    setLoading(true);
    try {
      const [bizRes, propRes] = await Promise.all([
        fetch(`${API_URL}/api/businesses/${lat}/${lng}?radius=${radius}`),
        fetch(`${API_URL}/api/properties/${lat}/${lng}`),
      ]);
      const [biz, prop] = await Promise.all([bizRes.json(), propRes.json()]);
      setBusinesses(Array.isArray(biz) ? biz : []);
      setProperties(Array.isArray(prop) ? prop : []);
    } catch (_) {}
    setLoading(false);
  };

  const changeRadius = async (delta) => {
    const next = Math.min(Math.max(radiusKm + delta, 1), 15);
    setRadiusKm(next);
    await loadMapData(center.lat, center.lng, next);
  };

  return (
    <Layout>
      <Head>
        <title>Business Viability Map — BizScope AI</title>
        <meta name="description" content="Interactive business map with viability heatmap. See competitor density and market opportunities in your area." />
      </Head>

      <div style={{ padding: '24px 28px', maxWidth: '1600px', margin: '0 auto' }}>

        {/* Header */}
        <div className="anim-fade-down" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🗺️</div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text)', letterSpacing: '-0.5px' }}>
                Business Viability Map
              </h1>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.6' }}>
              {locationName ? `Showing market data for ${locationName}` : 'Interactive competitor map with viability heatmap'}
              {' · '}Toggle the <strong style={{ color: '#10b981' }}>🌡️ Viability Heatmap</strong> to see opportunity zones
            </p>
          </div>

          {/* Radius controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: '600' }}>Radius:</span>
            <button onClick={() => changeRadius(-1)} disabled={radiusKm <= 1 || loading}
              style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
            <div style={{ padding: '6px 14px', borderRadius: '8px', background: 'var(--surface2)', border: '1px solid var(--border2)', fontSize: '13px', fontWeight: '700', color: 'var(--text)', minWidth: '52px', textAlign: 'center' }}>
              {radiusKm}km
            </div>
            <button onClick={() => changeRadius(1)} disabled={radiusKm >= 15 || loading}
              style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            {loading && <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Loading…</span>}
          </div>
        </div>

        {/* How to use heatmap — tip banner */}
        <div className="anim-fade-up" style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 18px', borderRadius: '12px', marginBottom: '20px',
          background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)',
        }}>
          <span style={{ fontSize: '20px' }}>💡</span>
          <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: '1.6' }}>
            <strong style={{ color: '#10b981' }}>New: Viability Heatmap</strong> — Click the{' '}
            <strong>🌡️ Viability Heatmap</strong> button on the map controls to overlay a color-coded grid.{' '}
            <span style={{ color: '#10b981' }}>Green zones</span> = low competition (open opportunity),{' '}
            <span style={{ color: '#ef4444' }}>Red zones</span> = saturated market. Filter by category for targeted insights.
          </div>
        </div>

        {/* Map */}
        <div className="anim-scale">
          {businesses.length === 0 && !loading ? (
            <div style={{
              height: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px',
              gap: '16px',
            }}>
              <div style={{ fontSize: '48px' }}>🗺️</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text)' }}>No map data loaded</div>
              <p style={{ fontSize: '14px', color: 'var(--muted)', textAlign: 'center', maxWidth: '360px', lineHeight: '1.7' }}>
                Run an analysis from the homepage first, then come back here to see the viability heatmap.
              </p>
              <a href="/" style={{ padding: '10px 24px', borderRadius: '10px', background: 'linear-gradient(135deg,#4f8ef7,#2563eb)', color: '#fff', textDecoration: 'none', fontSize: '14px', fontWeight: '700' }}>
                ← Start Analysis
              </a>
            </div>
          ) : (
            <MapView
              center={center}
              businesses={businesses}
              properties={properties}
              categoryColors={CATEGORY_COLORS}
              radiusKm={radiusKm}
            />
          )}
        </div>

        {/* Bottom legend */}
        <div style={{ marginTop: '20px', display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'linear-gradient(135deg,#4f8ef7,#2563eb)', border: '2px solid white' }} />
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Your location</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444', border: '2px solid white' }} />
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Businesses</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: '#f59e0b', border: '2px solid white' }} />
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Properties</span>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--muted2)' }}>
            Map data © OpenStreetMap · CARTO
          </div>
        </div>
      </div>

      <ReviewWidget />
    </Layout>
  );
}
