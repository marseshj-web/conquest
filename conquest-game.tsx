import { useState, useCallback, useMemo } from "react";

const SEASONS=["봄","여름","가을","겨울"];
const SC=["#4ade80","#fbbf24","#f97316","#60a5fa"];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rng=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const sum=(arr,fn)=>arr.reduce((s,x)=>s+fn(x),0);

const UNITS={
  infantry:{n:"보병",icon:"🗡️",atk:7,def:7,rng:0,mob:5,mor:55,chg:5,cost:[10,30],siege:false,desc:"기병에 강함"},
  archer:{n:"궁병",icon:"🏹",atk:4,def:4,rng:8,mob:6,mor:50,chg:2,cost:[20,25],siege:false,desc:"보병에 강함"},
  cavalry:{n:"기병",icon:"🐴",atk:8,def:6,rng:0,mob:8,mor:60,chg:8,cost:[35,40],siege:false,desc:"궁병에 강함"},
  siege:{n:"공성",icon:"🪨",atk:2,def:2,rng:8,mob:4,mor:30,chg:2,cost:[60,15],siege:true,desc:"성벽 무시"},
};
const SPECIALS={
  mongol:{n:"몽골기병",icon:"🐎",atk:8,def:6,rng:8,mob:11,mor:80,chg:8,cost:[60,50],siege:false,type:"cavArcher",desc:"최강 궁기병"},
  manchu:{n:"수렵기병",icon:"🦌",atk:6,def:6,rng:6,mob:9,mor:60,chg:6,cost:[40,35],siege:false,type:"cavArcher",desc:"균형 궁기병"},
  korea:{n:"중보병",icon:"🛡️",atk:8,def:8,rng:0,mob:5,mor:55,chg:6,cost:[25,35],siege:false,type:"infantry",desc:"견고한 방어"},
  japan:{n:"무사",icon:"⚔️",atk:10,def:8,rng:6,mob:9,mor:80,chg:10,cost:[70,60],siege:false,type:"cavalry",desc:"최정예 공수겸비"},
  north_china:{n:"화포병",icon:"💥",atk:4,def:2,rng:6,mob:5,mor:30,chg:2,cost:[50,20],siege:true,type:"siege",desc:"성벽무시+혼란"},
  south_china:{n:"노궁병",icon:"🎯",atk:4,def:4,rng:8,mob:5,mor:50,chg:2,cost:[30,25],siege:false,type:"archer",desc:"연사 석궁"},
  tibet:{n:"산악병",icon:"🏔️",atk:6,def:9,rng:0,mob:6,mor:70,chg:5,cost:[25,30],siege:false,type:"infantry",desc:"고산 방어"},
  india:{n:"전투코끼리",icon:"🐘",atk:10,def:10,rng:0,mob:5,mor:60,chg:10,cost:[80,60],siege:false,type:"cavalry",desc:"최강 근접"},
  persia:{n:"경궁기병",icon:"🏇",atk:6,def:4,rng:10,mob:10,mor:70,chg:6,cost:[55,40],siege:false,type:"cavArcher",desc:"최강 원거리"},
  arabia:{n:"낙타기병",icon:"🐪",atk:7,def:5,rng:6,mob:9,mor:65,chg:7,cost:[45,35],siege:false,type:"cavArcher",desc:"사막 습격대"},
  east_europe:{n:"기사",icon:"🏰",atk:8,def:10,rng:0,mob:7,mor:65,chg:10,cost:[60,45],siege:false,type:"cavalry",desc:"철갑 중장기병"},
  west_europe:{n:"돌격기병",icon:"⚜️",atk:10,def:8,rng:0,mob:9,mor:70,chg:10,cost:[65,50],siege:false,type:"cavalry",desc:"최강 돌격"},
};
const COUNTER={infantry:"cavalry",cavalry:"archer",archer:"infantry"};
const COUNTER_MULT=1.3;
const FOOD_PER_SOLDIER=0.5; // per season
const MERCHANT_RATE={goldToFood:1.5, foodToGold:0.6}; // 100금→150식, 100식→60금

const totalArmy=a=>a.infantry+a.archer+a.cavalry+a.siege+a.special;
const PLAYERS={player:{n:"플레이어",c:"#3b82f6"},ai1:{n:"몽골 제국",c:"#ef4444"},ai2:{n:"이슬람 연맹",c:"#22c55e"}};

const INIT=[
  {id:"mongol",name:"몽골 초원",x:52,y:22,pop:6000,econ:30,agri:20,mor:80,wall:30,training:0,
   army:{infantry:100,archer:50,cavalry:200,siege:20,special:300},owner:"ai1",conn:["manchu","north_china","tibet","persia"]},
  {id:"manchu",name:"만주",x:72,y:20,pop:7500,econ:40,agri:45,mor:70,wall:40,training:0,
   army:{infantry:150,archer:80,cavalry:100,siege:10,special:150},owner:"ai1",conn:["mongol","korea","north_china"]},
  {id:"korea",name:"고려",x:80,y:32,pop:9000,econ:50,agri:55,mor:75,wall:60,training:0,
   army:{infantry:200,archer:60,cavalry:50,siege:15,special:200},owner:null,conn:["manchu","japan"]},
  {id:"japan",name:"일본",x:90,y:35,pop:11000,econ:60,agri:50,mor:80,wall:55,training:0,
   army:{infantry:100,archer:80,cavalry:80,siege:10,special:250},owner:null,conn:["korea"]},
  {id:"north_china",name:"화북",x:65,y:35,pop:17500,econ:70,agri:60,mor:65,wall:50,training:0,
   army:{infantry:200,archer:100,cavalry:150,siege:50,special:200},owner:"ai1",conn:["mongol","manchu","south_china","tibet"]},
  {id:"south_china",name:"화남",x:68,y:50,pop:20000,econ:80,agri:80,mor:70,wall:45,training:0,
   army:{infantry:150,archer:120,cavalry:80,siege:30,special:150},owner:null,conn:["north_china","india","tibet"]},
  {id:"tibet",name:"티베트",x:52,y:42,pop:4000,econ:15,agri:15,mor:85,wall:70,training:0,
   army:{infantry:100,archer:30,cavalry:30,siege:5,special:200},owner:null,conn:["mongol","north_china","south_china","india"]},
  {id:"india",name:"인도",x:48,y:60,pop:19000,econ:65,agri:75,mor:70,wall:40,training:0,
   army:{infantry:200,archer:80,cavalry:100,siege:20,special:200},owner:"ai2",conn:["tibet","south_china","persia","arabia"]},
  {id:"persia",name:"페르시아",x:35,y:40,pop:12500,econ:55,agri:45,mor:70,wall:50,training:0,
   army:{infantry:150,archer:60,cavalry:120,siege:20,special:200},owner:"ai2",conn:["mongol","india","arabia","east_europe"]},
  {id:"arabia",name:"아라비아",x:30,y:58,pop:9000,econ:70,agri:25,mor:75,wall:35,training:0,
   army:{infantry:100,archer:70,cavalry:80,siege:15,special:180},owner:"ai2",conn:["india","persia","east_europe"]},
  {id:"east_europe",name:"동유럽",x:22,y:25,pop:10000,econ:45,agri:50,mor:70,wall:55,training:0,
   army:{infantry:150,archer:60,cavalry:100,siege:20,special:180},owner:null,conn:["persia","arabia","west_europe"]},
  {id:"west_europe",name:"서유럽",x:10,y:30,pop:15000,econ:75,agri:65,mor:80,wall:65,training:0,
   army:{infantry:200,archer:100,cavalry:150,siege:30,special:250},owner:null,conn:["east_europe"]},
];

