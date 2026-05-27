import { MAPS, MAP_W, MAP_H } from '../battlesim/constants.js';
import { GRADE_VALUES } from '../data/leaders.js';
import { simBattle } from '../engine/combat.js';
import { clamp } from '../utils/math.js';
import { mapArmyToBattleList, mapSurvivorsToArmy } from './unitMapping.js';
import { getCountScaleFromArmies } from './countScale.js';
import { seasonToMap } from './seasonMap.js';

export function shouldUsePlayerBattle(atkTerr, defTerr) {
  return atkTerr.owner === 'player' || defTerr.owner === 'player';
}

// Add wagon obstacle patches to the defender side proportional to wall level
function addWallObstacles(map, wall) {
  if (wall < 30) return map;
  const nObs = Math.floor(wall / 20);
  const extra = [];
  for (let i = 0; i < nObs; i++) {
    extra.push({
      x: MAP_W - 220 - Math.random() * 80,
      y: 60 + Math.random() * (MAP_H - 120),
      radius: 18 + Math.random() * 8,
      type: 'wagon',
    });
  }
  return { ...map, obstacles: [...map.obstacles, ...extra] };
}

// Build the full battle context (does NOT run the simulation).
// Returned ctx is consumed by BattleScene or runQuickTactical.
export function prepareTacticalBattle(atkTerr, defTerr, leaders, season) {
  const atkLeader = leaders[atkTerr.id];
  const defLeader = leaders[defTerr.id];

  const { squads: atkSquads, manifest: atkManifest } = mapArmyToBattleList(atkTerr, atkLeader);
  const { squads: defSquads, manifest: defManifest } = mapArmyToBattleList(defTerr, defLeader);

  const countScale = getCountScaleFromArmies(atkTerr.army, defTerr.army);
  const mapId      = seasonToMap(season, defTerr);
  const baseMap    = MAPS[mapId] ?? MAPS.field;
  const map        = addWallObstacles(baseMap, defTerr.wall ?? 0);

  return {
    atkSquads, defSquads,
    atkManifest, defManifest,
    countScale, map,
    atkWarMult: GRADE_VALUES.war[atkLeader?.war ?? 'C'],
    defWarMult: GRADE_VALUES.war[defLeader?.war ?? 'C'],
    wallMult:   1 + (defTerr.wall ?? 0) / 200,
    atkTerrId: atkTerr.id,
    defTerrId: defTerr.id,
  };
}

// Post-process raw battlesim result into conquest-compatible army objects.
export function foldBattleResult(battleResult, ctx) {
  const atkSurv = mapSurvivorsToArmy(
    battleResult.playerSurvivorsByType ?? {},
    ctx.atkManifest,
    ctx.countScale,
  );
  const defSurv = mapSurvivorsToArmy(
    battleResult.aiSurvivorsByType ?? {},
    ctx.defManifest,
    ctx.countScale,
  );
  const atkWin = battleResult.winner === 'player';
  return { atkWin, atkSurv, defSurv, raw: battleResult };
}

function scaleArmy(army, mult) {
  const out = {};
  for (const k of Object.keys(army)) out[k] = Math.max(0, Math.round((army[k] ?? 0) * mult));
  return out;
}

// Apply the outcome of a resolved battle to the current game state.
// Returns a partial state diff (same pattern as doAttack in actions.js).
export function applyBattleOutcome(state, fromId, toId, atkSurv, defSurv, atkWin) {
  const { terrs, leaders } = state;
  const atkTerr = terrs.find(t => t.id === fromId);
  return {
    leaders: atkWin ? { ...leaders, [toId]: leaders[fromId] } : leaders,
    terrs: terrs.map(t => {
      if (t.id === fromId)
        return { ...t, army: scaleArmy(atkSurv, atkWin ? 0.6 : 1.0) };
      if (t.id === toId) {
        if (atkWin) {
          return {
            ...t,
            owner: atkTerr.owner,
            army: scaleArmy(atkSurv, 0.4),
            rebelImmune: 3,
          };
        }
        return { ...t, army: defSurv };
      }
      return t;
    }),
  };
}

// Quick headless fallback using conquest's abstract simBattle.
// Used only for AI-vs-AI; never called for player battles.
export function runAbstractBattle(atkTerr, defTerr, leaders) {
  return simBattle(atkTerr, defTerr, leaders);
}
