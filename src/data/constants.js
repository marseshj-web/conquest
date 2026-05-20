export const SEASONS = ["봄", "여름", "가을", "겨울"];
export const SEASON_COLORS = ["#4ade80", "#fbbf24", "#f97316", "#60a5fa"];

export const PLAYERS = {
  player: { n: "플레이어", c: "#3b82f6" },
  ai1:    { n: "몽골 제국",  c: "#ef4444" },
  ai2:    { n: "이슬람 연맹", c: "#22c55e" },
};

export const FOOD_PER_SOLDIER = 0.5;
export const MAX_ACTIONS = 3;

// Income divisors — population values are in thousands, so divisors scale accordingly
export const GOLD_INCOME_DIV = 1500;  // spring: econ * pop / GOLD_INCOME_DIV
export const FOOD_INCOME_DIV = 1000;  // autumn: agri * pop / FOOD_INCOME_DIV

export const MERCHANT_RATE = { goldToFood: 1.5, foodToGold: 0.6 };

export const COUNTER = { infantry: "cavalry", cavalry: "archer", archer: "infantry" };
export const COUNTER_MULT = 1.3;

export const INITIAL_RESOURCES = {
  gold: { player: 500, ai1: 400, ai2: 350 },
  food: { player: 2000, ai1: 1200, ai2: 1000 },
};

export const START_YEAR = 1206;

// Fixed soldiers recruited per conscript action (population unchanged)
export const CONSCRIPT_AMOUNTS = {
  infantry: 100,
  archer:    70,
  cavalry:   35,
  siege:     10,
  special:   50,
};
