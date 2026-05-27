import { UNIT_TYPES, MAX_GOLD, MAP_W, MAP_H } from './constants.js';

export function dmgA(a, d) { return Math.max(1, Math.round(a - d / 2 + (Math.random() * 4 - 2))); }
export function dmgB(a, d) { return Math.max(1, Math.round((a * a) / (a + d) + (Math.random() * 2 - 1))); }

export function getAIPatterns(maxGold = MAX_GOLD) {
  const p = [];
  const g = maxGold;
  
  const createArmy = (w) => {
    let cg = g; const a = [];
    const ks = Object.keys(w);
    const tw = Object.values(w).reduce((acc, b) => acc + b, 0);
    let t = 0;
    while (cg >= 500 && t < 100) {
      let r = Math.random() * tw, ch = "militia";
      for (const k of ks) { r -= w[k]; if (r <= 0) { ch = k; break; } }
      if (UNIT_TYPES[ch].cost <= cg) { a.push(ch); cg -= UNIT_TYPES[ch].cost; }
      t++;
    }
    return a;
  };

  // 10 distinct patterns
  p.push({ name: "보병 물량전", army: createArmy({ militia: 8, spearmen: 2, heavyInf: 0, archers: 0, knights: 0 }) });
  p.push({ name: "궁수 극대화", army: createArmy({ militia: 1, spearmen: 1, heavyInf: 1, archers: 7, knights: 0 }) });
  p.push({ name: "중갑 방어선", army: createArmy({ militia: 0, spearmen: 4, heavyInf: 6, archers: 0, knights: 0 }) });
  p.push({ name: "기사단 돌격", army: createArmy({ militia: 1, spearmen: 0, heavyInf: 0, archers: 0, knights: 9 }) });
  p.push({ name: "기본 밸런스", army: createArmy({ militia: 3, spearmen: 3, heavyInf: 4, archers: 3, knights: 2 }) });
  p.push({ name: "대기병 진형", army: createArmy({ militia: 2, spearmen: 6, heavyInf: 0, archers: 2, knights: 0 }) });
  p.push({ name: "기동 타격대", army: createArmy({ militia: 0, spearmen: 0, heavyInf: 2, archers: 4, knights: 4 }) });
  p.push({ name: "궁수+창병 방진", army: createArmy({ militia: 0, spearmen: 5, heavyInf: 0, archers: 5, knights: 0 }) });
  p.push({ name: "가성비 조합", army: createArmy({ militia: 5, spearmen: 0, heavyInf: 0, archers: 3, knights: 2 }) });
  p.push({ name: "엘리트 조합", army: createArmy({ militia: 0, spearmen: 0, heavyInf: 5, archers: 0, knights: 5 }) });
  p.push({ name: "경기병 기동전", army: createArmy({ lightCavalry: 6, archers: 3, militia: 1 }) });
  p.push({ name: "머스켓 방어선", army: createArmy({ musketeer: 4, heavyInf: 4, militia: 2 }) });
  p.push({ name: "투석기 포격전", army: createArmy({ catapult: 3, lightCavalry: 3, spearmen: 2, militia: 1 }) });

  return p;
}

export function genAI(maxGold = MAX_GOLD) {
  const patterns = getAIPatterns(maxGold);
  return patterns[Math.floor(Math.random() * patterns.length)].army;
}

