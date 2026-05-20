export const TERRITORIES_INIT = [
  { id: "mongol",      name: "몽골 초원", x: 52, y: 22, pop: 6000,  econ: 30, agri: 20, mor: 80, wall: 30,
    army: { infantry: 100, archer: 50,  cavalry: 200, siege: 20, special: 300 }, owner: "ai1",
    conn: ["manchu", "north_china", "tibet", "persia"] },

  { id: "manchu",      name: "만주",     x: 72, y: 20, pop: 7500,  econ: 40, agri: 45, mor: 70, wall: 40,
    army: { infantry: 150, archer: 80,  cavalry: 100, siege: 10, special: 150 }, owner: "ai1",
    conn: ["mongol", "korea", "north_china"] },

  { id: "korea",       name: "고려",     x: 80, y: 32, pop: 9000,  econ: 50, agri: 55, mor: 75, wall: 60,
    army: { infantry: 200, archer: 60,  cavalry: 50,  siege: 15, special: 200 }, owner: null,
    conn: ["manchu", "japan"] },

  { id: "japan",       name: "일본",     x: 90, y: 35, pop: 11000, econ: 60, agri: 50, mor: 80, wall: 55,
    army: { infantry: 100, archer: 80,  cavalry: 80,  siege: 10, special: 250 }, owner: null,
    conn: ["korea"] },

  { id: "north_china", name: "화북",     x: 65, y: 35, pop: 17500, econ: 70, agri: 60, mor: 65, wall: 50,
    army: { infantry: 200, archer: 100, cavalry: 150, siege: 50, special: 200 }, owner: "ai1",
    conn: ["mongol", "manchu", "south_china", "tibet"] },

  { id: "south_china", name: "화남",     x: 68, y: 50, pop: 20000, econ: 80, agri: 80, mor: 70, wall: 45,
    army: { infantry: 150, archer: 120, cavalry: 80,  siege: 30, special: 150 }, owner: null,
    conn: ["north_china", "india", "tibet"] },

  { id: "tibet",       name: "티베트",   x: 52, y: 42, pop: 4000,  econ: 15, agri: 15, mor: 85, wall: 70,
    army: { infantry: 100, archer: 30,  cavalry: 30,  siege: 5,  special: 200 }, owner: null,
    conn: ["mongol", "north_china", "south_china", "india"] },

  { id: "india",       name: "인도",     x: 48, y: 60, pop: 19000, econ: 65, agri: 75, mor: 70, wall: 40,
    army: { infantry: 200, archer: 80,  cavalry: 100, siege: 20, special: 200 }, owner: "ai2",
    conn: ["tibet", "south_china", "persia", "arabia"] },

  { id: "persia",      name: "페르시아", x: 35, y: 40, pop: 12500, econ: 55, agri: 45, mor: 70, wall: 50,
    army: { infantry: 150, archer: 60,  cavalry: 120, siege: 20, special: 200 }, owner: "ai2",
    conn: ["mongol", "india", "arabia", "east_europe"] },

  { id: "arabia",      name: "아라비아", x: 30, y: 58, pop: 9000,  econ: 70, agri: 25, mor: 75, wall: 35,
    army: { infantry: 100, archer: 70,  cavalry: 80,  siege: 15, special: 180 }, owner: "ai2",
    conn: ["india", "persia", "east_europe"] },

  { id: "east_europe", name: "동유럽",   x: 22, y: 25, pop: 10000, econ: 45, agri: 50, mor: 70, wall: 55,
    army: { infantry: 150, archer: 60,  cavalry: 100, siege: 20, special: 180 }, owner: null,
    conn: ["persia", "arabia", "west_europe"] },

  { id: "west_europe", name: "서유럽",   x: 10, y: 30, pop: 15000, econ: 75, agri: 65, mor: 80, wall: 65,
    army: { infantry: 200, archer: 100, cavalry: 150, siege: 30, special: 250 }, owner: null,
    conn: ["east_europe"] },
];
