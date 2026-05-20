import { useState, useMemo } from "react";
import { UNITS, SPECIALS } from "../../data/units.js";

const UNIT_KEYS = ["infantry", "archer", "cavalry", "siege", "special"];

export default function BulkTransferModal({ terrs, fromId, onDo, onClose }) {
  const ft = terrs.find(t => t.id === fromId);
  const allies = ft.conn
    .map(cid => terrs.find(t => t.id === cid))
    .filter(t => t && t.owner === "player");

  const [transfers, setTransfers] = useState(() =>
    Object.fromEntries(allies.map(t => [t.id, { infantry: 0, archer: 0, cavalry: 0, siege: 0, special: 0 }]))
  );

  const remaining = useMemo(() => {
    const r = {};
    UNIT_KEYS.forEach(k => {
      r[k] = ft.army[k] - allies.reduce((s, t) => s + (transfers[t.id]?.[k] || 0), 0);
    });
    return r;
  }, [transfers, ft, allies]);

  const setVal = (toId, k, v) =>
    setTransfers(p => ({ ...p, [toId]: { ...p[toId], [k]: +v } }));

  const setAll = toId =>
    setTransfers(p => {
      const next = { ...p };
      UNIT_KEYS.forEach(k => {
        const rem = ft.army[k] - allies.reduce((s, t) => t.id !== toId ? s + (p[t.id]?.[k] || 0) : s, 0);
        next[toId] = { ...next[toId], [k]: Math.max(0, rem) };
      });
      return next;
    });

  const clearAll = toId =>
    setTransfers(p => ({ ...p, [toId]: { infantry: 0, archer: 0, cavalry: 0, siege: 0, special: 0 } }));

  const totalMoved = allies.reduce(
    (s, t) => s + UNIT_KEYS.reduce((a, k) => a + (transfers[t.id]?.[k] || 0), 0), 0
  );

  const units = [
    ["infantry", UNITS.infantry],
    ["archer",   UNITS.archer],
    ["cavalry",  UNITS.cavalry],
    ["siege",    UNITS.siege],
    ["special",  SPECIALS[fromId]],
  ];

  return (
    <div className="bg-slate-800 rounded-xl p-3 mt-2">
      <div className="font-bold text-blue-400 mb-1 text-sm">🚚 일괄이동 — {ft.name}</div>
      <div className="text-xs text-slate-400 mb-2">
        잔여: {UNIT_KEYS.map(k => `${units.find(([uk]) => uk === k)[1].icon}${remaining[k]}`).join(' ')}
      </div>

      {allies.length === 0 ? (
        <div className="text-slate-400 text-xs text-center py-3">인접한 아군 영지 없음</div>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
          {allies.map(tgt => (
            <div key={tgt.id} className="bg-slate-900 rounded-lg p-2">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-bold text-green-400">→ {tgt.name}</span>
                <div className="flex gap-1">
                  <button onClick={() => setAll(tgt.id)}
                    className="text-xs bg-slate-700 hover:bg-slate-600 rounded px-1.5 py-0.5 text-slate-300 cursor-pointer">
                    전부
                  </button>
                  <button onClick={() => clearAll(tgt.id)}
                    className="text-xs bg-slate-700 hover:bg-slate-600 rounded px-1.5 py-0.5 text-slate-400 cursor-pointer">
                    초기화
                  </button>
                </div>
              </div>
              {units.map(([k, u]) => (
                <div key={k} className="flex items-center gap-2 mb-0.5 text-xs">
                  <span className="w-14 text-slate-300">{u.icon}{u.n}</span>
                  <input type="range" min={0}
                    max={(transfers[tgt.id]?.[k] || 0) + Math.max(0, remaining[k])}
                    value={transfers[tgt.id]?.[k] || 0}
                    onChange={e => setVal(tgt.id, k, e.target.value)}
                    className="flex-1 accent-blue-500" />
                  <span className="w-8 text-right text-slate-200">{transfers[tgt.id]?.[k] || 0}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-slate-400 text-right mt-2 mb-2">총 이동: {totalMoved}명</div>
      <div className="flex gap-2">
        <button onClick={() => onDo(transfers)} disabled={totalMoved === 0}
          className={`flex-1 rounded-lg py-2 text-sm ${
            totalMoved > 0
              ? "bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
              : "bg-slate-700 text-slate-500 cursor-not-allowed"
          }`}>
          일괄이동
        </button>
        <button onClick={onClose}
          className="flex-1 bg-slate-600 hover:bg-slate-500 text-white rounded-lg py-2 text-sm cursor-pointer">
          취소
        </button>
      </div>
    </div>
  );
}
