import { useState, useRef, useMemo, useEffect } from 'react';
import { MAPS, THEME_COLORS as c } from '../../constants.js';
import { runTournament } from '../../simulatorCore.js';
import { getAIPatterns } from '../../engine.js';
import HeatmapTable from './charts/HeatmapTable.jsx';
import { armySummary, tournamentMatrixToCSV, copyToClipboard } from './labUtils.js';

export default function Tournament({ army, formula, mapId, savedSlots, setSavedSlots }) {
  const patterns = useMemo(() => getAIPatterns(), []);
  const [iters, setIters] = useState(10);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [matrix, setMatrix] = useState(null);
  const [slotName, setSlotName] = useState('');
  const [copied, setCopied] = useState(false);
  const [aiPatternIdx, setAiPatternIdx] = useState(0);
  const [aiSlotName, setAiSlotName] = useState('');
  const ctrlRef = useRef(null);
  const copyTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(copyTimerRef.current), []);

  const handleSave = () => {
    if (!army.length) return;
    const name = slotName.trim() || `편성 ${savedSlots.length + 1}`;
    setSavedSlots(prev => [...prev.slice(0, 4), { name, army: [...army] }]);
    setSlotName('');
    setMatrix(null);
  };

  const handleSaveAI = () => {
    if (savedSlots.length >= 5) return;
    const pattern = patterns[aiPatternIdx];
    const name = aiSlotName.trim() || pattern.name;
    setSavedSlots(prev => [...prev, { name, army: [...pattern.army] }]);
    setAiSlotName('');
    setMatrix(null);
  };

  const handleRemove = i => {
    setSavedSlots(prev => prev.filter((_, j) => j !== i));
    setMatrix(null);
  };

  const handleRun = () => {
    if (savedSlots.length < 2) return;
    setIsRunning(true);
    setMatrix(null);
    const total = savedSlots.length * (savedSlots.length - 1);
    setProgress({ done: 0, total });

    const ctrl = runTournament(
      savedSlots, iters, formula, MAPS[mapId] || null,
      (done, t, m) => {
        setProgress({ done, total: t });
        setMatrix(m);
        if (done >= t) setIsRunning(false);
      }
    );
    ctrlRef.current = ctrl;
    ctrl.start();
  };

  const handleCancel = () => { ctrlRef.current?.cancel(); setIsRunning(false); };

  const handleCopy = () => {
    if (!matrix) return;
    copyToClipboard(tournamentMatrixToCSV(savedSlots, matrix));
    setCopied(true);
    clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  let bestIdx = -1;
  if (matrix) {
    const avgs = savedSlots.map((_, i) => {
      const row = matrix[i].filter((v, j) => j !== i && v !== null);
      return row.length ? row.reduce((s, v) => s + v, 0) / row.length : 0;
    });
    bestIdx = avgs.indexOf(Math.max(...avgs));
  }

  let bestAvg = null;
  if (bestIdx >= 0) {
    const row = matrix[bestIdx].filter((v, j) => j !== bestIdx && v !== null);
    bestAvg = row.length ? (row.reduce((s, v) => s + v, 0) / row.length).toFixed(1) : '?';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* Slot manager */}
      <div style={{ background: c.pn, border: `1px solid ${c.bd}`, borderRadius: 4, padding: '8px 10px' }}>
        <div style={{ fontSize: 9, color: c.dm, marginBottom: 6 }}>
          편성 슬롯 (최대 5개) · 현재 편성을 이름과 함께 저장
        </div>

        {savedSlots.map((slot, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '3px 6px', marginBottom: 3,
            background: 'rgba(255,255,255,0.02)', border: `1px solid ${c.bd}`, borderRadius: 3,
          }}>
            <span style={{ color: c.gl, fontWeight: 700, fontSize: 10, minWidth: 14 }}>{i + 1}</span>
            <span style={{ color: c.tx, fontSize: 10, fontWeight: 600, minWidth: 60 }}>{slot.name}</span>
            <span style={{ color: c.dm, fontSize: 9, flex: 1 }}>{armySummary(slot.army, true)}</span>
            <button onClick={() => handleRemove(i)} style={{
              padding: '1px 6px', fontSize: 9, cursor: 'pointer',
              border: `1px solid ${c.bd}`, borderRadius: 2,
              background: 'transparent', color: c.rd,
            }}>삭제</button>
          </div>
        ))}

        {savedSlots.length < 5 && (
          <>
            <div style={{ display: 'flex', gap: 5, marginTop: 5 }}>
              <input value={slotName} onChange={e => setSlotName(e.target.value)}
                placeholder={`편성 ${savedSlots.length + 1}`}
                style={{
                  flex: 1, padding: '3px 6px', fontSize: 10,
                  background: c.bg, color: c.tx, border: `1px solid ${c.bd}`, borderRadius: 3,
                }} />
              <button onClick={handleSave} disabled={!army.length} style={{
                padding: '3px 10px', fontSize: 10,
                cursor: army.length ? 'pointer' : 'default',
                border: `1px solid ${army.length ? c.gn : c.bd}`, borderRadius: 3,
                background: army.length ? `${c.gn}12` : 'transparent',
                color: army.length ? c.gn : c.dm, fontWeight: 700,
              }}>현재 편성 저장</button>
            </div>
            <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px solid ${c.bd}33` }}>
              <div style={{ fontSize: 9, color: c.dm, marginBottom: 4 }}>AI 패턴 추가</div>
              <div style={{ display: 'flex', gap: 5 }}>
                <select value={aiPatternIdx} onChange={e => setAiPatternIdx(+e.target.value)} style={{
                  flex: 1, background: c.bg, color: c.tx, border: `1px solid ${c.bd}`, borderRadius: 3,
                  padding: '3px 5px', fontSize: 9,
                }}>
                  {patterns.map((p, i) => <option key={i} value={i}>{p.name}</option>)}
                </select>
                <input value={aiSlotName} onChange={e => setAiSlotName(e.target.value)}
                  placeholder={patterns[aiPatternIdx]?.name}
                  style={{
                    width: 70, padding: '3px 6px', fontSize: 10,
                    background: c.bg, color: c.tx, border: `1px solid ${c.bd}`, borderRadius: 3,
                  }} />
                <button onClick={handleSaveAI} style={{
                  padding: '3px 10px', fontSize: 10, cursor: 'pointer',
                  border: `1px solid ${c.bl}`, borderRadius: 3,
                  background: `${c.bl}12`, color: c.bl, fontWeight: 700,
                }}>추가</button>
              </div>
            </div>
          </>
        )}
        {savedSlots.length < 2 && (
          <div style={{ fontSize: 8, color: c.dm, marginTop: 4 }}>
            토너먼트 시작에 최소 2개 슬롯이 필요합니다
          </div>
        )}
      </div>

      {/* Iterations + Run */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 9, color: c.dm }}>반복:</span>
          <input type="range" min={5} max={50} step={5} value={iters}
            onChange={e => setIters(+e.target.value)}
            style={{ width: 90, accentColor: c.gl }} />
          <span style={{ color: c.tx, fontSize: 11 }}>{iters}회</span>
        </div>

        {!isRunning ? (
          <button onClick={handleRun} disabled={savedSlots.length < 2} style={{
            padding: '7px 16px', fontSize: 12, fontWeight: 700,
            cursor: savedSlots.length < 2 ? 'default' : 'pointer',
            border: `1px solid ${savedSlots.length < 2 ? c.bd : c.gl}`, borderRadius: 4,
            background: savedSlots.length < 2 ? 'transparent' : `${c.gl}12`,
            color: savedSlots.length < 2 ? c.dm : c.gl,
          }}>
            토너먼트 시작 ({savedSlots.length}팀, {savedSlots.length * (savedSlots.length - 1)}매치)
          </button>
        ) : (
          <button onClick={handleCancel} style={{
            padding: '7px 14px', fontSize: 11, cursor: 'pointer',
            border: `1px solid ${c.rd}`, borderRadius: 4,
            background: `${c.rd}15`, color: c.rd,
          }}>취소</button>
        )}

        {isRunning && (
          <div style={{ flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 9, color: c.dm, marginBottom: 2 }}>
              {progress.done} / {progress.total} 매치
            </div>
            <div style={{ height: 4, background: c.bd, borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
                height: '100%', background: c.gl, borderRadius: 2, transition: 'width 0.1s'
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Matrix result */}
      {matrix && savedSlots.length >= 2 && (
        <div style={{ background: c.pn, border: `1px solid ${c.bd}`, borderRadius: 4, padding: '8px 10px' }}>
          <div style={{ fontSize: 10, color: c.gl, fontWeight: 700, marginBottom: 6 }}>
            대전표 (행: 내 편성 승률 %)
          </div>
          <HeatmapTable slots={savedSlots} matrix={matrix} />

          {bestIdx >= 0 && (
            <div style={{ marginTop: 8, fontSize: 10, color: c.gn }}>
              종합 최강: <strong>{savedSlots[bestIdx].name}</strong>
              {' · '}평균 승률 {bestAvg}%
            </div>
          )}

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
