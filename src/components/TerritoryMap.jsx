import { PLAYERS } from "../data/constants.js";
import { totalArmy } from "../utils/math.js";

const SHAPES = {
  west_europe:  "0,14 20,14 20,52 0,52",
  east_europe:  "20,14 36,14 36,52 20,52",
  persia:       "36,26 54,26 54,48 36,48",
  arabia:       "20,48 42,48 42,68 20,68",
  india:        "42,48 60,48 60,68 42,68",
  tibet:        "54,26 66,26 66,48 54,48",
  mongol:       "36,14 70,14 70,26 36,26",
  north_china:  "66,26 80,26 80,48 66,48",
  south_china:  "60,48 80,48 80,68 60,68",
  manchu:       "70,14 86,14 86,26 70,26",
  korea:        "80,26 90,26 90,44 80,44",
  japan:        "90,22 99,22 99,46 90,46",
};

const OWNER_FILL = { player: "#1d4ed8", ai1: "#b91c1c", ai2: "#15803d" };
const FILL_NEUTRAL = "#57534e";
const SEA_ROUTES = new Set(["korea-japan", "japan-korea"]);

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
  const centers = Object.fromEntries(
    Object.entries(SHAPES).map(([id, pts]) => [id, polyCenter(pts)])
  );

  return (
    <svg viewBox="0 0 100 70" className="w-full" style={{ background: "#0c1a2e" }}>
      {/* Ocean/sea background hint */}
      <rect x="0" y="0" width="100" height="70" fill="#0c1a2e" />

      {/* Connection lines — drawn behind polygons */}
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
                strokeWidth="0.35"
                strokeDasharray={isSea ? "1 1" : undefined}
                opacity="0.5"
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
        const fontSize = Math.min(2.4, dims.h * 0.2, dims.w * 0.13);
        const visible = t.owner === "player" || scouted[t.id];

        return (
          <g key={t.id} onClick={() => setSel(t.id)} style={{ cursor: "pointer" }}>
            <polygon
              points={pts}
              fill={fill}
              opacity={isSelected ? 1 : 0.82}
              stroke={isSelected ? "#ffffff" : "#0f172a"}
              strokeWidth={isSelected ? "0.7" : "0.25"}
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
