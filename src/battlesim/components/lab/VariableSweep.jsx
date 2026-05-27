import { useState, useRef, useMemo, useEffect } from 'react';
import { UNIT_TYPES, MAX_GOLD, MAPS, THEME_COLORS as c } from '../../constants.js';
import { getAIPatterns } from '../../engine.js';
import { runVariableSweep } from '../../simulatorCore.js';
import LineChart from './charts/LineChart.jsx';
import { sweepResultsToCSV, copyToClipboard } from './labUtils.js';

const CHART_LINES = [
  { key: 'aWinRate', label: '내 승률', color: '#4a6a9a', stdDevKey: 'aStdDev' },
  { key: 'bWinRate', label: '상대 승률', color: '#a04040' },
];

export default function VariableSweep({ army, formula, mapId }) {
  const patterns = useMemo(() => getAIPatterns(), []);

  const [selectedUnit, setSelectedUnit] = useState('militia');
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

  const maxSquads = Math.floor(MAX_GOLD / UNIT_TYPES[selectedUnit].cost);
  const opponentArmy = opponentType === 'pattern' ? patterns[patternIdx].army : army;

  const handleRun = () => {
    setIsRunning(true);
    setResults([]);
    setProgress({ done: 0, total: maxSquads });

    const ctrl = runVariableSweep(
      selectedUnit, opponentArmy, iters, formula, MAPS[mapId] || null,
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
    copyToClipboard(sweepResultsToCSV(results, selectedUnit));
    setCopied(true);
    clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  const best = results.length > 0
    ? results.reduce((b, r) => r.aWinRate > b.aWinRate ? r : b, results[0])
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* Unit selector */}
      <div style={{ background: c.pn, border: `1px solid ${c.bd}`, borderRadius: 4, padding: '8px 10px' }}>
        <div style={{ fontSize: 9, color: c.dm, marginBottom: 5 }}>탐색할 유닛 (1분대 → 예산 소진까지 증가)</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {Object.values(UNIT_TYPES).map(u => (
            <button key={u.id} onClick={() => { setSelectedUnit(u.id); setResults([]); }} style={{
              padding: '3px 8px', fontSize: 10, cursor: 'pointer',
              border: `1px solid ${selectedUnit === u.id ? c.gl : c.bd}`, borderRadius: 3,
              background: selectedUnit === u.id ? `${c.gl}18` : 'transparent',
              color: selectedUnit === u.id ? c.gl : c.dm,
            }}>
              {u.icon} {u.name}
              <span style={{ color: c.dm, fontSize: 8, marginLeft: 3 }}>
                (최대 {Math.floor(MAX_GOLD / u.cost)}분대)
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Opponent + Iterations */}
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
          {opponentType === 'current' && army.length === 0 && (
            <div style={{ fontSize: 8, color: c.rd }}>현재 편성이 없습니다</div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 9, color: c.dm }}>반복:</span>
          <input type="range" min={5} max={50} step={5} value={iters}
            onChange={e => setIters(+e.target.value)}
            style={{ width: 90, accentColor: c.bl }} />
          <span style={{ color: c.tx, fontSize: 11, minWidth: 30 }}>{iters}회</span>
        </div>
      </div>

      {/* Run / Cancel + Progress */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {!isRunning ? (
          <button onClick={handleRun}
            disabled={opponentType === 'current' && army.length === 0}
            style={{
              padding: '7px 18px', fontSize: 12, fontWeight: 700,
              cursor: opponentType === 'current' && army.length === 0 ? 'default' : 'pointer',
              border: `1px solid ${c.bl}`, borderRadius: 4,
              background: `${c.bl}15`, color: c.bl,
            }}>
            실험 시작 (1→{maxSquads}분대, 각 {iters}회)
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
              {progress.done} / {progress.total} 포인트
            </div>
            <div style={{ height: 4, background: c.bd, borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
                height: '100%', background: c.bl, borderRadius: 2, transition: 'width 0.1s'
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Chart + table */}
      {results.length > 1 && (
        <div style={{ background: c.pn, border: `1px solid ${c.bd}`, borderRadius: 4, padding: '8px 10px' }}>
          <div style={{ fontSize: 10, color: c.bl, fontWeight: 700, marginBottom: 6 }}>
            {UNIT_TYPES[selectedUnit].name} 분대 수별 승률 변화
          </div>
          <div style={{ overflowX: 'auto' }}>
            <LineChart data={results} xKey="squadCount" lines={CHART_LINES}
              width={560} height={200} xLabel={`${UNIT_TYPES[selectedUnit].name} 분대 수`} />
          </div>

          {best && (
            <div style={{ fontSize: 9, color: c.gn, marginTop: 4 }}>
              최고 승률: <strong>{best.aWinRate.toFixed(1)}%</strong> ({best.squadCount}분대)
              · 평균 전투 {best.avgDuration.toFixed(0)}초
            </div>
          )}

          {/* Detailed stats table */}
          <div style={{ marginTop: 8, maxHeight: 130, overflowY: 'auto' }}>
            <table style={{ width: '100%', fontSize: 8, borderCollapse: 'collapse', color: c.tx }}>
              <thead>
                <tr style={{ color: c.dm }}>
                  <th style={{ padding: '2px 4px', textAlign: 'left' }}>분대</th>
                  <th style={{ padding: '2px 4px' }}>승률</th>
                  <th style={{ padding: '2px 4px' }}>패율</th>
                  <th style={{ padding: '2px 4px' }}>무승부</th>
                  <th style={{ padding: '2px 4px' }}>평균 전투</th>
                  <th style={{ padding: '2px 4px' }}>평균 생존</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} style={{ background: i % 2 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                    <td style={{ padding: '2px 4px' }}>{r.squadCount}분대</td>
                    <td style={{ padding: '2px 4px', textAlign: 'center', fontWeight: 'bold',
                      color: r.aWinRate > 50 ? c.gn : r.aWinRate < 50 ? c.rd : c.tx }}>
                      {r.aWinRate.toFixed(0)}%
                    </td>
                    <td style={{ padding: '2px 4px', textAlign: 'center' }}>{r.bWinRate.toFixed(0)}%</td>
                    <td style={{ padding: '2px 4px', textAlign: 'center', color: c.dm }}>{r.drawRate.toFixed(0)}%</td>
                    <td style={{ padding: '2px 4px', textAlign: 'center', color: c.dm }}>{r.avgDuration.toFixed(0)}초</td>
                    <td style={{ padding: '2px 4px', textAlign: 'center' }}>{r.aAvgSurv}</td>
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
