import { useGeoMap, MAP_W, MAP_H } from './GeoMapBackground.jsx';
import { PLAYERS } from "../data/constants.js";
import { totalArmy } from "../utils/math.js";

// Territory polygons repositioned to geographic coordinates.
// viewBox is MAP_W × MAP_H = 170 × 65, where:
//   x = longitude + 20   (lon -20° → x=0, lon 150° → x=170)
//   y = 65 - latitude    (lat 65°N → y=0, lat 0°N → y=65)
const SHAPES = {
  west_europe:  "0,9 38,9 38,38 0,38",
  east_europe:  "38,8 65,8 65,37 38,37",
  persia:       "65,24 88,24 88,44 65,44",
  arabia:       "47,44 77,44 77,65 47,65",
  india:        "77,43 98,43 98,65 77,65",
  tibet:        "88,24 122,24 122,43 88,43",
  mongol:       "102,7 134,7 134,23 102,23",
  north_china:  "122,25 144,25 144,42 122,42",
  south_china:  "100,42 144,42 144,60 100,60",
  manchu:       "134,7 152,7 152,23 134,23",
  korea:        "144,23 157,23 157,41 144,41",
  japan:        "157,20 170,20 170,47 157,47",
};

const OWNER_FILL = {
  player:         "#1d4ed8",
  ai_mongol:      "#b91c1c",
  ai_manchu:      "#c2410c",
  ai_north_china: "#a16207",
  ai_india:       "#15803d",
  ai_persia:      "#0f766e",
  ai_arabia:      "#7e22ce",
};
const FILL_NEUTRAL = "#44403c";

const SEA_ROUTES = new Set([
  "korea-japan",       "japan-korea",
  "north_china-japan", "japan-north_china",
  "south_china-japan", "japan-south_china",
  "arabia-west_europe","west_europe-arabia",
]);

function polyCenter(pts) {
  const coords = pts.trim().split(" ").map(p => p.split(",").map(Number));
  return {
    x: coords.reduce((s, [x]) => s + x, 0) / coords.length,
    y: coords.reduce((s, [, y]) => s + y, 0) / coords.length,
  };
}

function polyDims(pts) {
  const coords = pts.trim().split(" ").map(p => p.split(",").map(Number));
  const xs = coords.map(([x]) => x), ys = coords.map(([, y]) => y);
  return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

export default function TerritoryMap({ terrs, sel, setSel, scouted }) {
  const mapUrl = useGeoMap();

  const centers = Object.fromEntries(
    Object.entries(SHAPES).map(([id, pts]) => [id, polyCenter(pts)])
  );

  return (
    <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="w-full"
         style={{ background: "#091624", display: "block" }}>

      {/* Geographic world map background */}
      {mapUrl && (
        <image href={mapUrl} x="0" y="0" width={MAP_W} height={MAP_H}
               preserveAspectRatio="none" />
      )}

      {/* Connection lines — behind polygons */}
      {terrs.map(t =>
        t.conn
          .filter(cid => t.id < cid)
          .map(cid => {
            const a = centers[t.id], b = centers[cid];
            if (!a || !b) return null;
            const key = `${t.id}-${cid}`;
            const isSea = SEA_ROUTES.has(key) || SEA_ROUTES.has(`${cid}-${t.id}`);
            return (
              <line key={key}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke="#94a3b8"
                strokeWidth="0.5"
                strokeDasharray={isSea ? "1.5 1.5" : undefined}
                opacity="0.55"
              />
            );
          })
      )}

      {/* Territory polygons */}
      {terrs.map(t => {
        const pts = SHAPES[t.id];
        if (!pts) return null;
        const fill = OWNER_FILL[t.owner] ?? FILL_NEUTRAL;
        const isSelected = sel === t.id;
        const center = centers[t.id];
        const dims = polyDims(pts);
        const fontSize = Math.min(4.5, dims.h * 0.22, dims.w * 0.15);
        const visible = t.owner === "player" || scouted[t.id];

        return (
          <g key={t.id} onClick={() => setSel(t.id)} style={{ cursor: "pointer" }}>
            <polygon
              points={pts}
              fill={fill}
              fillOpacity={isSelected ? 0.75 : 0.55}
              stroke={isSelected ? "#ffffff" : "#0f172a"}
              strokeWidth={isSelected ? "1.0" : "0.3"}
            />
            {/* Territory name */}
            <text
              x={center.x} y={center.y - 1}
              textAnchor="middle"
              fill="#f1f5f9"
              fontSize={fontSize}
              fontWeight="600"
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              {t.name}
            </text>
            {/* Army count */}
            <text
              x={center.x} y={center.y + fontSize + 0.5}
              textAnchor="middle"
              fill={isSelected ? "#fde68a" : "#fbbf24"}
              fontSize={fontSize * 0.85}
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              {visible ? totalArmy(t.army) : "?"}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
