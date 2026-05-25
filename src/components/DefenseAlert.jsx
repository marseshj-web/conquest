import { useState } from "react";

export default function DefenseAlert({ battles, onClose }) {
  const [logIdx, setLogIdx] = useState(null);

  if (logIdx !== null) {
    const b = battles[logIdx];
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3">
        <div className="bg-slate-800 rounded-xl p-3 w-full max-w-sm flex flex-col" style={{ maxHeight: "80vh" }}>
          <div className={`font-bold text-sm mb-2 ${b.won ? "text-red-400" : "text-green-400"}`}>
            {b.won ? "❌ 점령당함" : "✅ 방어 성공"} — {b.attackerName}: {b.fromName}→{b.toName}
          </div>
          <div className="overflow-y-auto flex-1 space-y-0.5">
            {b.logs.map((l, i) => (
              <div key={i} className={`py-0.5 text-xs border-b border-slate-700
                ${l.includes("✅") ? "text-green-400" : l.includes("❌") ? "text-red-400" : l.includes("⚔️") ? "text-yellow-400" : "text-slate-300"}`}>
                {l}
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            {battles.length > 1 && (
              <button onClick={() => setLogIdx(null)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg py-2 text-sm cursor-pointer">
                목록
              </button>
            )}
            <button onClick={onClose}
              className="flex-1 bg-blue-700 hover:bg-blue-600 text-white rounded-lg py-2 text-sm cursor-pointer">
              확인
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3">
      <div className="bg-slate-800 rounded-xl p-3 w-full max-w-sm">
        <div className="text-yellow-400 font-bold text-sm mb-3">⚠️ 침공 발생!</div>
        <div className="space-y-2">
          {battles.map((b, i) => (
            <div key={i} className={`flex items-center justify-between rounded-lg p-2.5 ${b.won ? "bg-red-950 border border-red-800" : "bg-slate-900 border border-slate-700"}`}>
              <div>
                <div className={`text-xs font-bold ${b.won ? "text-red-400" : "text-green-400"}`}>
                  {b.won ? "❌ 점령당함" : "✅ 방어 성공"}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {b.attackerName}: {b.fromName} → {b.toName}
                </div>
              </div>
              <button onClick={() => setLogIdx(i)}
                className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded px-2 py-1 ml-2 cursor-pointer shrink-0">
                전투 로그
              </button>
            </div>
          ))}
        </div>
        <button onClick={onClose}
          className="w-full mt-3 bg-blue-700 hover:bg-blue-600 text-white rounded-lg py-2.5 text-sm font-bold cursor-pointer">
          확인
        </button>
      </div>
    </div>
  );
}
