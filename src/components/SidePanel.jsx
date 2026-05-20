import { PLAYERS, SEASONS } from "../data/constants.js";
import { UNITS, SPECIALS } from "../data/units.js";
import { totalArmy } from "../utils/math.js";
import TransferModal from "./modals/TransferModal.jsx";
import BulkTransferModal from "./modals/BulkTransferModal.jsx";
import ConscriptModal from "./modals/ConscriptModal.jsx";
import MerchantModal from "./modals/MerchantModal.jsx";

const ownerColor = owner => owner ? (PLAYERS[owner]?.c || "#6b7280") : "#9ca3af";
const ownerName  = owner => owner ? (PLAYERS[owner]?.n || "?") : "중립";

const GRADE_COLOR = { A: "text-yellow-400", B: "text-green-400", C: "text-slate-400", D: "text-red-400" };
const GRADE_LABEL = { admin: "내정", charm: "매력", war: "전쟁", trade: "무역" };

export default function SidePanel({
  terrs, sel, setSel, scouted, myTerrs, ownerCnt,
  gold, food, season, actions,
  modal, setModal,
  autoManaged, toggleAutoManage, leaders,
  invest, comfort, conscript, transfer, bulkTransfer, attack, trade, scout, surrender, endTurn,
}) {
  const selT   = sel ? terrs.find(t => t.id === sel) : null;
  const actLeft = id => 3 - (actions[id] || 0);
  const nextSeason = SEASONS[(season + 1) % 4];
  const isAdjacent = selT ? myTerrs.some(pt => pt.conn.includes(selT.id)) : false;
  const atkBase    = selT ? myTerrs.find(pt => pt.conn.includes(selT.id)) : null;

  const BottomBar = () => (
    <div className="mt-auto pt-2 flex flex-col gap-1.5 border-t border-slate-700">
      <button onClick={() => setModal({ type: "merchant" })}
        className="w-full bg-yellow-900 hover:bg-yellow-800 text-yellow-400 rounded-lg py-2 text-sm font-bold cursor-pointer">
        🏪 상인
      </button>
      <button onClick={endTurn}
        className="w-full bg-blue-700 hover:bg-blue-600 text-white rounded-lg py-2.5 text-sm font-bold cursor-pointer">
        턴 종료 → {nextSeason}
      </button>
      {modal?.type === "merchant" && (
        <MerchantModal gold={gold.player} food={food.player}
          onTrade={trade} onClose={() => setModal(null)} />
      )}
    </div>
  );

  // ── A: Nothing selected ──────────────────────────────────────────
  if (!selT) {
    return (
      <div className="flex flex-col h-full p-3 gap-3 min-h-[300px]">
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
          영지를 클릭하세요
        </div>
        <BottomBar />
      </div>
    );
  }

  // ── B: Player's own territory ────────────────────────────────────
  if (selT.owner === "player") {
    return (
      <div className="flex flex-col p-3 gap-2">
        {/* Header */}
        <div className="flex justify-between items-center">
          <span className="font-bold text-blue-400 text-base">{selT.name}</span>
          <div className="flex items-center gap-1.5">
            <button onClick={() => toggleAutoManage(selT.id)}
              className={`text-xs rounded px-2 py-0.5 cursor-pointer transition ${
                autoManaged[selT.id]
                  ? "bg-emerald-700 hover:bg-emerald-600 text-emerald-200"
                  : "bg-slate-700 hover:bg-slate-600 text-slate-300"
              }`}>
              {autoManaged[selT.id] ? "🤖 ON" : "🤖"}
            </button>
            <span className={`text-xs px-2 py-0.5 rounded-full ${actLeft(selT.id) > 0 ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
              명령 {actLeft(selT.id)}/3
            </span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-5 gap-1 text-xs">
          {[["👥", selT.pop, "인구"], ["💰", selT.econ, "경제"],
            ["🌾", selT.agri, "농업"], ["😊", selT.mor, "민심"], ["🏰", selT.wall, "성벽"]
          ].map(([ic, v, lb], i) => (
            <div key={i} className="bg-slate-900 rounded p-1 text-center">
              <div className="text-slate-500 text-xs">{ic}</div>
              <div className={`font-bold text-xs mt-0.5 ${
                lb === "민심" ? (v < 40 ? "text-red-400" : v < 60 ? "text-yellow-400" : "text-green-400") : "text-slate-200"
              }`}>{v}</div>
              <div className="text-slate-600 text-xs">{lb}</div>
            </div>
          ))}
        </div>

        {/* Leader card */}
        {(() => {
          const leader = leaders?.[selT.id];
          if (!leader) return null;
          return (
            <div className="bg-slate-800 rounded-lg p-2 flex items-center gap-2.5">
              <span className="text-2xl leading-none">{leader.icon}</span>
              <div className="min-w-0">
                <div className="text-sm font-bold text-yellow-300 truncate">{leader.name}</div>
                <div className="flex gap-2 mt-0.5">
                  {["admin","charm","war","trade"].map(k => (
                    <span key={k} className={`text-xs ${GRADE_COLOR[leader[k]]}`}>
                      {GRADE_LABEL[k]}{leader[k]}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Army grid */}
        <div className="grid grid-cols-3 gap-1 text-xs">
          {[["infantry", UNITS.infantry], ["archer", UNITS.archer], ["cavalry", UNITS.cavalry],
            ["siege", UNITS.siege], ["special", SPECIALS[selT.id]]].map(([k, u]) => (
            <div key={k} className="bg-slate-900 rounded p-1 text-center">
              <div className="text-slate-400">{u.icon}{u.n}</div>
              <div className="font-bold text-xs mt-0.5">{selT.army[k]}</div>
            </div>
          ))}
          <div className="bg-slate-900 rounded p-1 text-center">
            <div className="text-slate-400">총병력</div>
            <div className="font-bold text-xs text-yellow-400 mt-0.5">{totalArmy(selT.army)}</div>
          </div>
        </div>

        {/* Commands */}
        <div className="bg-slate-800 rounded-lg p-2">
          <div className="text-xs font-bold text-slate-400 mb-1.5">📋 명령</div>
          <div className="grid grid-cols-3 gap-1">
            {[["econ", "📈경제", "💰50"], ["agri", "🌿농업", "💰30🌾20"],
              ["wall", "🏰성벽", "💰60"], ["comfort", "😊위무", "🌾80"]].map(([k, lb, cs]) => {
              const dis = actLeft(selT.id) <= 0;
              return (
                <button key={k}
                  onClick={() => k === "comfort" ? comfort(selT.id) : invest(selT.id, k)}
                  disabled={dis}
                  className={`border border-slate-700 rounded p-1.5 text-xs transition
                    ${dis ? "bg-slate-900 text-slate-600 cursor-not-allowed" : "bg-slate-700 hover:bg-slate-600 text-slate-200 cursor-pointer"}`}>
                  <div>{lb}</div>
                  <div className="text-slate-500 text-xs">{cs}</div>
                </button>
              );
            })}
            <button onClick={() => setModal({ type: "conscript", tid: selT.id })}
              disabled={actLeft(selT.id) <= 0}
              className={`border border-slate-700 rounded p-1.5 text-xs transition
                ${actLeft(selT.id) <= 0 ? "bg-slate-900 text-slate-600 cursor-not-allowed" : "bg-slate-700 hover:bg-slate-600 text-slate-200 cursor-pointer"}`}>
              <div>⚔️징병</div>
              <div className="text-slate-500 text-xs">병종선택</div>
            </button>
          </div>
        </div>

        {/* Transfer / Attack */}
        <div className="bg-slate-800 rounded-lg p-2">
          <div className="flex justify-between items-center mb-1.5">
            <div className="text-xs font-bold text-slate-400">🚚 이동 · ⚔️ 공격</div>
            {selT.conn.some(cid => terrs.find(t => t.id === cid)?.owner === "player") && (
              <button
                onClick={() => setModal({ type: "bulkTransfer", from: selT.id })}
                disabled={actLeft(selT.id) <= 0}
                className={`text-xs rounded px-2 py-0.5 cursor-pointer transition ${
                  actLeft(selT.id) > 0
                    ? "bg-blue-800 hover:bg-blue-700 text-blue-300"
                    : "bg-slate-900 text-slate-600 cursor-not-allowed"
                }`}>
                일괄이동
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {selT.conn.map(cid => {
              const tgt = terrs.find(t => t.id === cid);
              const isAlly = tgt?.owner === "player";
              return (
                <button key={cid}
                  onClick={() => setModal(isAlly
                    ? { type: "transfer", from: selT.id, to: cid }
                    : { type: "attack",   from: selT.id, to: cid })}
                  disabled={!isAlly && actLeft(selT.id) <= 0}
                  className={`rounded px-2 py-1 text-xs cursor-pointer transition
                    ${isAlly ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-red-950 hover:bg-red-900 text-red-300"}`}>
                  {isAlly ? "🚚" : "⚔️"}{tgt.name}
                  {(scouted[cid] || tgt.owner === "player") && (
                    <span className="text-slate-400 ml-1">({totalArmy(tgt.army)})</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Modals */}
        {modal?.type === "bulkTransfer" && modal.from === selT.id && (
          <BulkTransferModal terrs={terrs} fromId={selT.id}
            onDo={tr => bulkTransfer(selT.id, tr)}
            onClose={() => setModal(null)} />
        )}
        {modal?.type === "transfer" && modal.from === selT.id && (
          <TransferModal terrs={terrs} from={modal.from} to={modal.to}
            onDo={tr => transfer(modal.from, modal.to, tr)}
            onClose={() => setModal(null)} />
        )}
        {modal?.type === "conscript" && modal.tid === selT.id && (
          <ConscriptModal terrs={terrs} tid={modal.tid}
            actLeft={actLeft(selT.id)}
            onConscript={conscript}
            onClose={() => setModal(null)} />
        )}
        {modal?.type === "attack" && modal.from === selT.id && (
          <div className="bg-red-950 rounded-lg p-2.5">
            <div className="font-bold text-red-300 text-sm">
              ⚔️ {selT.name} → {terrs.find(t => t.id === modal.to)?.name}
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => attack(modal.from, modal.to)}
                className="bg-red-600 hover:bg-red-500 text-white rounded-lg px-4 py-2 text-sm cursor-pointer">공격!</button>
              <button onClick={() => setModal(null)}
                className="bg-slate-600 hover:bg-slate-500 text-white rounded-lg px-4 py-2 text-sm cursor-pointer">취소</button>
            </div>
          </div>
        )}
        {modal?.type === "merchant" && (
          <MerchantModal gold={gold.player} food={food.player}
            onTrade={trade} onClose={() => setModal(null)} />
        )}

        <BottomBar />
      </div>
    );
  }

  // ── C/D: Enemy or Neutral territory ─────────────────────────────
  return (
    <div className="flex flex-col p-3 gap-2">
      {/* Header */}
      <div className="flex justify-between items-center">
        <span className="font-bold text-base" style={{ color: ownerColor(selT.owner) }}>
          {selT.name}
        </span>
        <span className="text-xs text-slate-400">{ownerName(selT.owner)}</span>
      </div>

      {/* Stats / scout */}
      {(scouted[selT.id]) ? (
        <>
          <div className="grid grid-cols-5 gap-1 text-xs">
            {[["👥", selT.pop, "인구"], ["💰", selT.econ, "경제"],
              ["🌾", selT.agri, "농업"], ["😊", selT.mor, "민심"], ["🏰", selT.wall, "성벽"]
            ].map(([ic, v, lb], i) => (
              <div key={i} className="bg-slate-900 rounded p-1 text-center">
                <div className="text-slate-500 text-xs">{ic}</div>
                <div className="font-bold text-xs mt-0.5 text-slate-200">{v}</div>
                <div className="text-slate-600 text-xs">{lb}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1 text-xs">
            {[["infantry", UNITS.infantry], ["archer", UNITS.archer], ["cavalry", UNITS.cavalry],
              ["siege", UNITS.siege], ["special", SPECIALS[selT.id]]].map(([k, u]) => (
              <div key={k} className="bg-slate-900 rounded p-1 text-center">
                <div className="text-slate-400">{u.icon}{u.n}</div>
                <div className="font-bold text-xs mt-0.5">{selT.army[k]}</div>
              </div>
            ))}
            <div className="bg-slate-900 rounded p-1 text-center">
              <div className="text-slate-400">총병력</div>
              <div className="font-bold text-xs text-yellow-400 mt-0.5">{totalArmy(selT.army)}</div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-slate-800 rounded-lg p-3 text-center">
          <div className="text-slate-400 text-sm mb-2">정보 미확인</div>
          <button onClick={() => scout(selT.id)}
            className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2 text-sm cursor-pointer">
            🔍 정찰 (💰40)
          </button>
        </div>
      )}

      {/* Attack / Surrender */}
      {isAdjacent && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setModal({ type: "attack", from: atkBase.id, to: selT.id })}
            className="flex-1 bg-red-700 hover:bg-red-600 text-white rounded-lg py-2 text-sm cursor-pointer">
            ⚔️ 공격
          </button>
          {selT.owner && (
            <button onClick={() => surrender(selT.id)}
              className="flex-1 bg-purple-700 hover:bg-purple-600 text-white rounded-lg py-2 text-sm cursor-pointer">
              🏳️ 항복권고 (💰100)
            </button>
          )}
        </div>
      )}

      {/* Attack confirm modal */}
      {modal?.type === "attack" && modal.to === selT.id && (
        <div className="bg-red-950 rounded-lg p-2.5">
          <div className="font-bold text-red-300 text-sm">
            ⚔️ {terrs.find(t => t.id === modal.from)?.name} → {selT.name}
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={() => attack(modal.from, modal.to)}
              className="bg-red-600 hover:bg-red-500 text-white rounded-lg px-4 py-2 text-sm cursor-pointer">공격!</button>
            <button onClick={() => setModal(null)}
              className="bg-slate-600 hover:bg-slate-500 text-white rounded-lg px-4 py-2 text-sm cursor-pointer">취소</button>
          </div>
        </div>
      )}

      <BottomBar />
    </div>
  );
}
