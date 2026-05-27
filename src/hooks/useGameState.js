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

function freshTerrs() {
  return JSON.parse(JSON.stringify(TERRITORIES_INIT));
}

const INIT = {
  phase:          "select",
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
  defenseBattles: [],
  modal:          null,
  autoManaged:    {},
  leaders:        {},
};

// Merge engine update into state, prepending collected log messages
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

      // Auto-manage player territories
      const autoIds = Object.keys(state.autoManaged).filter(id => state.autoManaged[id]);
      if (autoIds.length) {
        const am = autoManageTurn(ts, autoIds, g, f, addLog, ldr);
        ts = am.ts; g = am.gold; f = am.food;
      }

      // AI turns — each country independent
      const allPlayerBattles = [];
      for (const pid of ["ai_mongol", "ai_manchu", "ai_north_china", "ai_india", "ai_persia", "ai_arabia"]) {
        const r = aiTurn(ts, pid, g, f, addLog, ldr);
        ts = r.ts; g = r.gold; f = r.food; ldr = r.leaders;
        if (r.playerBattles?.length) allPlayerBattles.push(...r.playerBattles);
      }

      // Economy processing
      const { ts: finalTs, ng, nf, ns, nl } = processTurnEnd(ts, g, f, state.season, addLog, ldr);
      const ny = ns === 0 ? state.year + 1 : state.year;
      addLog(`--- ${ny}년 ${SEASONS[ns]} ---`);

      const pc = finalTs.filter(t => t.owner === "player").length;
      if (pc === 0)  addLog("패배...");
      if (pc === 12) addLog("🏆 세계 통일!");

      const nextAutoManaged = {};
      Object.keys(state.autoManaged).forEach(id => { if (state.autoManaged[id]) nextAutoManaged[id] = true; });

      return {
        ...state,
        terrs:          finalTs,
        gold:           ng,
        food:           nf,
        season:         ns,
        year:           ny,
        leaders:        nl,
        actions:        {},
        autoManaged:    nextAutoManaged,
        defenseBattles: allPlayerBattles,
        phase:          pc === 0 || pc === 12 ? "over" : "play",
        log:            [...msgs.reverse(), ...state.log].slice(0, 80),
      };
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
        ...(action.closeModal           && { modal: null }),
        ...(action.setViewOnSuccess && update && { view: action.setViewOnSuccess }),
      };
    }

    case "SET":
      return { ...state, [action.key]: action.value };

    case "RESET":
      return { ...INIT, terrs: freshTerrs() };

    case "LOAD_SAVE":
      return {
        ...INIT,
        ...action.data,
        sel: null, view: "map", battleLog: null, defenseBattles: [], modal: null,
      };

    default:
      return state;
  }
}

export function useGameState() {
  const [state, dispatch] = useReducer(reducer, INIT, s => ({ ...s, terrs: freshTerrs() }));

  const {
    phase, terrs, season, year, gold, food,
    sel, log, scouted, actions, view,
    battleLog, defenseBattles, modal,
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

  const setSel              = useCallback(id => dispatch({ type: "SET", key: "sel",            value: id }), []);
  const setView             = useCallback(v  => dispatch({ type: "SET", key: "view",           value: v  }), []);
  const setModal            = useCallback(m  => dispatch({ type: "SET", key: "modal",          value: m  }), []);
  const clearDefenseBattles = useCallback(() => dispatch({ type: "SET", key: "defenseBattles", value: [] }), []);

  const selectStart      = useCallback(id  => dispatch({ type: "SELECT_START",       id  }), []);
  const toggleAutoManage = useCallback(tid => dispatch({ type: "TOGGLE_AUTO_MANAGE", tid }), []);
  const endTurn          = useCallback(()  => dispatch({ type: "END_TURN"                }), []);
  const resetGame        = useCallback(()  => dispatch({ type: "RESET"                   }), []);

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
    phase, terrs, season, year, gold, food,
    sel, setSel, log, scouted, actions, view, setView,
    battleLog, defenseBattles, clearDefenseBattles,
    modal, setModal,
    autoManaged, leaders,
    // Derived
    myTerrs, ownerCnt, selT, actLeft, playerTotalTroops,
    // Game flow
    selectStart, endTurn, resetGame, toggleAutoManage,
    saveGame, loadGame,
    // Engine actions
    invest:       (tid, type)               => dispatch({ type: "ACTION", fn: s => doInvest(s, tid, type) }),
    comfort:      tid                       => dispatch({ type: "ACTION", fn: s => doComfort(s, tid) }),
    conscript:    (tid, unitKey)            => dispatch({ type: "ACTION", fn: s => doConscript(s, tid, unitKey) }),
    transfer:     (fromId, toId, transfers) => dispatch({ type: "ACTION", fn: s => doTransfer(s, fromId, toId, transfers),  closeModal: true }),
    bulkTransfer: (fromId, transfersMap)    => dispatch({ type: "ACTION", fn: s => doBulkTransfer(s, fromId, transfersMap), closeModal: true }),
    attack:       (fromId, toId)            => dispatch({ type: "ACTION", fn: s => doAttack(s, fromId, toId),   closeModal: true, setViewOnSuccess: "battle" }),
    trade:        (type, amount)            => dispatch({ type: "ACTION", fn: s => doTrade(s, type, amount) }),
    scout:        tid                       => dispatch({ type: "ACTION", fn: s => doScout(s, tid) }),
    surrender:    tid                       => dispatch({ type: "ACTION", fn: s => doSurrender(s, tid) }),
  };
}
