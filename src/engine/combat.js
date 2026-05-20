import { UNITS, SPECIALS } from '../data/units.js';
import { COUNTER, COUNTER_MULT } from '../data/constants.js';
import { GRADE_VALUES } from '../data/leaders.js';
import { clamp, rng, totalArmy } from '../utils/math.js';

function dealDmg(src, tgt, wallMult, isDefending, srcId, tgtId, warMult = 1.0) {
  const sp = SPECIALS[srcId];
  const dm = { infantry: 0, archer: 0, cavalry: 0, siege: 0, special: 0 };

  const calc = (cnt, unit, key) => {
    if (cnt <= 0) return;
    const av = unit.rng > 0 ? Math.max(unit.atk, unit.rng) : unit.atk;
    const mobM = Math.max(1, Math.floor(unit.mob / 3));
    let base = cnt * av * mobM * warMult * rng(70, 100) / 100;
    if (isDefending && !unit.siege) base *= wallMult;
    const tot = totalArmy(tgt);
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

export function simBattle(atkTerr, defTerr, leaders = {}) {
  const aa = { ...atkTerr.army };
  const da = { ...defTerr.army };
  const aSp = SPECIALS[atkTerr.id];
  const dSp = SPECIALS[defTerr.id];
  const logs = [];

  const atkWarMult = GRADE_VALUES.war[leaders[atkTerr.id]?.war ?? "C"];
  const defWarMult = GRADE_VALUES.war[leaders[defTerr.id]?.war ?? "C"];

  logs.push(`⚔️ ${atkTerr.name} → ${defTerr.name}`);
  logs.push(`공격: 🗡️${aa.infantry} 🏹${aa.archer} 🐴${aa.cavalry} 🪨${aa.siege} ${aSp.icon}${aa.special}`);
  logs.push(`방어: 🗡️${da.infantry} 🏹${da.archer} 🐴${da.cavalry} 🪨${da.siege} ${dSp.icon}${da.special} (성벽${defTerr.wall})`);

  const wallMult = 1 + defTerr.wall / 200;

  for (let r = 1; r <= 5; r++) {
    if (totalArmy(aa) <= 0 || totalArmy(da) <= 0) break;

    const ad = dealDmg(aa, da, wallMult, false, atkTerr.id, defTerr.id, atkWarMult);
    const dd = dealDmg(da, aa, wallMult, true,  defTerr.id, atkTerr.id, defWarMult);

    let aL = 0, dL = 0;
    Object.keys(da).forEach(k => { const l = Math.min(da[k], Math.floor(ad[k] / 12)); da[k] -= l; dL += l; });
    Object.keys(aa).forEach(k => { const l = Math.min(aa[k], Math.floor(dd[k] / 12)); aa[k] -= l; aL += l; });

    logs.push(`[${r}R] 공격 -${aL}(잔${totalArmy(aa)}) / 방어 -${dL}(잔${totalArmy(da)})`);
    if (totalArmy(aa) <= 0) { logs.push("❌ 공격측 전멸!"); break; }
    if (totalArmy(da) <= 0) { logs.push("✅ 방어측 전멸!"); break; }
  }

  const atkWin = totalArmy(aa) > totalArmy(da);
  if (totalArmy(aa) > 0 && totalArmy(da) > 0)
    logs.push(atkWin ? "✅ 공격측 판정승!" : "❌ 방어측 판정 방어!");

  return { atkWin, aa, da, logs };
}