export default function Game(){
  const [phase,setPhase]=useState("select");
  const [terrs,setTerrs]=useState(JSON.parse(JSON.stringify(INIT)));
  const [season,setSeason]=useState(0);
  const [year,setYear]=useState(1206);
  const [gold,setGold]=useState({player:500,ai1:800,ai2:600});
  const [food,setFood]=useState({player:2000,ai1:3000,ai2:2500});
  const [sel,setSel]=useState(null);
  const [log,setLog]=useState([]);
  const [scouted,setScouted]=useState({});
  const [actions,setActions]=useState({});
  const [view,setView]=useState("map");
  const [battleLog,setBattleLog]=useState(null);
  const [modal,setModal]=useState(null);
  const [commanders,setCommanders]=useState({});

  const addLog=useCallback(m=>setLog(p=>[m,...p].slice(0,80)),[]);
  const myTerrs=useMemo(()=>terrs.filter(t=>t.owner==="player"),[terrs]);
  const ownerCnt=useMemo(()=>{const c={};terrs.forEach(t=>{if(t.owner)c[t.owner]=(c[t.owner]||0)+1});return c},[terrs]);
  const selT=terrs.find(t=>t.id===sel);
  const maxAct=3;
  const actLeft=id=>maxAct-(actions[id]||0);
  const useAct=id=>setActions(p=>({...p,[id]:(p[id]||0)+1}));

  // Total troops for a player
  const playerTotalTroops=pid=>sum(terrs.filter(t=>t.owner===pid),t=>totalArmy(t.army));

  const selectStart=id=>{
    setTerrs(p=>p.map(t=>t.id===id?{...t,owner:"player"}:t));
    setPhase("play");addLog(`${year}년 봄 - ${INIT.find(t=>t.id===id).name}에서 출발!`);
  };

  // === COMBAT ===
  const simBattle=(atkTerr,defTerr)=>{
    const aa={...atkTerr.army},da={...defTerr.army};
    const aSp=SPECIALS[atkTerr.id],dSp=SPECIALS[defTerr.id];
    const logs=[];
    logs.push(`⚔️ ${atkTerr.name} → ${defTerr.name}`);
    logs.push(`공격: 🗡️${aa.infantry} 🏹${aa.archer} 🐴${aa.cavalry} 🪨${aa.siege} ${aSp.icon}${aa.special}`);
    logs.push(`방어: 🗡️${da.infantry} 🏹${da.archer} 🐴${da.cavalry} 🪨${da.siege} ${dSp.icon}${da.special} (성벽${defTerr.wall})`);
    const wallMult=1+defTerr.wall/200;
    const aMor=0.7+atkTerr.mor/200, dMor=0.7+defTerr.mor/200;

    for(let r=1;r<=5;r++){
      if(totalArmy(aa)<=0||totalArmy(da)<=0)break;
      const dealDmg=(src,srcMor,tgt,isDef,srcId,tgtId)=>{
        const sp=SPECIALS[srcId];
        const dm={infantry:0,archer:0,cavalry:0,siege:0,special:0};
        const calc=(cnt,unit,key)=>{
          if(cnt<=0)return;
          const av=unit.rng>0?Math.max(unit.atk,unit.rng):unit.atk;
          const mobM=Math.max(1,Math.floor(unit.mob/3));
          let base=cnt*av*mobM*srcMor*rng(70,100)/100;
          if(isDef&&!unit.siege)base*=wallMult;
          const tot=totalArmy(tgt);if(tot<=0)return;
          Object.keys(tgt).forEach(tk=>{
            if(tgt[tk]<=0)return;
            let mult=1;
            const uT=key==="special"?sp.type:key;
            const tT=tk==="special"?SPECIALS[tgtId].type:tk;
            if(COUNTER[uT]===tT)mult=COUNTER_MULT;
            if(COUNTER[tT]===uT)mult=1/COUNTER_MULT;
            dm[tk]+=base*(tgt[tk]/tot)*mult;
          });
        };
        calc(src.infantry,UNITS.infantry,"infantry");
        calc(src.archer,UNITS.archer,"archer");
        calc(src.cavalry,UNITS.cavalry,"cavalry");
        calc(src.siege,UNITS.siege,"siege");
        calc(src.special,sp,"special");
        return dm;
      };
      const ad=dealDmg(aa,aMor,da,false,atkTerr.id,defTerr.id);
      const dd=dealDmg(da,dMor,aa,true,defTerr.id,atkTerr.id);
      let aL=0,dL=0;
      Object.keys(da).forEach(k=>{const l=Math.min(da[k],Math.floor(ad[k]/12));da[k]-=l;dL+=l;});
      Object.keys(aa).forEach(k=>{const l=Math.min(aa[k],Math.floor(dd[k]/12));aa[k]-=l;aL+=l;});
      logs.push(`[${r}R] 공격 -${aL}(잔${totalArmy(aa)}) / 방어 -${dL}(잔${totalArmy(da)})`);
      if(totalArmy(aa)<=0){logs.push("❌ 공격측 전멸!");break;}
      if(totalArmy(da)<=0){logs.push("✅ 방어측 전멸!");break;}
    }
    const w=totalArmy(aa)>totalArmy(da);
    if(totalArmy(aa)>0&&totalArmy(da)>0)logs.push(w?"✅ 공격측 판정승!":"❌ 방어측 판정 방어!");
    return{atkWin:w,aa,da,logs};
  };

  // === ACTIONS ===
  const doInvest=(tid,type)=>{
    const costs={econ:[50,0],agri:[30,20],wall:[60,0]};
    const [gc,fc]=costs[type];
    if(gold.player<gc||food.player<fc){addLog("자원 부족");return;}
    if(actLeft(tid)<=0){addLog("명령 횟수 소진");return;}
    setGold(g=>({...g,player:g.player-gc}));
    setFood(f=>({...f,player:f.player-fc}));
    setTerrs(p=>p.map(t=>{
      if(t.id!==tid)return t;
      const v=rng(3,8);
      if(type==="econ")return{...t,econ:clamp(t.econ+v,0,100)};
      if(type==="agri")return{...t,agri:clamp(t.agri+v,0,100)};
      if(type==="wall")return{...t,wall:clamp(t.wall+rng(3,7),0,100)};
      return t;
    }));
    useAct(tid);addLog(`${terrs.find(t=>t.id===tid).name} ${type==="econ"?"경제":type==="agri"?"농업":"성벽"} 투자`);
  };

  const doComfort=tid=>{
    if(food.player<80){addLog("식량 부족 (80 필요)");return;}
    if(actLeft(tid)<=0){addLog("명령 횟수 소진");return;}
    setFood(f=>({...f,player:f.player-80}));
    setTerrs(p=>p.map(t=>t.id===tid?{...t,mor:clamp(t.mor+rng(8,15),10,100)}:t));
    useAct(tid);addLog(`${terrs.find(t=>t.id===tid).name} 위무 (식량 배급)`);
  };

  const doConscript=(tid,unitKey)=>{
    const t=terrs.find(t=>t.id===tid);
    const isSpec=unitKey==="special";
    const unit=isSpec?SPECIALS[tid]:UNITS[unitKey];
    const [gc,fc]=unit.cost;
    const maxC=Math.min(Math.floor(t.pop*0.1),t.pop-500);
    if(maxC<=0){addLog("인구 부족");return;}
    if(gold.player<gc){addLog(`금 부족 (${gc} 필요)`);return;}
    if(food.player<fc){addLog(`식량 부족 (${fc} 필요)`);return;}
    if(actLeft(tid)<=0){addLog("명령 횟수 소진");return;}
    setGold(g=>({...g,player:g.player-gc}));
    setFood(f=>({...f,player:f.player-fc}));
    setTerrs(p=>p.map(tr=>{
      if(tr.id!==tid)return tr;
      const a={...tr.army};a[unitKey]+=maxC;
      return{...tr,army:a,pop:tr.pop-maxC,mor:clamp(tr.mor-5,10,100)};
    }));
    useAct(tid);addLog(`${t.name} ${unit.n} ${maxC}명 징병 (💰${gc} 🌾${fc})`);
  };

  const doTransfer=(fromId,toId,transfers)=>{
    if(actLeft(fromId)<=0){addLog("명령 횟수 소진");return;}
    const total=Object.values(transfers).reduce((s,v)=>s+v,0);
    if(total<=0)return;
    setTerrs(p=>p.map(t=>{
      if(t.id===fromId){const a={...t.army};Object.keys(transfers).forEach(k=>{a[k]=Math.max(0,a[k]-transfers[k])});return{...t,army:a};}
      if(t.id===toId){const a={...t.army};Object.keys(transfers).forEach(k=>{a[k]+=transfers[k]});return{...t,army:a};}
      return t;
    }));
    useAct(fromId);addLog(`${terrs.find(t=>t.id===fromId).name}→${terrs.find(t=>t.id===toId).name}: ${total}명 이동`);
    setModal(null);
  };

  const doAttack=(fromId,toId)=>{
    const aT=terrs.find(t=>t.id===fromId),dT=terrs.find(t=>t.id===toId);
    if(totalArmy(aT.army)<30){addLog("병력 부족");return;}
    const res=simBattle(aT,dT);
    setBattleLog(res.logs);
    setTerrs(p=>p.map(t=>{
      if(t.id===fromId)return{...t,army:Object.fromEntries(Object.keys(res.aa).map(k=>[k,res.atkWin?Math.floor(res.aa[k]*0.6):res.aa[k]]))};
      if(t.id===toId){
        if(res.atkWin){
          const occ={};Object.keys(res.aa).forEach(k=>{occ[k]=Math.floor(res.aa[k]*0.4)});
          return{...t,owner:aT.owner,army:occ,mor:clamp(t.mor-15,10,100)};
        }
        return{...t,army:{...res.da}};
      }
      return t;
    }));
    addLog(res.atkWin?`✅ ${aT.name}→${dT.name} 점령!`:`❌ ${dT.name} 공격 실패`);
    setView("battle");setModal(null);
  };

  // === MERCHANT (no action cost) ===
  const doTrade=(type,amount)=>{
    if(type==="buyFood"){
      const cost=amount;
      const gained=Math.floor(amount*MERCHANT_RATE.goldToFood);
      if(gold.player<cost){addLog("금 부족");return;}
      setGold(g=>({...g,player:g.player-cost}));
      setFood(f=>({...f,player:f.player+gained}));
      addLog(`상인: 💰${cost} → 🌾${gained}`);
    }else{
      const cost=amount;
      const gained=Math.floor(amount*MERCHANT_RATE.foodToGold);
      if(food.player<cost){addLog("식량 부족");return;}
      setFood(f=>({...f,player:f.player-cost}));
      setGold(g=>({...g,player:g.player+gained}));
      addLog(`상인: 🌾${cost} → 💰${gained}`);
    }
  };

  const doScout=tid=>{
    if(gold.player<40){addLog("금 부족");return;}
    setGold(g=>({...g,player:g.player-40}));setScouted(p=>({...p,[tid]:true}));
    addLog(`${terrs.find(t=>t.id===tid).name} 정찰 완료`);
  };

  const doTrain=tid=>{
    if(gold.player<30){addLog("금 부족 (30 필요)");return;}
    if(food.player<20){addLog("식량 부족 (20 필요)");return;}
    if(actLeft(tid)<=0){addLog("명령 횟수 소진");return;}
    const isWar=commanders[tid]==="war";
    const base=rng(6,12);
    const gain=isWar?Math.floor(base*1.5):base;
    setGold(g=>({...g,player:g.player-30}));
    setFood(f=>({...f,player:f.player-20}));
    setTerrs(p=>p.map(t=>t.id!==tid?t:{...t,training:clamp((t.training??0)+gain,0,100)}));
    useAct(tid);addLog(`${terrs.find(t=>t.id===tid).name} 훈련 +${gain}${isWar?" (전쟁지휘관)":""}`);
  };

  const doRecruitCommander=(tid,type)=>{
    if(gold.player<80){addLog("금 부족 (80 필요)");return;}
    if(actLeft(tid)<=0){addLog("명령 횟수 소진");return;}
    setGold(g=>({...g,player:g.player-80}));
    setCommanders(p=>({...p,[tid]:type}));
    useAct(tid);addLog(`${terrs.find(t=>t.id===tid).name} ${type==="war"?"전쟁":"내정"} 지휘관 임명`);
  };

  const doSurrender=tid=>{
    if(gold.player<100){addLog("금 부족");return;}
    setGold(g=>({...g,player:g.player-100}));
    const t=terrs.find(t=>t.id===tid);
    const ch=(t.mor<40?0.5:t.mor<60?0.25:0.08)+(playerTotalTroops("player")>totalArmy(t.army)*3?0.3:0);
    if(Math.random()<ch){
      setTerrs(p=>p.map(tr=>tr.id===tid?{...tr,owner:"player",mor:clamp(tr.mor-10,10,100)}:tr));
      addLog(`🏳️ ${t.name} 항복!`);
    }else addLog(`${t.name} 항복 거부`);
  };

  // === AI ===
  const aiTurn=useCallback((ts,pid)=>{
    const owned=ts.filter(t=>t.owner===pid);
    if(!owned.length)return ts;
    let nts=ts.map(t=>({...t,army:{...t.army}}));
    let g=gold[pid]||0,f=food[pid]||0;
    // AI merchant: if low on food, buy some
    if(f<playerTotalTroops(pid)*2&&g>200){const buy=Math.min(200,g);f+=Math.floor(buy*1.5);g-=buy;}
    if(g<100&&f>2000){const sell=Math.min(500,f);g+=Math.floor(sell*0.6);f-=sell;}

    owned.forEach(o=>{
      const t=nts.find(nt=>nt.id===o.id);
      for(let i=0;i<2;i++){
        const r=Math.random();
        if(r<0.15&&g>=50){t.econ=clamp(t.econ+rng(3,6),0,100);g-=50;}
        else if(r<0.3&&g>=30){t.agri=clamp(t.agri+rng(3,6),0,100);g-=30;}
        else if(r<0.65&&f>=40&&t.pop>600){
          const amt=Math.min(Math.floor(t.pop*0.06),t.pop-500);
          if(amt>0){
            const pick=Math.random();
            if(pick<0.3){t.army.cavalry+=amt;g-=35;f-=40;}
            else if(pick<0.5){t.army.special+=amt;g-=60;f-=50;}
            else if(pick<0.7){t.army.archer+=amt;g-=20;f-=25;}
            else{t.army.infantry+=amt;g-=10;f-=30;}
            t.pop-=amt;t.mor=clamp(t.mor-4,10,100);
          }
        }else if(t.mor<50&&f>=80){t.mor=clamp(t.mor+rng(5,10),10,100);f-=80;}
      }
    });
    setGold(p=>({...p,[pid]:Math.max(0,g)}));
    setFood(p=>({...p,[pid]:Math.max(0,f)}));

    if(Math.random()<0.35){
      const cands=[];
      owned.forEach(o=>{
        const t=nts.find(nt=>nt.id===o.id);
        t.conn.forEach(cid=>{
          const tgt=nts.find(nt=>nt.id===cid);
          if(tgt&&tgt.owner!==pid){
            const my=totalArmy(t.army),th=totalArmy(tgt.army);
            if(my>th*1.3)cands.push({from:t.id,to:cid,r:my/th});
          }
        });
      });
      if(cands.length){
        cands.sort((a,b)=>b.r-a.r);
        const p=cands[0];
        const aT=nts.find(t=>t.id===p.from),dT=nts.find(t=>t.id===p.to);
        const res=simBattle(aT,dT);
        nts[nts.findIndex(t=>t.id===p.from)]={...nts.find(t=>t.id===p.from),army:{...res.aa}};
        if(res.atkWin){
          const occ={};Object.keys(res.aa).forEach(k=>{occ[k]=Math.floor(res.aa[k]*0.3)});
          const di=nts.findIndex(t=>t.id===p.to);
          nts[di]={...nts[di],owner:pid,army:occ,mor:clamp(nts[di].mor-15,10,100)};
          addLog(`⚔️ ${PLAYERS[pid].n}: ${aT.name}→${dT.name} 점령!`);
        }else{
          nts[nts.findIndex(t=>t.id===p.to)]={...nts.find(t=>t.id===p.to),army:{...res.da}};
          addLog(`⚔️ ${PLAYERS[pid].n}: ${dT.name} 공격 실패`);
        }
      }
    }
    return nts;
  },[gold,food,addLog]);

  // === END TURN ===
  const endTurn=()=>{
    let ts=terrs.map(t=>({...t,army:{...t.army}}));
    ts=aiTurn(ts,"ai1");ts=aiTurn(ts,"ai2");
    const ns=(season+1)%4,ny=ns===0?year+1:year;
    setSeason(ns);setYear(ny);
    const ng={...gold},nf={...food};

    // === EVERY TURN: Army food consumption ===
    Object.keys(PLAYERS).forEach(pid=>{
      const troops=sum(ts.filter(t=>t.owner===pid),t=>totalArmy(t.army));
      const consumption=Math.floor(troops*FOOD_PER_SOLDIER);
      nf[pid]=Math.max(0,(nf[pid]||0)-consumption);
      if(pid==="player")addLog(`군량 소비: -${consumption} 식량 (병사 ${troops}명)`);
    });

    // Famine notification (penalties handled by MORALE section and winter logic)
    if(food.player>0&&nf.player<=0){
      addLog("🌾 기근 발생! 병사들이 이탈하기 시작합니다!");
    }else if(food.player<=0&&nf.player<=0){
      addLog("⚠️ 기근 지속 중...");
    }

    // === MORALE: based on food supply ===
    Object.keys(PLAYERS).forEach(pid=>{
      const troops=sum(ts.filter(t=>t.owner===pid),t=>totalArmy(t.army));
      const foodRatio=troops>0?(nf[pid]||0)/(troops*FOOD_PER_SOLDIER*4):999; // 4계절분 여유 기준
      ts=ts.map(t=>{
        if(t.owner!==pid)return t;
        let morChange=0;
        if(foodRatio>2)morChange=3; // 여유
        else if(foodRatio>1)morChange=1; // 적정
        else if(foodRatio>0.5)morChange=-5; // 부족
        else morChange=-12; // 심각
        return{...t,mor:clamp(t.mor+morChange,10,100)};
      });
    });

    // Training: morale bonus + 1pt decay per turn
    ts=ts.map(t=>{
      if(t.owner!=="player")return t;
      const tr=t.training??0;
      return{...t,mor:clamp(t.mor+Math.floor(tr/15),10,100),training:Math.max(0,tr-1)};
    });

    if(ns===0){// 봄: gold income + pop growth
      Object.keys(PLAYERS).forEach(pid=>{
        const inc=sum(ts.filter(t=>t.owner===pid),t=>Math.floor(t.econ*t.pop/300));
        ng[pid]=(ng[pid]||0)+inc;
        if(pid==="player")addLog(`봄 세수: +${inc} 금`);
      });
      ts=ts.map(t=>t.owner?{...t,pop:Math.min(50000,t.pop+Math.floor(t.pop*(t.mor/100)*0.03))}:t);
    }
    if(ns===2){// 가을: food income
      Object.keys(PLAYERS).forEach(pid=>{
        const inc=sum(ts.filter(t=>t.owner===pid),t=>Math.floor(t.agri*t.pop/200));
        nf[pid]=(nf[pid]||0)+inc;
        if(pid==="player")addLog(`가을 수확: +${inc} 식량`);
      });
    }
    if(ns===3){// 겨울: extra morale hit if food low
      ts=ts.map(t=>{
        if(!t.owner)return t;
        return (nf[t.owner]||0)<=0?{...t,mor:clamp(t.mor-8,10,100),army:{...t.army,
          infantry:Math.floor(t.army.infantry*0.9),archer:Math.floor(t.army.archer*0.9),
          cavalry:Math.floor(t.army.cavalry*0.9),siege:t.army.siege,special:Math.floor(t.army.special*0.9)
        }}:t;
      });
      if((nf.player||0)<=0)addLog("⚠️ 식량 고갈! 병사 이탈 발생!");
    }
    // Neutral recovery
    ts=ts.map(t=>!t.owner?{...t,army:{...t.army,infantry:t.army.infantry+rng(10,25),archer:t.army.archer+rng(5,15)},mor:clamp(t.mor+2,10,100)}:t);

    setGold(ng);setFood(nf);setTerrs(ts);setActions({});
    addLog(`--- ${ny}년 ${SEASONS[ns]} ---`);
    const pc=ts.filter(t=>t.owner==="player").length;
    if(pc===0){setPhase("over");addLog("패배...");}
    else if(pc===12){setPhase("over");addLog("🏆 세계 통일!");}
  };

  const gc2=o=>o?PLAYERS[o]?.c||"#6b7280":"#9ca3af";
  const gn=o=>o?PLAYERS[o]?.n||"?":"중립";

  // === TRANSFER MODAL ===
  const TransferModal=({from,to,onDo,onClose})=>{
    const [tr,setTr]=useState({infantry:0,archer:0,cavalry:0,siege:0,special:0});
    const ft=terrs.find(t=>t.id===from);
    const items=[["infantry",UNITS.infantry],["archer",UNITS.archer],["cavalry",UNITS.cavalry],["siege",UNITS.siege],["special",SPECIALS[from]]];
    return(<div style={{background:"#1e293b",borderRadius:10,padding:12,marginTop:8}}>
      <div style={{fontWeight:700,color:"#60a5fa",marginBottom:8}}>🚚 {ft.name} → {terrs.find(t=>t.id===to).name}</div>
      {items.map(([k,u])=>(
        <div key={k} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5,fontSize:12}}>
          <span style={{width:65}}>{u.icon}{u.n}</span>
          <span style={{width:30,color:"#94a3b8",textAlign:"right"}}>{ft.army[k]}</span>
          <input type="range" min={0} max={ft.army[k]} value={tr[k]}
            onChange={e=>setTr(p=>({...p,[k]:+e.target.value}))} style={{flex:1}}/>
          <span style={{width:30,textAlign:"right"}}>{tr[k]}</span>
        </div>
      ))}
      <div style={{display:"flex",gap:6,marginTop:6}}>
        <button onClick={()=>onDo(tr)} style={{flex:1,background:"#3b82f6",color:"#fff",border:"none",borderRadius:6,padding:8,cursor:"pointer"}}>이동</button>
        <button onClick={onClose} style={{flex:1,background:"#475569",color:"#fff",border:"none",borderRadius:6,padding:8,cursor:"pointer"}}>취소</button>
      </div>
    </div>);
  };

  // === CONSCRIPT MODAL ===
  const ConscriptModal=({tid,onClose})=>{
    const t=terrs.find(t=>t.id===tid);
    const maxP=Math.min(Math.floor(t.pop*0.1),t.pop-500);
    const items=[["infantry",UNITS.infantry],["archer",UNITS.archer],["cavalry",UNITS.cavalry],["siege",UNITS.siege],["special",SPECIALS[tid]]];
    return(<div style={{background:"#1e293b",borderRadius:10,padding:12,marginTop:8}}>
      <div style={{fontWeight:700,color:"#fbbf24",marginBottom:4}}>⚔️ 징병 ({t.name})</div>
      <div style={{fontSize:11,color:"#94a3b8",marginBottom:8}}>최대: {maxP}명 (인구 10%) · 민심 -5</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
        {items.map(([k,u])=>(
          <button key={k} onClick={()=>{doConscript(tid,k);onClose();}}
            disabled={actLeft(tid)<=0||maxP<=0}
            style={{background:"#334155",border:"1px solid #475569",borderRadius:8,padding:8,
              color:"#e2e8f0",textAlign:"left",cursor:"pointer",fontSize:11,opacity:actLeft(tid)<=0?0.5:1}}>
            <div>{u.icon} {u.n} <span style={{color:"#94a3b8"}}>({t.army[k]})</span></div>
            <div style={{color:"#fbbf24",fontSize:10}}>💰{u.cost[0]} 🌾{u.cost[1]}</div>
            <div style={{color:"#64748b",fontSize:10}}>{u.desc}</div>
          </button>
        ))}
      </div>
      <button onClick={onClose} style={{width:"100%",marginTop:8,background:"#475569",color:"#fff",border:"none",borderRadius:6,padding:8,cursor:"pointer"}}>닫기</button>
    </div>);
  };

  // === TRAINING MODAL ===
  const TrainingModal=({tid,onClose})=>{
    const t=terrs.find(t=>t.id===tid);
    const cmd=commanders[tid];
    const training=t.training??0;
    return(<div style={{background:"#1e293b",borderRadius:10,padding:12,marginTop:8}}>
      <div style={{fontWeight:700,color:"#60a5fa",marginBottom:8}}>🏋️ 훈련 ({t.name})</div>
      <div style={{marginBottom:8}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}>
          <span style={{color:"#94a3b8"}}>훈련 수치: {training}/100</span>
          <span style={{color:"#4ade80"}}>민심 +{Math.floor(training/15)}/턴</span>
        </div>
        <div style={{background:"#0f172a",borderRadius:4,height:7}}>
          <div style={{background:`hsl(${Math.floor(120*training/100)},75%,50%)`,borderRadius:4,height:"100%",width:`${training}%`}}/>
        </div>
        <div style={{fontSize:9,color:"#64748b",marginTop:2}}>매 턴 -1 자연감소 · 훈련 15당 민심+1/턴</div>
      </div>
      <div style={{padding:"5px 8px",background:"#0f172a",borderRadius:6,fontSize:11,marginBottom:8}}>
        <span style={{color:"#94a3b8"}}>지휘관: </span>
        {cmd==="war"?<span style={{color:"#f87171",fontWeight:700}}>⚔️ 전쟁지휘관 (훈련 ×1.5)</span>
          :<span style={{color:"#475569"}}>없음</span>}
      </div>
      <button onClick={()=>doTrain(tid)}
        disabled={actLeft(tid)<=0||gold.player<30||food.player<20}
        style={{width:"100%",background:actLeft(tid)<=0?"#1e293b":"#1d4ed8",color:"#fff",
          border:"1px solid #2563eb",borderRadius:6,padding:"8px 0",marginBottom:8,
          cursor:actLeft(tid)<=0?"not-allowed":"pointer",fontSize:12,opacity:actLeft(tid)<=0?0.5:1}}>
        🏋️ 훈련 실시 💰30 🌾20{cmd==="war"?" (×1.5 보너스)":""}
      </button>
      <div style={{fontSize:11,color:"#94a3b8",marginBottom:4,fontWeight:700}}>지휘관 임명 💰80 (명령 소비)</div>
      <div style={{marginBottom:8}}>
        <button onClick={()=>doRecruitCommander(tid,"war")}
          disabled={actLeft(tid)<=0||gold.player<80||cmd==="war"}
          style={{width:"100%",background:cmd==="war"?"#1e3a5f":"#334155",border:`1px solid ${cmd==="war"?"#3b82f6":"#475569"}`,
            borderRadius:6,padding:"6px 8px",textAlign:"left",
            color:cmd==="war"?"#60a5fa":"#e2e8f0",fontSize:11,
            cursor:cmd==="war"||actLeft(tid)<=0?"not-allowed":"pointer",
            opacity:actLeft(tid)<=0&&cmd!=="war"?0.5:1}}>
          <div>⚔️ 전쟁지휘관</div>
          <div style={{fontSize:9,color:"#94a3b8"}}>훈련 속도 +50%</div>
        </button>
      </div>
      <button onClick={onClose} style={{width:"100%",background:"#475569",color:"#fff",border:"none",borderRadius:6,padding:8,cursor:"pointer"}}>닫기</button>
    </div>);
  };

  // === MERCHANT MODAL ===
  const MerchantModal=({onClose})=>{
    const [amt,setAmt]=useState(100);
    return(<div style={{background:"#1e293b",borderRadius:10,padding:12,marginTop:8}}>
      <div style={{fontWeight:700,color:"#fbbf24",marginBottom:8}}>🏪 상인 (명령 소비 없음)</div>
      <div style={{fontSize:12,color:"#94a3b8",marginBottom:8}}>
        보유: 💰{gold.player} / 🌾{food.player}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
        <span style={{fontSize:12}}>수량:</span>
        <input type="range" min={50} max={500} step={50} value={amt}
          onChange={e=>setAmt(+e.target.value)} style={{flex:1}}/>
        <span style={{fontSize:13,fontWeight:700,width:40,textAlign:"right"}}>{amt}</span>
      </div>
      <div style={{display:"flex",gap:6}}>
        <button onClick={()=>{doTrade("buyFood",amt);}}
          style={{flex:1,background:"#22c55e",color:"#fff",border:"none",borderRadius:6,padding:10,cursor:"pointer",fontSize:12}}>
          💰{amt} → 🌾{Math.floor(amt*MERCHANT_RATE.goldToFood)}
        </button>
        <button onClick={()=>{doTrade("sellFood",amt);}}
          style={{flex:1,background:"#f97316",color:"#fff",border:"none",borderRadius:6,padding:10,cursor:"pointer",fontSize:12}}>
          🌾{amt} → 💰{Math.floor(amt*MERCHANT_RATE.foodToGold)}
        </button>
      </div>
      <button onClick={onClose} style={{width:"100%",marginTop:8,background:"#475569",color:"#fff",border:"none",borderRadius:6,padding:8,cursor:"pointer"}}>닫기</button>
    </div>);
  };

  // === RENDER ===
  if(phase==="select"){
    return(<div style={{background:"#0f172a",minHeight:"100vh",color:"#e2e8f0",padding:12,fontFamily:"sans-serif"}}>
      <h2 style={{textAlign:"center",fontSize:20,margin:"8px 0",color:"#fbbf24"}}>⚔️ 정복자 v3</h2>
      <p style={{textAlign:"center",fontSize:12,color:"#94a3b8",marginBottom:12}}>시작 영지 선택 (중립만 가능)</p>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center"}}>
        {terrs.filter(t=>!t.owner).map(t=>{const sp=SPECIALS[t.id];return(
          <button key={t.id} onClick={()=>selectStart(t.id)}
            style={{background:"#1e293b",border:"2px solid #3b82f6",borderRadius:10,padding:10,color:"#e2e8f0",
              width:"calc(50% - 3px)",textAlign:"left",cursor:"pointer"}}>
            <div style={{fontWeight:700,fontSize:13,color:"#60a5fa"}}>{t.name}</div>
            <div style={{fontSize:10,color:"#94a3b8",marginTop:2}}>
              인구{t.pop} 경제{t.econ} 농업{t.agri}<br/>
              병력{totalArmy(t.army)} {sp.icon}{sp.n}{t.army.special}
            </div>
          </button>);})}
      </div>
      <div style={{marginTop:12,padding:10,background:"#1e293b",borderRadius:8,fontSize:11,color:"#94a3b8"}}>
        <div style={{color:"#ef4444",fontWeight:700}}>🔴 몽골 제국: 몽골·만주·화북</div>
        <div style={{color:"#22c55e",fontWeight:700,marginTop:4}}>🟢 이슬람 연맹: 인도·페르시아·아라비아</div>
        <div style={{marginTop:6,color:"#64748b",fontSize:10}}>
          💡 금=경제·외교·공성, 식량=징병·군량·민심<br/>
          매 턴 병사 1명당 0.5 식량 소비 · 상인으로 금↔식량 교환 가능
        </div>
      </div>
    </div>);
  }

  if(phase==="over"){
    const won=terrs.filter(t=>t.owner==="player").length===12;
    return(<div style={{background:"#0f172a",minHeight:"100vh",color:"#e2e8f0",padding:20,fontFamily:"sans-serif",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
      <div style={{fontSize:48}}>{won?"🏆":"💀"}</div>
      <h2 style={{color:won?"#fbbf24":"#ef4444"}}>{won?"세계 통일!":"패배..."}</h2>
      <button onClick={()=>{setPhase("select");setTerrs(JSON.parse(JSON.stringify(INIT)));setSeason(0);setYear(1206);
        setGold({player:500,ai1:800,ai2:600});setFood({player:2000,ai1:3000,ai2:2500});
        setLog([]);setScouted({});setActions({});setSel(null);setModal(null);setBattleLog(null);setCommanders({});}}
        style={{marginTop:16,background:"#3b82f6",color:"#fff",border:"none",borderRadius:8,padding:"10px 24px",cursor:"pointer"}}>다시 시작</button>
    </div>);
  }

  const troopInfo=playerTotalTroops("player");
  const foodBurn=Math.floor(troopInfo*FOOD_PER_SOLDIER);

  return(<div style={{background:"#0f172a",minHeight:"100vh",color:"#e2e8f0",fontFamily:"sans-serif",fontSize:13}}>
    {/* Header */}
    <div style={{background:"#1e293b",padding:"5px 10px",display:"flex",justifyContent:"space-between",alignItems:"center",
      borderBottom:"1px solid #334155",position:"sticky",top:0,zIndex:10}}>
      <span style={{color:SC[season],fontWeight:700,fontSize:13}}>{year}년 {SEASONS[season]}</span>
      <div style={{display:"flex",gap:8,fontSize:11}}>
        <span style={{color:"#fbbf24"}}>💰{gold.player}</span>
        <span style={{color:"#4ade80"}}>🌾{food.player}</span>
        <span style={{color:"#f87171",fontSize:10}}>(-{foodBurn}/턴)</span>
        <span style={{color:"#60a5fa"}}>🏰{myTerrs.length}</span>
      </div>
    </div>

    {/* Tabs */}
    <div style={{display:"flex",background:"#1e293b",borderBottom:"1px solid #334155"}}>
      {[["map","🗺️지도"],["detail","📋영지"],["battle","⚔️전투"],["log","📜기록"]].map(([v,l])=>(
        <button key={v} onClick={()=>setView(v)}
          style={{flex:1,padding:"6px 0",background:view===v?"#334155":"transparent",
            color:view===v?"#fff":"#94a3b8",border:"none",fontSize:11,cursor:"pointer",
            borderBottom:view===v?"2px solid #3b82f6":"2px solid transparent"}}>{l}</button>
      ))}
    </div>

    {/* MAP */}
    {view==="map"&&(<div style={{padding:8}}>
      <svg viewBox="0 0 100 80" style={{width:"100%",background:"#0f172a",borderRadius:8}}>
        {terrs.map(t=>t.conn.map(cid=>{
          const c=terrs.find(ct=>ct.id===cid);
          if(!c||t.id>cid)return null;
          return <line key={`${t.id}-${cid}`} x1={t.x} y1={t.y} x2={c.x} y2={c.y} stroke="#334155" strokeWidth="0.3"/>;
        }))}
        {terrs.map(t=>(<g key={t.id} onClick={()=>setSel(t.id)} style={{cursor:"pointer"}}>
          <circle cx={t.x} cy={t.y} r={3.2} fill={gc2(t.owner)} opacity={0.85}
            stroke={sel===t.id?"#fff":"none"} strokeWidth="0.5"/>
          <text x={t.x} y={t.y+5.5} textAnchor="middle" fill="#cbd5e1" fontSize="2.5" fontWeight="600">{t.name}</text>
          <text x={t.x} y={t.y+0.8} textAnchor="middle" fill="#fff" fontSize="2" fontWeight="700">
            {t.owner==="player"||scouted[t.id]?totalArmy(t.army):"?"}</text>
        </g>))}
      </svg>
      <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:4,fontSize:10}}>
        {Object.entries(PLAYERS).map(([k,v])=>(
          <span key={k} style={{color:v.c}}>●{v.n}({ownerCnt[k]||0})</span>
        ))}
        <span style={{color:"#9ca3af"}}>●중립({12-(ownerCnt.player||0)-(ownerCnt.ai1||0)-(ownerCnt.ai2||0)})</span>
      </div>

      {selT&&(<div style={{background:"#1e293b",borderRadius:8,padding:10,marginTop:8}}>
        <div style={{display:"flex",justifyContent:"space-between"}}>
          <span style={{fontWeight:700,color:gc2(selT.owner)}}>{selT.name}</span>
          <span style={{fontSize:11,color:"#94a3b8"}}>{gn(selT.owner)}</span>
        </div>
        {(selT.owner==="player"||scouted[selT.id])?(<div style={{fontSize:11,color:"#94a3b8",marginTop:4}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:2}}>
            <span>🗡️보{selT.army.infantry}</span><span>🏹궁{selT.army.archer}</span><span>🐴기{selT.army.cavalry}</span>
            <span>🪨공{selT.army.siege}</span><span>{SPECIALS[selT.id].icon}{SPECIALS[selT.id].n}{selT.army.special}</span>
            <span style={{color:"#fbbf24"}}>총{totalArmy(selT.army)}</span>
          </div>
        </div>):(
          <button onClick={()=>doScout(selT.id)} style={{marginTop:6,background:"#3b82f6",color:"#fff",border:"none",borderRadius:6,padding:"6px 14px",fontSize:12,cursor:"pointer"}}>🔍 정찰(💰40)</button>
        )}
        {selT.owner!=="player"&&myTerrs.some(pt=>pt.conn.includes(selT.id))&&(
          <div style={{marginTop:6,display:"flex",gap:6,flexWrap:"wrap"}}>
            <button onClick={()=>{const f=myTerrs.find(pt=>pt.conn.includes(selT.id));setSel(f.id);setModal({type:"attack",from:f.id,to:selT.id});}}
              style={{background:"#ef4444",color:"#fff",border:"none",borderRadius:6,padding:"6px 12px",fontSize:12,cursor:"pointer"}}>⚔️공격</button>
            {selT.owner&&<button onClick={()=>doSurrender(selT.id)}
              style={{background:"#a855f7",color:"#fff",border:"none",borderRadius:6,padding:"6px 12px",fontSize:12,cursor:"pointer"}}>🏳️항복권고(💰100)</button>}
          </div>
        )}
        {selT.owner==="player"&&<button onClick={()=>setView("detail")}
          style={{marginTop:6,background:"#334155",color:"#fff",border:"none",borderRadius:6,padding:"6px 12px",fontSize:12,cursor:"pointer"}}>📋상세</button>}
      </div>)}

      {modal?.type==="attack"&&view==="map"&&(
        <div style={{background:"#7f1d1d",borderRadius:8,padding:10,marginTop:8}}>
          <div style={{fontWeight:700,color:"#fca5a5"}}>⚔️ {terrs.find(t=>t.id===modal.from)?.name} → {terrs.find(t=>t.id===modal.to)?.name}</div>
          <div style={{display:"flex",gap:8,marginTop:8}}>
            <button onClick={()=>doAttack(modal.from,modal.to)} style={{background:"#ef4444",color:"#fff",border:"none",borderRadius:6,padding:"8px 16px",cursor:"pointer"}}>공격!</button>
            <button onClick={()=>setModal(null)} style={{background:"#475569",color:"#fff",border:"none",borderRadius:6,padding:"8px 16px",cursor:"pointer"}}>취소</button>
          </div>
        </div>
      )}

      {/* Merchant + End Turn */}
      <div style={{display:"flex",gap:6,marginTop:10}}>
        <button onClick={()=>setModal({type:"merchant"})} style={{flex:1,background:"#854d0e",color:"#fbbf24",border:"none",borderRadius:8,padding:"10px 0",fontSize:13,fontWeight:700,cursor:"pointer"}}>🏪 상인</button>
        <button onClick={endTurn} style={{flex:2,background:"#1d4ed8",color:"#fff",border:"none",borderRadius:8,padding:"10px 0",fontSize:13,fontWeight:700,cursor:"pointer"}}>
          턴 종료 → {SEASONS[(season+1)%4]}</button>
      </div>
      {modal?.type==="merchant"&&view==="map"&&<MerchantModal onClose={()=>setModal(null)}/>}
    </div>)}

    {/* DETAIL */}
    {view==="detail"&&(<div style={{padding:8}}>
      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>
        {myTerrs.map(t=>(
          <button key={t.id} onClick={()=>{setSel(t.id);setModal(null);}}
            style={{background:sel===t.id?"#3b82f6":"#334155",color:"#fff",border:"none",borderRadius:6,padding:"4px 8px",fontSize:11,cursor:"pointer"}}>{t.name}</button>
        ))}
      </div>
      {selT&&selT.owner==="player"?(<div>
        <div style={{background:"#1e293b",borderRadius:8,padding:10}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <span style={{fontWeight:700,color:"#60a5fa",fontSize:15}}>{selT.name}</span>
            <span style={{fontSize:11,color:actLeft(selT.id)>0?"#4ade80":"#ef4444"}}>명령 {actLeft(selT.id)}/{maxAct}</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:3,fontSize:10}}>
            {[["👥",selT.pop,"인구"],["💰",selT.econ,"경제"],["🌾",selT.agri,"농업"],
              ["😊",selT.mor,"민심"],["🏰",selT.wall,"성벽"],["🏋️",selT.training??0,"훈련"]].map(([ic,v,lb],i)=>(
              <div key={i} style={{background:"#0f172a",borderRadius:5,padding:5,textAlign:"center"}}>
                <div style={{color:"#94a3b8"}}>{ic}{lb}</div>
                <div style={{fontWeight:700,fontSize:12,color:(lb==="민심"||lb==="훈련")?(v<40?"#ef4444":v<60?"#fbbf24":"#4ade80"):"#e2e8f0"}}>{v}</div>
              </div>
            ))}
          </div>
          {commanders[selT.id]==="war"&&<div style={{marginTop:4,padding:"3px 8px",background:"#0f172a",borderRadius:5,fontSize:10,color:"#f87171"}}>
            지휘관: ⚔️ 전쟁지휘관 (훈련 ×1.5)
          </div>}
          <div style={{marginTop:4,display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:3,fontSize:10}}>
            {[["infantry",UNITS.infantry],["archer",UNITS.archer],["cavalry",UNITS.cavalry],
              ["siege",UNITS.siege],["special",SPECIALS[selT.id]]].map(([k,u])=>(
              <div key={k} style={{background:"#0f172a",borderRadius:5,padding:5,textAlign:"center"}}>
                <div style={{color:"#94a3b8"}}>{u.icon}{u.n}</div>
                <div style={{fontWeight:700,fontSize:12}}>{selT.army[k]}</div>
              </div>
            ))}
            <div style={{background:"#0f172a",borderRadius:5,padding:5,textAlign:"center"}}>
              <div style={{color:"#94a3b8"}}>총병력</div>
              <div style={{fontWeight:700,fontSize:12,color:"#fbbf24"}}>{totalArmy(selT.army)}</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{marginTop:6,background:"#1e293b",borderRadius:8,padding:10}}>
          <div style={{fontWeight:700,fontSize:12,marginBottom:6}}>📋 명령</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:4}}>
            {[["econ","📈경제","💰50"],["agri","🌿농업","💰30🌾20"],["wall","🏰성벽","💰60"],
              ["comfort","😊위무","🌾80"],["train","🏋️훈련","💰30🌾20"]].map(([k,lb,cs])=>(
              <button key={k} onClick={()=>{
                if(k==="comfort")doComfort(selT.id);
                else if(k==="train")setModal({type:"training",tid:selT.id});
                else doInvest(selT.id,k);
              }}
                disabled={actLeft(selT.id)<=0}
                style={{background:actLeft(selT.id)<=0?"#1e293b":"#334155",border:"1px solid #475569",borderRadius:6,
                  padding:5,color:actLeft(selT.id)<=0?"#475569":"#e2e8f0",cursor:actLeft(selT.id)<=0?"not-allowed":"pointer",fontSize:11}}>
                <div>{lb}</div><div style={{fontSize:9,color:"#94a3b8"}}>{cs}</div>
              </button>
            ))}
            <button onClick={()=>setModal({type:"conscript",tid:selT.id})} disabled={actLeft(selT.id)<=0}
              style={{background:actLeft(selT.id)<=0?"#1e293b":"#334155",border:"1px solid #475569",borderRadius:6,
                padding:5,color:actLeft(selT.id)<=0?"#475569":"#e2e8f0",cursor:actLeft(selT.id)<=0?"not-allowed":"pointer",fontSize:11}}>
              <div>⚔️징병</div><div style={{fontSize:9,color:"#94a3b8"}}>병종선택</div>
            </button>
            <button onClick={()=>setModal({type:"merchant"})}
              style={{background:"#854d0e",border:"1px solid #a16207",borderRadius:6,padding:5,color:"#fbbf24",cursor:"pointer",fontSize:11,gridColumn:"1/-1"}}>
              <div>🏪상인</div><div style={{fontSize:9,color:"#d97706"}}>금↔식량</div>
            </button>
          </div>
        </div>

        {/* Transfer */}
        <div style={{marginTop:6,background:"#1e293b",borderRadius:8,padding:10}}>
          <div style={{fontWeight:700,fontSize:12,marginBottom:4}}>🚚 병력이동 · ⚔️ 공격</div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            {selT.conn.map(cid=>{
              const tgt=terrs.find(t=>t.id===cid);
              const isAlly=tgt?.owner==="player";
              return(<button key={cid} onClick={()=>setModal(isAlly?{type:"transfer",from:selT.id,to:cid}:{type:"attack",from:selT.id,to:cid})}
                disabled={!isAlly&&actLeft(selT.id)<=0}
                style={{background:isAlly?"#334155":"#7f1d1d",color:isAlly?"#fff":"#fca5a5",border:"none",borderRadius:6,
                  padding:"4px 10px",fontSize:11,cursor:"pointer"}}>
                {isAlly?"🚚":"⚔️"}{tgt.name}
                {(scouted[cid]||tgt.owner==="player")&&<span style={{color:"#94a3b8"}}> ({totalArmy(tgt.army)})</span>}
              </button>);
            })}
          </div>
        </div>

        {/* Modals */}
        {modal?.type==="transfer"&&modal.from===selT.id&&
          <TransferModal from={modal.from} to={modal.to} onDo={tr=>doTransfer(modal.from,modal.to,tr)} onClose={()=>setModal(null)}/>}
        {modal?.type==="conscript"&&modal.tid===selT.id&&
          <ConscriptModal tid={modal.tid} onClose={()=>setModal(null)}/>}
        {modal?.type==="training"&&modal.tid===selT.id&&
          <TrainingModal tid={modal.tid} onClose={()=>setModal(null)}/>}
        {modal?.type==="attack"&&modal.from===selT.id&&(
          <div style={{background:"#7f1d1d",borderRadius:8,padding:10,marginTop:8}}>
            <div style={{fontWeight:700,color:"#fca5a5"}}>⚔️ {selT.name} → {terrs.find(t=>t.id===modal.to)?.name}</div>
            <div style={{display:"flex",gap:8,marginTop:8}}>
              <button onClick={()=>doAttack(modal.from,modal.to)} style={{background:"#ef4444",color:"#fff",border:"none",borderRadius:6,padding:"8px 16px",cursor:"pointer"}}>공격!</button>
              <button onClick={()=>setModal(null)} style={{background:"#475569",color:"#fff",border:"none",borderRadius:6,padding:"8px 16px",cursor:"pointer"}}>취소</button>
            </div>
          </div>
        )}
        {modal?.type==="merchant"&&<MerchantModal onClose={()=>setModal(null)}/>}

        <button onClick={endTurn} style={{width:"100%",marginTop:8,background:"#1d4ed8",color:"#fff",border:"none",borderRadius:8,padding:"12px 0",fontSize:14,fontWeight:700,cursor:"pointer"}}>
          턴 종료 → {SEASONS[(season+1)%4]}</button>
      </div>):(<div style={{textAlign:"center",color:"#94a3b8",padding:20}}>위에서 내 영지를 선택하세요</div>)}
    </div>)}

    {/* BATTLE */}
    {view==="battle"&&(<div style={{padding:12}}>
      {battleLog?(<div style={{background:"#1e293b",borderRadius:8,padding:12}}>
        <h3 style={{color:"#fbbf24",fontSize:14,marginBottom:8}}>⚔️ 전투 기록</h3>
        {battleLog.map((l,i)=>(
          <div key={i} style={{padding:"3px 0",fontSize:12,
            color:l.includes("✅")?"#4ade80":l.includes("❌")?"#ef4444":l.includes("⚔️")?"#fbbf24":"#cbd5e1",
            borderBottom:"1px solid #0f172a"}}>{l}</div>
        ))}
      </div>):(<div style={{textAlign:"center",color:"#64748b",padding:20}}>전투 기록 없음</div>)}
      <button onClick={()=>setView("map")} style={{width:"100%",marginTop:10,background:"#334155",color:"#fff",border:"none",borderRadius:8,padding:"10px 0",cursor:"pointer"}}>지도로</button>
    </div>)}

    {/* LOG */}
    {view==="log"&&(<div style={{padding:8}}>
      <div style={{background:"#1e293b",borderRadius:8,padding:10,maxHeight:"75vh",overflowY:"auto"}}>
        {log.length===0?<div style={{color:"#64748b",textAlign:"center"}}>기록 없음</div>:
          log.map((l,i)=>(
            <div key={i} style={{padding:"3px 0",fontSize:12,borderBottom:"1px solid #0f172a",
              color:l.includes("점령")?"#4ade80":l.includes("실패")||l.includes("⚠️")?"#ef4444":l.includes("---")?"#fbbf24":"#94a3b8"}}>{l}</div>
          ))}
      </div>
    </div>)}
  </div>);
}
