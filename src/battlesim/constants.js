export const UNIT_TYPES = {
  militia: {
    id: "militia", name: "민병대", count: 15, cost: 500,
    hp: 40, atk: 3, def: 2, speed: 1.8, range: 20, atkSpeed: 1.0,
    color: "#a0855b", icon: "⚔", desc: "저가 고기방패",
    type: "melee", armorClass: "light",
    targetPriority: "nearest",
  },
  heavyInf: {
    id: "heavyInf", name: "중보병", count: 10, cost: 1300,
    hp: 80, atk: 10, def: 6, speed: 1.3, range: 20, atkSpeed: 1.0,
    color: "#5a7fa0", icon: "🛡", desc: "높은 방어, 화살 저항",
    type: "melee", armorClass: "heavy",
    targetPriority: "nearest",
  },
  spearmen: {
    id: "spearmen", name: "창병", count: 10, cost: 1000,
    hp: 60, atk: 8, def: 5, speed: 1.6, range: 24, atkSpeed: 1.0,
    color: "#7a9a5a", icon: "🔱", desc: "대기병 x2",
    type: "melee", armorClass: "medium",
    targetPriority: "prefer_knights",
  },
  archers: {
    id: "archers", name: "궁수", count: 8, cost: 1200,
    hp: 35, atk: 15, def: 2, speed: 1.6, range: 250, atkSpeed: 0.8,
    color: "#b08040", icon: "🏹", desc: "원거리, 경장 특효",
    type: "ranged", armorClass: "light",
    targetPriority: "prefer_light",
  },
  knights: {
    id: "knights", name: "기사", count: 5, cost: 2000,
    hp: 170, atk: 15, def: 10, speed: 3.2, range: 20, atkSpeed: 1.0,
    color: "#c0a030", icon: "🐴", desc: "강력한 돌격",
    type: "melee", armorClass: "plate",
    chargeBonus: 2.5,
    targetPriority: "nearest",
  },
  lightCavalry: {
    id: "lightCavalry", name: "경기병", count: 6, cost: 1500,
    hp: 90, atk: 11, def: 5, speed: 2.8, range: 20, atkSpeed: 1.0,
    color: "#8a6030", icon: "🐎", desc: "빠른 기동, 궁수 사냥",
    type: "melee", armorClass: "medium",
    chargeBonus: 1.5,
    targetPriority: "hunt_ranged",
  },
  musketeer: {
    id: "musketeer", name: "머스켓 보병", count: 5, cost: 1800,
    hp: 45, atk: 18, def: 3, speed: 1.4, range: 220, atkSpeed: 2.5,
    color: "#607060", icon: "🔫", desc: "갑옷 관통, 느린 장전",
    type: "ranged", armorClass: "light",
    targetPriority: "prefer_heavy",
  },
  catapult: {
    id: "catapult", name: "투석기", count: 2, cost: 2000,
    hp: 100, atk: 22, def: 3, speed: 0.4, range: 500, atkSpeed: 4.0,
    color: "#7a6050", icon: "🪨", desc: "광역 포격, 밀집 보병 특효",
    type: "siege", armorClass: "heavy",
    splashRadius: 60,
    targetPriority: "prefer_cluster",
  },
  // === 지역 특수 유닛 (conquest bridge용) ===
  cavArcher: {
    id: "cavArcher", name: "궁기병", count: 6, cost: 1700,
    hp: 60, atk: 10, def: 4, speed: 2.6, range: 200, atkSpeed: 1.1,
    color: "#7a4030", icon: "🐎", desc: "기동 원거리",
    type: "ranged", armorClass: "medium",
    targetPriority: "prefer_light",
  },
  cavArcherElite: {
    id: "cavArcherElite", name: "몽골 궁기병", count: 6, cost: 2200,
    hp: 80, atk: 13, def: 5, speed: 3.0, range: 220, atkSpeed: 0.9,
    color: "#a04030", icon: "🐎", desc: "최강 궁기병",
    type: "ranged", armorClass: "medium",
    targetPriority: "prefer_light",
  },
  samurai: {
    id: "samurai", name: "사무라이", count: 6, cost: 2400,
    hp: 140, atk: 18, def: 8, speed: 2.4, range: 20, atkSpeed: 0.9,
    color: "#a83030", icon: "⚔", desc: "강력한 공수 겸비",
    type: "melee", armorClass: "heavy",
    chargeBonus: 2.0,
    targetPriority: "nearest",
  },
  warElephant: {
    id: "warElephant", name: "전투코끼리", count: 3, cost: 2800,
    hp: 280, atk: 20, def: 12, speed: 1.8, range: 24, atkSpeed: 1.2,
    color: "#7a6048", icon: "🐘", desc: "광역 근접 돌파",
    type: "melee", armorClass: "heavy",
    splashRadius: 35,
    chargeBonus: 2.5,
    targetPriority: "prefer_cluster",
  },
  mountainInf: {
    id: "mountainInf", name: "산악병", count: 10, cost: 1100,
    hp: 70, atk: 9, def: 9, speed: 1.5, range: 20, atkSpeed: 1.0,
    color: "#806a50", icon: "🏔", desc: "견고한 방어",
    type: "melee", armorClass: "heavy",
    targetPriority: "nearest",
  },
  crossbowmen: {
    id: "crossbowmen", name: "노궁병", count: 8, cost: 1400,
    hp: 35, atk: 18, def: 2, speed: 1.4, range: 260, atkSpeed: 1.4,
    color: "#9a6a30", icon: "🎯", desc: "중장갑 관통 원거리",
    type: "ranged", armorClass: "light",
    targetPriority: "prefer_heavy",
  },
  fireBombard: {
    id: "fireBombard", name: "화포병", count: 2, cost: 2200,
    hp: 90, atk: 26, def: 3, speed: 0.4, range: 480, atkSpeed: 4.5,
    color: "#604030", icon: "💥", desc: "광역 포격",
    type: "siege", armorClass: "heavy",
    splashRadius: 70,
    targetPriority: "prefer_cluster",
  },
};

