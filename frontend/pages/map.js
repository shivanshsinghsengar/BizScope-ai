import API_URL from '../utils/api';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import { useEffect, useState } from 'react';

// Leaflet must be loaded client-side only
const MapView = dynamic(() => import('../components/MapView'), { ssr: false });
const ReviewWidget = dynamic(() => import('../components/ReviewWidget'), { ssr: false });

const CATEGORY_COLORS = {
  restaurant: '#ef4444', cafe: '#f97316', retail: '#8b5cf6',
  grocery: '#10b981', pharmacy: '#3b82f6', gym: '#ec4899',
  salon: '#f59e0b', hotel: '#06b6d4', default: '#64748b',
};

export default function MapPage() {
  const [center, setCenter] = useState({ lat: 28.6139, lng: 77.2090 });
  const [businesses, setBusinesses] = useState([]);
  const [properties, setProperties] = useState([]);
  const [radiusKm, setRadiusKm] = useState(5);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const lat = parseFloat(urlParams.get('lat'));
    const lng = parseFloat(urlParams.get('lng'));
    if (lat && lng) {
      setCenter({ lat, lng });
      loadMapData(lat, lng, radiusKm);
    }
  }, []);

  const loadMapData = async (lat, lng, radius = 5) => {
    const [bizRes, propRes] = await Promise.all([
      fetch(`${API_URL}/api/businesses/${lat}/${lng}?radius=${radius}`),
      fetch(`${API_URL}/api/properties/${lat}/${lng}`),
    ]);
    setBusinesses(await bizRes.json());
    setProperties(await propRes.json());
  };

  const increaseRadius = async () => {
    const nextRadius = Math.min(radiusKm + 2, 10);
    setRadiusKm(nextRadius);
    await loadMapData(center.lat, center.lng, nextRadius);
  };

  return (
    <>
      <Head><title>Interactive Map — BizScope AI</title></Head>
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
        <nav style={{ borderBottom: '1px solid var(--border)', background: 'var(--nav-bg)', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontWeight: '700', fontSize: '18px' }}>🗺️ Business Map</h1>
          <a href="/" style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: 'white', padding: '8px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>← New Analysis</a>
        </nav>
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
            {businesses.length} businesses · {properties.length} properties · {radiusKm}km radius
          </div>
          <button onClick={increaseRadius} style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '10px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px' }}>
            Increase Radius
          </button>
        </div>
          <MapView
            center={center}
            businesses={businesses}
            properties={properties}
            categoryColors={CATEGORY_COLORS}
            radiusKm={radiusKm}
          />
        </div>
      </div>
      <ReviewWidget />
    </>
  );
}
