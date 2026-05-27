import { THEME_COLORS as c } from '../../../constants.js';

function cellColor(rate) {
  if (rate === null) return c.pn;
  const r = Math.round(30 + 160 * (1 - rate / 100));
  const g = Math.round(50 + 140 * (rate / 100));
  return `rgb(${r}, ${g}, 40)`;
}

const td = {
  padding: '4px 8px',
  textAlign: 'center',
  fontSize: 10,
  border: `1px solid #1e1e1e`,
  minWidth: 48,
};

export default function HeatmapTable({ slots, matrix }) {
  if (!slots || !matrix) return null;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', fontSize: 10 }}>
        <thead>
          <tr>
            <th style={{ ...td, background: c.pn, color: c.dm, fontSize: 8, minWidth: 64 }}>내↓ / 상대→</th>
            {slots.map((s, j) => (
              <th key={j} style={{ ...td, background: c.pn, color: c.gl }}>{s.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((rowSlot, i) => (
            <tr key={i}>
              <td style={{ ...td, background: c.pn, color: c.gl, fontWeight: 'bold', textAlign: 'left' }}>
                {rowSlot.name}
              </td>
              {slots.map((_, j) => {
                if (i === j) return (
                  <td key={j} style={{ ...td, background: c.pn, color: c.dm }}>—</td>
                );
                const v = matrix[i][j];
                return (
                  <td key={j} style={{ ...td, background: cellColor(v), color: '#fff', fontWeight: 'bold' }}>
                    {v !== null ? `${v.toFixed(0)}%` : '…'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