export function findTarget(soldier, enemies) {
  const def = UNIT_TYPES[soldier.typeId];
  const prio = def.targetPriority;

  if (prio === "prefer_knights") {
    let bestKnight = null, bestKD = Infinity;
    for (const e of enemies) {
      if (e.typeId === "knights") {
        const d = Math.hypot(e.x - soldier.x, e.y - soldier.y);
        if (d < 200 && d < bestKD) { bestKD = d; bestKnight = e; }
      }
    }
    if (bestKnight) return bestKnight;
    return findNearest(soldier, enemies);
  }

  // Archers no longer try to run away or prefer light specifically in logic, 
  // they just attack nearest unless we want to keep prefer_light targeting.
  // Kept prefer_light targeting but removed the run-away logic in BattlePhase and simulatorCore.
  if (prio === "prefer_light") {
    let bestLight = null, bestLD = Infinity;
    let bestAny = null, bestAD = Infinity;
    for (const e of enemies) {
      const d = Math.hypot(e.x - soldier.x, e.y - soldier.y);
      if (d < bestAD) { bestAD = d; bestAny = e; }
      if ((e.armorClass === "light" || e.armorClass === "medium") && d < soldier.range + 50) {
        if (d < bestLD) { bestLD = d; bestLight = e; }
      }
    }
    if (bestLight) return bestLight;
    return bestAny;
  }

  if (prio === "hunt_ranged") {
    let bestArcher = null, bestMusk = null, bdA = Infinity, bdM = Infinity;
    for (const e of enemies) {
      const d = Math.hypot(e.x - soldier.x, e.y - soldier.y);
      if (e.typeId === "archers"   && d < bdA) { bdA = d; bestArcher = e; }
      if (e.typeId === "musketeer" && d < bdM) { bdM = d; bestMusk   = e; }
    }
    if (bestArcher) return bestArcher;
    if (bestMusk)   return bestMusk;
    return findNearest(soldier, enemies);
  }

  if (prio === "prefer_heavy") {
    let bestHeavy = null, bdH = Infinity;
    for (const e of enemies) {
      if (e.armorClass === "heavy" || e.armorClass === "plate") {
        const d = Math.hypot(e.x - soldier.x, e.y - soldier.y);
        if (d < soldier.range + 80 && d < bdH) { bdH = d; bestHeavy = e; }
      }
    }
    if (bestHeavy) return bestHeavy;
    return findNearest(soldier, enemies);
  }

  if (prio === "prefer_cluster") {
    const splashR = UNIT_TYPES[soldier.typeId].splashRadius || 60;
    const inRangeEnemies = enemies.filter(e => Math.hypot(e.x - soldier.x, e.y - soldier.y) <= soldier.range);
    const pool = inRangeEnemies.length > 0 ? inRangeEnemies : enemies;
    let bestTarget = null, bestScore = -1;
    for (const e of pool) {
      let score = 0;
      for (const e2 of enemies) {
        if (Math.hypot(e.x - e2.x, e.y - e2.y) <= splashR) score++;
      }
      if (score > bestScore) { bestScore = score; bestTarget = e; }
    }
    return bestTarget || findNearest(soldier, enemies);
  }

  return findNearest(soldier, enemies);
}

