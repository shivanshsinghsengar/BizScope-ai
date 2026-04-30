import dynamic from 'next/dynamic';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import { fetchJson } from '../utils/api';

// Lazy load Google Maps — only loads when this page is visited
const GoogleMap = dynamic(() => import('@react-google-maps/api').then(m => m.GoogleMap), { ssr: false });
const LoadScript = dynamic(() => import('@react-google-maps/api').then(m => m.LoadScript), { ssr: false });
const Marker = dynamic(() => import('@react-google-maps/api').then(m => m.Marker), { ssr: false });
const ReviewWidget = dynamic(() => import('../components/ReviewWidget'), { ssr: false });

export default function MapPage() {
  const [center, setCenter] = useState({ lat: 28.6139, lng: 77.2090 });
  const [businesses, setBusinesses] = useState([]);
  const [properties, setProperties] = useState([]);
  const [radius, setRadius] = useState(5);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const lat = parseFloat(urlParams.get('lat'));
    const lng = parseFloat(urlParams.get('lng'));
    if (lat && lng) { setCenter({ lat, lng }); loadMapData(lat, lng, radius); }
  }, [radius]);

  const loadMapData = async (lat, lng, rad) => {
    const [bizData, propData] = await Promise.all([
      fetchJson(`/api/businesses/${lat}/${lng}?radius=${rad}`),
      fetchJson(`/api/properties/${lat}/${lng}?radius=${rad}`),
    ]);
    setBusinesses(Array.isArray(bizData) ? bizData : []);
    setProperties(Array.isArray(propData) ? propData : []);
  };

  const increaseRadius = () => {
    setRadius(prev => prev + 5);
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
          <div style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--muted)' }}>
            {businesses.length} businesses · {properties.length} properties · {radius}km radius
            <button onClick={increaseRadius} style={{ marginLeft: '12px', padding: '4px 8px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
              +5km
            </button>
          </div>
          <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
            <GoogleMap mapContainerStyle={{ height: '80vh', width: '100%', borderRadius: '16px' }} center={center} zoom={14}>
              <Marker position={center} icon={{ url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png' }} />
              {businesses.map((b, i) => (
                <Marker key={i} position={{ lat: b.latitude, lng: b.longitude }} title={b.name || b.businessName || 'Business'}
                  icon={{ url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png' }} />
              ))}
              {properties.map((p, i) => (
                <Marker key={`p${i}`} position={{ lat: p.latitude, lng: p.longitude }}
                  title={`${p.type}: ₹${p.price?.toLocaleString()}`}
                  icon={{ url: 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png' }} />
              ))}
            </GoogleMap>
          </LoadScript>
        </div>
      </div>
      <ReviewWidget />
    </>
  );
}
