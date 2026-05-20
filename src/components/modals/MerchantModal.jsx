import { useState } from "react";
import { MERCHANT_RATE } from "../../data/constants.js";

export default function MerchantModal({ gold, food, onTrade, onClose }) {
  const [amt, setAmt] = useState(100);

  return (
    <div className="bg-slate-800 rounded-xl p-3 mt-2">
      <div className="font-bold text-yellow-400 mb-2 text-sm">🏪 상인 <span className="text-slate-400 font-normal">(명령 소비 없음)</span></div>
      <div className="text-xs text-slate-400 mb-2">보유: 💰{gold} / 🌾{food}</div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs">수량:</span>
        <input type="range" min={50} max={500} step={50} value={amt}
          onChange={e => setAmt(+e.target.value)} className="flex-1" />
        <span className="text-sm font-bold w-10 text-right">{amt}</span>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onTrade("buyFood", amt)}
          className="flex-1 bg-green-600 hover:bg-green-500 text-white rounded-lg py-2 text-xs cursor-pointer">
          💰{amt} → 🌾{Math.floor(amt * MERCHANT_RATE.goldToFood)}
        </button>
        <button onClick={() => onTrade("sellFood", amt)}
          className="flex-1 bg-orange-600 hover:bg-orange-500 text-white rounded-lg py-2 text-xs cursor-pointer">
          🌾{amt} → 💰{Math.floor(amt * MERCHANT_RATE.foodToGold)}
        </button>
      </div>
      <button onClick={onClose}
        className="w-full mt-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg py-2 text-sm cursor-pointer">
        닫기
      </button>
    </div>
  );
}
