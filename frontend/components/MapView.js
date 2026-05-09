import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import ViabilityHeatmap from './ViabilityHeatmap';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const makeIcon = (color, size = 12) => L.divIcon({
  className: '',
  html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.9);box-shadow:0 2px 8px rgba(0,0,0,0.45)"></div>`,
  iconSize: [size, size], iconAnchor: [size / 2, size / 2],
});

const userIcon = L.divIcon({
  className: '',
  html: `<div style="width:20px;height:20px;border-radius:50%;background:linear-gradient(135deg,#4f8ef7,#2563eb);border:3px solid white;box-shadow:0 2px 12px rgba(79,142,247,0.7)"></div>`,
  iconSize: [20, 20], iconAnchor: [10, 10],
});

const propertyIcon = L.divIcon({
  className: '',
  html: `<div style="width:14px;height:14px;border-radius:4px;background:#f59e0b;border:2px solid white;box-shadow:0 2px 8px rgba(245,158,11,0.5)"></div>`,
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
    return photo.fileurlProc || photo.fileurl || null;
  } catch {
    return null;
  }
}

function BusinessPopup({ b, color }) {
  const [img, setImg] = useState(undefined);

  const load = useCallback(async () => {
    if (img !== undefined) return;
    setImg(null);
    const url = await fetchStreetView(b.latitude, b.longitude);
    setImg(url);
  }, [b.latitude, b.longitude, img]);

  return (
    <Popup onOpen={load}>
      <div style={{ minWidth: '190px', maxWidth: '230px', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '5px', color: '#0f172a' }}>{b.name}</div>
        <div style={{ display: 'inline-block', padding: '2px 9px', borderRadius: '100px', background: color + '22', color, fontSize: '11px', fontWeight: '700', marginBottom: '7px' }}>
          {b.category}
        </div>
        {b.address && <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>📍 {b.address}</div>}
        {b.phone && <a href={`tel:${b.phone}`} style={{ fontSize: '11px', color: '#4f8ef7', marginTop: '2px', display: 'block', fontWeight: '600' }}>📞 {b.phone}</a>}
        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>⭐ {b.rating} · {b.reviewCount} reviews</div>
        <div style={{ marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
          <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}>📸 Street View</div>
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

// ── Heatmap Legend (rendered outside map) ──
function HeatmapLegend() {
  const steps = [
    { label: 'Open', color: '#10b981' },
    { label: 'Low', color: '#34d399' },
    { label: 'Moderate', color: '#f59e0b' },
    { label: 'High', color: '#f97316' },
    { label: 'Saturated', color: '#ef4444' },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: '32px', left: '16px', zIndex: 1000,
      background: 'rgba(13,17,23,0.92)', backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px',
      padding: '12px 16px', minWidth: '160px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      <div style={{ fontSize: '10px', fontWeight: '800', color: '#7a8499', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
        Viability Heatmap
      </div>
      {steps.map(s => (
        <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: s.color, flexShrink: 0 }} />
          <span style={{ fontSize: '12px', color: '#c8cfe0', fontWeight: '500' }}>{s.label}</span>
        </div>
      ))}
      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '10px', color: '#4e5870', lineHeight: '1.5' }}>
        Green = opportunity<br />Red = saturated market
      </div>
    </div>
  );
}

