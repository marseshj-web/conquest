import { PLAYERS, FOOD_PER_SOLDIER, GOLD_INCOME_DIV, FOOD_INCOME_DIV } from '../data/constants.js';
import { GRADE_VALUES } from '../data/leaders.js';
import { clamp, rng, sum, totalArmy } from '../utils/math.js';

export function processTurnEnd(terrs, gold, food, season, addLog, leaders = {}) {
  let ts = terrs.map(t => ({ ...t, army: { ...t.army } }));
  const ng = { ...gold };
  const nf = { ...food };
  let nl = { ...leaders };

  const ns = (season + 1) % 4;

  // Army food consumption (every turn)
  Object.keys(PLAYERS).forEach(pid => {
    const troops = sum(ts.filter(t => t.owner === pid), t => totalArmy(t.army));
    const consumption = Math.floor(troops * FOOD_PER_SOLDIER);
    const prevFood = nf[pid] || 0;
    nf[pid] = Math.max(0, prevFood - consumption);
    if (pid === "player") {
      addLog(`군량 소비: -${consumption} 식량 (병사 ${troops}명)`);
      if (nf[pid] === 0 && prevFood > 0 && ns !== 3) {
        addLog("⚠️ 식량 고갈! 다음 겨울에 병사 이탈 예정");
      }
    }
  });

  // 반란 유예 카운터 감소
  ts = ts.map(t => t.rebelImmune > 0 ? { ...t, rebelImmune: t.rebelImmune - 1 } : t);

  // 매력 패시브: 매 턴 영지 지도자 charm 등급에 따라 민심 소폭 변동
  ts = ts.map(t => {
    if (!t.owner) return t;
    const passive = GRADE_VALUES.charm[leaders[t.id]?.charm ?? "C"].passive;
    return passive !== 0 ? { ...t, mor: clamp(t.mor + passive, 10, 100) } : t;
  });

  // 민심 배율: 0.5 + mor/200 → mor=10: 0.55×, mor=50: 0.75×, mor=100: 1.0×
  const morMult = t => 0.5 + t.mor / 200;

  if (ns === 0) { // 봄: gold income + pop growth
    Object.keys(PLAYERS).forEach(pid => {
      const inc = sum(ts.filter(t => t.owner === pid),
        t => Math.floor(t.econ * t.pop / GOLD_INCOME_DIV * morMult(t)));
      ng[pid] = (ng[pid] || 0) + inc;
      if (pid === "player") addLog(`봄 세수: +${inc} 금 (민심 반영)`);
    });
    ts = ts.map(t => t.owner
      ? { ...t, pop: Math.min(50000, t.pop + Math.floor(t.pop * (t.mor / 100) * 0.03)) }
      : t);
  }

  if (ns === 2) { // 가을: food income
    Object.keys(PLAYERS).forEach(pid => {
      const inc = sum(ts.filter(t => t.owner === pid),
        t => Math.floor(t.agri * t.pop / FOOD_INCOME_DIV * morMult(t)));
      nf[pid] = (nf[pid] || 0) + inc;
      if (pid === "player") addLog(`가을 수확: +${inc} 식량 (민심 반영)`);
    });
  }

  if (ns === 3) { // 겨울: starvation
    let playerStarved = false;
    ts = ts.map(t => {
      if (!t.owner) return t;
      if ((nf[t.owner] || 0) > 0) return t;
      const lostTotal =
        (t.army.infantry - Math.floor(t.army.infantry * 0.9)) +
        (t.army.archer   - Math.floor(t.army.archer   * 0.9)) +
        (t.army.cavalry  - Math.floor(t.army.cavalry  * 0.9)) +
        (t.army.special  - Math.floor(t.army.special  * 0.9));
      if (t.owner === "player") {
        if (lostTotal > 0) addLog(`❄️ ${t.name}: 기근 이탈 -${lostTotal}명, 민심-8`);
        playerStarved = true;
      }
      return {
        ...t,
        mor: clamp(t.mor - 8, 10, 100),
        army: {
          infantry: Math.floor(t.army.infantry * 0.9),
          archer:   Math.floor(t.army.archer   * 0.9),
          cavalry:  Math.floor(t.army.cavalry  * 0.9),
          siege:    t.army.siege,
          special:  Math.floor(t.army.special  * 0.9),
        },
      };
    });
    if (playerStarved) addLog("⚠️ 식량 고갈! 겨울 기근 발생!");
  }

  // Rebellion check: mor < 30 → 반란 가능성 (정복 직후 3턴 유예)
  ts = ts.map(t => {
    if (!t.owner || t.mor >= 30 || t.rebelImmune > 0) return t;
    const chance = (30 - t.mor) * 0.02; // mor=10 → 40%, mor=25 → 10%
    if (Math.random() > chance) return t;

    const rebelSize = Math.floor(t.pop * rng(10, 25) / 1000); // 인구의 1~2.5%
    const garrison  = totalArmy(t.army);
    const isPlayer  = t.owner === "player";

    if (garrison >= rebelSize * 2) {
      // 쉽게 진압 — 소규모 피해
      if (isPlayer) addLog(`⚡ ${t.name} 반란(${rebelSize}명) 진압 — 병력 소모`);
      return {
        ...t,
        mor: clamp(t.mor - 3, 10, 100),
        army: Object.fromEntries(Object.keys(t.army).map(k => [k, Math.floor(t.army[k] * 0.9)])),
      };
    } else if (garrison >= rebelSize) {
      // 힘겹게 진압 — 상당한 피해
      if (isPlayer) addLog(`⚠️ ${t.name} 반란(${rebelSize}명) 간신히 진압 — 큰 피해`);
      return {
        ...t,
        mor: clamp(t.mor - 8, 10, 100),
        army: Object.fromEntries(Object.keys(t.army).map(k => [k, Math.floor(t.army[k] * 0.75)])),
      };
    } else {
      // 반란 성공 → 공백지
      if (isPlayer) addLog(`💥 ${t.name} 반란 성공! 공백지로 전락 (반란군 ${rebelSize} vs 수비대 ${garrison})`);
      delete nl[t.id];
      return {
        ...t,
        owner: null,
        mor: clamp(t.mor + 15, 10, 100),
        army: { infantry: rebelSize, archer: 0, cavalry: 0, siege: 0, special: 0 },
      };
    }
  });

  // Neutral territory recovery
  ts = ts.map(t => !t.owner
    ? { ...t, army: { ...t.army, infantry: t.army.infantry + rng(10, 25), archer: t.army.archer + rng(5, 15) }, mor: clamp(t.mor + 2, 10, 100) }
    : t);

  return { ts, ng, nf, ns, nl };
}
