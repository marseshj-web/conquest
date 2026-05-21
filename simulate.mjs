// Conquest simulation — 6 independent AIs + new map connections
// Player starts at 고려 (korea), runs 3 games x 50 turns

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rng   = (a, b)    => Math.floor(Math.random() * (b - a + 1)) + a;
const sum   = (arr, fn) => arr.reduce((s, x) => s + fn(x), 0);
const totalArmy = a     => a.infantry + a.archer + a.cavalry + a.siege + a.special;

const PLAYERS = {
  player:         { n: "플레이어(고려)" },
  ai_mongol:      { n: "몽골"           },
  ai_manchu:      { n: "만주국"         },
  ai_north_china: { n: "금나라"         },
  ai_india:       { n: "인도"           },
  ai_persia:      { n: "페르시아"       },
  ai_arabia:      { n: "아라비아"       },
};
const AI_IDS = ["ai_mongol","ai_manchu","ai_north_china","ai_india","ai_persia","ai_arabia"];

const SEASONS = ["봄","여름","가을","겨울"];
const CONSCRIPT_AMOUNTS = { infantry: 100, archer: 70, cavalry: 35, siege: 10, special: 50 };
const FOOD_PER_SOLDIER  = 0.5;
const GOLD_INCOME_DIV   = 1500;
const FOOD_INCOME_DIV   = 1000;
const COUNTER           = { infantry: "cavalry", cavalry: "archer", archer: "infantry" };
const COUNTER_MULT      = 1.3;

const UNITS = {
  infantry: { atk: 7,  rng: 0, mob: 5,  siege: false },
  archer:   { atk: 4,  rng: 8, mob: 6,  siege: false },
  cavalry:  { atk: 8,  rng: 0, mob: 8,  siege: false },
  siege:    { atk: 2,  rng: 8, mob: 4,  siege: true  },
};
const SPECIALS = {
  mongol:      { atk: 8,  rng: 8,  mob: 11, siege: false, type: "cavArcher" },
  manchu:      { atk: 6,  rng: 6,  mob: 9,  siege: false, type: "cavArcher" },
  korea:       { atk: 8,  rng: 0,  mob: 5,  siege: false, type: "infantry"  },
  japan:       { atk: 10, rng: 6,  mob: 9,  siege: false, type: "cavalry"   },
  north_china: { atk: 4,  rng: 6,  mob: 5,  siege: true,  type: "siege"     },
  south_china: { atk: 4,  rng: 8,  mob: 5,  siege: false, type: "archer"    },
  tibet:       { atk: 6,  rng: 0,  mob: 6,  siege: false, type: "infantry"  },
  india:       { atk: 10, rng: 0,  mob: 5,  siege: false, type: "cavalry"   },
  persia:      { atk: 6,  rng: 10, mob: 10, siege: false, type: "cavArcher" },
  arabia:      { atk: 7,  rng: 6,  mob: 9,  siege: false, type: "cavArcher" },
  east_europe: { atk: 8,  rng: 0,  mob: 7,  siege: false, type: "cavalry"   },
  west_europe: { atk: 10, rng: 0,  mob: 9,  siege: false, type: "cavalry"   },
};

const GRADE_VALUES = {
  charm: { A: { passive: 3 }, B: { passive: 1 }, C: { passive: 0 }, D: { passive: -1 } },
  war:   { A: 1.30, B: 1.15, C: 1.00, D: 0.85 },
};

