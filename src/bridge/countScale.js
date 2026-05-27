import { totalArmy } from '../utils/math.js';

// Total combined soldiers drives sprite density.
// Small skirmishes look dense; mega-battles stay readable.
export function getCountScaleFromArmies(atkArmy, defArmy) {
  const tot = totalArmy(atkArmy) + totalArmy(defArmy);
  if (tot <= 200)  return 1.20;
  if (tot <= 400)  return 1.00;
  if (tot <= 700)  return 0.80;
  if (tot <= 1100) return 0.65;
  if (tot <= 1600) return 0.50;
  return 0.40;
}
