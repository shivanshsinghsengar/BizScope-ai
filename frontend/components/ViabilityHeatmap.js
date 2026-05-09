/**
 * Business Viability Heatmap
 * Overlays a scored grid on the Leaflet map.
 * Green = low competition (opportunity), Red = high competition (saturated).
 * Uses react-leaflet's useMap hook — must be rendered inside <MapContainer>.
 */
import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

// Grid resolution: number of cells per axis
const GRID = 12;

/**
 * Build a GRID×GRID score matrix from business positions.
 * Score 0–1: 0 = no businesses (green), 1 = max density (red).
 */
function buildScoreMatrix(businesses, bounds) {
  const matrix = Array.from({ length: GRID }, () => new Array(GRID).fill(0));
  if (!businesses.length) return matrix;

  const latMin = bounds.getSouth();
  const latMax = bounds.getNorth();
  const lngMin = bounds.getWest();
  const lngMax = bounds.getEast();
  const latSpan = latMax - latMin;
  const lngSpan = lngMax - lngMin;

  businesses.forEach(b => {
    if (!b.latitude || !b.longitude) return;
    const row = Math.min(GRID - 1, Math.floor(((b.latitude - latMin) / latSpan) * GRID));
    const col = Math.min(GRID - 1, Math.floor(((b.longitude - lngMin) / lngSpan) * GRID));
    if (row >= 0 && col >= 0) matrix[row][col]++;
  });

  // Normalize 0–1
  const max = Math.max(...matrix.flat(), 1);
  return matrix.map(row => row.map(v => v / max));
}

/**
 * Score → RGBA color
 * 0.0 = deep green (opportunity)
 * 0.5 = amber (moderate)
 * 1.0 = deep red (saturated)
 */
function scoreToColor(score, alpha = 0.38) {
  // Green → Yellow → Red
  let r, g, b;
  if (score < 0.5) {
    const t = score * 2;
    r = Math.round(16 + t * (245 - 16));
    g = Math.round(185 + t * (158 - 185));
    b = Math.round(129 + t * (11 - 129));
  } else {
    const t = (score - 0.5) * 2;
    r = Math.round(245 + t * (239 - 245));
    g = Math.round(158 + t * (68 - 158));
    b = Math.round(11 + t * (68 - 11));
  }
  return `rgba(${r},${g},${b},${alpha})`;
}

function scoreToLabel(score) {
  if (score < 0.2) return { text: 'Open', color: '#10b981' };
  if (score < 0.45) return { text: 'Low', color: '#34d399' };
  if (score < 0.65) return { text: 'Moderate', color: '#f59e0b' };
  if (score < 0.85) return { text: 'High', color: '#f97316' };
  return { text: 'Saturated', color: '#ef4444' };
}

export default function ViabilityHeatmap({ businesses, visible, selectedCategory }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!visible) {
      if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null; }
      return;
    }

    // Filter by category if selected
    const filtered = selectedCategory && selectedCategory !== 'All'
      ? businesses.filter(b => b.category?.toLowerCase() === selectedCategory.toLowerCase())
      : businesses;

    const bounds = map.getBounds();
    const matrix = buildScoreMatrix(filtered, bounds);

    const latMin = bounds.getSouth();
    const latMax = bounds.getNorth();
    const lngMin = bounds.getWest();
    const lngMax = bounds.getEast();
    const latStep = (latMax - latMin) / GRID;
    const lngStep = (lngMax - lngMin) / GRID;

    // Remove old layer
    if (layerRef.current) { map.removeLayer(layerRef.current); }

    const group = L.layerGroup();

    for (let row = 0; row < GRID; row++) {
      for (let col = 0; col < GRID; col++) {
        const score = matrix[row][col];
        const swLat = latMin + row * latStep;
        const swLng = lngMin + col * lngStep;
        const neLat = swLat + latStep;
        const neLng = swLng + lngStep;

        const rect = L.rectangle(
          [[swLat, swLng], [neLat, neLng]],
          {
            color: 'transparent',
            fillColor: scoreToColor(score, score < 0.05 ? 0 : 0.38),
            fillOpacity: 1,
            weight: 0,
            interactive: true,
          }
        );

        const label = scoreToLabel(score);
        const bizCount = Math.round(score * filtered.length / (GRID * GRID / 4));

        rect.bindTooltip(
          `<div style="font-family:Inter,sans-serif;font-size:12px;padding:4px 2px">
            <strong style="color:${label.color}">${label.text} Competition</strong><br/>
            <span style="color:#94a3b8">~${bizCount} businesses in zone</span><br/>
            <span style="color:#64748b;font-size:10px">Score: ${(score * 100).toFixed(0)}%</span>
          </div>`,
          { sticky: true, opacity: 0.97 }
        );

        group.addLayer(rect);
      }
    }

    group.addTo(map);
    layerRef.current = group;

    // Redraw on map move/zoom
    const redraw = () => {
      if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null; }
      // Re-trigger by toggling — handled by parent re-render
    };
    map.once('moveend', redraw);
    map.once('zoomend', redraw);

    return () => {
      if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null; }
    };
  }, [map, businesses, visible, selectedCategory]);

  return null;
}