function freshTerrs() {
  return [
    { id: "mongol",      name: "몽골 초원", pop: 6000,  econ: 30, agri: 20, mor: 80, wall: 30,
      army: { infantry: 100, archer: 50,  cavalry: 200, siege: 20, special: 300 }, owner: "ai_mongol",
      conn: ["manchu","north_china","tibet","persia","east_europe"] },
    { id: "manchu",      name: "만주",     pop: 7500,  econ: 40, agri: 45, mor: 70, wall: 40,
      army: { infantry: 150, archer: 80,  cavalry: 100, siege: 10, special: 150 }, owner: "ai_manchu",
      conn: ["mongol","korea","north_china"] },
    { id: "korea",       name: "고려",     pop: 9000,  econ: 50, agri: 55, mor: 75, wall: 60,
      army: { infantry: 200, archer: 60,  cavalry: 50,  siege: 15, special: 200 }, owner: "player",
      conn: ["manchu","japan"] },
    { id: "japan",       name: "일본",     pop: 11000, econ: 60, agri: 50, mor: 80, wall: 55,
      army: { infantry: 80,  archer: 64,  cavalry: 64,  siege: 8,  special: 200 }, owner: null,
      conn: ["korea","north_china","south_china"] },
    { id: "north_china", name: "화북",     pop: 22000, econ: 85, agri: 75, mor: 65, wall: 70,
      army: { infantry: 200, archer: 100, cavalry: 150, siege: 50, special: 200 }, owner: "ai_north_china",
      conn: ["mongol","manchu","south_china","tibet","japan"] },
    { id: "south_china", name: "화남",     pop: 20000, econ: 80, agri: 80, mor: 70, wall: 45,
      army: { infantry: 120, archer: 96,  cavalry: 64,  siege: 24, special: 120 }, owner: null,
      conn: ["north_china","india","tibet","japan"] },
    { id: "tibet",       name: "티베트",   pop: 4000,  econ: 15, agri: 15, mor: 85, wall: 70,
      army: { infantry: 80,  archer: 24,  cavalry: 24,  siege: 4,  special: 160 }, owner: null,
      conn: ["mongol","north_china","south_china","india"] },
    { id: "india",       name: "인도",     pop: 19000, econ: 65, agri: 75, mor: 70, wall: 40,
      army: { infantry: 200, archer: 80,  cavalry: 100, siege: 20, special: 200 }, owner: "ai_india",
      conn: ["tibet","south_china","persia","arabia"] },
    { id: "persia",      name: "페르시아", pop: 12500, econ: 55, agri: 45, mor: 70, wall: 50,
      army: { infantry: 150, archer: 60,  cavalry: 120, siege: 20, special: 200 }, owner: "ai_persia",
      conn: ["mongol","india","arabia","east_europe"] },
    { id: "arabia",      name: "아라비아", pop: 9000,  econ: 70, agri: 25, mor: 75, wall: 35,
      army: { infantry: 100, archer: 70,  cavalry: 80,  siege: 15, special: 180 }, owner: "ai_arabia",
      conn: ["india","persia","east_europe","west_europe"] },
    { id: "east_europe", name: "동유럽",   pop: 10000, econ: 45, agri: 50, mor: 70, wall: 55,
      army: { infantry: 120, archer: 48,  cavalry: 80,  siege: 16, special: 144 }, owner: null,
      conn: ["persia","arabia","west_europe","mongol"] },
    { id: "west_europe", name: "서유럽",   pop: 15000, econ: 75, agri: 65, mor: 80, wall: 65,
      army: { infantry: 160, archer: 80,  cavalry: 120, siege: 24, special: 200 }, owner: null,
      conn: ["east_europe","arabia"] },
  ].map(t => ({ ...t, army: { ...t.army } }));
}

function freshResources() {
  return {
    gold: { player: 500, ai_mongol: 280, ai_manchu: 250, ai_north_china: 380,
            ai_india: 300, ai_persia: 350, ai_arabia: 320 },
    food: { player: 2000, ai_mongol: 900, ai_manchu: 750, ai_north_china: 850,
            ai_india: 950, ai_persia: 750, ai_arabia: 650 },
  };
}

function assignLeaders(territories) {
  const grades = ["A","B","C","D"];
  const result = {};
  territories.forEach(t => {
    result[t.id] = { war: grades[Math.floor(Math.random()*4)], charm: grades[Math.floor(Math.random()*4)] };
  });
  return result;
}

function dealDmg(src, tgt, wallMult, isDefending, srcId, tgtId, warMult = 1.0) {
  const sp = SPECIALS[srcId];
  const dm = { infantry: 0, archer: 0, cavalry: 0, siege: 0, special: 0 };
  const calc = (cnt, unit, key) => {
    if (cnt <= 0) return;
    const av   = unit.rng > 0 ? Math.max(unit.atk, unit.rng) : unit.atk;
    const mobM = Math.max(1, Math.floor(unit.mob / 3));
    let base   = cnt * av * mobM * warMult * rng(70, 100) / 100;
    if (isDefending && !unit.siege) base *= wallMult;
    const tot  = totalArmy(tgt);
    if (tot <= 0) return;
    Object.keys(tgt).forEach(tk => {
      if (tgt[tk] <= 0) return;
      let mult = 1;
      const uT = key === "special" ? sp.type : key;
      const tT = tk === "special" ? SPECIALS[tgtId].type : tk;
      if (COUNTER[uT] === tT) mult = COUNTER_MULT;
      if (COUNTER[tT] === uT) mult = 1 / COUNTER_MULT;
      dm[tk] += base * (tgt[tk] / tot) * mult;
    });
  };
  calc(src.infantry, UNITS.infantry, "infantry");
  calc(src.archer,   UNITS.archer,   "archer");
  calc(src.cavalry,  UNITS.cavalry,  "cavalry");
  calc(src.siege,    UNITS.siege,    "siege");
  calc(src.special,  sp,             "special");
  return dm;
}

