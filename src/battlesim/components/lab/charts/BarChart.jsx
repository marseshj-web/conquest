import { THEME_COLORS as c } from '../../../constants.js';

export default function BarChart({ data, nameKey, valueKey, width = 420, height = 180 }) {
  if (!data || data.length === 0) return null;

  const pad = { top: 16, right: 16, bottom: 36, left: 44 };
  const iw = width - pad.left - pad.right;
  const ih = height - pad.top - pad.bottom;
  const gap = iw / data.length;
  const barW = gap * 0.65;

  const toY = v => pad.top + (1 - Math.max(0, Math.min(1, v / 100))) * ih;
  const yTicks = [0, 25, 50, 75, 100];

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {/* Grid lines */}
      {yTicks.map(t => (
        <line key={t} x1={pad.left} x2={pad.left + iw} y1={toY(t)} y2={toY(t)}
          stroke={c.bd} strokeWidth={1} strokeDasharray="3,3" />
      ))}

      {/* 50% reference */}
      <line x1={pad.left} x2={pad.left + iw} y1={toY(50)} y2={toY(50)}
        stroke={c.dm} strokeWidth={1} />

      {/* Bars */}
      {data.map((d, i) => {
        const v = d[valueKey];
        const x = pad.left + i * gap + (gap - barW) / 2;
        const y = toY(v);
        const bh = toY(0) - y;
        const fill = v >= 50 ? c.gn : c.rd;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={bh} fill={fill} opacity={0.8} rx={2} />
            <text x={x + barW / 2} y={y - 3} textAnchor="middle" fill={c.tx} fontSize={9} fontWeight="bold">
              {v.toFixed(0)}%
            </text>
            <text x={x + barW / 2} y={pad.top + ih + 14} textAnchor="middle" fill={c.dm} fontSize={9}>
              {d[nameKey]}
            </text>
          </g>
        );
      })}

      {/* Axes */}
      <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + ih} stroke={c.dm} />
      <line x1={pad.left} y1={pad.top + ih} x2={pad.left + iw} y2={pad.top + ih} stroke={c.dm} />

      {/* Y ticks */}
      {yTicks.map(t => (
        <text key={t} x={pad.left - 4} y={toY(t) + 4} textAnchor="end" fill={c.dm} fontSize={9}>{t}</text>
      ))}
    </svg>
  );
}
