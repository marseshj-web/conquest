import { useState } from 'react';
import { UNIT_TYPES, ARROW_ACC, THEME_COLORS as c, MAP_W, MAPS } from '../constants.js';
import { getAIPatterns } from '../engine.js';
import { runComprehensiveSimulation } from '../simulatorCore.js';

const GOLD_TIERS = [
  { value: 5000,  label: "소규모", sub: "5천" },
  { value: 10000, label: "표준",   sub: "1만" },
  { value: 15000, label: "중규모", sub: "1.5만" },
  { value: 20000, label: "대규모", sub: "2만" },
  { value: 25000, label: "대전쟁", sub: "2.5만" },
  { value: 30000, label: "서사",   sub: "3만" },
];

export default function SetupPhase({
  gold, maxGold, changeMaxGold, countScale, pop, army, formula, setFormula,
  mapId, setMapId,
  buy, sell, startBattle, sm, onOpenLab
}) {
  const [simResult, setSimResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const handleSimulate = () => {
    if (!army.length) return;
    setIsSimulating(true);
    setSimResult(null);
    setTimeout(() => {
      const patterns = getAIPatterns(maxGold);
      const res = runComprehensiveSimulation(army, patterns, 5, formula, MAPS[mapId], countScale);
      setSimResult(res);
      setIsSimulating(false);
    }, 50);
  };

  return (
    <div style={{ width: "100%", maxWidth: MAP_W }}>
      {/* Gold bar */}
      <div style={{
        background: c.pn, border: `1px solid ${c.bd}`, borderRadius: 4,
        padding: "6px 10px", marginBottom: 5,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
          <div>
            <span style={{ color: c.gl, fontSize: 16, fontWeight: 700 }}>{gold.toLocaleString()}</span>
            <span style={{ color: c.dm, fontSize: 10, marginLeft: 3 }}>/ {maxGold.toLocaleString()}</span>
          </div>
          <div style={{ width: 120, height: 4, background: "#222", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ width: `${(gold / maxGold) * 100}%`, height: "100%", background: c.gl, borderRadius: 2 }} />
          </div>
          <div style={{ fontSize: 10, color: c.dm }}>{pop}명 · {army.length}부대</div>
        </div>
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          {GOLD_TIERS.map(t => (
            <button key={t.value} onClick={() => changeMaxGold(t.value)} style={{
              flex: 1, minWidth: 60, padding: "2px 4px",
              border: `1px solid ${maxGold === t.value ? c.gl : c.bd}`, borderRadius: 3,
              background: maxGold === t.value ? `${c.gl}20` : "transparent",
              color: maxGold === t.value ? c.gl : c.dm,
              cursor: "pointer", fontSize: 9, fontWeight: maxGold === t.value ? 700 : 400,
              textAlign: "center", lineHeight: 1.4,
            }}>
              <div>{t.label}</div>
              <div style={{ fontSize: 8, opacity: 0.7 }}>{t.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Settings bar (Formula & Map) */}
      <div style={{
        display: "flex", flexDirection: "column", gap: 5, marginBottom: 5,
        padding: "6px 10px", background: c.pn, border: `1px solid ${c.bd}`,
        borderRadius: 4, fontSize: 10
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
          <span style={{ color: c.dm, width: "30px" }}>공식:</span>
          {["A", "B"].map(f => (
            <button key={f} onClick={() => setFormula(f)} style={{
              padding: "2px 8px", border: `1px solid ${formula === f ? c.gl : c.bd}`, borderRadius: 3,
              background: formula === f ? `${c.gl}18` : "transparent",
              color: formula === f ? c.gl : c.dm, cursor: "pointer", fontSize: 9,
              fontWeight: formula === f ? 700 : 400,
            }}>{f === "A" ? "감산형" : "비율형"}</button>
          ))}
          <span style={{ color: c.dm, fontSize: 8, marginLeft: "auto" }}>
            기사→궁수/머스켓 | 창병→기사/경기병 x2/1.5 | 경기병→궁수 사냥 | 머스켓→중갑 관통 | 투석기→밀집 보병 AoE
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
          <span style={{ color: c.dm, width: "30px" }}>전장:</span>
          {Object.values(MAPS).map(m => (
            <button key={m.id} onClick={() => setMapId(m.id)} style={{
              padding: "2px 8px", border: `1px solid ${mapId === m.id ? c.gn : c.bd}`, borderRadius: 3,
              background: mapId === m.id ? `${c.gn}18` : "transparent",
              color: mapId === m.id ? c.gn : c.dm, cursor: "pointer", fontSize: 9,
              fontWeight: mapId === m.id ? 700 : 400,
            }} title={m.desc}>{m.name}</button>
          ))}
          <span style={{ color: c.dm, fontSize: 8, marginLeft: "auto" }}>
            {MAPS[mapId]?.desc}
          </span>
        </div>
      </div>

      {/* Unit cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 4, marginBottom: 5,
      }}>
        {Object.values(UNIT_TYPES).map(u => {
          const ok = gold >= u.cost, own = sm[u.id] || 0;
          return (
            <div key={u.id} style={{
              background: c.pn, border: `1px solid ${ok ? c.bd : "#161616"}`,
              borderRadius: 4, padding: 6, opacity: ok ? 1 : 0.4,
              display: "flex", flexDirection: "column", gap: 1,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 15 }}>{u.icon}</span>
                <span style={{ color: c.gl, fontSize: 10, fontWeight: 700 }}>{u.cost}g</span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 600 }}>{u.name}</div>
              <div style={{ fontSize: 8, color: c.dm }}>{u.desc}</div>
              <div style={{ fontSize: 8, color: c.dm, display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                <span>HP {u.hp}</span><span>ATK {u.atk}</span>
                <span>DEF {u.def}</span><span>SPD {u.speed}</span>
                <span>{Math.max(1, Math.round(u.count * countScale))}명</span><span>{u.type === "ranged" ? `거리${u.range}` : "근접"}</span>
              </div>
              <div style={{ fontSize: 7, color: "#666" }}>
                {({ plate: "판금", heavy: "중장", medium: "중간", light: "경장" })[u.armorClass]}
                {" · 화살 " + Math.round((ARROW_ACC[u.armorClass] || 0.7) * 100) + "%명중"}
                {u.targetPriority === "hunt_archers" && " · 궁수사냥"}
                {u.targetPriority === "prefer_knights" && " · 기사추적"}
                {u.targetPriority === "prefer_light" && " · 경장특효"}
              </div>
              <button onClick={() => buy(u.id)} disabled={!ok} style={{
                marginTop: 2, padding: 3,
                border: `1px solid ${ok ? c.gn : c.bd}`, borderRadius: 3,
                background: ok ? `${c.gn}15` : "transparent",
                color: ok ? "#8ab88a" : c.dm,
                cursor: ok ? "pointer" : "default", fontSize: 10, fontWeight: 600,
              }}>구매</button>
              {own > 0 && (
                <div style={{ fontSize: 9, color: c.gl, textAlign: "center" }}>
                  ×{own} ({own * Math.max(1, Math.round(u.count * countScale))}명)
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Army list */}
      {army.length > 0 && (
        <div style={{
          background: c.pn, border: `1px solid ${c.bd}`, borderRadius: 4,
          padding: "4px 7px", marginBottom: 5,
        }}>
          <div style={{ fontSize: 9, color: c.dm, marginBottom: 2 }}>편성 (클릭→판매)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            {army.map((t, i) => (
              <div key={i} onClick={() => sell(i)} style={{
                display: "flex", alignItems: "center", gap: 2,
                padding: "1px 4px", background: "rgba(255,255,255,0.02)",
                border: `1px solid ${c.bd}`, borderRadius: 3,
                cursor: "pointer", fontSize: 9,
              }}>
                <span>{UNIT_TYPES[t].icon}</span>
                <span>{UNIT_TYPES[t].name}</span>
                <span style={{ color: c.rd, fontWeight: 700 }}>×</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        <button onClick={handleSimulate} disabled={!army.length || isSimulating} style={{
          flex: 1, minWidth: 120, padding: 8,
          border: `1px solid ${army.length ? c.bl : c.bd}`, borderRadius: 4,
          background: army.length ? `${c.bl}12` : "transparent",
          color: army.length ? c.bl : c.dm,
          fontSize: 12, fontWeight: 600,
          cursor: army.length && !isSimulating ? "pointer" : "default",
        }}>
          {isSimulating ? "⏳ 계산 중 (50회)..." : "📊 종합 상성 테스트"}
        </button>
        <button onClick={onOpenLab} style={{
          flex: 1, minWidth: 100, padding: 8,
          border: `1px solid ${c.gl}88`, borderRadius: 4,
          background: `${c.gl}0a`,
          color: c.gl, fontSize: 11, fontWeight: 600, cursor: "pointer",
        }}>🔬 Research Lab</button>
        <button onClick={startBattle} disabled={!army.length} style={{
          flex: 2, minWidth: 120, padding: 8,
          border: `2px solid ${army.length ? c.gl : c.bd}`, borderRadius: 4,
          background: army.length ? `${c.gl}12` : "transparent",
          color: army.length ? c.gl : c.dm,
          fontSize: 13, fontWeight: 700,
          cursor: army.length ? "pointer" : "default", letterSpacing: 2,
        }}>⚔ 전투 시작</button>
      </div>

      {/* Simulation Result */}
      {simResult && (
        <div style={{
          marginTop: 8, padding: 10,
          background: c.pn, border: `1px solid ${c.bl}`, borderRadius: 4,
          fontSize: 11, color: c.tx
        }}>
          <div style={{ color: c.bl, fontWeight: "bold", marginBottom: 6, fontSize: 12 }}>종합 분석 결과 (10가지 패턴 × 5회 교전)</div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
            <div style={{ background: "rgba(100,160,255,0.1)", padding: 6, borderRadius: 4 }}>
              <div style={{ color: "#8ab4f8", marginBottom: 2 }}>내 평균 승률</div>
              <div style={{ fontSize: 16, fontWeight: "bold" }}>{simResult.overallAWinRate.toFixed(1)}%</div>
              <div style={{ fontSize: 9, color: c.dm }}>평균 생존: {simResult.overallAAvgSurv}명</div>
            </div>
            <div style={{ background: "rgba(255,100,100,0.1)", padding: 6, borderRadius: 4 }}>
              <div style={{ color: "#f88a8a", marginBottom: 2 }}>AI 평균 승률</div>
              <div style={{ fontSize: 16, fontWeight: "bold" }}>{simResult.overallBWinRate.toFixed(1)}%</div>
            </div>
          </div>

          <div style={{ fontSize: 10, fontWeight: "bold", color: c.dm, marginBottom: 4 }}>패턴별 상세 결과</div>
          <div style={{ 
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4,
            maxHeight: "150px", overflowY: "auto", paddingRight: 4
          }}>
            {simResult.details.map((d, i) => (
              <div key={i} style={{ 
                background: "rgba(255,255,255,0.03)", padding: "4px 6px", 
                borderRadius: 3, border: `1px solid ${c.bd}`,
                display: "flex", justifyContent: "space-between", alignItems: "center"
              }}>
                <span style={{ color: c.dm, fontSize: 9 }}>{d.name}</span>
                <span style={{ 
                  color: d.aWinRate > 50 ? "#8ab4f8" : d.aWinRate < 50 ? "#f88a8a" : "#aaa",
                  fontWeight: "bold", fontSize: 10
                }}>
                  {d.aWinRate.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
