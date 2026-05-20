export const UNITS = {
  infantry: { n: "보병",  icon: "🗡️", atk: 7,  def: 7,  rng: 0,  mob: 5,  mor: 55, chg: 5,  cost: [10, 30], siege: false, type: "infantry",  desc: "기병에 강함" },
  archer:   { n: "궁병",  icon: "🏹", atk: 4,  def: 4,  rng: 8,  mob: 6,  mor: 50, chg: 2,  cost: [20, 25], siege: false, type: "archer",    desc: "보병에 강함" },
  cavalry:  { n: "기병",  icon: "🐴", atk: 8,  def: 6,  rng: 0,  mob: 8,  mor: 60, chg: 8,  cost: [35, 40], siege: false, type: "cavalry",   desc: "궁병에 강함" },
  siege:    { n: "공성",  icon: "🪨", atk: 2,  def: 2,  rng: 8,  mob: 4,  mor: 30, chg: 2,  cost: [60, 15], siege: true,  type: "siege",     desc: "성벽 무시"  },
};

export const SPECIALS = {
  mongol:      { n: "몽골기병",   icon: "🐎", atk: 8,  def: 6,  rng: 8,  mob: 11, mor: 80, chg: 8,  cost: [60, 50], siege: false, type: "cavArcher", desc: "최강 궁기병"    },
  manchu:      { n: "수렵기병",   icon: "🦌", atk: 6,  def: 6,  rng: 6,  mob: 9,  mor: 60, chg: 6,  cost: [40, 35], siege: false, type: "cavArcher", desc: "균형 궁기병"    },
  korea:       { n: "중보병",     icon: "🛡️", atk: 8,  def: 8,  rng: 0,  mob: 5,  mor: 55, chg: 6,  cost: [25, 35], siege: false, type: "infantry",  desc: "견고한 방어"    },
  japan:       { n: "무사",       icon: "⚔️", atk: 10, def: 8,  rng: 6,  mob: 9,  mor: 80, chg: 10, cost: [70, 60], siege: false, type: "cavalry",   desc: "최정예 공수겸비" },
  north_china: { n: "화포병",     icon: "💥", atk: 4,  def: 2,  rng: 6,  mob: 5,  mor: 30, chg: 2,  cost: [50, 20], siege: true,  type: "siege",     desc: "성벽무시+혼란"  },
  south_china: { n: "노궁병",     icon: "🎯", atk: 4,  def: 4,  rng: 8,  mob: 5,  mor: 50, chg: 2,  cost: [30, 25], siege: false, type: "archer",    desc: "연사 석궁"      },
  tibet:       { n: "산악병",     icon: "🏔️", atk: 6,  def: 9,  rng: 0,  mob: 6,  mor: 70, chg: 5,  cost: [25, 30], siege: false, type: "infantry",  desc: "고산 방어"      },
  india:       { n: "전투코끼리", icon: "🐘", atk: 10, def: 10, rng: 0,  mob: 5,  mor: 60, chg: 10, cost: [80, 60], siege: false, type: "cavalry",   desc: "최강 근접"      },
  persia:      { n: "경궁기병",   icon: "🏇", atk: 6,  def: 4,  rng: 10, mob: 10, mor: 70, chg: 6,  cost: [55, 40], siege: false, type: "cavArcher", desc: "최강 원거리"    },
  arabia:      { n: "낙타기병",   icon: "🐪", atk: 7,  def: 5,  rng: 6,  mob: 9,  mor: 65, chg: 7,  cost: [45, 35], siege: false, type: "cavArcher", desc: "사막 습격대"    },
  east_europe: { n: "기사",       icon: "🏰", atk: 8,  def: 10, rng: 0,  mob: 7,  mor: 65, chg: 10, cost: [60, 45], siege: false, type: "cavalry",   desc: "철갑 중장기병"  },
  west_europe: { n: "돌격기병",   icon: "⚜️", atk: 10, def: 8,  rng: 0,  mob: 9,  mor: 70, chg: 10, cost: [65, 50], siege: false, type: "cavalry",   desc: "최강 돌격"      },
};
