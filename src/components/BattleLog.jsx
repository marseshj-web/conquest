export default function BattleLog({ battleLog, onBack }) {
  return (
    <div className="p-3">
      {battleLog ? (
        <div className="bg-slate-800 rounded-lg p-3">
          <h3 className="text-yellow-400 text-sm font-bold mb-2">⚔️ 전투 기록</h3>
          {battleLog.map((l, i) => (
            <div key={i} className={`py-1 text-xs border-b border-slate-900
              ${l.includes("✅") ? "text-green-400" : l.includes("❌") ? "text-red-400" : l.includes("⚔️") ? "text-yellow-400" : "text-slate-300"}`}>
              {l}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-slate-600 py-10">전투 기록 없음</div>
      )}
      <button onClick={onBack}
        className="w-full mt-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg py-2.5 text-sm cursor-pointer">
        지도로
      </button>
    </div>
  );
}
