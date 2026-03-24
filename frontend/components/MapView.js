import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const makeIcon = (color) => L.divIcon({
  className: '',
  html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
  iconSize: [12, 12], iconAnchor: [6, 6],
});

const userIcon = L.divIcon({
  className: '',
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#6366f1;border:3px solid white;box-shadow:0 2px 10px rgba(99,102,241,0.6)"></div>`,
  iconSize: [18, 18], iconAnchor: [9, 9],
});

const propertyIcon = L.divIcon({
  className: '',
  html: `<div style="width:14px;height:14px;border-radius:3px;background:#f59e0b;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
  iconSize: [14, 14], iconAnchor: [7, 7],
});

function Recenter({ center }) {
  const map = useMap();
  useEffect(() => { map.setView([center.lat, center.lng], 14); }, [center]);
  return null;
}

// Fetch nearest street view photo from KartaView
async function fetchStreetView(lat, lng) {
  try {
    const res = await fetch(
      `https://api.openstreetcam.org/1.0/photo/?lat=${lat}&lng=${lng}&radius=50&page=1&ipp=1`,
      { headers: { Accept: 'application/json' } }
    );
    const data = await res.json();
    const photo = data?.currentPageItems?.[0];
    if (!photo) return null;
    // Build thumb URL
    const base = photo.fileurlProc || photo.fileurl || '';
    return base || null;
  } catch {
    return null;
  }
}

// Business popup with lazy street view
function BusinessPopup({ b, color }) {
  const [img, setImg] = useState(undefined); // undefined=not loaded, null=none, string=url

  const load = useCallback(async () => {
    if (img !== undefined) return;
    setImg(null); // loading
    const url = await fetchStreetView(b.latitude, b.longitude);
    setImg(url);
  }, [b.latitude, b.longitude, img]);

  return (
    <Popup onOpen={load}>
      <div style={{ minWidth: '180px', maxWidth: '220px' }}>
        <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '4px' }}>{b.name}</div>
        <div style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '100px', background: color + '20', color, fontSize: '11px', fontWeight: '600', marginBottom: '6px' }}>
          {b.category}
        </div>
        {b.address && <div style={{ fontSize: '11px', color: '#64748b' }}>📍 {b.address}</div>}
        {b.phone && <a href={`tel:${b.phone}`} style={{ fontSize: '11px', color: '#6366f1', marginTop: '2px', display: 'block', fontWeight: '600' }}>📞 {b.phone}</a>}
        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>⭐ {b.rating} · {b.reviewCount} reviews</div>

        {/* Street View */}
        <div style={{ marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
          <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}>📸 Street View (KartaView)</div>
          {img === undefined || img === null ? (
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{img === undefined ? 'Loading...' : 'No street view available'}</div>
          ) : (
            <a href={`https://kartaview.org/map/@${b.latitude},${b.longitude},17z`} target="_blank" rel="noreferrer">
              <img src={img} alt="Street view" style={{ width: '100%', borderRadius: '6px', cursor: 'pointer' }} />
            </a>
          )}
        </div>
      </div>
    </Popup>
  );
}

export default function MapView({ center, businesses, properties, categoryColors }) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={14}
      style={{ height: '80vh', width: '100%', borderRadius: '16px', zIndex: 1 }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter center={center} />

      <Circle
        center={[center.lat, center.lng]}
        radius={5000}
        pathOptions={{ color: '#6366f1', fillColor: '#6366f1', fillOpacity: 0.05, weight: 1.5, dashArray: '6' }}
      />

      <Marker position={[center.lat, center.lng]} icon={userIcon}>
        <Popup>
          <div style={{ fontWeight: '700', fontSize: '13px' }}>📍 Your Location</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Analysis center point</div>
        </Popup>
      </Marker>

      {businesses.map((b, i) => {
        if (!b.latitude || !b.longitude) return null;
        const color = categoryColors[b.category] || '#64748b';
        return (
          <Marker key={`b-${i}`} position={[b.latitude, b.longitude]} icon={makeIcon(color)}>
            <BusinessPopup b={b} color={color} />
          </Marker>
        );
      })}

      {properties.map((p, i) => {
        if (!p.latitude || !p.longitude) return null;
        return (
          <Marker key={`p-${i}`} position={[p.latitude, p.longitude]} icon={propertyIcon}>
            <Popup>
              <div style={{ minWidth: '160px' }}>
                <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '4px' }}>🏪 {p.address}</div>
                <div style={{ fontSize: '12px', color: p.type === 'rent' ? '#3b82f6' : '#10b981', fontWeight: '600' }}>
                  {p.type === 'rent' ? '🔑 FOR RENT' : '🏷️ FOR SALE'}
                </div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b', marginTop: '4px' }}>
                  ₹{p.price?.toLocaleString('en-IN')}{p.type === 'rent' ? '/mo' : ''}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>📐 {p.size} sqft · 👥 {p.footTraffic}% traffic</div>
                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>* Price is estimated</div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
