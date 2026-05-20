import { UNITS, SPECIALS } from '../data/units.js';
import { MERCHANT_RATE, CONSCRIPT_AMOUNTS } from '../data/constants.js';
import { GRADE_VALUES } from '../data/leaders.js';
import { simBattle } from './combat.js';
import { clamp, rng, sum, totalArmy } from '../utils/math.js';

export function doInvest(state, tid, type) {
  const { terrs, gold, food, actions, leaders, addLog } = state;
  const costs = { econ: [50, 0], agri: [30, 20], wall: [60, 0] };
  const [gc, fc] = costs[type];
  if (gold.player < gc || food.player < fc) { addLog("자원 부족"); return null; }
  if ((actions[tid] || 0) >= 3)             { addLog("명령 횟수 소진"); return null; }

  const t = terrs.find(t => t.id === tid);
  const label = { econ: "경제", agri: "농업", wall: "성벽" }[type];
  const { cap, speed } = GRADE_VALUES.admin[leaders?.[tid]?.admin ?? "C"];
  addLog(`${t.name} ${label} 투자`);

  return {
    gold:    { ...gold, player: gold.player - gc },
    food:    { ...food, player: food.player - fc },
    actions: { ...actions, [tid]: (actions[tid] || 0) + 1 },
    terrs:   terrs.map(t => {
      if (t.id !== tid) return t;
      const v = Math.round(rng(3, 8) * speed);
      if (type === "econ") return { ...t, econ: clamp(t.econ + v, 0, cap) };
      if (type === "agri") return { ...t, agri: clamp(t.agri + v, 0, cap) };
      return { ...t, wall: clamp(t.wall + rng(3, 7), 0, 100) };
    }),
  };
}

export function doComfort(state, tid) {
  const { terrs, food, actions, leaders, addLog } = state;
  if (food.player < 80)         { addLog("식량 부족 (80 필요)"); return null; }
  if ((actions[tid] || 0) >= 3) { addLog("명령 횟수 소진"); return null; }

  const t = terrs.find(t => t.id === tid);
  const { comfortMult } = GRADE_VALUES.charm[leaders?.[tid]?.charm ?? "C"];
  const gain = Math.round(rng(8, 15) * comfortMult);
  addLog(`${t.name} 위무 (식량 배급)`);
  return {
    food:    { ...food, player: food.player - 80 },
    actions: { ...actions, [tid]: (actions[tid] || 0) + 1 },
    terrs:   terrs.map(t => t.id === tid ? { ...t, mor: clamp(t.mor + gain, 10, 100) } : t),
  };
}

export function doConscript(state, tid, unitKey) {
  const { terrs, gold, food, actions, addLog } = state;
  const t = terrs.find(t => t.id === tid);
  const unit = unitKey === "special" ? SPECIALS[tid] : UNITS[unitKey];
  const [gc, fc] = unit.cost;
  const amount = CONSCRIPT_AMOUNTS[unitKey];

  if (gold.player < gc)         { addLog(`금 부족 (${gc} 필요)`); return null; }
  if (food.player < fc)         { addLog(`식량 부족 (${fc} 필요)`); return null; }
  if ((actions[tid] || 0) >= 3) { addLog("명령 횟수 소진"); return null; }

  addLog(`${t.name} ${unit.n} ${amount}명 징병 (💰${gc} 🌾${fc})`);
  return {
    gold:    { ...gold, player: gold.player - gc },
    food:    { ...food, player: food.player - fc },
    actions: { ...actions, [tid]: (actions[tid] || 0) + 1 },
    terrs:   terrs.map(tr => {
      if (tr.id !== tid) return tr;
      const a = { ...tr.army };
      a[unitKey] += amount;
      return { ...tr, army: a, mor: clamp(tr.mor - 5, 10, 100) };
    }),
  };
}

export function doTransfer(state, fromId, toId, transfers) {
  const { terrs, actions, addLog } = state;
  if ((actions[fromId] || 0) >= 3) { addLog("명령 횟수 소진"); return null; }
  const total = Object.values(transfers).reduce((s, v) => s + v, 0);
  if (total <= 0) return null;

  const from = terrs.find(t => t.id === fromId);
  const to   = terrs.find(t => t.id === toId);
  addLog(`${from.name}→${to.name}: ${total}명 이동`);
  return {
    actions: { ...actions, [fromId]: (actions[fromId] || 0) + 1 },
    terrs:   terrs.map(t => {
      if (t.id === fromId) { const a = { ...t.army }; Object.keys(transfers).forEach(k => { a[k] = Math.max(0, a[k] - transfers[k]); }); return { ...t, army: a }; }
      if (t.id === toId)   { const a = { ...t.army }; Object.keys(transfers).forEach(k => { a[k] += transfers[k]; }); return { ...t, army: a }; }
      return t;
    }),
  };
}

