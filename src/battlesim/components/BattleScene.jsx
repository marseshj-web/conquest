import { useState, useRef, useEffect } from 'react';
import { deploy, clearArrows } from '../engine.js';
import BattlePhase from './BattlePhase.jsx';
import ResultPhase from './ResultPhase.jsx';

// Wraps the tactical battle flow for use inside the meta-campaign.
// ctx = prepareTacticalBattle(...) output from battleBridge.js
// onComplete(battleResult) is called when player confirms result.
export default function BattleScene({ ctx, onComplete, isDefensive, atkName, defName }) {
  const [innerPhase, setInnerPhase] = useState('battle');
  const [result,     setResult]     = useState(null);
  const [stats,      setStats]      = useState({ p: 0, a: 0, t: 0 });
  const [battleResult, setBattleResult] = useState(null);
  const [speed,      setSpeed]      = useState(1);
  const [muted,      setMuted]      = useState(true);
  const gRef = useRef(null);

  useEffect(() => {
    clearArrows();
    const aDep = deploy(ctx.atkSquads, 'player', 0,          ctx.countScale, ctx.atkWarMult, 1.0);
    const dDep = deploy(ctx.defSquads, 'ai',     aDep.nextId, ctx.countScale, ctx.defWarMult, ctx.wallMult);

    function countByType(arr) {
      const m = {};
      for (const s of arr) m[s.typeId] = (m[s.typeId] ?? 0) + 1;
      return m;
    }

    gRef.current = {
      soldiers: [...aDep.soldiers, ...dDep.soldiers],
      time: 0, done: false, winner: null,
      map: ctx.map,
      playerDeployedByType: countByType(aDep.soldiers),
      aiDeployedByType:     countByType(dDep.soldiers),
      aiArmy: dDep.soldiers.map(s => s.typeId),
    };
  }, [ctx]);

  const battleHeader = (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 6, fontSize: 13 }}>
      <span style={{ color: '#ef4444', fontWeight: 700 }}>{atkName ?? '공격'}</span>
      <span style={{ color: '#94a3b8' }}>vs</span>
      <span style={{ color: '#60a5fa', fontWeight: 700 }}>{defName ?? '방어'}</span>
    </div>
  );

  if (innerPhase === 'battle') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 8 }}>
        {battleHeader}
        <BattlePhase
          gRef={gRef}
          formula="B"
          speed={speed}
          setSpeed={setSpeed}
          setResult={setResult}
          setStats={setStats}
          setBattleResult={setBattleResult}
          setPhase={setInnerPhase}
          soundRef={null}
          muted={muted}
          setMuted={setMuted}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 8 }}>
      {battleHeader}
      <ResultPhase
        result={result}
        stats={stats}
        formula="B"
        sm={battleResult?.playerDeployedByType ?? gRef.current?.playerDeployedByType ?? {}}
        gRef={gRef}
        reset={() => {}}
        startRematch={() => {}}
        onReturnToMap={() => onComplete(battleResult)}
        isDefensive={isDefensive}
        atkName={atkName}
        defName={defName}
      />
    </div>
  );
}