export default function MapView({ center, businesses, properties, categoryColors, radiusKm }) {
  const [heatmapOn, setHeatmapOn] = useState(false);
  const [heatmapKey, setHeatmapKey] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [mapStyle, setMapStyle] = useState('dark');

  const categories = ['All', ...Array.from(new Set(businesses.map(b => b.category).filter(Boolean))).sort()];

  const tileLayers = {
    dark: {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://carto.com">CARTO</a>',
    },
    light: {
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://carto.com">CARTO</a>',
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; <a href="https://www.esri.com">Esri</a>',
    },
  };

  const toggleHeatmap = () => {
    setHeatmapOn(v => !v);
    setHeatmapKey(k => k + 1);
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* ── Control Bar ── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center',
        marginBottom: '14px', padding: '14px 18px',
        background: 'rgba(13,17,23,0.85)', backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px',
      }}>
        {/* Heatmap toggle */}
        <button
          onClick={toggleHeatmap}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer',
            fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: '700',
            background: heatmapOn
              ? 'linear-gradient(135deg, #10b981, #059669)'
              : 'rgba(255,255,255,0.06)',
            color: heatmapOn ? '#ffffff' : '#7a8499',
            boxShadow: heatmapOn ? '0 4px 16px rgba(16,185,129,0.35)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          <span style={{ fontSize: '16px' }}>🌡️</span>
          {heatmapOn ? 'Heatmap ON' : 'Viability Heatmap'}
        </button>

        {/* Category filter (only when heatmap is on) */}
        {heatmapOn && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#4e5870', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Filter:</span>
            {categories.slice(0, 8).map(cat => (
              <button key={cat} onClick={() => { setSelectedCategory(cat); setHeatmapKey(k => k + 1); }}
                style={{
                  padding: '5px 12px', borderRadius: '100px', border: 'none', cursor: 'pointer',
                  fontSize: '11px', fontWeight: '600', fontFamily: 'Inter, sans-serif',
                  background: selectedCategory === cat ? 'linear-gradient(135deg,#4f8ef7,#2563eb)' : 'rgba(255,255,255,0.06)',
                  color: selectedCategory === cat ? '#ffffff' : '#7a8499',
                  transition: 'all 0.15s',
                }}>
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Map style switcher */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
          {['dark', 'light', 'satellite'].map(style => (
            <button key={style} onClick={() => setMapStyle(style)}
              style={{
                padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontSize: '11px', fontWeight: '600', fontFamily: 'Inter, sans-serif',
                background: mapStyle === style ? 'rgba(79,142,247,0.2)' : 'rgba(255,255,255,0.04)',
                color: mapStyle === style ? '#4f8ef7' : '#4e5870',
                transition: 'all 0.15s', textTransform: 'capitalize',
              }}>
              {style === 'dark' ? '🌙' : style === 'light' ? '☀️' : '🛰️'} {style}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
        {[
          { icon: '🏪', value: businesses.length, label: 'Businesses', color: '#4f8ef7' },
          { icon: '🏢', value: properties.length, label: 'Properties', color: '#f59e0b' },
          { icon: '📍', value: `${radiusKm}km`, label: 'Radius', color: '#10b981' },
          { icon: '📂', value: categories.length - 1, label: 'Categories', color: '#8b5cf6' },
        ].map(s => (
          <div key={s.label} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 14px', borderRadius: '10px',
            background: 'rgba(13,17,23,0.7)', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <span style={{ fontSize: '14px' }}>{s.icon}</span>
            <span style={{ fontSize: '15px', fontWeight: '800', color: s.color }}>{s.value}</span>
            <span style={{ fontSize: '11px', color: '#4e5870', fontWeight: '500' }}>{s.label}</span>
          </div>
        ))}
        {heatmapOn && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 14px', borderRadius: '10px',
            background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
          }}>
            <span style={{ fontSize: '14px' }}>🌡️</span>
            <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '700' }}>
              Heatmap active{selectedCategory !== 'All' ? ` · ${selectedCategory}` : ''}
            </span>
          </div>
        )}
      </div>

      {/* ── Map ── */}
      <div style={{ position: 'relative', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={14}
          style={{ height: '78vh', width: '100%' }}
          scrollWheelZoom={true}
          zoomControl={false}
        >
          <TileLayer
            key={mapStyle}
            attribution={tileLayers[mapStyle].attribution}
            url={tileLayers[mapStyle].url}
          />
          <Recenter center={center} />

          {/* Viability Heatmap overlay */}
          <ViabilityHeatmap
            key={heatmapKey}
            businesses={businesses}
            visible={heatmapOn}
            selectedCategory={selectedCategory}
          />

          {/* Analysis radius circle */}
          <Circle
            center={[center.lat, center.lng]}
            radius={radiusKm * 1000}
            pathOptions={{
              color: '#4f8ef7',
              fillColor: '#4f8ef7',
              fillOpacity: 0.04,
              weight: 1.5,
              dashArray: '8 4',
            }}
          />

          {/* Center marker */}
          <Marker position={[center.lat, center.lng]} icon={userIcon}>
            <Popup>
              <div style={{ fontFamily: 'Inter, sans-serif' }}>
                <div style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a' }}>📍 Analysis Center</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
                </div>
              </div>
            </Popup>
          </Marker>

          {/* Business markers */}
          {businesses.map((b, i) => {
            if (!b.latitude || !b.longitude) return null;
            const color = categoryColors[b.category?.toLowerCase()] || categoryColors[b.category] || '#64748b';
            return (
              <Marker key={`b-${i}`} position={[b.latitude, b.longitude]} icon={makeIcon(color)}>
                <BusinessPopup b={b} color={color} />
              </Marker>
            );
          })}

          {/* Property markers */}
          {properties.map((p, i) => {
            if (!p.latitude || !p.longitude) return null;
            return (
              <Marker key={`p-${i}`} position={[p.latitude, p.longitude]} icon={propertyIcon}>
                <Popup>
                  <div style={{ minWidth: '170px', fontFamily: 'Inter, sans-serif' }}>
                    <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '5px', color: '#0f172a' }}>🏪 {p.address}</div>
                    <div style={{ fontSize: '12px', color: p.type === 'rent' ? '#3b82f6' : '#10b981', fontWeight: '700' }}>
                      {p.type === 'rent' ? '🔑 FOR RENT' : '🏷️ FOR SALE'}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                      ₹{p.price?.toLocaleString('en-IN')}{p.type === 'rent' ? '/mo' : ''}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                      📐 {p.size} sqft · 👥 {p.footTraffic}% traffic
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>* Estimated price</div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Heatmap legend overlay */}
        {heatmapOn && <HeatmapLegend />}
      </div>
    </div>
  );
}