export function doAttack(state, fromId, toId) {
  const { terrs, leaders, addLog } = state;
  const aT = terrs.find(t => t.id === fromId);
  const dT = terrs.find(t => t.id === toId);
  if (totalArmy(aT.army) < 30) { addLog("병력 부족"); return null; }

  const res = simBattle(aT, dT, leaders);
  addLog(res.atkWin ? `✅ ${aT.name}→${dT.name} 점령!` : `❌ ${dT.name} 공격 실패`);

  return {
    battleLog: res.logs,
    terrs: terrs.map(t => {
      if (t.id === fromId) return { ...t, army: Object.fromEntries(Object.keys(res.aa).map(k => [k, res.atkWin ? Math.floor(res.aa[k] * 0.6) : res.aa[k]])) };
      if (t.id === toId) {
        if (res.atkWin) {
          const occ = {};
          Object.keys(res.aa).forEach(k => { occ[k] = Math.floor(res.aa[k] * 0.4); });
          return { ...t, owner: aT.owner, army: occ, mor: clamp(t.mor - 15, 10, 100) };
        }
        return { ...t, army: { ...res.da } };
      }
      return t;
    }),
  };
}

export function doTrade(state, type, amount) {
  const { gold, food, sel, leaders, addLog } = state;
  const tradeGrade = leaders?.[sel]?.trade ?? "C";
  const rates = GRADE_VALUES.trade[tradeGrade];
  if (type === "buyFood") {
    if (gold.player < amount) { addLog("금 부족"); return null; }
    const gained = Math.floor(amount * rates.goldToFood);
    addLog(`상인: 💰${amount} → 🌾${gained}`);
    return { gold: { ...gold, player: gold.player - amount }, food: { ...food, player: food.player + gained } };
  } else {
    if (food.player < amount) { addLog("식량 부족"); return null; }
    const gained = Math.floor(amount * rates.foodToGold);
    addLog(`상인: 🌾${amount} → 💰${gained}`);
    return { food: { ...food, player: food.player - amount }, gold: { ...gold, player: gold.player + gained } };
  }
}

export function doScout(state, tid) {
  const { terrs, gold, scouted, addLog } = state;
  if (gold.player < 40) { addLog("금 부족"); return null; }
  const t = terrs.find(t => t.id === tid);
  addLog(`${t.name} 정찰 완료`);
  return { gold: { ...gold, player: gold.player - 40 }, scouted: { ...scouted, [tid]: true } };
}

export function doBulkTransfer(state, fromId, transfersMap) {
  const { terrs, actions, addLog } = state;
  if ((actions[fromId] || 0) >= 3) { addLog("명령 횟수 소진"); return null; }

  const totalMoved = Object.values(transfersMap).reduce(
    (s, tr) => s + Object.values(tr).reduce((a, v) => a + v, 0), 0
  );
  if (totalMoved <= 0) return null;

  const from = terrs.find(t => t.id === fromId);
  const totalOut = {};
  Object.values(transfersMap).forEach(tr => {
    Object.keys(tr).forEach(k => { totalOut[k] = (totalOut[k] || 0) + tr[k]; });
  });

  const insufficient = Object.keys(totalOut).find(k => totalOut[k] > from.army[k]);
  if (insufficient) { addLog("병력 부족"); return null; }

  const toNames = Object.keys(transfersMap)
    .filter(id => Object.values(transfersMap[id]).some(v => v > 0))
    .map(id => terrs.find(t => t.id === id).name).join(', ');
  addLog(`${from.name} → ${toNames}: 일괄이동 ${totalMoved}명`);

  return {
    actions: { ...actions, [fromId]: (actions[fromId] || 0) + 1 },
    terrs: terrs.map(t => {
      if (t.id === fromId) {
        const a = { ...t.army };
        Object.keys(totalOut).forEach(k => { a[k] = Math.max(0, a[k] - totalOut[k]); });
        return { ...t, army: a };
      }
      if (transfersMap[t.id] && Object.values(transfersMap[t.id]).some(v => v > 0)) {
        const a = { ...t.army };
        Object.keys(transfersMap[t.id]).forEach(k => { a[k] += transfersMap[t.id][k]; });
        return { ...t, army: a };
      }
      return t;
    }),
  };
}

export function doSurrender(state, tid) {
  const { terrs, gold, addLog } = state;
  if (gold.player < 100) { addLog("금 부족"); return null; }
  const t = terrs.find(t => t.id === tid);
  const myTroops = sum(terrs.filter(tr => tr.owner === "player"), tr => totalArmy(tr.army));
  const theirTroops = totalArmy(t.army);
  const ch = myTroops > theirTroops * 3 ? 0.45
           : myTroops > theirTroops * 1.5 ? 0.20
           : 0.07;

  const newGold = { ...gold, player: gold.player - 100 };
  if (Math.random() < ch) {
    addLog(`🏳️ ${t.name} 항복!`);
    return {
      gold: newGold,
      terrs: terrs.map(tr => tr.id === tid ? { ...tr, owner: "player", mor: clamp(tr.mor - 10, 10, 100) } : tr),
    };
  }
  addLog(`${t.name} 항복 거부`);
  return { gold: newGold };
}