export const ARROW_ACC = { light: 0.85, medium: 0.70, heavy: 0.45, plate: 0.25 };
export const ARROW_MULT = { light: 1.0, medium: 0.85, heavy: 0.60, plate: 0.35 };

export const MUSKET_ACC  = { light: 0.75, medium: 0.65, heavy: 0.65, plate: 0.50 };
export const MUSKET_MULT = { light: 1.0,  medium: 1.0,  heavy: 2.0,  plate: 1.8  };

export const MELEE_BONUS = {
  spearmen:     { knights: 2.0, lightCavalry: 1.5, samurai: 1.5, warElephant: 2.0, cavArcher: 1.3, cavArcherElite: 1.3 },
  knights:      { archers: 1.5, heavyInf: 1.3, musketeer: 1.5, crossbowmen: 1.5 },
  heavyInf:     { militia: 1.3 },
  lightCavalry: { archers: 1.3, musketeer: 1.3, crossbowmen: 1.3 },
  samurai:      { heavyInf: 1.3, spearmen: 1.2 },
  warElephant:  { spearmen: 1.5, heavyInf: 1.3 },
};

export const ARCHER_BONUS = {
  militia:  { accBonus: 0.15, dmgMult: 1.3 },
  archers:  { accBonus: 0.15, dmgMult: 1.3 },
  spearmen: { accBonus: 0.10, dmgMult: 1.1 },
};

export const MAX_GOLD = 10000;
export const MAP_W = 1400;
export const MAP_H = 620;
export const Y_COMPRESS = 0.62;
export const HORIZON_OFFSET = 70;
export const RENDER_H = HORIZON_OFFSET + Math.round(MAP_H * Y_COMPRESS) + 16;
export const MAX_ATK_PER = 4;
export const SEP_RADIUS = 26;
export const SEP_FORCE = 45;

// Terrain definitions
export const TERRAIN_TYPES = {
  plain: { id: 'plain', speedMult: 1.0, color: 'transparent' },
  river: { id: 'river', speedMult: 0.4, color: 'rgba(50, 150, 200, 0.4)' },
  mud: { id: 'mud', speedMult: 0.6, color: 'rgba(100, 70, 50, 0.5)' },
};

export const MAPS = {
  field: {
    id: "field",
    name: "평원",
    desc: "아무런 장애물이 없는 맵",
    terrain: [],
    obstacles: [
      { x: 470, y: 185, radius: 19, type: "rock" },
      { x: 930, y: 430, radius: 22, type: "rock" },
      { x: 690, y: 500, radius: 16, type: "rock" },
      { x: 445, y: 400, radius: 20, type: "wagon" },
      { x: 965, y: 195, radius: 20, type: "wagon" },
    ]
  },
  river: {
    id: "river",
    name: "도하 작전",
    desc: "중앙을 가로지르는 얕은 강 (이동 속도 대폭 감소)",
    terrain: [
      { type: "river", x: MAP_W / 2 - 80, y: 0, w: 160, h: MAP_H }
    ],
    obstacles: [
      { x: 640, y: 135, radius: 16, type: "rock" },
      { x: 765, y: 475, radius: 18, type: "rock" },
      { x: 610, y: 315, radius: 14, type: "rock" },
      { x: 790, y: 255, radius: 15, type: "rock" },
    ]
  },
  mud: {
    id: "mud",
    name: "진흙탕",
    desc: "기동력을 저하시키는 광범위한 진흙 구역",
    terrain: [
      { type: "mud", x: 380, y: 150, w: 640, h: 320 }
    ],
    obstacles: [
      { x: 495, y: 235, radius: 20, type: "rock" },
      { x: 835, y: 375, radius: 18, type: "rock" },
      { x: 625, y: 420, radius: 15, type: "rock" },
      { x: 900, y: 195, radius: 20, type: "wagon" },
    ]
  },
  forest: {
    id: "forest",
    name: "작은 숲",
    desc: "중앙에 나무들과 바위들이 있어 우회해야 함",
    terrain: [],
    obstacles: [
      { x: 660, y: 210, radius: 22, type: "tree" },
      { x: 750, y: 182, radius: 17, type: "tree" },
      { x: 610, y: 268, radius: 25, type: "tree" },
      { x: 785, y: 252, radius: 19, type: "tree" },
      { x: 698, y: 308, radius: 23, type: "tree" },
      { x: 633, y: 358, radius: 20, type: "tree" },
      { x: 740, y: 342, radius: 18, type: "tree" },
      { x: 562, y: 318, radius: 16, type: "tree" },
      { x: 818, y: 302, radius: 21, type: "tree" },
      { x: 672, y: 393, radius: 24, type: "tree" },
      { x: 582, y: 228, radius: 19, type: "tree" },
      { x: 837, y: 368, radius: 17, type: "tree" },
      { x: 705, y: 262, radius: 13, type: "rock" },
      { x: 618, y: 408, radius: 11, type: "rock" },
      { x: 790, y: 218, radius: 10, type: "rock" },
    ]
  }
};

export const THEME_COLORS = {
  bg: "#0f0f0f", pn: "#181818", bd: "#282828", gl: "#d4a04a",
  tx: "#bfb8a8", dm: "#605848", gn: "#5a8f5a", rd: "#a04040", bl: "#4a6a9a",
};
