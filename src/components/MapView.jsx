import { PLAYERS, SEASONS } from "../data/constants.js";
import { SPECIALS } from "../data/units.js";
import { totalArmy } from "../utils/math.js";
import TerritoryMap from "./TerritoryMap.jsx";
import TransferModal from "./modals/TransferModal.jsx";
import MerchantModal from "./modals/MerchantModal.jsx";

const ownerColor = owner => owner ? (PLAYERS[owner]?.c || "#6b7280") : "#9ca3af";
const ownerName  = owner => owner ? (PLAYERS[owner]?.n || "?") : "중립";

export default function MapView({
  terrs, sel, setSel, scouted, myTerrs, ownerCnt,
  gold, food, season,
  modal, setModal, setView,
  scout, surrender, attack, transfer, trade, endTurn,
}) {
  const selT = terrs.find(t => t.id === sel);
  const nextSeason = SEASONS[(season + 1) % 4];

  return (
    <div className="p-2">
      <TerritoryMap terrs={terrs} sel={sel} setSel={setSel} scouted={scouted} />

      {/* Legend */}
      <div className="flex gap-3 justify-center mt-1 text-xs">
        {Object.entries(PLAYERS).map(([k, v]) => (
          <span key={k} style={{ color: v.c }}>●{v.n}({ownerCnt[k] || 0})</span>
        ))}
        <span className="text-slate-400">
          ●중립({12 - Object.values(ownerCnt).reduce((a, b) => a + b, 0)})
        </span>
      </div>

      {/* Selected territory info */}
      {selT && (
        <div className="bg-slate-800 rounded-lg p-2.5 mt-2">
          <div className="flex justify-between">
            <span className="font-bold" style={{ color: ownerColor(selT.owner) }}>{selT.name}</span>
            <span className="text-xs text-slate-400">{ownerName(selT.owner)}</span>
          </div>

          {(selT.owner === "player" || scouted[selT.id]) ? (
            <div className="text-xs text-slate-400 mt-1 grid grid-cols-3 gap-1">
              <span>🗡️보{selT.army.infantry}</span>
              <span>🏹궁{selT.army.archer}</span>
              <span>🐴기{selT.army.cavalry}</span>
              <span>🪨공{selT.army.siege}</span>
              <span>{SPECIALS[selT.id].icon}{SPECIALS[selT.id].n} {selT.army.special}</span>
              <span className="text-yellow-400">총{totalArmy(selT.army)}</span>
            </div>
          ) : (
            <button onClick={() => scout(selT.id)}
              className="mt-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-3 py-1.5 text-xs cursor-pointer">
              🔍 정찰(💰40)
            </button>
          )}

          {selT.owner !== "player" && myTerrs.some(pt => pt.conn.includes(selT.id)) && (
            <div className="mt-1.5 flex gap-2 flex-wrap">
              <button onClick={() => {
                const f = myTerrs.find(pt => pt.conn.includes(selT.id));
                setSel(f.id);
                setModal({ type: "attack", from: f.id, to: selT.id });
              }} className="bg-red-700 hover:bg-red-600 text-red-200 rounded-lg px-3 py-1 text-xs cursor-pointer">
                ⚔️공격
              </button>
              {selT.owner && (
                <button onClick={() => surrender(selT.id)}
                  className="bg-purple-700 hover:bg-purple-600 text-white rounded-lg px-3 py-1 text-xs cursor-pointer">
                  🏳️항복권고(💰100)
                </button>
              )}
            </div>
          )}

          {selT.owner === "player" && (
            <button onClick={() => setView("detail")}
              className="mt-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg px-3 py-1 text-xs cursor-pointer">
              📋상세
            </button>
          )}
        </div>
      )}

      {/* Attack confirm */}
      {modal?.type === "attack" && (
        <div className="bg-red-950 rounded-lg p-2.5 mt-2">
          <div className="font-bold text-red-300 text-sm">
            ⚔️ {terrs.find(t => t.id === modal.from)?.name} → {terrs.find(t => t.id === modal.to)?.name}
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={() => attack(modal.from, modal.to)}
              className="bg-red-600 hover:bg-red-500 text-white rounded-lg px-4 py-2 text-sm cursor-pointer">공격!</button>
            <button onClick={() => setModal(null)}
              className="bg-slate-600 hover:bg-slate-500 text-white rounded-lg px-4 py-2 text-sm cursor-pointer">취소</button>
          </div>
        </div>
      )}

      {modal?.type === "transfer" && (
        <TransferModal terrs={terrs} from={modal.from} to={modal.to}
          onDo={tr => transfer(modal.from, modal.to, tr)}
          onClose={() => setModal(null)} />
      )}

      {/* Bottom buttons */}
      <div className="flex gap-2 mt-3">
        <button onClick={() => setModal({ type: "merchant" })}
          className="flex-1 bg-yellow-900 hover:bg-yellow-800 text-yellow-400 rounded-lg py-2.5 text-sm font-bold cursor-pointer">
          🏪 상인
        </button>
        <button onClick={endTurn}
          className="flex-[2] bg-blue-700 hover:bg-blue-600 text-white rounded-lg py-2.5 text-sm font-bold cursor-pointer">
          턴 종료 → {nextSeason}
        </button>
      </div>

      {modal?.type === "merchant" && (
        <MerchantModal gold={gold.player} food={food.player}
          onTrade={trade} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
