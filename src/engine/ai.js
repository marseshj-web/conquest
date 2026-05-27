import { simBattle } from './combat.js';
import { clamp, rng, sum, totalArmy } from '../utils/math.js';
import { PLAYERS, CONSCRIPT_AMOUNTS } from '../data/constants.js';

export function autoManageTurn(ts, autoManagedIds, gold, food, addLog, leaders = {}) {
  if (!autoManagedIds.length) return { ts, gold, food };

  let nts = ts.map(t => ({ ...t, army: { ...t.army } }));
  let g = gold.player || 0;
  let f = food.player || 0;

  const managed = autoManagedIds.filter(id => {
    const t = nts.find(nt => nt.id === id);
    return t && t.owner === 'player';
  });

  managed.forEach(tid => {
    const t = nts.find(nt => nt.id === tid);
    const acts = [];

    for (let i = 0; i < 2; i++) {
      if (t.mor < 50 && f >= 80) {
        t.mor = clamp(t.mor + rng(5, 10), 10, 100);
        f -= 80;
        acts.push('위무');
      } else {
        const r = Math.random();
        if      (r < 0.25 && g >= 50) { t.econ = clamp(t.econ + rng(3, 6), 0, 100); g -= 50; acts.push('경제'); }
        else if (r < 0.45 && g >= 30) { t.agri = clamp(t.agri + rng(3, 6), 0, 100); g -= 30; acts.push('농업'); }
        else if (f >= 25) {
          const pick = Math.random();
          if      (pick < 0.3  && g >= 35) { t.army.cavalry  += CONSCRIPT_AMOUNTS.cavalry;  g -= 35; f -= 40; acts.push('기병'); }
          else if (pick < 0.5  && g >= 60) { t.army.special  += CONSCRIPT_AMOUNTS.special;  g -= 60; f -= 50; acts.push('특수병'); }
          else if (pick < 0.75 && g >= 20) { t.army.archer   += CONSCRIPT_AMOUNTS.archer;   g -= 20; f -= 25; acts.push('궁병'); }
          else if (              g >= 10)  { t.army.infantry += CONSCRIPT_AMOUNTS.infantry;  g -= 10; f -= 30; acts.push('보병'); }
          t.mor = clamp(t.mor - 4, 10, 100);
        }
      }
    }
    if (acts.length) addLog(`🤖 ${t.name} 자율관리: ${acts.join(', ')}`);
  });

  return {
    ts: nts,
    gold: { ...gold, player: Math.max(0, g) },
    food: { ...food, player: Math.max(0, f) },
  };
}

export function aiTurn(ts, pid, gold, food, addLog, leaders = {}) {
  const owned = ts.filter(t => t.owner === pid);
  if (!owned.length) return { ts, gold, food, leaders };

  let nl = { ...leaders };

  let nts = ts.map(t => ({ ...t, army: { ...t.army } }));
  let g = gold[pid] || 0;
  let f = food[pid] || 0;

  const totalTroops = sum(nts.filter(t => t.owner === pid), t => totalArmy(t.army));

  // Merchant auto-trade: limited to avoid bypassing income reduction
  if (f < totalTroops && g > 150) { const buy = Math.min(80, g); f += Math.floor(buy * 1.5); g -= buy; }
  if (g < 60 && f > 600)         { const sell = Math.min(150, f); g += Math.floor(sell * 0.6); f -= sell; }

  // Internal actions (2 per territory)
  owned.forEach(o => {
    const t = nts.find(nt => nt.id === o.id);
    for (let i = 0; i < 2; i++) {
      const r = Math.random();
      if      (r < 0.15 && g >= 50)               { t.econ = clamp(t.econ + rng(3, 6), 0, 100); g -= 50; }
      else if (r < 0.30 && g >= 30)               { t.agri = clamp(t.agri + rng(3, 6), 0, 100); g -= 30; }
      else if (r < 0.65 && f >= 25) {
        const pick = Math.random();
        if      (pick < 0.3 && g >= 35) { t.army.cavalry  += CONSCRIPT_AMOUNTS.cavalry;  g -= 35; f -= 40; }
        else if (pick < 0.5 && g >= 60) { t.army.special  += CONSCRIPT_AMOUNTS.special;  g -= 60; f -= 50; }
        else if (pick < 0.7 && g >= 20) { t.army.archer   += CONSCRIPT_AMOUNTS.archer;   g -= 20; f -= 25; }
        else if (            g >= 10)   { t.army.infantry += CONSCRIPT_AMOUNTS.infantry;  g -= 10; f -= 30; }
        t.mor = clamp(t.mor - 4, 10, 100);
      } else if (t.mor < 50 && f >= 80) { t.mor = clamp(t.mor + rng(5, 10), 10, 100); f -= 80; }
    }
  });

  // Attack
  let queuedAttack = null;
  if (Math.random() < 0.35) {
    const cands = [];
    owned.forEach(o => {
      const t = nts.find(nt => nt.id === o.id);
      t.conn.forEach(cid => {
        const tgt = nts.find(nt => nt.id === cid);
        if (tgt && tgt.owner !== pid) {
          const my = totalArmy(t.army), th = totalArmy(tgt.army);
          if (my > th * 1.3) cands.push({ from: t.id, to: cid, r: my / th });
        }
      });
    });
    if (cands.length) {
      cands.sort((a, b) => b.r - a.r);
      const p = cands[0];
      const aT = nts.find(t => t.id === p.from);
      const dT = nts.find(t => t.id === p.to);

      if (dT.owner === "player") {
        // Defer player-territory attacks for tactical battle
        queuedAttack = { fromId: p.from, toId: p.to };
      } else {
        const res = simBattle(aT, dT, leaders);
        nts[nts.findIndex(t => t.id === p.from)] = { ...aT, army: { ...res.aa } };
        if (res.atkWin) {
          const occ = {};
          Object.keys(res.aa).forEach(k => { occ[k] = Math.floor(res.aa[k] * 0.3); });
          const di = nts.findIndex(t => t.id === p.to);
          nts[di] = { ...nts[di], owner: pid, army: occ, rebelImmune: 3 };
          nl = { ...nl, [p.to]: nl[p.from] };
          addLog(`⚔️ ${PLAYERS[pid].n}: ${aT.name}→${dT.name} 점령!`);
        } else {
          nts[nts.findIndex(t => t.id === p.to)] = { ...dT, army: { ...res.da } };
          addLog(`⚔️ ${PLAYERS[pid].n}: ${dT.name} 공격 실패`);
        }
      }
    }
  }

  return {
    ts: nts,
    gold: { ...gold, [pid]: Math.max(0, g) },
    food: { ...food, [pid]: Math.max(0, f) },
    leaders: nl,
    queuedAttack,
  };
}
