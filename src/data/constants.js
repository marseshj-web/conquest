export const SEASONS = ["봄", "여름", "가을", "겨울"];
export const SEASON_COLORS = ["#4ade80", "#fbbf24", "#f97316", "#60a5fa"];

export const PLAYERS = {
  player:         { n: "플레이어",   c: "#3b82f6" },
  ai_mongol:      { n: "몽골",       c: "#ef4444" },
  ai_manchu:      { n: "만주국",     c: "#f97316" },
  ai_north_china: { n: "금나라",     c: "#eab308" },
  ai_india:       { n: "인도",       c: "#22c55e" },
  ai_persia:      { n: "페르시아",   c: "#14b8a6" },
  ai_arabia:      { n: "아라비아",   c: "#a855f7" },
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
  gold: { player: 500, ai_mongol: 280, ai_manchu: 250, ai_north_china: 380,
          ai_india: 300, ai_persia: 350, ai_arabia: 320 },
  food: { player: 2000, ai_mongol: 900, ai_manchu: 750, ai_north_china: 850,
          ai_india: 950, ai_persia: 750, ai_arabia: 650 },
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
