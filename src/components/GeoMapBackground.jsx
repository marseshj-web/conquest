import { useState, useEffect } from 'react';
import { feature } from 'topojson-client';
import landData from 'world-atlas/land-50m.json';

// Geographic bounds matching the game's 12-territory region
const LON_MIN = -20, LON_MAX = 150;
const LAT_MAX = 65,  LAT_MIN = 0;

export const MAP_W = 170; // viewBox width  (= longitude span)
export const MAP_H = 65;  // viewBox height (= latitude span)

const RENDER_SCALE = 10; // canvas pixels per viewBox unit

function buildMapDataUrl() {
  const W = MAP_W * RENDER_SCALE;
  const H = MAP_H * RENDER_SCALE;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  if (!ctx) return null;

  const toX = lon => (lon - LON_MIN) / (LON_MAX - LON_MIN) * W;
  const toY = lat => (LAT_MAX - lat) / (LAT_MAX - LAT_MIN) * H;

  function traceLand(features) {
    ctx.beginPath();
    for (const f of features) {
      const { type, coordinates } = f.geometry;
      const polys = type === 'MultiPolygon' ? coordinates : [coordinates];
      for (const poly of polys) {
        for (const ring of poly) {
          ring.forEach(([lon, lat], i) => {
            i === 0
              ? ctx.moveTo(toX(lon), toY(lat))
              : ctx.lineTo(toX(lon), toY(lat));
          });
          ctx.closePath();
        }
      }
    }
  }

  // Ocean background
  ctx.fillStyle = '#091624';
  ctx.fillRect(0, 0, W, H);

  // Land fill
  const { features } = feature(landData, landData.objects.land);
  traceLand(features);
  ctx.fillStyle = '#1a2e18';
  ctx.fill('evenodd');

  // Subtle coast / border shading
  traceLand(features);
  ctx.strokeStyle = '#253d22';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Slight vignette at top/bottom edges (open ocean feel)
  const vignette = ctx.createLinearGradient(0, 0, 0, H);
  vignette.addColorStop(0,   'rgba(0,0,0,0.35)');
  vignette.addColorStop(0.1, 'rgba(0,0,0,0)');
  vignette.addColorStop(0.9, 'rgba(0,0,0,0)');
  vignette.addColorStop(1,   'rgba(0,0,0,0.35)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  return cv.toDataURL('image/png');
}

// Rendered once, cached for the lifetime of the page
let _cachedUrl = null;

export function useGeoMap() {
  const [url, setUrl] = useState(_cachedUrl);

  useEffect(() => {
    if (_cachedUrl) { setUrl(_cachedUrl); return; }
    // Defer to next tick so the component mounts first
    const id = requestAnimationFrame(() => {
      _cachedUrl = buildMapDataUrl();
      setUrl(_cachedUrl);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return url;
}
