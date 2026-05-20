import { useState } from "react";
import { UNITS } from "../../data/units.js";
import { SPECIALS } from "../../data/units.js";

export default function TransferModal({ terrs, from, to, onDo, onClose }) {
  const [tr, setTr] = useState({ infantry: 0, archer: 0, cavalry: 0, siege: 0, special: 0 });
  const ft = terrs.find(t => t.id === from);
  const tt = terrs.find(t => t.id === to);
  const items = [
    ["infantry", UNITS.infantry],
    ["archer",   UNITS.archer],
    ["cavalry",  UNITS.cavalry],
    ["siege",    UNITS.siege],
    ["special",  SPECIALS[from]],
  ];

  return (
    <div className="bg-slate-800 rounded-xl p-3 mt-2">
      <div className="font-bold text-blue-400 mb-2 text-sm">🚚 {ft.name} → {tt.name}</div>
      {items.map(([k, u]) => (
        <div key={k} className="flex items-center gap-2 mb-1 text-xs">
          <span className="w-16">{u.icon}{u.n}</span>
          <span className="w-8 text-slate-400 text-right">{ft.army[k]}</span>
          <input type="range" min={0} max={ft.army[k]} value={tr[k]}
            onChange={e => setTr(p => ({ ...p, [k]: +e.target.value }))}
            className="flex-1" />
          <span className="w-8 text-right">{tr[k]}</span>
        </div>
      ))}
      <div className="flex gap-2 mt-2">
        <button onClick={() => onDo(tr)}
          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2 text-sm cursor-pointer">
          이동
        </button>
        <button onClick={onClose}
          className="flex-1 bg-slate-600 hover:bg-slate-500 text-white rounded-lg py-2 text-sm cursor-pointer">
          취소
        </button>
      </div>
    </div>
  );
}
