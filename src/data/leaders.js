export const GRADE_VALUES = {
  admin: {
    A: { cap: 120, speed: 1.6 },
    B: { cap: 110, speed: 1.3 },
    C: { cap: 100, speed: 1.0 },
    D: { cap:  90, speed: 0.75 },
  },
  charm: {
    A: { comfortMult: 1.5,  passive:  3 },
    B: { comfortMult: 1.25, passive:  1 },
    C: { comfortMult: 1.0,  passive:  0 },
    D: { comfortMult: 0.8,  passive: -1 },
  },
  war: { A: 1.30, B: 1.15, C: 1.00, D: 0.85 },
  trade: {
    A: { goldToFood: 1.8,  foodToGold: 0.80 },
    B: { goldToFood: 1.65, foodToGold: 0.70 },
    C: { goldToFood: 1.5,  foodToGold: 0.60 },
    D: { goldToFood: 1.3,  foodToGold: 0.45 },
  },
};

export const LEADER_POOL = [
  { id: "genghis",    name: "칭기즈 칸",    icon: "🐎", admin: "B", charm: "A", war: "A", trade: "C" },
  { id: "subutai",    name: "수부타이",      icon: "⚔️", admin: "C", charm: "C", war: "A", trade: "C" },
  { id: "yelucai",    name: "야율초재",      icon: "📜", admin: "A", charm: "B", war: "C", trade: "B" },
  { id: "kublai",     name: "쿠빌라이 칸",  icon: "👑", admin: "A", charm: "B", war: "B", trade: "A" },
  { id: "saladin",    name: "살라딘",        icon: "🌙", admin: "B", charm: "A", war: "B", trade: "C" },
  { id: "richard",    name: "리처드 1세",    icon: "🦁", admin: "C", charm: "B", war: "A", trade: "C" },
  { id: "frederick",  name: "프리드리히 2세",icon: "🏰", admin: "A", charm: "B", war: "C", trade: "A" },
  { id: "batu",       name: "바투 칸",       icon: "🗡️", admin: "C", charm: "C", war: "A", trade: "D" },
  { id: "nevsky",     name: "알렉산드르 넵스키", icon: "❄️", admin: "B", charm: "B", war: "B", trade: "C" },
  { id: "ibrahim",    name: "이브라힘 로디", icon: "🐘", admin: "C", charm: "B", war: "B", trade: "C" },
  { id: "mingano",    name: "밍가노",        icon: "🏹", admin: "D", charm: "C", war: "B", trade: "B" },
  { id: "gorguz",     name: "코르쿠즈",      icon: "💰", admin: "C", charm: "C", war: "C", trade: "A" },
  { id: "hulagu",     name: "홀레구",        icon: "🔥", admin: "D", charm: "C", war: "A", trade: "C" },
  { id: "bela",       name: "벨라 4세",      icon: "🛡️", admin: "B", charm: "C", war: "B", trade: "C" },
  { id: "watanabe",   name: "와타나베",      icon: "🌸", admin: "B", charm: "A", war: "C", trade: "B" },
];

export function assignLeaders(territories) {
  const pool = [...LEADER_POOL].sort(() => Math.random() - 0.5);
  const result = {};
  territories.forEach((t, i) => {
    result[t.id] = pool[i % pool.length];
  });
  return result;
}
