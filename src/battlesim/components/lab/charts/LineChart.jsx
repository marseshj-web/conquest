import { THEME_COLORS as c } from '../../../constants.js';

export default function LineChart({ data, xKey, lines, width = 560, height = 200, xLabel = '', yLabel = '%' }) {
  if (!data || data.length < 2) return null;

  const pad = { top: 20, right: 20, bottom: 36, left: 44 };
  const iw = width - pad.left - pad.right;
  const ih = height - pad.top - pad.bottom;

  const xs = data.map(d => d[xKey]);
  const xMin = xs[0], xMax = xs[xs.length - 1];

  const toX = v => pad.left + (xMax === xMin ? 0.5 : (v - xMin) / (xMax - xMin)) * iw;
  const toY = v => pad.top + (1 - Math.max(0, Math.min(1, v / 100))) * ih;

  const yTicks = [0, 25, 50, 75, 100];
  const xStep = Math.max(1, Math.ceil(xs.length / 10));

  return (
    <svg width={width} height={height} style={{ overflow: 'visible', display: 'block' }}>
      {/* Grid lines */}
      {yTicks.map(t => (
        <line key={t} x1={pad.left} x2={pad.left + iw} y1={toY(t)} y2={toY(t)}
          stroke={c.bd} strokeWidth={1} strokeDasharray="3,3" />
      ))}

      {/* 50% reference line */}
      <line x1={pad.left} x2={pad.left + iw} y1={toY(50)} y2={toY(50)}
        stroke={c.dm} strokeWidth={1} />

      {/* Lines and confidence bands */}
      {lines.map(line => {
        const pts = data.map(d => [toX(d[xKey]), toY(d[line.key])]);
        const pointsStr = pts.map(p => p.join(',')).join(' ');

        let band = null;
        if (line.stdDevKey) {
          const upper = data.map(d => [toX(d[xKey]), toY(Math.min(100, d[line.key] + d[line.stdDevKey] * 2))]);
          const lower = data.map(d => [toX(d[xKey]), toY(Math.max(0, d[line.key] - d[line.stdDevKey] * 2))]);
          const bandPts = [...upper, ...[...lower].reverse()].map(p => p.join(',')).join(' ');
          band = <polygon key={`band-${line.key}`} points={bandPts} fill={line.color} fillOpacity={0.12} />;
        }

        return (
          <g key={line.key}>
            {band}
            <polyline points={pointsStr} fill="none" stroke={line.color} strokeWidth={2} />
            {pts.map(([px, py], i) => (
              <circle key={i} cx={px} cy={py} r={3} fill={line.color} />
            ))}
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

      {/* X ticks */}
      {xs.filter((_, i) => i % xStep === 0).map(x => (
        <text key={x} x={toX(x)} y={pad.top + ih + 14} textAnchor="middle" fill={c.dm} fontSize={9}>{x}</text>
      ))}

      {/* Axis labels */}
      <text x={pad.left + iw / 2} y={height - 2} textAnchor="middle" fill={c.dm} fontSize={9}>{xLabel}</text>
      <text x={8} y={pad.top + ih / 2} textAnchor="middle" fill={c.dm} fontSize={9}
        transform={`rotate(-90, 8, ${pad.top + ih / 2})`}>{yLabel}</text>

      {/* Legend */}
      {lines.map((line, i) => (
        <g key={`leg-${line.key}`} transform={`translate(${pad.left + iw - 80}, ${pad.top + i * 14})`}>
          <line x1={0} y1={6} x2={14} y2={6} stroke={line.color} strokeWidth={2} />
          <circle cx={7} cy={6} r={3} fill={line.color} />
          <text x={18} y={10} fill={c.dm} fontSize={9}>{line.label}</text>
        </g>
      ))}
    </svg>
  );
}
