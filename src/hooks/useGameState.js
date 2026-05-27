import { useReducer, useCallback, useMemo } from "react";
import { TERRITORIES_INIT } from "../data/territories.js";
import { INITIAL_RESOURCES, SEASONS, START_YEAR } from "../data/constants.js";
import { totalArmy, sum } from "../utils/math.js";
import { aiTurn, autoManageTurn } from "../engine/ai.js";
import { assignLeaders } from "../data/leaders.js";
import { processTurnEnd } from "../engine/economy.js";
import {
  doInvest, doComfort, doConscript, doTransfer, doBulkTransfer,
  doAttack, doTrade, doScout, doSurrender,
} from "../engine/actions.js";
import {
  prepareTacticalBattle, foldBattleResult, applyBattleOutcome,
  shouldUsePlayerBattle, runAbstractBattle,
} from "../bridge/battleBridge.js";

function freshTerrs() {
  return JSON.parse(JSON.stringify(TERRITORIES_INIT));
}

const INIT = {
  phase:          "select",
  scene:          "meta",   // "meta" | "battle"
  pendingBattle:  null,     // { fromId, toId, ctx, atkName, defName, isDefensive, key }
  defensiveQueue: [],       // [{ fromId, toId }, ...]
  terrs:          [],
  season:         0,
  year:           START_YEAR,
  gold:           INITIAL_RESOURCES.gold,
  food:           INITIAL_RESOURCES.food,
  sel:            null,
  log:            [],
  scouted:        {},
  actions:        {},
  view:           "map",
  battleLog:      null,
  modal:          null,
  autoManaged:    {},
  leaders:        {},
};

function mergeUpdate(state, update, msgs) {
  const newLog = msgs.length
    ? [...msgs.reverse(), ...state.log].slice(0, 80)
    : state.log;

  if (!update) return newLog !== state.log ? { ...state, log: newLog } : state;

  return {
    ...state,
    ...(update.terrs     && { terrs:     update.terrs }),
    ...(update.gold      && { gold:      update.gold }),
    ...(update.food      && { food:      update.food }),
    ...(update.actions   && { actions:   update.actions }),
    ...(update.scouted   && { scouted:   update.scouted }),
    ...(update.battleLog && { battleLog: update.battleLog }),
    ...(update.leaders   && { leaders:   update.leaders }),
    log: newLog,
  };
}

function popDefensiveQueue(state) {
  if (!state.defensiveQueue.length) {
    return { ...state, scene: "meta", pendingBattle: null, defensiveQueue: [] };
  }
  const [first, ...rest] = state.defensiveQueue;
  const atkT = state.terrs.find(t => t.id === first.fromId);
  const defT = state.terrs.find(t => t.id === first.toId);
  if (!atkT || !defT) {
    return { ...state, scene: "meta", pendingBattle: null, defensiveQueue: rest };
  }
  const ctx = prepareTacticalBattle(atkT, defT, state.leaders, state.season);
  return {
    ...state,
    scene: "battle",
    pendingBattle: {
      fromId: first.fromId, toId: first.toId,
      atkName: atkT.name, defName: defT.name,
      ctx, isDefensive: true, key: Date.now(),
    },
    defensiveQueue: rest,
  };
}

