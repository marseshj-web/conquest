import {
  MAP_W, MAP_H, UNIT_TYPES, ARROW_ACC, ARROW_MULT, MUSKET_ACC, MUSKET_MULT,
  ARCHER_BONUS, MELEE_BONUS, MAX_ATK_PER, SEP_RADIUS, SEP_FORCE, TERRAIN_TYPES
} from './constants.js';
import {
  dmgA, dmgB, buildGrid, getNear, findTarget,
  deploy, clearArrows
} from './engine.js';

function countByType(arr) {
  const m = {};
  for (const s of arr) m[s.typeId] = (m[s.typeId] ?? 0) + 1;
  return m;
}

export function runSingleBattle(armyA, armyB, formulaType = 'B', map = null, countScale = 1.0, mults = {}) {
  const atkWarMult = mults.atkWarMult ?? 1.0;
  const defWarMult = mults.defWarMult ?? 1.0;
  const wallMult   = mults.wallMult   ?? 1.0;

  let pDeploy = deploy(armyA, "player", 0, countScale, atkWarMult, 1.0);
  let eDeploy = deploy(armyB, "ai", pDeploy.nextId, countScale, defWarMult, wallMult);
  const soldiers = [...pDeploy.soldiers, ...eDeploy.soldiers];
  const df = formulaType === "A" ? dmgA : dmgB;

  const playerDeployedByType = countByType(pDeploy.soldiers);
  const aiDeployedByType     = countByType(eDeploy.soldiers);

  let elapsedTime = 0;
  const FIXED_DT = 0.05;
  const TIMEOUT = 120;

  clearArrows();

  while (true) {
    elapsedTime += FIXED_DT;
    const dt = FIXED_DT;

    const alive = soldiers.filter(s => s.alive);
    const pA = alive.filter(s => s.team === "player");
    const eA = alive.filter(s => s.team === "ai");

    if (!pA.length || !eA.length) {
      return {
        winner: pA.length ? 'player' : eA.length ? 'ai' : 'draw',
        time: elapsedTime,
        survivors: pA.length > 0 ? pA.length : eA.length,
        playerSurvivorsByType: countByType(pA),
        aiSurvivorsByType:     countByType(eA),
        playerDeployedByType,
        aiDeployedByType,
      };
    }

    if (elapsedTime > TIMEOUT) {
      return {
        winner: 'timeout', time: elapsedTime, survivors: 0,
        playerSurvivorsByType: countByType(pA),
        aiSurvivorsByType:     countByType(eA),
        playerDeployedByType,
        aiDeployedByType,
      };
    }

    const cs = SEP_RADIUS * 2;
    const pGrid = buildGrid(pA, cs);
    const eGrid = buildGrid(eA, cs);

    for (const s of alive) s.attackersCount = 0;

    const sepX = new Float32Array(alive.length);
    const sepY = new Float32Array(alive.length);
    const idxMap = {};
    alive.forEach((s, i) => { idxMap[s.id] = i; });

    for (const s of alive) {
      const idx = idxMap[s.id];
      const grid = s.team === "player" ? pGrid : eGrid;
      const neighbors = getNear(grid, s, cs);
      for (const n of neighbors) {
        if (n.team !== s.team) continue;
        const dx = s.x - n.x, dy = s.y - n.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < SEP_RADIUS && dist > 0.1) {
          const f = (SEP_RADIUS - dist) / SEP_RADIUS * SEP_FORCE;
          sepX[idx] += (dx / dist) * f;
          sepY[idx] += (dy / dist) * f;
        } else if (dist < 0.1) {
          const a = Math.random() * Math.PI * 2;
          sepX[idx] += Math.cos(a) * SEP_FORCE * 0.3;
          sepY[idx] += Math.sin(a) * SEP_FORCE * 0.3;
        }
      }

      if (map && map.obstacles) {
        for (const obs of map.obstacles) {
          const dx = s.x - obs.x, dy = s.y - obs.y;
          const dist = Math.hypot(dx, dy);
          const avoidR = obs.radius + 10;
          if (dist < avoidR && dist > 0.1) {
            const f = (avoidR - dist) / avoidR * SEP_FORCE * 2;
            sepX[idx] += (dx / dist) * f;
            sepY[idx] += (dy / dist) * f;
          }
        }
      }
    }

    for (const s of alive) {
      const enemies = s.team === "player" ? eA : pA;
      if (!enemies.length) continue;

      if (!s.target || !s.target.alive) {
        s.target = findTarget(s, enemies);
      }

      if (!s.target) continue;

      const dx = s.target.x - s.x, dy = s.target.y - s.y;
      const dist = Math.hypot(dx, dy);
      const engR = (s.type === "ranged" || s.type === "siege") ? s.range : 16;
      const inRange = dist <= engR;
      const idx = idxMap[s.id];

      let mx = 0, my = 0;
      if (!inRange) {
        if (s.type === "melee" && s.target.attackersCount >= MAX_ATK_PER) {
          let alt = null, ad = Infinity;
          for (const e of enemies) {
            if (e.attackersCount >= MAX_ATK_PER) continue;
            const d = Math.hypot(e.x - s.x, e.y - s.y);
            if (d < ad) { ad = d; alt = e; }
          }
          if (alt) s.target = alt;
        }

        let speedMult = 1.0;
        if (map && map.terrain) {
          for (const tr of map.terrain) {
            if (s.x >= tr.x && s.x <= tr.x + tr.w && s.y >= tr.y && s.y <= tr.y + tr.h) {
              speedMult *= TERRAIN_TYPES[tr.type].speedMult;
            }
          }
        }

        mx = (dx / dist) * s.speed * speedMult * 40;
        my = (dy / dist) * s.speed * speedMult * 40;
      }

      s.x += (mx + sepX[idx]) * dt;
      s.y += (my + sepY[idx]) * dt;
      s.x = Math.max(5, Math.min(MAP_W - 5, s.x));
      s.y = Math.max(5, Math.min(MAP_H - 5, s.y));

      const curDist = Math.hypot(s.target.x - s.x, s.target.y - s.y);
      if (curDist <= engR || (s.type === "ranged" && curDist <= s.range)) {
        if (s.type === "melee") s.target.attackersCount++;
        s.atkCooldown -= dt;
        if (s.atkCooldown <= 0) {
          s.atkCooldown = s.atkSpeed;

          if (s.type === "ranged") {
            const ac = s.target.armorClass || "light";
            let hitChance, dmgMult;
            if (s.typeId === "musketeer") {
              hitChance = MUSKET_ACC[ac] || 0.6;
              dmgMult   = MUSKET_MULT[ac] || 1.0;
            } else {
              hitChance = ARROW_ACC[ac] || 0.6;
              dmgMult   = ARROW_MULT[ac] || 1.0;
              const abonus = ARCHER_BONUS[s.target.typeId];
              if (abonus) { hitChance += abonus.accBonus; dmgMult *= abonus.dmgMult; }
            }

            if (curDist > 180) hitChance *= 0.82;
            else if (curDist > 120) hitChance *= 0.9;
            hitChance = Math.min(hitChance, 0.95);

            if (Math.random() < hitChance) {
              const dmg = df(Math.round(s.atk * dmgMult), s.target.def);
              s.target.hp -= dmg;
              if (s.target.hp <= 0) { s.target.alive = false; s.target = null; }
            }
          } else if (s.type === "siege") {
            const splashR = UNIT_TYPES[s.typeId].splashRadius || 60;
            const tx = s.target.x, ty = s.target.y;
            const splashTargets = enemies.filter(e => e.alive && Math.hypot(e.x - tx, e.y - ty) <= splashR);
            for (const victim of splashTargets) {
              const dmg = df(s.atk, victim.def);
              victim.hp -= dmg;
              if (victim.hp <= 0) victim.alive = false;
            }
            if (s.target && !s.target.alive) s.target = null;
          } else {
            let av = s.atk;

            const bonusTable = MELEE_BONUS[s.typeId];
            if (bonusTable && bonusTable[s.target.typeId]) {
              av = Math.round(av * bonusTable[s.target.typeId]);
            }

            const chargeDef = UNIT_TYPES[s.typeId];
            if (chargeDef.chargeBonus && !s.hasCharged) {
              av = Math.round(av * chargeDef.chargeBonus);
              s.hasCharged = true;
            }

            const dmg = df(av, s.target.def);
            s.target.hp -= dmg;
            if (s.target.hp <= 0) { s.target.alive = false; s.target = null; }
          }
        }
      }
    }
  }
}

