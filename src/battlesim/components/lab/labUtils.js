import { UNIT_TYPES } from '../../constants.js';

export function armySummary(army, compact = false) {
  const sm = {};
  army.forEach(t => { sm[t] = (sm[t] || 0) + 1; });
  if (compact) {
    return Object.entries(sm).map(([t, n]) => `${UNIT_TYPES[t].icon}×${n}`).join(' ');
  }
  return Object.entries(sm)
    .map(([t, n]) => `${UNIT_TYPES[t].name} ×${n}`)
    .join(' · ');
}

export function sweepResultsToCSV(results, unitType) {
  const header = 'squad_count,win_rate,loss_rate,draw_rate,timeout_rate,avg_duration_sec,avg_survivors';
  const rows = results.map(r =>
    [r.squadCount, r.aWinRate.toFixed(1), r.bWinRate.toFixed(1), r.drawRate.toFixed(1),
      r.timeoutRate.toFixed(1), r.avgDuration.toFixed(1), r.aAvgSurv].join(',')
  );
  return [header, ...rows].join('\n');
}

export function tournamentMatrixToCSV(slots, matrix) {
  const header = ['', ...slots.map(s => s.name)].join(',');
  const rows = slots.map((s, i) =>
    [s.name, ...matrix[i].map(v => v === null ? '-' : v.toFixed(1) + '%')].join(',')
  );
  return [header, ...rows].join('\n');
}

export function terrainResultsToCSV(results) {
  const header = 'map,win_rate,loss_rate,draw_rate,timeout_rate,avg_duration_sec,avg_survivors';
  const rows = results.map(r =>
    [r.mapName, r.aWinRate.toFixed(1), r.bWinRate.toFixed(1), r.drawRate.toFixed(1),
      r.timeoutRate.toFixed(1), r.avgDuration.toFixed(1), r.aAvgSurv].join(',')
  );
  return [header, ...rows].join('\n');
}

export function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => fallback(text));
  } else {
    fallback(text);
  }
}

function fallback(text) {
  const el = document.createElement('textarea');
  el.value = text;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}