function reducer(state, action) {
  switch (action.type) {

    case "SELECT_START": {
      const newTerrs = state.terrs.map(t =>
        t.id === action.id ? { ...t, owner: "player" } : t
      );
      return {
        ...state,
        terrs:   newTerrs,
        leaders: assignLeaders(newTerrs),
        phase:   "play",
        log:     [`${START_YEAR}년 봄 - ${TERRITORIES_INIT.find(t => t.id === action.id).name}에서 출발!`],
      };
    }

    case "TOGGLE_AUTO_MANAGE":
      return {
        ...state,
        autoManaged: { ...state.autoManaged, [action.tid]: !state.autoManaged[action.tid] },
      };

    case "END_TURN": {
      const msgs = [];
      const addLog = msg => msgs.push(msg);

      let ts  = state.terrs.map(t => ({ ...t, army: { ...t.army } }));
      let g   = { ...state.gold };
      let f   = { ...state.food };
      let ldr = { ...state.leaders };

      const autoIds = Object.keys(state.autoManaged).filter(id => state.autoManaged[id]);
      if (autoIds.length) {
        const am = autoManageTurn(ts, autoIds, g, f, addLog, ldr);
        ts = am.ts; g = am.gold; f = am.food;
      }

      const queuedAttacks = [];
      for (const pid of ["ai_mongol", "ai_manchu", "ai_north_china", "ai_india", "ai_persia", "ai_arabia"]) {
        const r = aiTurn(ts, pid, g, f, addLog, ldr);
        ts = r.ts; g = r.gold; f = r.food; ldr = r.leaders;
        if (r.queuedAttack) queuedAttacks.push(r.queuedAttack);
      }

      const { ts: finalTs, ng, nf, ns, nl } = processTurnEnd(ts, g, f, state.season, addLog, ldr);
      const ny = ns === 0 ? state.year + 1 : state.year;
      addLog(`--- ${ny}년 ${SEASONS[ns]} ---`);

      // Auto-resolve excess defensive battles (keep at most 2 as live tactical)
      const liveAttacks = queuedAttacks.slice(0, 2);
      const autoAttacks = queuedAttacks.slice(2);
      let resolvedTs = finalTs;
      let resolvedLdr = nl;
      for (const atk of autoAttacks) {
        const atkTerr = resolvedTs.find(t => t.id === atk.fromId);
        const defTerr = resolvedTs.find(t => t.id === atk.toId);
        if (!atkTerr || !defTerr) continue;
        const res = runAbstractBattle(atkTerr, defTerr, resolvedLdr);
        if (res.atkWin) resolvedLdr = { ...resolvedLdr, [atk.toId]: resolvedLdr[atk.fromId] };
        resolvedTs = resolvedTs.map(t => {
          if (t.id === atk.fromId) return { ...t, army: { ...res.aa } };
          if (t.id === atk.toId) {
            if (res.atkWin) {
              const occ = {};
              Object.keys(res.aa).forEach(k => { occ[k] = Math.floor(res.aa[k] * 0.3); });
              return { ...t, owner: atkTerr.owner, army: occ, rebelImmune: 3 };
            }
            return { ...t, army: { ...res.da } };
          }
          return t;
        });
        addLog(res.atkWin
          ? `⚡ 자동해결: ${atkTerr.name}→${defTerr.name} 함락!`
          : `⚡ 자동해결: ${defTerr.name} 방어 성공`);
      }

      const pc = resolvedTs.filter(t => t.owner === "player").length;
      const nextAutoManaged = {};
      Object.keys(state.autoManaged).forEach(id => { if (state.autoManaged[id]) nextAutoManaged[id] = true; });

      const baseNext = {
        ...state,
        terrs:       resolvedTs,
        gold:        ng,
        food:        nf,
        season:      ns,
        year:        ny,
        leaders:     resolvedLdr,
        actions:     {},
        autoManaged: nextAutoManaged,
        phase:       pc === 0 || pc === 12 ? "over" : "play",
        log:         [...msgs.reverse(), ...state.log].slice(0, 80),
      };

      if (pc === 0 || pc === 12) return baseNext;

      // Set up first live defensive battle if any
      if (liveAttacks.length) {
        const [first, ...rest] = liveAttacks;
        const atkT = resolvedTs.find(t => t.id === first.fromId);
        const defT = resolvedTs.find(t => t.id === first.toId);
        if (atkT && defT) {
          const ctx = prepareTacticalBattle(atkT, defT, resolvedLdr, ns);
          return {
            ...baseNext,
            scene: "battle",
            pendingBattle: {
              fromId: first.fromId, toId: first.toId,
              atkName: atkT.name, defName: defT.name,
              ctx, isDefensive: true, key: Date.now(),
            },
            defensiveQueue: rest,
          };
        }
      }
      return baseNext;
    }

    case "LAUNCH_BATTLE": {
      const { fromId, toId } = action;
      const atkTerr = state.terrs.find(t => t.id === fromId);
      const defTerr = state.terrs.find(t => t.id === toId);
      if (!atkTerr || !defTerr) return state;
      const ctx = prepareTacticalBattle(atkTerr, defTerr, state.leaders, state.season);
      return {
        ...state,
        scene: "battle",
        modal: null,
        pendingBattle: {
          fromId, toId,
          atkName: atkTerr.name, defName: defTerr.name,
          ctx, isDefensive: false, key: Date.now(),
        },
      };
    }

    case "BATTLE_COMPLETE": {
      if (!state.pendingBattle) return state;
      const { fromId, toId, ctx } = state.pendingBattle;
      const folded = foldBattleResult(action.battleResult, ctx);
      const diff   = applyBattleOutcome(
        { terrs: state.terrs, leaders: state.leaders },
        fromId, toId, folded.atkSurv, folded.defSurv, folded.atkWin,
      );
      const atkTerr = state.terrs.find(t => t.id === fromId);
      const defTerr = state.terrs.find(t => t.id === toId);
      const label = folded.atkWin
        ? `✅ ${atkTerr?.name ?? fromId}→${defTerr?.name ?? toId} 점령!`
        : `❌ ${defTerr?.name ?? toId} 방어 성공`;

      const next = {
        ...state,
        terrs:      diff.terrs    ?? state.terrs,
        leaders:    diff.leaders  ?? state.leaders,
        battleLog:  [label],
        pendingBattle: null,
        log: [label, ...state.log].slice(0, 80),
      };
      return popDefensiveQueue(next);
    }

    case "SKIP_BATTLE": {
      if (!state.pendingBattle) return state;
      const { fromId, toId } = state.pendingBattle;
      const atkTerr = state.terrs.find(t => t.id === fromId);
      const defTerr = state.terrs.find(t => t.id === toId);
      if (!atkTerr || !defTerr) return { ...state, scene: "meta", pendingBattle: null };
      const res  = runAbstractBattle(atkTerr, defTerr, state.leaders);
      const diff = applyBattleOutcome(
        { terrs: state.terrs, leaders: state.leaders },
        fromId, toId, res.aa, res.da, res.atkWin,
      );
      const label = res.atkWin
        ? `⚡ ${atkTerr.name}→${defTerr.name} 점령!`
        : `⚡ ${defTerr.name} 방어 성공`;

      const next = {
        ...state,
        terrs:      diff.terrs   ?? state.terrs,
        leaders:    diff.leaders ?? state.leaders,
        battleLog:  [label],
        pendingBattle: null,
        log: [label, ...state.log].slice(0, 80),
      };
      return popDefensiveQueue(next);
    }

    case "ACTION": {
      const msgs = [];
      const addLog = msg => msgs.push(msg);
      const s = {
        terrs: state.terrs, gold: state.gold, food: state.food,
        actions: state.actions, scouted: state.scouted,
        leaders: state.leaders, sel: state.sel, addLog,
      };
      const update = action.fn(s);
      const next   = mergeUpdate(state, update, msgs);
      return {
        ...next,
        ...(action.closeModal && { modal: null }),
      };
    }

    case "ATTACK": {
      const { fromId, toId } = action;
      const msgs = [];
      const addLog = msg => msgs.push(msg);
      const atkTerr = state.terrs.find(t => t.id === fromId);
      const defTerr = state.terrs.find(t => t.id === toId);
      if (!atkTerr || !defTerr) return state;
      if (totalArmy(atkTerr.army) < 30) {
        return { ...state, log: ["병력 부족", ...state.log].slice(0, 80) };
      }
      if (shouldUsePlayerBattle(atkTerr, defTerr)) {
        const ctx = prepareTacticalBattle(atkTerr, defTerr, state.leaders, state.season);
        return {
          ...state,
          scene: "battle",
          modal: null,
          pendingBattle: {
            fromId, toId,
            atkName: atkTerr.name, defName: defTerr.name,
            ctx, isDefensive: false, key: Date.now(),
          },
        };
      }
      // AI-vs-AI abstract battle
      const s = {
        terrs: state.terrs, gold: state.gold, food: state.food,
        actions: state.actions, scouted: state.scouted,
        leaders: state.leaders, sel: state.sel, addLog,
      };
      const update = doAttack(s, fromId, toId);
      const next   = mergeUpdate(state, update, msgs);
      return { ...next, modal: null, view: update ? "battle" : state.view };
    }

    case "SET":
      return { ...state, [action.key]: action.value };

    case "RESET":
      return { ...INIT, terrs: freshTerrs() };

    case "LOAD_SAVE":
      return {
        ...INIT,
        ...action.data,
        scene: "meta", pendingBattle: null, defensiveQueue: [],
        sel: null, view: "map", battleLog: null, modal: null,
      };

    default:
      return state;
  }
}