function simBattle(atkTerr, defTerr, leaders) {
  const aa = { ...atkTerr.army };
  const da = { ...defTerr.army };
  const atkWarMult = GRADE_VALUES.war[leaders[atkTerr.id]?.war ?? "C"];
  const defWarMult = GRADE_VALUES.war[leaders[defTerr.id]?.war ?? "C"];
  const wallMult   = 1 + defTerr.wall / 200;
  for (let r = 1; r <= 5; r++) {
    if (totalArmy(aa) <= 0 || totalArmy(da) <= 0) break;
    const ad = dealDmg(aa, da, wallMult, false, atkTerr.id, defTerr.id, atkWarMult);
    const dd = dealDmg(da, aa, wallMult, true,  defTerr.id, atkTerr.id, defWarMult);
    Object.keys(da).forEach(k => { da[k] -= Math.min(da[k], Math.floor(ad[k] / 12)); });
    Object.keys(aa).forEach(k => { aa[k] -= Math.min(aa[k], Math.floor(dd[k] / 12)); });
    if (totalArmy(aa) <= 0 || totalArmy(da) <= 0) break;
  }
  return { atkWin: totalArmy(aa) > totalArmy(da), aa, da };
}

function aiTurn(ts, pid, gold, food, events, leaders) {
  const owned = ts.filter(t => t.owner === pid);
  if (!owned.length) return { ts, gold, food, leaders };

  let nl  = { ...leaders };
  let nts = ts.map(t => ({ ...t, army: { ...t.army } }));
  let g = gold[pid] || 0;
  let f = food[pid] || 0;

  const totalTroops = sum(nts.filter(t => t.owner === pid), t => totalArmy(t.army));
  if (f < totalTroops && g > 150) { const buy = Math.min(80, g); f += Math.floor(buy * 1.5); g -= buy; }
  if (g < 60 && f > 600)          { const sell = Math.min(150, f); g += Math.floor(sell * 0.6); f -= sell; }

  owned.forEach(o => {
    const t = nts.find(nt => nt.id === o.id);
    for (let i = 0; i < 2; i++) {
      const r = Math.random();
      if      (r < 0.15 && g >= 50)               { t.econ = clamp(t.econ + rng(3,6), 0, 100); g -= 50; }
      else if (r < 0.30 && g >= 30)               { t.agri = clamp(t.agri + rng(3,6), 0, 100); g -= 30; }
      else if (r < 0.65 && f >= 25) {
        const pick = Math.random();
        if      (pick < 0.3 && g >= 35) { t.army.cavalry  += CONSCRIPT_AMOUNTS.cavalry;  g -= 35; f -= 40; }
        else if (pick < 0.5 && g >= 60) { t.army.special  += CONSCRIPT_AMOUNTS.special;  g -= 60; f -= 50; }
        else if (pick < 0.7 && g >= 20) { t.army.archer   += CONSCRIPT_AMOUNTS.archer;   g -= 20; f -= 25; }
        else if (g >= 10)               { t.army.infantry += CONSCRIPT_AMOUNTS.infantry;  g -= 10; f -= 30; }
        t.mor = clamp(t.mor - 4, 10, 100);
      } else if (t.mor < 50 && f >= 80) { t.mor = clamp(t.mor + rng(5,10), 10, 100); f -= 80; }
    }
  });

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
      const res = simBattle(aT, dT, nl);
      nts[nts.findIndex(t => t.id === p.from)] = { ...aT, army: { ...res.aa } };
      if (res.atkWin) {
        const occ = {};
        Object.keys(res.aa).forEach(k => { occ[k] = Math.floor(res.aa[k] * 0.3); });
        const di = nts.findIndex(t => t.id === p.to);
        nts[di] = { ...nts[di], owner: pid, army: occ, rebelImmune: 3 };
        nl = { ...nl, [p.to]: nl[p.from] };
        events.push(`  ⚔️ ${PLAYERS[pid].n}: ${aT.name}→${dT.name} 점령!`);
      } else {
        nts[nts.findIndex(t => t.id === p.to)] = { ...dT, army: { ...res.da } };
      }
    }
  }
  return { ts: nts, gold: { ...gold, [pid]: Math.max(0,g) }, food: { ...food, [pid]: Math.max(0,f) }, leaders: nl };
}

