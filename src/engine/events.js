import { clamp, rng } from '../utils/math.js';

// Event chance per player territory per turn
const EVENT_CHANCE = 0.20;

// Each event: weight(t) returns relative probability given territory stats
// apply(t, res) mutates res={gold,food} in-place and returns updated territory + log message
const EVENTS = {
  drought: {
    weight: t => Math.max(2, 10 - t.agri * 0.08),  // agri=0→10, agri=100→2
    apply(t, res) {
      const loss = Math.max(30, Math.round(110 - t.agri * 0.8));
      res.food = Math.max(0, res.food - loss);
      return { t, msg: `☀️ ${t.name}에 가뭄 발생! 식량 -${loss}` };
    },
  },
  bumper_harvest: {
    weight: t => 2 + t.agri * 0.10,                 // agri=0→2, agri=100→12
    apply(t, res) {
      const gain = Math.round(t.agri * 1.5 + 40);
      res.food += gain;
      return { t, msg: `🌾 ${t.name} 풍작! 식량 +${gain}` };
    },
  },
  plague: {
    weight: t => 2 + t.pop / 8000,                  // pop=8000→3, pop=24000→5
    apply(t, _res) {
      const popLoss = Math.floor(t.pop * rng(5, 12) / 100);
      return {
        t: {
          ...t,
          pop:  Math.max(1000, t.pop - popLoss),
          mor:  clamp(t.mor - 12, 10, 100),
          army: Object.fromEntries(Object.entries(t.army).map(([k, v]) => [k, Math.floor(v * 0.88)])),
        },
        msg: `💀 ${t.name}에 역병! 인구 -${popLoss}, 병력 12% 이탈, 민심 -12`,
      };
    },
  },
  fire: {
    weight: t => 2 + t.econ * 0.03,                 // econ=0→2, econ=100→5
    apply(t, _res) {
      const loss = rng(4, 9);
      return {
        t: { ...t, econ: Math.max(1, t.econ - loss) },
        msg: `🔥 ${t.name}에 화재! 경제력 -${loss}`,
      };
    },
  },
  flood: {
    weight: t => 1 + t.agri * 0.02,                 // agri=0→1, agri=100→3
    apply(t, _res) {
      const loss = rng(4, 10);
      return {
        t: { ...t, agri: Math.max(1, t.agri - loss) },
        msg: `🌊 ${t.name}에 홍수! 농업력 -${loss}`,
      };
    },
  },
  merchants: {
    weight: t => 3 + t.econ * 0.05,                 // econ=0→3, econ=100→8
    apply(t, res) {
      const gain = Math.round(t.econ * 1.2 + 40);
      res.gold += gain;
      return { t, msg: `💰 ${t.name}에 교역단 방문! 금 +${gain}` };
    },
  },
  good_will: {
    weight: _t => 3,
    apply(t, _res) {
      const gain = rng(10, 20);
      return {
        t: { ...t, mor: clamp(t.mor + gain, 10, 100) },
        msg: `✨ ${t.name} 민심 상승! +${gain}`,
      };
    },
  },
  migration: {
    weight: t => 2 + t.mor * 0.02,                  // mor=50→3, mor=100→4
    apply(t, _res) {
      const gain = rng(200, 600);
      return {
        t: { ...t, pop: Math.min(50000, t.pop + gain) },
        msg: `👥 ${t.name}에 이주민 유입! 인구 +${gain}`,
      };
    },
  },
};

function pickEvent(t) {
  const pool = Object.entries(EVENTS).map(([id, e]) => ({ id, w: e.weight(t) }));
  const total = pool.reduce((s, e) => s + e.w, 0);
  let r = Math.random() * total;
  for (const e of pool) {
    r -= e.w;
    if (r <= 0) return e.id;
  }
  return pool[pool.length - 1].id;
}

export function processEvents(ts, ng, nf, addLog) {
  const res = { gold: ng.player, food: nf.player };

  const newTs = ts.map(t => {
    if (t.owner !== "player") return t;
    if (Math.random() > EVENT_CHANCE) return t;

    const id = pickEvent(t);
    const { t: newT, msg } = EVENTS[id].apply(t, res);
    addLog(msg);
    return newT;
  });

  return {
    ts:  newTs,
    ng:  { ...ng, player: res.gold },
    nf:  { ...nf, player: res.food },
  };
}
