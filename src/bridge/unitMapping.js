import { UNIT_TYPES } from '../battlesim/constants.js';
import { SPECIALS } from '../data/units.js';

export const SOLDIERS_PER_SQUAD = 25;

// Region-specific override: conquest territory.id → battlesim typeId for specials
const SPECIAL_OVERRIDE = {
  mongol:      'cavArcherElite',
  manchu:      'cavArcher',
  persia:      'cavArcher',
  arabia:      'cavArcher',
  korea:       'heavyInf',
  japan:       'samurai',
  india:       'warElephant',
  tibet:       'mountainInf',
  east_europe: 'knights',
  west_europe: 'knights',
  south_china: 'crossbowmen',
  north_china: 'fireBombard',
};

// Fallback for SPECIALS.type → battlesim typeId
const SPECIAL_TYPE_TO_BATTLESIM = {
  cavArcher: 'cavArcher',
  infantry:  'heavyInf',
  cavalry:   'knights',
  archer:    'archers',
  siege:     'catapult',
};

function resolveInfantryType(terr, leader) {
  if (terr.wall >= 60) return 'heavyInf';
  if (leader?.war === 'A' || leader?.war === 'B') return 'spearmen';
  return 'militia';
}

function resolveCavalryType(leader) {
  return leader?.war === 'A' ? 'knights' : 'lightCavalry';
}

// Returns { squads: string[], manifest: object }
// manifest tracks { category → { typeId, originalCount, deployedSprites } }
export function mapArmyToBattleList(terr, leader) {
  const squads = [];
  const manifest = {};

  const add = (category, typeId, soldierCount) => {
    const squadCount = Math.max(0, Math.round(soldierCount / SOLDIERS_PER_SQUAD));
    const def = UNIT_TYPES[typeId];
    const spritesPerSquad = def ? def.count : 10;
    manifest[category] = { typeId, originalCount: soldierCount, deployedSprites: squadCount * spritesPerSquad };
    for (let i = 0; i < squadCount; i++) squads.push(typeId);
  };

  add('infantry', resolveInfantryType(terr, leader),     terr.army.infantry ?? 0);
  add('archer',   'archers',                              terr.army.archer   ?? 0);
  add('cavalry',  resolveCavalryType(leader),             terr.army.cavalry  ?? 0);
  add('siege',    'catapult',                             terr.army.siege    ?? 0);

  const sp = SPECIALS[terr.id];
  const specialType = SPECIAL_OVERRIDE[terr.id]
    ?? (sp ? SPECIAL_TYPE_TO_BATTLESIM[sp.type] : null)
    ?? 'militia';
  add('special', specialType, terr.army.special ?? 0);

  return { squads, manifest };
}

// Reverse: after battle, fold per-typeId survivor sprite counts back into conquest 5-bucket army.
export function mapSurvivorsToArmy(survivorsByTypeId, manifest, countScale) {
  const out = { infantry: 0, archer: 0, cavalry: 0, siege: 0, special: 0 };
  for (const [category, info] of Object.entries(manifest)) {
    const deployedScaled = Math.round(info.deployedSprites * countScale);
    const alive = survivorsByTypeId[info.typeId] ?? 0;
    const ratio = deployedScaled > 0 ? alive / deployedScaled : 0;
    out[category] = Math.max(0, Math.min(info.originalCount, Math.round(info.originalCount * ratio)));
  }
  return out;
}

// Helper used in simulatorCore and BattlePhase
export function countByType(soldiers) {
  const m = {};
  for (const s of soldiers) m[s.typeId] = (m[s.typeId] ?? 0) + 1;
  return m;
}
