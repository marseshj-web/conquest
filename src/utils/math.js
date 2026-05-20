export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const rng = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
export const sum = (arr, fn) => arr.reduce((s, x) => s + fn(x), 0);
export const totalArmy = (a) => a.infantry + a.archer + a.cavalry + a.siege + a.special;
