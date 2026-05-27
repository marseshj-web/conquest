import { useCallback, useRef } from "react";
import { useGameState } from "./hooks/useGameState.js";
import { PLAYERS, SEASONS, SEASON_COLORS, FOOD_PER_SOLDIER } from "./data/constants.js";
import { SPECIALS } from "./data/units.js";
import { totalArmy, sum } from "./utils/math.js";
import TerritoryMap from "./components/TerritoryMap.jsx";
import SidePanel from "./components/SidePanel.jsx";
import MapView from "./components/MapView.jsx";
import DetailView from "./components/DetailView.jsx";
import BattleLog from "./components/BattleLog.jsx";
import GameLog from "./components/GameLog.jsx";
import MerchantModal from "./components/modals/MerchantModal.jsx";
import DefenseAlert from "./components/DefenseAlert.jsx";

const MOBILE_TABS = [
  ["map",    "🗺️지도"],
  ["detail", "📋영지"],
  ["battle", "⚔️전투"],
  ["log",    "📜기록"],
];

export default function App() {
  const gs = useGameState();
  const {
    phase, terrs, season, year, gold, food,
    sel, setSel, log, scouted, actions, view, setView,
    battleLog, defenseBattles, clearDefenseBattles,
    modal, setModal,
    autoManaged, leaders,
    myTerrs, ownerCnt,
    selectStart, endTurn, resetGame,
    toggleAutoManage,
    saveGame, loadGame,
    invest, comfort, conscript, transfer, attack, trade, scout, surrender,
  } = gs;

  const loadFileRef = useRef(null);

  // Close modal when selecting a new territory
  const handleSel = useCallback(id => {
    setSel(id);
    setModal(null);
  }, [setSel, setModal]);

  // ── Select screen ────────────────────────────────────────────────
  if (phase === "select") {
    const neutrals = terrs.filter(t => !t.owner);
    return (
      <div className="min-h-screen bg-slate-900 text-slate-200 p-3 font-sans">
        <h2 className="text-center text-xl font-bold text-yellow-400 my-2">⚔️ 정복자 v3</h2>
        <p className="text-center text-xs text-slate-400 mb-3">시작 영지 선택 (중립만 가능)</p>
        <div className="flex flex-wrap gap-1.5 justify-center">
          {neutrals.map(t => {
            const sp = SPECIALS[t.id];
            return (
              <button key={t.id} onClick={() => selectStart(t.id)}
                className="bg-slate-800 border-2 border-blue-600 rounded-xl p-2.5 text-left cursor-pointer hover:border-blue-400 transition w-[calc(50%-3px)]">
                <div className="font-bold text-sm text-blue-400">{t.name}</div>
                <div className="text-xs text-slate-400 mt-1">
                  인구{t.pop} 경제{t.econ} 농업{t.agri}<br />
                  병력{totalArmy(t.army)} {sp.icon}{sp.n} {t.army.special}
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-3 p-2.5 bg-slate-800 rounded-lg text-xs text-slate-400">
          <div className="text-red-400 font-bold">🔴 몽골 제국: 몽골·만주·화북</div>
          <div className="text-green-400 font-bold mt-1">🟢 이슬람 연맹: 인도·페르시아·아라비아</div>
          <div className="mt-1.5 text-slate-500 text-xs">
            💡 금=경제·외교·공성, 식량=징병·군량·민심<br />
            매 턴 병사 1명당 0.5 식량 소비 · 상인으로 금↔식량 교환 가능
          </div>
        </div>
      </div>
    );
  }

  // ── Game over screen ─────────────────────────────────────────────
  if (phase === "over") {
    const won = terrs.filter(t => t.owner === "player").length === 12;
    return (
      <div className="min-h-screen bg-slate-900 text-slate-200 font-sans flex flex-col items-center justify-center gap-4">
        <div className="text-6xl">{won ? "🏆" : "💀"}</div>
        <h2 className={`text-2xl font-bold ${won ? "text-yellow-400" : "text-red-400"}`}>
          {won ? "세계 통일!" : "패배..."}
        </h2>
        <button onClick={resetGame}
          className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-6 py-2.5 font-bold cursor-pointer">
          다시 시작
        </button>
      </div>
    );
  }

  // ── Main game ─────────────────────────────────────────────────────
  const troopTotal = sum(myTerrs, t => totalArmy(t.army));
  const foodBurn   = Math.floor(troopTotal * FOOD_PER_SOLDIER);

  const sharedProps = {
    terrs, sel, setSel: handleSel, scouted, myTerrs, ownerCnt,
    gold, food, season, year, actions,
    modal, setModal, setView,
    autoManaged, toggleAutoManage, leaders,
    invest, comfort, conscript, transfer, attack, trade, scout, surrender, endTurn,
  };

  const Header = () => (
    <div className="bg-slate-800 px-3 py-1.5 flex justify-between items-center border-b border-slate-700 sticky top-0 z-10">
      <span className="font-bold text-sm" style={{ color: SEASON_COLORS[season] }}>
        {year}년 {SEASONS[season]}
      </span>
      <div className="flex gap-2 text-xs items-center">
        <span className="text-yellow-400">💰{gold.player}</span>
        <span className="text-green-400">🌾{food.player}</span>
        <span className="text-red-300">(-{foodBurn}/턴)</span>
        <span className="text-blue-400">🏰{myTerrs.length}</span>
        <div className="flex gap-1 ml-2">
          <button onClick={saveGame} title="세이브"
            className="px-2 py-0.5 rounded text-xs cursor-pointer transition bg-slate-700 hover:bg-green-700 text-slate-300 hover:text-white">
            💾
          </button>
          <button onClick={() => loadFileRef.current?.click()} title="로드"
            className="px-2 py-0.5 rounded text-xs cursor-pointer transition bg-slate-700 hover:bg-blue-700 text-slate-300 hover:text-white">
            📂
          </button>
          {/* Desktop log/battle toggle buttons */}
          <button onClick={() => setView(view === "battle" ? "map" : "battle")}
            className={`hidden md:block px-2 py-0.5 rounded text-xs cursor-pointer transition
              ${view === "battle" ? "bg-yellow-700 text-yellow-200" : "bg-slate-700 hover:bg-slate-600 text-slate-300"}`}>
            ⚔️
          </button>
          <button onClick={() => setView(view === "log" ? "map" : "log")}
            className={`hidden md:block px-2 py-0.5 rounded text-xs cursor-pointer transition
              ${view === "log" ? "bg-slate-500 text-white" : "bg-slate-700 hover:bg-slate-600 text-slate-300"}`}>
            📜
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-slate-900 text-slate-200 font-sans text-sm flex flex-col overflow-hidden">
      <input ref={loadFileRef} type="file" accept=".json" className="hidden"
        onChange={e => { if (e.target.files[0]) { loadGame(e.target.files[0]); e.target.value = ""; } }} />
      <Header />
      {defenseBattles.length > 0 && (
        <DefenseAlert battles={defenseBattles} onClose={clearDefenseBattles} />
      )}

      {/* ── Desktop layout (md+): 2-column ── */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        {/* Left 2/3: map + optional log panels */}
        <div className="flex-[2] flex flex-col overflow-hidden border-r border-slate-700">
          <div className="flex-1 overflow-hidden">
            <TerritoryMap terrs={terrs} sel={sel} setSel={handleSel} scouted={scouted} />
          </div>

          {/* Territory count legend */}
          <div className="flex gap-3 justify-center py-1 text-xs border-t border-slate-800 flex-shrink-0">
            {Object.entries(PLAYERS).map(([k, v]) => (
              <span key={k} style={{ color: v.c }}>●{v.n}({ownerCnt[k] || 0})</span>
            ))}
            <span className="text-slate-500">
              ●중립({12 - Object.values(ownerCnt).reduce((a, b) => a + b, 0)})
            </span>
          </div>

          {/* Battle/Log panels shown below map when toggled */}
          {view === "battle" && (
            <div className="flex-shrink-0 max-h-[35vh] overflow-y-auto border-t border-slate-700">
              <BattleLog battleLog={battleLog} onBack={() => setView("map")} />
            </div>
          )}
          {view === "log" && (
            <div className="flex-shrink-0 max-h-[35vh] overflow-y-auto border-t border-slate-700">
              <GameLog log={log} />
            </div>
          )}
        </div>

        {/* Right 1/3: side panel */}
        <div className="flex-[1] overflow-y-auto">
          <SidePanel {...sharedProps} />
        </div>
      </div>

      {/* ── Mobile layout (<md): tabs ── */}
      <div className="md:hidden flex flex-col flex-1 overflow-hidden">
        <div className="flex bg-slate-800 border-b border-slate-700 flex-shrink-0">
          {MOBILE_TABS.map(([v, l]) => (
            <button key={v} onClick={() => setView(v)}
              className={`flex-1 py-1.5 text-xs cursor-pointer transition border-b-2
                ${view === v
                  ? "bg-slate-700 text-white border-blue-500"
                  : "bg-transparent text-slate-400 border-transparent hover:text-slate-200"}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          {view === "map"    && <MapView    {...sharedProps} />}
          {view === "detail" && <DetailView {...sharedProps} />}
          {view === "battle" && <BattleLog  battleLog={battleLog} onBack={() => setView("map")} />}
          {view === "log"    && <GameLog    log={log} />}
        </div>
      </div>
    </div>
  );
}
