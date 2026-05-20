export default function GameLog({ log }) {
  return (
    <div className="p-2">
      <div className="bg-slate-800 rounded-lg p-2.5 max-h-[75vh] overflow-y-auto">
        {log.length === 0 ? (
          <div className="text-slate-600 text-center py-4">기록 없음</div>
        ) : log.map((l, i) => (
          <div key={i} className={`py-1 text-xs border-b border-slate-900
            ${l.includes("점령") ? "text-green-400" : l.includes("실패") || l.includes("⚠️") ? "text-red-400" : l.includes("---") ? "text-yellow-400" : "text-slate-400"}`}>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}