export function findNearest(s, enemies) {
  let best = null, bd = Infinity;
  for (const e of enemies) {
    const d = Math.hypot(e.x - s.x, e.y - s.y);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

export function deploy(armyList, team, startId = 0, countScale = 1.0, warMult = 1.0, wallMult = 1.0) {
  const soldiers = [];
  const melee     = armyList.filter(t => UNIT_TYPES[t]?.type === "melee" && t !== "knights" && t !== "lightCavalry" && t !== "samurai" && t !== "warElephant");
  const lightCav  = armyList.filter(t => t === "lightCavalry" || t === "cavArcher" || t === "cavArcherElite");
  const knight    = armyList.filter(t => t === "knights" || t === "samurai" || t === "warElephant");
  const ranged    = armyList.filter(t => UNIT_TYPES[t]?.type === "ranged" && t !== "cavArcher" && t !== "cavArcherElite");
  const siege     = armyList.filter(t => UNIT_TYPES[t]?.type === "siege");

  const MARGIN = 18;
  const USABLE = MAP_H - MARGIN * 2;
  const MIN_SP = 24;
  let nid = startId;

  const placeRow = (types, xBase, xRankGap) => {
    if (!types.length) return;
    const toPlace = [];
    for (const tid of types) {
      const scaledCount = Math.max(1, Math.round(UNIT_TYPES[tid].count * countScale));
      for (let i = 0; i < scaledCount; i++) toPlace.push(tid);
    }
    
    const maxPerCol = Math.max(1, Math.floor(USABLE / MIN_SP));
    const ranks = Math.max(1, Math.ceil(toPlace.length / maxPerCol));
    const perCol = Math.ceil(toPlace.length / ranks);
    const actualYSpace = toPlace.length > 1 ? Math.min(MIN_SP * 1.5, USABLE / Math.max(1, perCol - 1)) : MIN_SP;
    
    const totalH = actualYSpace * Math.max(0, perCol - 1);
    const yStart = MARGIN + Math.max(0, (USABLE - totalH) / 2);

    for (let i = 0; i < toPlace.length; i++) {
      const tid = toPlace[i];
      const def = UNIT_TYPES[tid];
      const rank = Math.floor(i / perCol);
      const file = i % perCol;
      const dir = team === "player" ? 1 : -1;
      
      let x = xBase + rank * xRankGap * dir;
      let y = yStart + file * actualYSpace;
      
      x += (Math.random() - 0.5) * 6;
      y += (Math.random() - 0.5) * 6;
      
      x = Math.max(8, Math.min(MAP_W - 8, x));
      y = Math.max(8, Math.min(MAP_H - 8, y));

      const baseHp  = Math.round(def.hp  * (team === 'ai' ? wallMult : 1.0));
      const baseAtk = Math.round(def.atk * warMult);
      soldiers.push({
        id: nid++, typeId: tid, team, x, y,
        hp: baseHp, maxHp: baseHp, atk: baseAtk, def: def.def,
        speed: def.speed, range: def.range, atkSpeed: def.atkSpeed,
        atkCooldown: Math.random() * 0.5, target: null, alive: true,
        hasCharged: false, attackersCount: 0, type: def.type,
        armorClass: def.armorClass,
      });
    }
  };

  if (team === "player") {
    placeRow(siege,    40, 28);
    placeRow(ranged,   76, 38);
    placeRow(knight,  184, 46);
    placeRow(lightCav,200, 40);
    placeRow(melee,   242, 38);
  } else {
    placeRow(siege,    MAP_W - 30,  22);
    placeRow(ranged,   MAP_W - 60,  30);
    placeRow(knight,   MAP_W - 145, 36);
    placeRow(lightCav, MAP_W - 160, 32);
    placeRow(melee,    MAP_W - 190, 30);
  }
  return { soldiers, nextId: nid };
}

export function buildGrid(soldiers, cs) {
  const g = {};
  for (const s of soldiers) {
    if (!s.alive) continue;
    const k = `${Math.floor(s.x / cs)},${Math.floor(s.y / cs)}`;
    if (!g[k]) g[k] = [];
    g[k].push(s);
  }
  return g;
}

export function getNear(grid, s, cs) {
  const cx = Math.floor(s.x / cs), cy = Math.floor(s.y / cs);
  const r = [];
  for (let dx = -1; dx <= 1; dx++)
    for (let dy = -1; dy <= 1; dy++) {
      const arr = grid[`${cx + dx},${cy + dy}`];
      if (arr) for (const n of arr) if (n.id !== s.id && n.alive) r.push(n);
    }
  return r;
}

export let arrows = [];
export function fireArrow(f, t, hit) {
  const m = hit ? 5 : 22 + Math.random() * 18;
  arrows.push({
    x: f.x, y: f.y,
    tx: t.x + (Math.random() - 0.5) * m * (hit ? 1 : 2),
    ty: t.y + (Math.random() - 0.5) * m * (hit ? 1 : 2),
    life: 0.2, ml: 0.2, hit,
  });
}
export function updateArrows(dt) {
  arrows = arrows.filter(a => { a.life -= dt; return a.life > 0; });
}
export function clearArrows() {
  arrows = [];
}
