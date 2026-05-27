import { useState } from 'react';
import { THEME_COLORS as c, MAP_W } from '../constants.js';
import VariableSweep from './lab/VariableSweep.jsx';
import Tournament from './lab/Tournament.jsx';
import TerrainStudy from './lab/TerrainStudy.jsx';
import { armySummary } from './lab/labUtils.js';

const TABS = [
  { id: 'sweep', label: '변수 탐색', desc: '유닛 수 변화 → 승률 곡선' },
  { id: 'tournament', label: '토너먼트', desc: '저장 편성들 N×N 대전표' },
  { id: 'terrain', label: '지형 연구', desc: '4가지 지형별 승률 비교' },
];

export default function ResearchPhase({ army, formula, mapId, onBack, savedSlots, setSavedSlots }) {
  const [activeTab, setActiveTab] = useState('sweep');

  return (
    <div style={{ width: '100%', maxWidth: MAP_W }}>

      {/* Lab header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: c.pn, border: `1px solid ${c.bd}`, borderRadius: 4,
        padding: '6px 10px', marginBottom: 6,
      }}>
        <div>
          <div style={{ color: c.gl, fontSize: 13, fontWeight: 700, letterSpacing: 2 }}>
            RESEARCH LAB
          </div>
          <div style={{ color: c.dm, fontSize: 9 }}>
            가상 전투 실험 · 변수 조작 · 데이터 분석
          </div>
        </div>
        <button onClick={onBack} style={{
          padding: '4px 10px', fontSize: 10, cursor: 'pointer',
          border: `1px solid ${c.bd}`, borderRadius: 3,
          background: 'transparent', color: c.dm,
        }}>← 편성으로</button>
      </div>

      {/* Current army info bar */}
      <div style={{
        fontSize: 9, color: c.dm, marginBottom: 6,
        padding: '3px 8px', background: `${c.gl}08`, border: `1px solid ${c.bd}33`, borderRadius: 3,
        display: 'flex', gap: 8, flexWrap: 'wrap',
      }}>
        {army.length > 0 ? (
          <>
            <span>현재 편성:</span>
            <span style={{ color: c.tx }}>{armySummary(army)}</span>
            <span style={{ color: c.bd }}>|</span>
            <span>공식 {formula}</span>
            <span style={{ color: c.bd }}>|</span>
            <span>전장 {mapId}</span>
          </>
        ) : (
          <span style={{ color: c.rd }}>편성이 없습니다. 돌아가서 유닛을 구매하세요.</span>
        )}
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 3, marginBottom: 8,
        background: c.pn, border: `1px solid ${c.bd}`, borderRadius: 4, padding: 4,
      }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1, padding: '5px 8px', cursor: 'pointer',
            border: `1px solid ${activeTab === tab.id ? c.gl : c.bd}`, borderRadius: 3,
            background: activeTab === tab.id ? `${c.gl}15` : 'transparent',
            color: activeTab === tab.id ? c.gl : c.dm,
            fontSize: 10, fontWeight: activeTab === tab.id ? 700 : 400,
            textAlign: 'center',
          }}>
            <div>{tab.label}</div>
            <div style={{ fontSize: 7, color: activeTab === tab.id ? c.dm : '#2e2e2e', marginTop: 1 }}>
              {tab.desc}
            </div>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'sweep' && (
        <VariableSweep army={army} formula={formula} mapId={mapId} />
      )}
      {activeTab === 'tournament' && (
        <Tournament
          army={army} formula={formula} mapId={mapId}
          savedSlots={savedSlots} setSavedSlots={setSavedSlots}
        />
      )}
      {activeTab === 'terrain' && (
        <TerrainStudy army={army} formula={formula} />
      )}
    </div>
  );
}