function processTurnEnd(terrs, gold, food, season, events, leaders) {
  let ts = terrs.map(t => ({ ...t, army: { ...t.army } }));
  const ng = { ...gold };
  const nf = { ...food };
  let nl = { ...leaders };

  // 반란 유예 카운터 감소
  ts = ts.map(t => t.rebelImmune > 0 ? { ...t, rebelImmune: t.rebelImmune - 1 } : t);

  Object.keys(PLAYERS).forEach(pid => {
    const troops = sum(ts.filter(t => t.owner === pid), t => totalArmy(t.army));
    nf[pid] = Math.max(0, (nf[pid] || 0) - Math.floor(troops * FOOD_PER_SOLDIER));
  });

  const ns = (season + 1) % 4;

  ts = ts.map(t => {
    if (!t.owner) return t;
    const passive = GRADE_VALUES.charm[leaders[t.id]?.charm ?? "C"].passive;
    return passive !== 0 ? { ...t, mor: clamp(t.mor + passive, 10, 100) } : t;
  });

  const morMult = t => 0.5 + t.mor / 200;

  if (ns === 0) {
    Object.keys(PLAYERS).forEach(pid => {
      const inc = sum(ts.filter(t => t.owner === pid),
        t => Math.floor(t.econ * t.pop / GOLD_INCOME_DIV * morMult(t)));
      ng[pid] = (ng[pid] || 0) + inc;
    });
    ts = ts.map(t => t.owner
      ? { ...t, pop: Math.min(50000, t.pop + Math.floor(t.pop * (t.mor / 100) * 0.03)) }
      : t);
  }

  if (ns === 2) {
    Object.keys(PLAYERS).forEach(pid => {
      const inc = sum(ts.filter(t => t.owner === pid),
        t => Math.floor(t.agri * t.pop / FOOD_INCOME_DIV * morMult(t)));
      nf[pid] = (nf[pid] || 0) + inc;
    });
  }

  if (ns === 3) {
    ts = ts.map(t => {
      if (!t.owner || (nf[t.owner] || 0) > 0) return t;
      return {
        ...t, mor: clamp(t.mor - 8, 10, 100),
        army: { infantry: Math.floor(t.army.infantry * 0.9), archer: Math.floor(t.army.archer * 0.9),
                cavalry: Math.floor(t.army.cavalry * 0.9),  siege: t.army.siege,
                special: Math.floor(t.army.special * 0.9) },
      };
    });
  }

  // Rebellion (정복 직후 3턴 유예)
  ts = ts.map(t => {
    if (!t.owner || t.mor >= 30 || t.rebelImmune > 0) return t;
    const chance = (30 - t.mor) * 0.02;
    if (Math.random() > chance) return t;
    const rebelSize = Math.floor(t.pop * rng(10, 25) / 1000);
    const garrison  = totalArmy(t.army);
    if (garrison >= rebelSize * 2) {
      return { ...t, mor: clamp(t.mor - 3, 10, 100),
        army: Object.fromEntries(Object.keys(t.army).map(k => [k, Math.floor(t.army[k] * 0.9)])) };
    } else if (garrison >= rebelSize) {
      return { ...t, mor: clamp(t.mor - 8, 10, 100),
        army: Object.fromEntries(Object.keys(t.army).map(k => [k, Math.floor(t.army[k] * 0.75)])) };
    } else {
      events.push(`  💥 반란! ${t.name} (${PLAYERS[t.owner]?.n}) → 공백지로`);
      delete nl[t.id];
      return { ...t, owner: null, mor: clamp(t.mor + 15, 10, 100),
        army: { infantry: rebelSize, archer: 0, cavalry: 0, siege: 0, special: 0 } };
    }
  });

  // Neutral recovery
  ts = ts.map(t => !t.owner
    ? { ...t, army: { ...t.army, infantry: t.army.infantry + rng(10,25), archer: t.army.archer + rng(5,15) },
        mor: clamp(t.mor + 2, 10, 100) }
    : t);

  return { ts, ng, nf, ns, nl };
}

function ownerMap(ts) {
  const c = {};
  Object.keys(PLAYERS).forEach(pid => { c[pid] = 0; });
  ts.forEach(t => { if (t.owner && c[t.owner] !== undefined) c[t.owner]++; });
  return c;
}

