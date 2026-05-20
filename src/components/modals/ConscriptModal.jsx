import { UNITS, SPECIALS } from "../../data/units.js";
import { CONSCRIPT_AMOUNTS } from "../../data/constants.js";

export default function ConscriptModal({ terrs, tid, actLeft, onConscript, onClose }) {
  const t = terrs.find(t => t.id === tid);
  const items = [
    ["infantry", UNITS.infantry],
    ["archer",   UNITS.archer],
    ["cavalry",  UNITS.cavalry],
    ["siege",    UNITS.siege],
    ["special",  SPECIALS[tid]],
  ];
  const disabled = actLeft <= 0;

  return (
    <div className="bg-slate-800 rounded-xl p-3 mt-2">
      <div className="font-bold text-yellow-400 mb-1 text-sm">⚔️ 징병 ({t.name})</div>
      <div className="text-xs text-slate-400 mb-2">병종당 고정 인원 · 민심 -5 · 인구 불변</div>
      <div className="grid grid-cols-2 gap-2">
        {items.map(([k, u]) => (
          <button key={k} onClick={() => { onConscript(tid, k); onClose(); }}
            disabled={disabled}
            className={`bg-slate-700 border border-slate-600 rounded-lg p-2 text-left text-xs transition
              ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-600 cursor-pointer"}`}>
            <div className="text-slate-200">{u.icon} {u.n} <span className="text-slate-400">({t.army[k]})</span></div>
            <div className="text-green-400 text-xs mt-0.5">+{CONSCRIPT_AMOUNTS[k]}명</div>
            <div className="text-yellow-400 text-xs">💰{u.cost[0]} 🌾{u.cost[1]}</div>
            <div className="text-slate-500 text-xs">{u.desc}</div>
          </button>
        ))}
      </div>
      <button onClick={onClose}
        className="w-full mt-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg py-2 text-sm cursor-pointer">
        닫기
      </button>
    </div>
  );
}