export function runBatch(nameA, armyA, nameB, armyB, iters = 100, formulaType = 'B', map = null, countScale = 1.0) {
  let aWin = 0, bWin = 0, draws = 0, timeouts = 0;
  let tA = 0, tB = 0;
  const durations = [];
  const aSurvArr = [], bSurvArr = [];

  for (let i = 0; i < iters; i++) {
    const res = runSingleBattle(armyA, armyB, formulaType, map, countScale);
    durations.push(res.time);
    if (res.winner === 'player') { aWin++; tA += res.survivors; aSurvArr.push(res.survivors); }
    else if (res.winner === 'ai') { bWin++; tB += res.survivors; bSurvArr.push(res.survivors); }
    else if (res.winner === 'timeout') { timeouts++; }
    else { draws++; }
  }

  const aAvgSurv = aWin > 0 ? Math.round(tA / aWin) : 0;
  const bAvgSurv = bWin > 0 ? Math.round(tB / bWin) : 0;
  const avgDuration = durations.reduce((s, x) => s + x, 0) / durations.length;

  const stdDev = (arr, mean) => {
    if (arr.length < 2) return 0;
    return Math.round(Math.sqrt(arr.reduce((s, x) => s + (x - mean) ** 2, 0) / arr.length));
  };

  return {
    matchup: `${nameA} vs ${nameB}`,
    aWinRate: (aWin / iters) * 100,
    bWinRate: (bWin / iters) * 100,
    drawRate: (draws / iters) * 100,
    timeoutRate: (timeouts / iters) * 100,
    aAvgSurv,
    bAvgSurv,
    avgDuration,
    aStdDev: stdDev(aSurvArr, aAvgSurv),
    bStdDev: stdDev(bSurvArr, bAvgSurv),
  };
}

