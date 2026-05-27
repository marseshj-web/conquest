import { useState, useRef, useMemo, useEffect } from 'react';
import { MAPS, THEME_COLORS as c } from '../../constants.js';
import { getAIPatterns } from '../../engine.js';
import { runTerrainStudy } from '../../simulatorCore.js';
import BarChart from './charts/BarChart.jsx';
import { terrainResultsToCSV, copyToClipboard } from './labUtils.js';

const MAP_LIST = Object.values(MAPS);

export default function TerrainStudy({ army, formula }) {
  const patterns = useMemo(() => getAIPatterns(), []);

  const [opponentType, setOpponentType] = useState('pattern');
  const [patternIdx, setPatternIdx] = useState(0);
  const [iters, setIters] = useState(10);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState([]);
  const [copied, setCopied] = useState(false);
  const ctrlRef = useRef(null);
  const copyTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(copyTimerRef.current), []);

  const opponentArmy = opponentType === 'pattern' ? patterns[patternIdx].army : army;

  const handleRun = () => {
    if (!army.length) return;
    setIsRunning(true);
    setResults([]);
    setProgress({ done: 0, total: MAP_LIST.length });

    const ctrl = runTerrainStudy(
      army, opponentArmy, MAP_LIST, iters, formula,
      (done, total, partial) => {
        setProgress({ done, total });
        setResults(partial);
        if (done >= total) setIsRunning(false);
      }
    );
    ctrlRef.current = ctrl;
    ctrl.start();
  };

  const handleCancel = () => { ctrlRef.current?.cancel(); setIsRunning(false); };

  const handleCopy = () => {
    copyToClipboard(terrainResultsToCSV(results));
    setCopied(true);
    clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  const best = results.length > 0
    ? results.reduce((b, r) => r.aWinRate > b.aWinRate ? r : b, results[0])
    : null;
  const worst = results.length > 0
    ? results.reduce((b, r) => r.aWinRate < b.aWinRate ? r : b, results[0])
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* Config */}
      <div style={{ background: c.pn, border: `1px solid ${c.bd}`, borderRadius: 4, padding: '8px 10px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 9, color: c.dm, marginBottom: 4 }}>상대 편성</div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
            {[['pattern', 'AI 패턴'], ['current', '현재 내 편성']].map(([t, lbl]) => (
              <button key={t} onClick={() => setOpponentType(t)} style={{
                padding: '2px 7px', fontSize: 9, cursor: 'pointer',
                border: `1px solid ${opponentType === t ? c.gn : c.bd}`, borderRadius: 3,
                background: opponentType === t ? `${c.gn}15` : 'transparent',
                color: opponentType === t ? c.gn : c.dm,
              }}>{lbl}</button>
            ))}
          </div>
          {opponentType === 'pattern' && (
            <select value={patternIdx} onChange={e => setPatternIdx(+e.target.value)} style={{
              background: c.bg, color: c.tx, border: `1px solid ${c.bd}`, borderRadius: 3,
              padding: '2px 5px', fontSize: 9, width: '100%',
            }}>
              {patterns.map((p, i) => <option key={i} value={i}>{p.name}</option>)}
            </select>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 9, color: c.dm }}>반복:</span>
          <input type="range" min={5} max={50} step={5} value={iters}
            onChange={e => setIters(+e.target.value)}
            style={{ width: 90, accentColor: c.gn }} />
          <span style={{ color: c.tx, fontSize: 11 }}>{iters}회</span>
        </div>
      </div>

      {/* Run + Progress */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {!isRunning ? (
          <button onClick={handleRun} disabled={!army.length} style={{
            padding: '7px 18px', fontSize: 12, fontWeight: 700,
            cursor: army.length ? 'pointer' : 'default',
            border: `1px solid ${army.length ? c.gn : c.bd}`, borderRadius: 4,
            background: army.length ? `${c.gn}12` : 'transparent',
            color: army.length ? c.gn : c.dm,
          }}>
            4가지 지형 비교 (각 {iters}회)
          </button>
        ) : (
          <button onClick={handleCancel} style={{
            padding: '7px 14px', fontSize: 11, cursor: 'pointer',
            border: `1px solid ${c.rd}`, borderRadius: 4,
            background: `${c.rd}15`, color: c.rd,
          }}>취소</button>
        )}
        {isRunning && (
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: c.dm, marginBottom: 2 }}>
              {progress.done} / {progress.total} 지형
            </div>
            <div style={{ height: 4, background: c.bd, borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
                height: '100%', background: c.gn, borderRadius: 2, transition: 'width 0.1s'
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Chart + result */}
      {results.length > 0 && (
        <div style={{ background: c.pn, border: `1px solid ${c.bd}`, borderRadius: 4, padding: '8px 10px' }}>
          <div style={{ fontSize: 10, color: c.gn, fontWeight: 700, marginBottom: 6 }}>지형별 내 승률</div>
          <BarChart data={results} nameKey="mapName" valueKey="aWinRate" width={420} height={180} />

          {best && worst && best.mapId !== worst.mapId && (
            <div style={{ marginTop: 4, fontSize: 9 }}>
              <span style={{ color: c.gn }}>최적 지형: {best.mapName} ({best.aWinRate.toFixed(1)}%)</span>
              <span style={{ color: c.dm }}> · </span>
              <span style={{ color: c.rd }}>최악 지형: {worst.mapName} ({worst.aWinRate.toFixed(1)}%)</span>
            </div>
          )}

          {/* Stats table */}
          <div style={{ marginTop: 8, overflowX: 'auto' }}>
            <table style={{ fontSize: 8, borderCollapse: 'collapse', color: c.tx, width: '100%' }}>
              <thead>
                <tr style={{ color: c.dm }}>
                  <th style={{ padding: '2px 6px', textAlign: 'left' }}>지형</th>
                  <th style={{ padding: '2px 6px' }}>내 승률</th>
                  <th style={{ padding: '2px 6px' }}>상대 승률</th>
                  <th style={{ padding: '2px 6px' }}>무승부</th>
                  <th style={{ padding: '2px 6px' }}>평균 전투</th>
                  <th style={{ padding: '2px 6px' }}>생존</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i}>
                    <td style={{ padding: '2px 6px', color: c.gl }}>{r.mapName}</td>
                    <td style={{ padding: '2px 6px', textAlign: 'center', fontWeight: 'bold',
                      color: r.aWinRate > 50 ? c.gn : c.rd }}>
                      {r.aWinRate.toFixed(0)}%
                    </td>
                    <td style={{ padding: '2px 6px', textAlign: 'center' }}>{r.bWinRate.toFixed(0)}%</td>
                    <td style={{ padding: '2px 6px', textAlign: 'center', color: c.dm }}>{r.drawRate.toFixed(0)}%</td>
                    <td style={{ padding: '2px 6px', textAlign: 'center', color: c.dm }}>{r.avgDuration.toFixed(0)}초</td>
                    <td style={{ padding: '2px 6px', textAlign: 'center' }}>{r.aAvgSurv}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button onClick={handleCopy} style={{
            marginTop: 6, padding: '3px 8px', fontSize: 9, cursor: 'pointer',
            border: `1px solid ${c.bd}`, borderRadius: 3,
            background: 'transparent', color: copied ? c.gn : c.dm,
          }}>{copied ? '✓ 복사됨' : 'CSV 복사'}</button>
        </div>
      )}
    </div>
  );
}