export function useGameState() {
  const [state, dispatch] = useReducer(reducer, INIT, s => ({ ...s, terrs: freshTerrs() }));

  const {
    phase, scene, terrs, season, year, gold, food,
    sel, log, scouted, actions, view,
    battleLog, pendingBattle, defensiveQueue, modal,
    autoManaged, leaders,
  } = state;

  const myTerrs  = useMemo(() => terrs.filter(t => t.owner === "player"), [terrs]);
  const ownerCnt = useMemo(() => {
    const c = {};
    terrs.forEach(t => { if (t.owner) c[t.owner] = (c[t.owner] || 0) + 1; });
    return c;
  }, [terrs]);

  const selT              = terrs.find(t => t.id === sel);
  const actLeft           = id => 3 - (actions[id] || 0);
  const playerTotalTroops = pid => sum(terrs.filter(t => t.owner === pid), t => totalArmy(t.army));

  const setSel   = useCallback(id => dispatch({ type: "SET", key: "sel",   value: id }), []);
  const setView  = useCallback(v  => dispatch({ type: "SET", key: "view",  value: v  }), []);
  const setModal = useCallback(m  => dispatch({ type: "SET", key: "modal", value: m  }), []);

  const selectStart      = useCallback(id  => dispatch({ type: "SELECT_START",       id  }), []);
  const toggleAutoManage = useCallback(tid => dispatch({ type: "TOGGLE_AUTO_MANAGE", tid }), []);
  const endTurn          = useCallback(()  => dispatch({ type: "END_TURN"                }), []);
  const resetGame        = useCallback(()  => dispatch({ type: "RESET"                   }), []);
  const onBattleComplete = useCallback(battleResult => dispatch({ type: "BATTLE_COMPLETE", battleResult }), []);
  const skipTacticalBattle = useCallback(() => dispatch({ type: "SKIP_BATTLE" }), []);

  const saveGame = useCallback(() => {
    const data = {
      version: 1,
      savedAt: new Date().toISOString(),
      phase, terrs, season, year, gold, food,
      log, scouted, actions, autoManaged, leaders,
    };
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `conquer_${year}년${SEASONS[season]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [phase, terrs, season, year, gold, food, log, scouted, actions, autoManaged, leaders]);

  const loadGame = useCallback(file => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.version !== 1) { alert("지원하지 않는 세이브 파일 버전입니다."); return; }
        dispatch({ type: "LOAD_SAVE", data });
      } catch {
        alert("세이브 파일을 읽을 수 없습니다.");
      }
    };
    reader.readAsText(file);
  }, []);

  return {
    // State
    phase, scene, terrs, season, year, gold, food,
    sel, setSel, log, scouted, actions, view, setView,
    battleLog, pendingBattle, defensiveQueue,
    modal, setModal,
    autoManaged, leaders,
    // Derived
    myTerrs, ownerCnt, selT, actLeft, playerTotalTroops,
    // Game flow
    selectStart, endTurn, resetGame, toggleAutoManage,
    onBattleComplete, skipTacticalBattle,
    saveGame, loadGame,
    // Engine actions
    invest:       (tid, type)               => dispatch({ type: "ACTION", fn: s => doInvest(s, tid, type) }),
    comfort:      tid                       => dispatch({ type: "ACTION", fn: s => doComfort(s, tid) }),
    conscript:    (tid, unitKey)            => dispatch({ type: "ACTION", fn: s => doConscript(s, tid, unitKey) }),
    transfer:     (fromId, toId, transfers) => dispatch({ type: "ACTION", fn: s => doTransfer(s, fromId, toId, transfers),  closeModal: true }),
    bulkTransfer: (fromId, transfersMap)    => dispatch({ type: "ACTION", fn: s => doBulkTransfer(s, fromId, transfersMap), closeModal: true }),
    attack:       (fromId, toId)            => dispatch({ type: "ATTACK", fromId, toId }),
    trade:        (type, amount)            => dispatch({ type: "ACTION", fn: s => doTrade(s, type, amount) }),
    scout:        tid                       => dispatch({ type: "ACTION", fn: s => doScout(s, tid) }),
    surrender:    tid                       => dispatch({ type: "ACTION", fn: s => doSurrender(s, tid) }),
  };
}