function statusLine(cnt, ts) {
  const parts = Object.entries(PLAYERS)
    .filter(([pid]) => cnt[pid] > 0)
    .map(([pid, p]) => `${p.n}:${cnt[pid]}`);
  const neutral = ts.filter(t => !t.owner).length;
  if (neutral > 0) parts.push(`공백:${neutral}`);
  return parts.join("  ");
}

function runGame(gameNum) {
  console.log(`\n${"=".repeat(65)}`);
  console.log(`게임 ${gameNum}  (플레이어 = 고려 시작, 6개국 독립 AI)`);
  console.log("=".repeat(65));

  let ts       = freshTerrs();
  const res    = freshResources();
  let gold     = res.gold;
  let food     = res.food;
  let season   = 0;
  let year     = 1206;
  let leaders  = assignLeaders(ts);
  let winner   = null;
  let endTurn  = 50;

  // 턴별 이벤트 요약 출력 (전투 or 반란 있는 턴 + 10의 배수 턴)
  for (let turn = 1; turn <= 50; turn++) {
    const events = [];

    // Player AI
    const p = aiTurn(ts, "player", gold, food, events, leaders);
    ts = p.ts; gold = p.gold; food = p.food; leaders = p.leaders;

    // 6개 독립 AI
    for (const pid of ["ai_mongol","ai_manchu","ai_north_china","ai_india","ai_persia","ai_arabia"]) {
      const r = aiTurn(ts, pid, gold, food, events, leaders);
      ts = r.ts; gold = r.gold; food = r.food; leaders = r.leaders;
    }

    const econ = processTurnEnd(ts, gold, food, season, events, leaders);
    ts = econ.ts; gold = econ.ng; food = econ.nf; leaders = econ.nl;
    season = econ.ns;
    if (season === 0) year++;

    const cnt = ownerMap(ts);
    const hasBattle = events.some(e => e.includes("⚔️") || e.includes("💥"));

    if (hasBattle || turn % 10 === 0) {
      console.log(`\n[${String(turn).padStart(2)}턴 ${year}년 ${SEASONS[season]}] ${statusLine(cnt, ts)}`);
      events.forEach(e => console.log(e));
    }

    // 종료 조건
    const pc = ts.filter(t => t.owner === "player").length;
    if (pc === 0) { winner = "플레이어 멸망"; endTurn = turn; break; }
    if (pc === 12){ winner = "플레이어 세계통일"; endTurn = turn; break; }
    const surviving = Object.entries(cnt).filter(([pid]) => pid !== "player" && cnt[pid] === 12);
    if (surviving.length) { winner = `${PLAYERS[surviving[0][0]].n} 세계통일`; endTurn = turn; break; }
  }

  const cnt = ownerMap(ts);
  console.log(`\n${"─".repeat(65)}`);
  console.log(`결과: ${winner || "미결 (50턴)"} (${endTurn}턴)`);
  console.log("최종 영토:");
  Object.entries(PLAYERS).forEach(([pid, p]) => {
    if (cnt[pid] === 0) return;
    const owned  = ts.filter(t => t.owner === pid).map(t => t.name).join(", ");
    const troops = sum(ts.filter(t => t.owner === pid), t => totalArmy(t.army));
    console.log(`  ${p.n.padEnd(12)}: ${cnt[pid]}개 [${owned}] / 병력 ${troops.toLocaleString()}명`);
  });
  const neutrals = ts.filter(t => !t.owner);
  if (neutrals.length) console.log(`  공백지(${neutrals.length}개): ${neutrals.map(t=>t.name).join(", ")}`);
  console.log(`자원 — 금: ${Object.entries(PLAYERS).map(([pid,p])=>`${p.n}:${gold[pid]||0}`).join(" / ")}`);
  console.log(`자원 — 식: ${Object.entries(PLAYERS).map(([pid,p])=>`${p.n}:${food[pid]||0}`).join(" / ")}`);

  return { winner: winner || "미결", cnt, neutral: neutrals.length, ts, gold, food };
}

// ── 3회 실행 ──
const results = [];
for (let i = 1; i <= 3; i++) results.push(runGame(i));

console.log(`\n${"=".repeat(65)}`);
console.log("3회 요약");
console.log("=".repeat(65));
results.forEach((r, i) => {
  const snap = Object.entries(PLAYERS)
    .map(([pid,p]) => `${p.n}:${r.cnt[pid]||0}`)
    .join(" / ");
  console.log(`게임${i+1}: ${r.winner.padEnd(16)} | ${snap} | 공백:${r.neutral}`);
});
