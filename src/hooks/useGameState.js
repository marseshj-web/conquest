import { useState, useCallback, useMemo } from "react";
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

export function useGameState() {
  const [phase,     setPhase]     = useState("select");
  const [terrs,     setTerrs]     = useState(freshTerrs);
  const [season,    setSeason]    = useState(0);
  const [year,      setYear]      = useState(START_YEAR);
  const [gold,      setGold]      = useState(INITIAL_RESOURCES.gold);
  const [food,      setFood]      = useState(INITIAL_RESOURCES.food);
  const [sel,       setSel]       = useState(null);
  const [log,       setLog]       = useState([]);
  const [scouted,   setScouted]   = useState({});
  const [actions,   setActions]   = useState({});
  const [view,      setView]      = useState("map");
  const [battleLog,      setBattleLog]      = useState(null);
  const [defenseBattles, setDefenseBattles] = useState([]);
  const [modal,          setModal]          = useState(null);
  const [autoManaged,    setAutoManaged]    = useState({});
  const [leaders,        setLeaders]        = useState({});

  const addLog = useCallback(m => setLog(p => [m, ...p].slice(0, 80)), []);

  const myTerrs  = useMemo(() => terrs.filter(t => t.owner === "player"), [terrs]);
  const ownerCnt = useMemo(() => {
    const c = {};
    terrs.forEach(t => { if (t.owner) c[t.owner] = (c[t.owner] || 0) + 1; });
    return c;
  }, [terrs]);

  const selT    = terrs.find(t => t.id === sel);
  const actLeft = id => 3 - (actions[id] || 0);

  const playerTotalTroops = pid => sum(terrs.filter(t => t.owner === pid), t => totalArmy(t.army));

  // Apply partial state updates from action functions
  const applyUpdate = useCallback(update => {
    if (!update) return;
    if (update.terrs)     setTerrs(update.terrs);
    if (update.gold)      setGold(update.gold);
    if (update.food)      setFood(update.food);
    if (update.actions)   setActions(update.actions);
    if (update.scouted)   setScouted(update.scouted);
    if (update.battleLog) setBattleLog(update.battleLog);
    if (update.leaders)   setLeaders(update.leaders);
  }, []);

  const buildState = useCallback(() => ({
    terrs, gold, food, actions, scouted, leaders, sel, addLog,
  }), [terrs, gold, food, actions, scouted, leaders, sel, addLog]);

  const selectStart = id => {
    const newTerrs = terrs.map(t => t.id === id ? { ...t, owner: "player" } : t);
    setTerrs(newTerrs);
    setLeaders(assignLeaders(newTerrs));
    setPhase("play");
    addLog(`${START_YEAR}년 봄 - ${TERRITORIES_INIT.find(t => t.id === id).name}에서 출발!`);
  };

  const toggleAutoManage = useCallback(tid => {
    setAutoManaged(p => ({ ...p, [tid]: !p[tid] }));
  }, []);

  const endTurn = useCallback(() => {
    let ts = terrs.map(t => ({ ...t, army: { ...t.army } }));
    let g = { ...gold };
    let f = { ...food };
    let ldr = { ...leaders };

    // Auto-manage player territories
    const autoIds = Object.keys(autoManaged).filter(id => autoManaged[id]);
    if (autoIds.length) {
      const am = autoManageTurn(ts, autoIds, g, f, addLog, ldr);
      ts = am.ts; g = am.gold; f = am.food;
    }

    // AI turns — each country is independent
    const allPlayerBattles = [];
    for (const pid of ["ai_mongol", "ai_manchu", "ai_north_china", "ai_india", "ai_persia", "ai_arabia"]) {
      const r = aiTurn(ts, pid, g, f, addLog, ldr);
      ts = r.ts; g = r.gold; f = r.food; ldr = r.leaders;
      if (r.playerBattles?.length) allPlayerBattles.push(...r.playerBattles);
    }
    if (allPlayerBattles.length) setDefenseBattles(allPlayerBattles);

    // Economy processing
    const { ts: finalTs, ng, nf, ns, nl } = processTurnEnd(ts, g, f, season, addLog, ldr);

    const ny = ns === 0 ? year + 1 : year;
    setSeason(ns);
    setYear(ny);
    setGold(ng);
    setFood(nf);
    setTerrs(finalTs);
    setLeaders(nl);
    setActions({});
    setAutoManaged(p => {
      const next = {};
      Object.keys(p).forEach(id => { if (p[id]) next[id] = true; });
      return next;
    });
    addLog(`--- ${ny}년 ${SEASONS[ns]} ---`);

    const pc = finalTs.filter(t => t.owner === "player").length;
    if (pc === 0)  { setPhase("over"); addLog("패배..."); }
    if (pc === 12) { setPhase("over"); addLog("🏆 세계 통일!"); }
  }, [terrs, gold, food, season, year, leaders, addLog]);

  const resetGame = () => {
    setPhase("select");
    setTerrs(freshTerrs());
    setSeason(0);
    setYear(START_YEAR);
    setGold(INITIAL_RESOURCES.gold);
    setFood(INITIAL_RESOURCES.food);
    setLog([]);
    setScouted({});
    setActions({});
    setSel(null);
    setModal(null);
    setBattleLog(null);
    setDefenseBattles([]);
    setAutoManaged({});
    setLeaders({});
  };

  return {
    // State
    phase, terrs, season, year, gold, food,
    sel, setSel, log, scouted, actions, view, setView,
    battleLog, defenseBattles, clearDefenseBattles: () => setDefenseBattles([]),
    modal, setModal,
    autoManaged, leaders,
    // Derived
    myTerrs, ownerCnt, selT, actLeft, playerTotalTroops,
    // Actions (wrap engine functions)
    selectStart,
    endTurn,
    resetGame,
    toggleAutoManage,
    invest:       (tid, type)               => applyUpdate(doInvest(buildState(), tid, type)),
    comfort:      tid                       => applyUpdate(doComfort(buildState(), tid)),
    conscript:    (tid, unitKey)            => applyUpdate(doConscript(buildState(), tid, unitKey)),
    transfer:     (fromId, toId, transfers) => { applyUpdate(doTransfer(buildState(), fromId, toId, transfers)); setModal(null); },
    bulkTransfer: (fromId, transfersMap)    => { applyUpdate(doBulkTransfer(buildState(), fromId, transfersMap)); setModal(null); },
    attack:       (fromId, toId)            => { const u = doAttack(buildState(), fromId, toId); applyUpdate(u); if (u) setView("battle"); setModal(null); },
    trade:        (type, amount)            => applyUpdate(doTrade(buildState(), type, amount)),
    scout:        tid                       => applyUpdate(doScout(buildState(), tid)),
    surrender:    tid                       => applyUpdate(doSurrender(buildState(), tid)),
  };
}
