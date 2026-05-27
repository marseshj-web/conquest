import { UNIT_TYPES, THEME_COLORS as c, MAP_W } from '../constants.js';

export default function ResultPhase({
  result, stats, formula, sm, gRef, reset, startRematch,
  onReturnToMap, isDefensive, atkName, defName,
}) {
  // isDefensive: AI attacked player — 'player' side in engine = AI attacker, 'ai' side = human defender
  const playerWon = isDefensive ? result === "ai" : result === "player";
  const isDraw = result !== "player" && result !== "ai";

  const icon  = isDraw ? "🤝" : playerWon ? "⚔" : "💀";
  const label = isDraw ? "무승부" : playerWon ? "승리!" : "패배";
  const color = isDraw ? c.gl : playerWon ? "#6ab86a" : "#c05050";

  // 병력 수: defensive에서 stats.p = AI(공격), stats.a = 플레이어(방어)
  const mySurv  = isDefensive ? stats.a : stats.p;
  const eneSurv = isDefensive ? stats.p : stats.a;

  // 병력 구성: sm = 'player'측(공격자) 배치, aiArmy = 'ai'측(방어자) 배치
  const myArmy  = isDefensive
    ? gRef.current?.aiArmy  // 'ai'측 = 내 방어군
    : null;                 // null이면 sm을 사용
  const eneArmy = isDefensive
    ? sm                    // 'player'측 = 적 공격군
    : null;

  const formatArmy = (armyByType, armyList) => {
    if (armyByType) return Object.entries(armyByType).map(([k, v]) => `${UNIT_TYPES[k].name}×${v}`).join(", ");
    if (armyList) {
      const x = {}; armyList.forEach(t => (x[t] = (x[t] || 0) + 1));
      return Object.entries(x).map(([k, v]) => `${UNIT_TYPES[k].name}×${v}`).join(", ");
    }
    return "-";
  };

  return (
    <div style={{ textAlign: "center", padding: "20px 10px", width: "100%", maxWidth: MAP_W }}>
      <div style={{ fontSize: 34, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, color }}>
        {label}
      </div>
      <div style={{ fontSize: 11, color: c.dm, marginBottom: 14 }}>
        아군 {mySurv}명 | 적군 {eneSurv}명 | {stats.t.toFixed(1)}초
      </div>
      <div style={{
        background: c.pn, border: `1px solid ${c.bd}`, borderRadius: 4,
        padding: 8, marginBottom: 10, textAlign: "left", fontSize: 10, color: c.dm,
      }}>
        <div style={{ fontWeight: 600, color: c.tx, fontSize: 11, marginBottom: 3 }}>전투 정보</div>
        <div>공식: {formula === "A" ? "감산형" : "비율형"}</div>
        <div>아군({isDefensive ? defName : atkName}): {
          isDefensive
            ? formatArmy(null, myArmy)
            : formatArmy(sm, null)
        }</div>
        <div>적군({isDefensive ? atkName : defName}): {
          isDefensive
            ? formatArmy(eneArmy, null)
            : formatArmy(null, gRef.current?.aiArmy)
        }</div>
      </div>
      <div style={{ display: "flex", gap: 5, justifyContent: "center", flexWrap: "wrap" }}>
        {onReturnToMap ? (
          <button onClick={onReturnToMap} style={{
            padding: "6px 18px", border: `1px solid ${c.gl}`, borderRadius: 4,
            background: `${c.gl}22`, color: c.gl, cursor: "pointer",
            fontSize: 12, fontWeight: 700,
          }}>🗺 지도로 돌아가기</button>
        ) : (<>
          <button onClick={startRematch} style={{
            padding: "6px 16px", border: `1px solid ${c.bl}`, borderRadius: 4,
            background: `${c.bl}18`, color: "#8ab4f8", cursor: "pointer",
            fontSize: 11, fontWeight: 600,
          }}>같은 편성 재대결</button>
          <button onClick={reset} style={{
            padding: "6px 16px", border: `1px solid ${c.bd}`, borderRadius: 4,
            background: "transparent", color: c.dm, cursor: "pointer", fontSize: 11,
          }}>새 게임</button>
        </>)}
      </div>
    </div>
  );
}