// Controller factory for async variable sweep (one unit type, vary squad count)
export function runVariableSweep(unitType, opponentArmy, itersPerPoint, formulaType, map, onProgress) {
  const maxSquads = Math.floor(MAX_GOLD / UNIT_TYPES[unitType].cost);
  let cancelled = false;

  function start() {
    const results = [];
    let idx = 0;

    function runNext() {
      if (cancelled) return;
      const count = idx + 1;
      const armyA = Array(count).fill(unitType);
      const res = runBatch('내 부대', armyA, '상대', opponentArmy, itersPerPoint, formulaType, map);
      results.push({ squadCount: count, ...res });
      idx++;
      onProgress(idx, maxSquads, [...results]);
      if (idx < maxSquads) setTimeout(runNext, 0);
    }
    setTimeout(runNext, 0);
  }

  return { start, cancel: () => { cancelled = true; } };
}

// Controller factory for round-robin tournament between named army slots
export function runTournament(slots, iters, formulaType, map, onProgress) {
  const n = slots.length;
  const pairs = [];
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      if (i !== j) pairs.push([i, j]);

  let cancelled = false;
  const matrix = Array.from({ length: n }, () => Array(n).fill(null));

  function start() {
    let pairIdx = 0;

    function runNext() {
      if (cancelled) return;
      const [i, j] = pairs[pairIdx];
      const res = runBatch(slots[i].name, slots[i].army, slots[j].name, slots[j].army, iters, formulaType, map);
      matrix[i][j] = res.aWinRate;
      pairIdx++;
      onProgress(pairIdx, pairs.length, matrix.map(r => [...r]));
      if (pairIdx < pairs.length) setTimeout(runNext, 0);
    }
    setTimeout(runNext, 0);
  }

  return { start, cancel: () => { cancelled = true; } };
}

// Controller factory for terrain effect study (same armies, all maps)
export function runTerrainStudy(armyA, armyB, maps, iters, formulaType, onProgress) {
  let cancelled = false;
  const results = [];

  function start() {
    let idx = 0;

    function runNext() {
      if (cancelled) return;
      const m = maps[idx];
      const res = runBatch('내 부대', armyA, '상대', armyB, iters, formulaType, m);
      results.push({ mapId: m.id, mapName: m.name, ...res });
      idx++;
      onProgress(idx, maps.length, [...results]);
      if (idx < maps.length) setTimeout(runNext, 0);
    }
    setTimeout(runNext, 0);
  }

  return { start, cancel: () => { cancelled = true; } };
}

export function runComprehensiveSimulation(armyA, patterns, itersPerPattern = 10, formulaType = 'B', map = null, countScale = 1.0) {
  const results = [];
  let totalAWin = 0;
  let totalBWin = 0;
  let totalAAvgSurv = 0;

  for (const pattern of patterns) {
    const res = runBatch("내 부대", armyA, pattern.name, pattern.army, itersPerPattern, formulaType, map, countScale);
    results.push({
      name: pattern.name,
      aWinRate: res.aWinRate,
      bWinRate: res.bWinRate,
      aAvgSurv: res.aAvgSurv,
      bAvgSurv: res.bAvgSurv,
    });
    totalAWin += res.aWinRate;
    totalBWin += res.bWinRate;
    totalAAvgSurv += res.aAvgSurv;
  }
  
  const numPatterns = patterns.length;
  return {
    overallAWinRate: totalAWin / numPatterns,
    overallBWinRate: totalBWin / numPatterns,
    overallAAvgSurv: Math.round(totalAAvgSurv / numPatterns),
    details: results
  };
}

export const strats = {
  "물량형": Array(20).fill('militia'),
  "균형형": [...Array(4).fill('heavyInf'), ...Array(3).fill('spearmen'), ...Array(6).fill('militia')],
  "정예형": Array(5).fill('knights'),
  "대기병형": [...Array(5).fill('spearmen'), ...Array(4).fill('archers')],
  "궁수형": [...Array(7).fill('archers'), ...Array(3).fill('militia')]
};

export function parseArmy(arg) {
  if (strats[arg]) return strats[arg];
  const army = [];
  const parts = arg.split(',');
  for (const p of parts) {
    const [unit, count] = p.split(':');
    const c = parseInt(count) || 1;
    if (UNIT_TYPES[unit]) {
      army.push(...Array(c).fill(unit));
    }
  }
  return army;
}