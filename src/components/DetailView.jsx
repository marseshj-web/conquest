import { UNITS, SPECIALS } from "../data/units.js";
import { SEASONS } from "../data/constants.js";

const GRADE_COLOR = { A: "text-yellow-400", B: "text-green-400", C: "text-slate-400", D: "text-red-400" };
const GRADE_LABEL = { admin: "내정", charm: "매력", war: "전쟁", trade: "무역" };
import { totalArmy } from "../utils/math.js";
import TransferModal from "./modals/TransferModal.jsx";
import BulkTransferModal from "./modals/BulkTransferModal.jsx";
import ConscriptModal from "./modals/ConscriptModal.jsx";
import MerchantModal from "./modals/MerchantModal.jsx";

export default function DetailView({
  terrs, sel, setSel, myTerrs, scouted,
  gold, food, season,
  actions, modal, setModal,
  autoManaged, toggleAutoManage, leaders,
  invest, comfort, conscript, transfer, bulkTransfer, attack, trade, endTurn,
}) {
  const selT = sel ? terrs.find(t => t.id === sel) : null;
  const actLeft = id => 3 - (actions[id] || 0);
  const nextSeason = SEASONS[(season + 1) % 4];

  return (
    <div className="p-2">
      {/* Territory selector tabs */}
      <div className="flex gap-1 flex-wrap mb-2">
        {myTerrs.map(t => (
          <button key={t.id} onClick={() => { setSel(t.id); setModal(null); }}
            className={`rounded-md px-2 py-1 text-xs cursor-pointer transition
              ${sel === t.id ? "bg-blue-600 text-white" : "bg-slate-700 hover:bg-slate-600 text-white"}`}>
            {autoManaged[t.id] ? "🤖" : ""}{t.name}
          </button>
        ))}
      </div>

      {selT && selT.owner === "player" ? (
        <div>
          {/* Stats */}
          <div className="bg-slate-800 rounded-lg p-2.5">
            <div className="flex justify-between mb-2">
              <span className="font-bold text-blue-400 text-base">{selT.name}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleAutoManage(selT.id)}
                  className={`text-xs rounded px-2 py-0.5 cursor-pointer transition ${
                    autoManaged[selT.id]
                      ? "bg-emerald-700 hover:bg-emerald-600 text-emerald-200"
                      : "bg-slate-700 hover:bg-slate-600 text-slate-300"
                  }`}>
                  {autoManaged[selT.id] ? "🤖 자율관리 ON" : "🤖 자율관리"}
                </button>
                <span className={`text-xs ${actLeft(selT.id) > 0 ? "text-green-400" : "text-red-400"}`}>
                  명령 {actLeft(selT.id)}/3
                </span>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-1 text-xs">
              {[["👥", selT.pop, "인구"], ["💰", selT.econ, "경제"], ["🌾", selT.agri, "농업"],
                ["😊", selT.mor, "민심"], ["🏰", selT.wall, "성벽"]].map(([ic, v, lb], i) => (
                <div key={i} className="bg-slate-900 rounded p-1.5 text-center">
                  <div className="text-slate-400">{ic}{lb}</div>
                  <div className={`font-bold text-sm mt-0.5 ${
                    lb === "민심" ? (v < 40 ? "text-red-400" : v < 60 ? "text-yellow-400" : "text-green-400") : "text-slate-200"
                  }`}>{v}</div>
                </div>
              ))}
            </div>
            {/* Leader card */}
            {(() => {
              const leader = leaders?.[selT.id];
              if (!leader) return null;
              return (
                <div className="mt-1.5 bg-slate-900 rounded-lg p-2 flex items-center gap-2.5">
                  <span className="text-xl leading-none">{leader.icon}</span>
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

            <div className="mt-1.5 grid grid-cols-3 gap-1 text-xs">
              {[["infantry", UNITS.infantry], ["archer", UNITS.archer], ["cavalry", UNITS.cavalry],
                ["siege", UNITS.siege], ["special", SPECIALS[selT.id]]].map(([k, u]) => (
                <div key={k} className="bg-slate-900 rounded p-1.5 text-center">
                  <div className="text-slate-400">{u.icon}{u.n}</div>
                  <div className="font-bold text-sm mt-0.5">{selT.army[k]}</div>
                </div>
              ))}
              <div className="bg-slate-900 rounded p-1.5 text-center">
                <div className="text-slate-400">총병력</div>
                <div className="font-bold text-sm text-yellow-400 mt-0.5">{totalArmy(selT.army)}</div>
              </div>
            </div>
          </div>

          {/* Command buttons */}
          <div className="mt-1.5 bg-slate-800 rounded-lg p-2.5">
            <div className="font-bold text-xs mb-1.5">📋 명령</div>
            <div className="grid grid-cols-3 gap-1.5">
              {[["econ", "📈경제", "💰50"], ["agri", "🌿농업", "💰30🌾20"], ["wall", "🏰성벽", "💰60"],
                ["comfort", "😊위무", "🌾80"]].map(([k, lb, cs]) => {
                const dis = actLeft(selT.id) <= 0;
                return (
                  <button key={k}
                    onClick={() => k === "comfort" ? comfort(selT.id) : invest(selT.id, k)}
                    disabled={dis}
                    className={`border border-slate-600 rounded-md p-1.5 text-xs transition
                      ${dis ? "bg-slate-900 text-slate-600 cursor-not-allowed" : "bg-slate-700 hover:bg-slate-600 text-slate-200 cursor-pointer"}`}>
                    <div>{lb}</div>
                    <div className="text-slate-400 text-xs mt-0.5">{cs}</div>
                  </button>
                );
              })}
              <button onClick={() => setModal({ type: "conscript", tid: selT.id })}
                disabled={actLeft(selT.id) <= 0}
                className={`border border-slate-600 rounded-md p-1.5 text-xs transition
                  ${actLeft(selT.id) <= 0 ? "bg-slate-900 text-slate-600 cursor-not-allowed" : "bg-slate-700 hover:bg-slate-600 text-slate-200 cursor-pointer"}`}>
                <div>⚔️징병</div>
                <div className="text-slate-400 text-xs mt-0.5">병종선택</div>
              </button>
              <button onClick={() => setModal({ type: "merchant" })}
                className="bg-yellow-900 hover:bg-yellow-800 border border-yellow-700 rounded-md p-1.5 text-xs text-yellow-400 cursor-pointer transition">
                <div>🏪상인</div>
                <div className="text-yellow-600 text-xs mt-0.5">금↔식량</div>
              </button>
            </div>
          </div>

          {/* Transfer / Attack */}
          <div className="mt-1.5 bg-slate-800 rounded-lg p-2.5">
            <div className="flex justify-between items-center mb-1.5">
              <div className="font-bold text-xs">🚚 병력이동 · ⚔️ 공격</div>
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
            <div className="flex gap-1.5 flex-wrap">
              {selT.conn.map(cid => {
                const tgt = terrs.find(t => t.id === cid);
                const isAlly = tgt?.owner === "player";
                return (
                  <button key={cid}
                    onClick={() => setModal(isAlly
                      ? { type: "transfer", from: selT.id, to: cid }
                      : { type: "attack",   from: selT.id, to: cid })}
                    disabled={!isAlly && actLeft(selT.id) <= 0}
                    className={`rounded-md px-2.5 py-1 text-xs cursor-pointer transition
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
            <div className="bg-red-950 rounded-lg p-2.5 mt-2">
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

          <button onClick={endTurn}
            className="w-full mt-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg py-3 text-sm font-bold cursor-pointer">
            턴 종료 → {nextSeason}
          </button>
        </div>
      ) : (
        <div className="text-center text-slate-400 py-10">위에서 내 영지를 선택하세요</div>
      )}
    </div>
  );
}
