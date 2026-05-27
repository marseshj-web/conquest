import { useEffect, useRef } from "react";
import {
  MAP_W, MAP_H, UNIT_TYPES, ARROW_ACC, ARROW_MULT, MUSKET_ACC, MUSKET_MULT,
  ARCHER_BONUS, MELEE_BONUS, MAX_ATK_PER, SEP_RADIUS, SEP_FORCE, THEME_COLORS as c,
  TERRAIN_TYPES, Y_COMPRESS, HORIZON_OFFSET, RENDER_H
} from '../constants.js';
import {
  dmgA, dmgB, buildGrid, getNear, findTarget,
  arrows, fireArrow, updateArrows
} from '../engine.js';

// --- Rendering helpers (module-level, no React deps) ---

const toSY = (wy) => HORIZON_OFFSET + wy * Y_COMPRESS;

function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildTerrainCache(map) {
  const oc = new OffscreenCanvas(MAP_W, RENDER_H);
  const octx = oc.getContext('2d');

  // Sky band — battle atmosphere sky
  const sky = octx.createLinearGradient(0, 0, 0, HORIZON_OFFSET);
  sky.addColorStop(0, "#1a2535");
  sky.addColorStop(0.6, "#263345");
  sky.addColorStop(1, "#2d3d3a");
  octx.fillStyle = sky;
  octx.fillRect(0, 0, MAP_W, HORIZON_OFFSET);

  // Horizon atmospheric haze band
  const haze = octx.createLinearGradient(0, HORIZON_OFFSET - 14, 0, HORIZON_OFFSET + 14);
  haze.addColorStop(0, "rgba(180,210,160,0)");
  haze.addColorStop(0.5, "rgba(180,210,160,0.11)");
  haze.addColorStop(1, "rgba(180,210,160,0)");
  octx.fillStyle = haze;
  octx.fillRect(0, HORIZON_OFFSET - 14, MAP_W, 28);

  // Ground
  const bg = octx.createLinearGradient(0, HORIZON_OFFSET, 0, RENDER_H);
  bg.addColorStop(0, "#2e3d2a");
  bg.addColorStop(1, "#263422");
  octx.fillStyle = bg;
  octx.fillRect(0, HORIZON_OFFSET, MAP_W, RENDER_H - HORIZON_OFFSET);

  // Atmospheric depth fog: near-horizon lighter for aerial perspective
  const fog = octx.createLinearGradient(0, HORIZON_OFFSET, 0, RENDER_H);
  fog.addColorStop(0, "rgba(130,160,120,0.18)");
  fog.addColorStop(0.3, "rgba(130,160,120,0.07)");
  fog.addColorStop(1, "rgba(130,160,120,0)");
  octx.fillStyle = fog;
  octx.fillRect(0, HORIZON_OFFSET, MAP_W, RENDER_H - HORIZON_OFFSET);

  // Grass texture: 700 strokes, depth-based alpha and length for perspective feel
  const grassRng = mulberry32(777);
  octx.lineWidth = 0.8;
  for (let i = 0; i < 700; i++) {
    const gx = grassRng() * MAP_W;
    const gy = toSY(grassRng() * MAP_H);
    const depth = Math.max(0, (gy - HORIZON_OFFSET) / (RENDER_H - HORIZON_OFFSET));
    const glen = 1.5 + depth * 5 + grassRng() * 2;
    const gangle = -Math.PI / 2 + (grassRng() - 0.5) * 0.8;
    const alpha = 0.04 + depth * 0.14 + grassRng() * 0.04;
    octx.strokeStyle = `rgba(100,150,60,${alpha.toFixed(2)})`;
    octx.beginPath();
    octx.moveTo(gx, gy);
    octx.lineTo(gx + Math.cos(gangle) * glen, gy + Math.sin(gangle) * glen);
    octx.stroke();
  }

  if (!map?.terrain) return oc;

  for (const tr of map.terrain) {
    const sy1 = toSY(tr.y);
    const sy2 = toSY(tr.y + tr.h);
    const sh = sy2 - sy1;

    if (tr.type === 'river') {
      octx.fillStyle = TERRAIN_TYPES.river.color;
      octx.fillRect(tr.x, sy1, tr.w, sh);

      // Edge depth shading
      const dg = octx.createLinearGradient(tr.x, 0, tr.x + tr.w, 0);
      dg.addColorStop(0, "rgba(20,80,140,0.3)");
      dg.addColorStop(0.5, "rgba(50,160,210,0.08)");
      dg.addColorStop(1, "rgba(20,80,140,0.3)");
      octx.fillStyle = dg;
      octx.fillRect(tr.x, sy1, tr.w, sh);

      // Seeded static base wave lines
      const rng = mulberry32(42);
      octx.strokeStyle = "rgba(255,255,255,0.07)";
      octx.lineWidth = 1;
      for (let i = 0; i < 80; i++) {
        const wx = tr.x + rng() * tr.w;
        const wy = sy1 + rng() * sh;
        const wl = 8 + rng() * 20;
        octx.beginPath(); octx.moveTo(wx, wy); octx.lineTo(wx + wl, wy); octx.stroke();
      }

    } else if (tr.type === 'mud') {
      octx.fillStyle = TERRAIN_TYPES.mud.color;
      octx.fillRect(tr.x, sy1, tr.w, sh);

      const rng = mulberry32(99);
      // Dots
      octx.fillStyle = "rgba(0,0,0,0.12)";
      for (let i = 0; i < 200; i++) {
        const mx = tr.x + rng() * tr.w;
        const my = sy1 + rng() * sh;
        const mr = 1 + rng() * 2.5;
        octx.beginPath(); octx.arc(mx, my, mr, 0, Math.PI * 2); octx.fill();
      }
      // Crack lines
      octx.strokeStyle = "rgba(0,0,0,0.18)";
      octx.lineWidth = 0.8;
      for (let i = 0; i < 40; i++) {
        const cx = tr.x + rng() * tr.w;
        const cy = sy1 + rng() * sh;
        const cl = 5 + rng() * 12;
        const ca = rng() * Math.PI * 2;
        octx.beginPath(); octx.moveTo(cx, cy);
        octx.lineTo(cx + Math.cos(ca) * cl, cy + Math.sin(ca) * cl); octx.stroke();
      }
    }
  }

  return oc;
}

function drawRiverWaves(ctx, terrain, time) {
  for (const tr of terrain) {
    if (tr.type !== 'river') continue;
    const sy1 = toSY(tr.y), sy2 = toSY(tr.y + tr.h), sh = sy2 - sy1;
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      const wy = sy1 + (sh / 10) * i + Math.sin(time * 1.4 + i * 0.7) * 2.5;
      const alpha = Math.max(0.03, 0.06 + Math.sin(time * 2.1 + i * 1.3) * 0.03);
      ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
      ctx.beginPath(); ctx.moveTo(tr.x, wy); ctx.lineTo(tr.x + tr.w, wy); ctx.stroke();
    }
  }
}

function drawPerspectiveGrid(ctx, W, H) {
  const vp = W / 2;
  ctx.lineWidth = 0.5;
  // Horizontal lines — equal world-Y spacing, naturally closer near horizon
  for (let i = 0; i <= 10; i++) {
    const sy = toSY((i / 10) * MAP_H);
    const alpha = 0.012 + (i / 10) * 0.022;
    ctx.strokeStyle = `rgba(200,200,150,${alpha.toFixed(3)})`;
    ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(W, sy); ctx.stroke();
  }
  // Vertical lines — converge toward vanishing point at horizon
  ctx.strokeStyle = "rgba(200,200,150,0.018)";
  for (let i = 0; i <= 14; i++) {
    const wx = (i / 14) * W;
    const topX = vp + (wx - vp) * 0.12;
    ctx.beginPath(); ctx.moveTo(topX, HORIZON_OFFSET); ctx.lineTo(wx, H); ctx.stroke();
  }
}

// --- Component ---

export default function BattlePhase({
  gRef, formula, speed, setSpeed, setResult, setStats, setPhase,
  setBattleResult,
  soundRef, muted, setMuted
}) {
  const cvRef = useRef(null);
  const afRef = useRef(null);
  const terrainCacheRef = useRef(null);

  useEffect(() => {
    if (!cvRef.current) return;
    const ctx = cvRef.current.getContext("2d");
    let last = performance.now();
    const df = formula === "A" ? dmgA : dmgB;

    const loop = now => {
      const G = gRef.current;
      if (!G || G.done) return;
      const dt = Math.min((now - last) / 1000, 0.05) * speed;
      last = now; G.time += dt;

      const alive = G.soldiers.filter(s => s.alive);
      const pA = alive.filter(s => s.team === "player");
      const eA = alive.filter(s => s.team === "ai");

      const timeout = G.time > 120;
      if (!pA.length || !eA.length || timeout) {
        G.done = true;
        G.winner = timeout
          ? (pA.length > eA.length ? "player" : pA.length < eA.length ? "ai" : "draw")
          : (pA.length ? "player" : eA.length ? "ai" : "draw");
        soundRef?.current?.play(G.winner === 'player' ? 'victory' : 'defeat');
        setResult(G.winner);
        setStats({ p: pA.length, a: eA.length, t: G.time });
        if (setBattleResult) {
          const ct = (arr) => { const m = {}; for (const s of arr) m[s.typeId] = (m[s.typeId] ?? 0) + 1; return m; };
          setBattleResult({
            winner: G.winner,
            time: G.time,
            playerSurvivorsByType: ct(pA),
            aiSurvivorsByType:     ct(eA),
            playerDeployedByType:  G.playerDeployedByType ?? {},
            aiDeployedByType:      G.aiDeployedByType     ?? {},
          });
        }
        setPhase("result");
        return;
      }

      const cs = SEP_RADIUS * 2;
      const pGrid = buildGrid(pA, cs);
      const eGrid = buildGrid(eA, cs);

      for (const s of alive) s.attackersCount = 0;

      const sepX = new Float32Array(alive.length);
      const sepY = new Float32Array(alive.length);
      const idxMap = {};
      alive.forEach((s, i) => { idxMap[s.id] = i; });

      for (const s of alive) {
        const idx = idxMap[s.id];
        const grid = s.team === "player" ? pGrid : eGrid;
        const neighbors = getNear(grid, s, cs);
        for (const n of neighbors) {
          if (n.team !== s.team) continue;
          const dx = s.x - n.x, dy = s.y - n.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < SEP_RADIUS && dist > 0.1) {
            const f = (SEP_RADIUS - dist) / SEP_RADIUS * SEP_FORCE;
            sepX[idx] += (dx / dist) * f;
            sepY[idx] += (dy / dist) * f;
          } else if (dist < 0.1) {
            const a = Math.random() * Math.PI * 2;
            sepX[idx] += Math.cos(a) * SEP_FORCE * 0.3;
            sepY[idx] += Math.sin(a) * SEP_FORCE * 0.3;
          }
        }

        if (G.map && G.map.obstacles) {
          for (const obs of G.map.obstacles) {
            const dx = s.x - obs.x, dy = s.y - obs.y;
            const dist = Math.hypot(dx, dy);
            const avoidR = obs.radius + 10;
            if (dist < avoidR && dist > 0.1) {
              const f = (avoidR - dist) / avoidR * SEP_FORCE * 2;
              sepX[idx] += (dx / dist) * f;
              sepY[idx] += (dy / dist) * f;
            }
          }
        }
      }

      for (const s of alive) {
        const enemies = s.team === "player" ? eA : pA;
        if (!enemies.length) continue;

        if (!s.target || !s.target.alive) {
          s.target = findTarget(s, enemies);
        }

        if (!s.target) continue;

        const dx = s.target.x - s.x, dy = s.target.y - s.y;
        const dist = Math.hypot(dx, dy);
        const engR = (s.type === "ranged" || s.type === "siege") ? s.range : 16;
        const inRange = dist <= engR;
        const idx = idxMap[s.id];

        let mx = 0, my = 0;
        if (!inRange) {
          if (s.type === "melee" && s.target.attackersCount >= MAX_ATK_PER) {
            let alt = null, ad = Infinity;
            for (const e of enemies) {
              if (e.attackersCount >= MAX_ATK_PER) continue;
              const d = Math.hypot(e.x - s.x, e.y - s.y);
              if (d < ad) { ad = d; alt = e; }
            }
            if (alt) s.target = alt;
          }

          let speedMult = 1.0;
          if (G.map && G.map.terrain) {
            for (const tr of G.map.terrain) {
              if (s.x >= tr.x && s.x <= tr.x + tr.w && s.y >= tr.y && s.y <= tr.y + tr.h) {
                speedMult *= TERRAIN_TYPES[tr.type].speedMult;
              }
            }
          }

          mx = (dx / dist) * s.speed * speedMult * 40;
          my = (dy / dist) * s.speed * speedMult * 40;
        }

        s.x += (mx + sepX[idx]) * dt;
        s.y += (my + sepY[idx]) * dt;
        s.x = Math.max(5, Math.min(MAP_W - 5, s.x));
        s.y = Math.max(5, Math.min(MAP_H - 5, s.y));

        const curDist = Math.hypot(s.target.x - s.x, s.target.y - s.y);
        if (curDist <= engR || (s.type === "ranged" && curDist <= s.range)) {
          if (s.type === "melee") s.target.attackersCount++;
          s.atkCooldown -= dt;
          if (s.atkCooldown <= 0) {
            s.atkCooldown = s.atkSpeed;

            if (s.type === "ranged") {
              const ac = s.target.armorClass || "light";
              let hitChance, dmgMult;
              if (s.typeId === "musketeer") {
                hitChance = MUSKET_ACC[ac] || 0.6;
                dmgMult   = MUSKET_MULT[ac] || 1.0;
              } else {
                hitChance = ARROW_ACC[ac] || 0.6;
                dmgMult   = ARROW_MULT[ac] || 1.0;
                const abonus = ARCHER_BONUS[s.target.typeId];
                if (abonus) { hitChance += abonus.accBonus; dmgMult *= abonus.dmgMult; }
              }

              if (curDist > 180) hitChance *= 0.82;
              else if (curDist > 120) hitChance *= 0.9;
              hitChance = Math.min(hitChance, 0.95);

              if (Math.random() < hitChance) {
                const dmg = df(Math.round(s.atk * dmgMult), s.target.def);
                s.target.hp -= dmg;
                soundRef?.current?.play(s.typeId === 'musketeer' ? 'musketFire' : 'arrowFire');
                fireArrow(s, s.target, true);
                if (s.target.hp <= 0) { s.target.alive = false; soundRef?.current?.play('unitDeath'); s.target = null; }
              } else {
                fireArrow(s, s.target, false);
              }
            } else if (s.type === "siege") {
              const splashR = UNIT_TYPES[s.typeId].splashRadius || 60;
              const tx = s.target.x, ty = s.target.y;
              const splashTargets = enemies.filter(e => e.alive && Math.hypot(e.x - tx, e.y - ty) <= splashR);
              for (const victim of splashTargets) {
                const dmg = df(s.atk, victim.def);
                victim.hp -= dmg;
                if (victim.hp <= 0) victim.alive = false;
              }
              fireArrow(s, s.target, true);
              soundRef?.current?.play('siegeImpact');
              if (s.target && !s.target.alive) s.target = null;
            } else {
              let av = s.atk;

              const bonusTable = MELEE_BONUS[s.typeId];
              if (bonusTable && bonusTable[s.target.typeId]) {
                av = Math.round(av * bonusTable[s.target.typeId]);
              }

              const chargeDef = UNIT_TYPES[s.typeId];
              if (chargeDef.chargeBonus && !s.hasCharged) {
                av = Math.round(av * chargeDef.chargeBonus);
                s.hasCharged = true;
                soundRef?.current?.play('chargeBlow');
              }

              const dmg = df(av, s.target.def);
              s.target.hp -= dmg;
              soundRef?.current?.play('meleeHit');
              if (s.target.hp <= 0) { s.target.alive = false; soundRef?.current?.play('unitDeath'); s.target = null; }
            }
          }
        }
      }

      updateArrows(dt);

      const W = MAP_W, H = RENDER_H;

      // Terrain cache (built once per battle start)
      if (!terrainCacheRef.current) {
        terrainCacheRef.current = buildTerrainCache(G.map);
      }
      ctx.drawImage(terrainCacheRef.current, 0, 0);

      // Animated river waves (on top of cache)
      if (G.map?.terrain) drawRiverWaves(ctx, G.map.terrain, G.time);

      // Perspective ground grid
      drawPerspectiveGrid(ctx, W, H);

      // Midfield line
      ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.setLineDash([5, 10]);
      ctx.beginPath(); ctx.moveTo(W / 2, HORIZON_OFFSET); ctx.lineTo(W / 2, H); ctx.stroke(); ctx.setLineDash([]);

      // Team labels
      ctx.font = "bold 10px monospace";
      ctx.fillStyle = "rgba(100,160,255,0.13)"; ctx.fillText("◀ PLAYER", 10, HORIZON_OFFSET + 14);
      ctx.fillStyle = "rgba(255,100,100,0.13)"; ctx.fillText("ENEMY ▶", W - 75, HORIZON_OFFSET + 14);

      // Arrows
      for (const a of arrows) {
        const t = 1 - a.life / a.ml;

        const dist = Math.hypot(a.tx - a.x, a.ty - a.y);
        const maxZ = Math.min(dist * 0.2, 40);
        const z = Math.sin(t * Math.PI) * maxZ;
        const pt = Math.max(0, t - 0.2);
        const pz = Math.sin(pt * Math.PI) * maxZ;

        const px = a.x + (a.tx - a.x) * t;
        const py = a.y + (a.ty - a.y) * t;
        const startX = a.x + (a.tx - a.x) * pt;
        const startY = a.y + (a.ty - a.y) * pt;

        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath();
        ctx.ellipse(px, toSY(py), 2, 1, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = a.hit ? "rgba(255,210,60,0.8)" : "rgba(200,200,200,0.8)";
        ctx.lineWidth = a.hit ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(startX, toSY(startY) - pz);
        ctx.lineTo(px, toSY(py) - z);
        ctx.stroke();
      }

      // Depth Sorting: back to front by world Y
      const renderables = [
        ...G.soldiers.filter(s => s.alive),
        ...(G.map?.obstacles || []).map(o => ({ ...o, isObstacle: true }))
      ].sort((a, b) => a.y - b.y);

      for (const item of renderables) {
        if (item.isObstacle) {
          ctx.save();
          ctx.translate(item.x, toSY(item.y));

          if (item.type === "tree") {
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.beginPath();
            ctx.ellipse(0, 0, item.radius, item.radius * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#3e2723";
            ctx.fillRect(-item.radius * 0.2, -item.radius, item.radius * 0.4, item.radius);

            ctx.fillStyle = "#2e4a1e";
            ctx.beginPath();
            ctx.arc(0, -item.radius * 1.2, item.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#3e6a2e";
            ctx.beginPath();
            ctx.arc(-item.radius * 0.3, -item.radius * 1.5, item.radius * 0.7, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(item.radius * 0.3, -item.radius * 1.3, item.radius * 0.6, 0, Math.PI * 2);
            ctx.fill();
          }

          if (item.type === "rock") {
            const r = item.radius;
            // Ground shadow
            ctx.fillStyle = "rgba(0,0,0,0.4)";
            ctx.beginPath(); ctx.ellipse(r*0.15, r*0.35, r*1.1, r*0.45, 0, 0, Math.PI*2); ctx.fill();
            // Dark face with soft AO shadow cast
            ctx.shadowColor = "rgba(0,0,0,0.5)";
            ctx.shadowBlur = Math.max(3, r * 0.4);
            ctx.shadowOffsetX = r * 0.18; ctx.shadowOffsetY = r * 0.28;
            ctx.fillStyle = "#706858";
            ctx.beginPath(); ctx.ellipse(0, -r*0.15, r*0.95, r*0.72, 0.2, 0, Math.PI*2); ctx.fill();
            ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
            // Light face
            ctx.fillStyle = "#8a806a";
            ctx.beginPath(); ctx.ellipse(-r*0.1, -r*0.32, r*0.62, r*0.44, 0, 0, Math.PI*2); ctx.fill();
            // Highlight
            ctx.fillStyle = "rgba(255,255,255,0.13)";
            ctx.beginPath(); ctx.ellipse(-r*0.28, -r*0.52, r*0.22, r*0.14, 0.4, 0, Math.PI*2); ctx.fill();
          }

          if (item.type === "wagon") {
            const r = item.radius;
            const ww = r * 2.2, wh = r * 1.3, elev = r * 0.8;
            const wheelR = r * 0.42;
            // Shadow
            ctx.fillStyle = "rgba(0,0,0,0.45)";
            ctx.beginPath(); ctx.ellipse(0, 0, r*1.8, r*0.7, 0, 0, Math.PI*2); ctx.fill();
            ctx.translate(0, -elev);
            // Wheels
            ctx.fillStyle = "#3a2008";
            for (const [wx, wy] of [[-r*0.85,r*0.35],[r*0.85,r*0.35],[-r*0.85,-r*0.25],[r*0.85,-r*0.25]]) {
              ctx.beginPath(); ctx.arc(wx, wy, wheelR, 0, Math.PI*2); ctx.fill();
              ctx.strokeStyle = "#1e0e04"; ctx.lineWidth = 0.8;
              for (let sp = 0; sp < 4; sp++) {
                const sa = (sp / 4) * Math.PI * 2;
                ctx.beginPath(); ctx.moveTo(wx, wy);
                ctx.lineTo(wx + Math.cos(sa)*wheelR*0.85, wy + Math.sin(sa)*wheelR*0.85); ctx.stroke();
              }
            }
            // Cargo bed
            ctx.fillStyle = "#7a4e28";
            ctx.fillRect(-ww/2, -wh - r*0.4, ww, wh);
            ctx.strokeStyle = "#4a2e10"; ctx.lineWidth = 1;
            ctx.strokeRect(-ww/2, -wh - r*0.4, ww, wh);
            // Planks
            ctx.strokeStyle = "#5c3a18"; ctx.lineWidth = 0.6;
            for (let p = 1; p < 4; p++) {
              const py = -wh - r*0.4 + (wh / 4) * p;
              ctx.beginPath(); ctx.moveTo(-ww/2, py); ctx.lineTo(ww/2, py); ctx.stroke();
            }
          }

          ctx.restore();
          continue;
        }

        const s = item;
        const def = UNIT_TYPES[s.typeId];
        const baseSz = s.typeId === "knights" ? 9.0
          : s.typeId === "lightCavalry" ? 8.5
          : s.typeId === "catapult"     ? 10.0
          : s.typeId === "heavyInf"     ? 7.5
          : 6.5;
        const depthScale = 0.5 + (s.y / MAP_H) * 0.55;
        const sz = baseSz * depthScale;

        let angle = 0;
        if (s.target) {
          angle = Math.atan2(s.target.y - s.y, s.target.x - s.x);
        } else {
          angle = s.team === "player" ? 0 : Math.PI;
        }

        ctx.save();
        ctx.translate(s.x, toSY(s.y));

        // 1. Shadow (at ground level) — soft radial gradient
        const shadowW = (s.typeId === "knights" || s.typeId === "lightCavalry") ? sz * 3.5
          : s.typeId === "catapult" ? sz * 4.5 : sz * 1.8;
        const shadowH = (s.typeId === "knights" || s.typeId === "lightCavalry") ? sz * 1.8
          : s.typeId === "catapult" ? sz * 2.2 : sz * 1.0;
        const shadowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, shadowW);
        shadowGrad.addColorStop(0, "rgba(0,0,0,0.55)");
        shadowGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.save();
        ctx.scale(1, shadowH / shadowW);
        ctx.fillStyle = shadowGrad;
        ctx.beginPath();
        ctx.arc(0, 0, shadowW, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 2. Elevate to draw standing body
        const elevation = (s.typeId === "knights" || s.typeId === "lightCavalry") ? sz * 3
          : s.typeId === "catapult" ? sz * 1.5 : sz * 2.5;
        ctx.translate(0, -elevation);

        // 3. Flip horizontally for facing direction
        const facingLeft = Math.abs(angle) > Math.PI / 2;
        if (facingLeft) ctx.scale(-1, 1);

        const teamColor = s.team === "player" ? def.color : `hsl(0,42%,${28 + (s.hp / s.maxHp) * 22}%)`;
        const strokeColor = s.team === "player" ? "rgba(120,170,255,0.4)" : "rgba(255,120,120,0.4)";

        ctx.fillStyle = teamColor;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1;

        if (s.typeId === "knights" || s.typeId === "lightCavalry") {
          const isLight = s.typeId === "lightCavalry";
          ctx.fillStyle = s.team === "player"
            ? (isLight ? "#8a6030" : "#6d4c41")
            : (isLight ? "#5a4020" : "#4e342e");
          ctx.beginPath();
          ctx.ellipse(0, sz, sz * (isLight ? 2.8 : 3.5), sz * 1.8, 0, 0, Math.PI * 2);
          ctx.fill();
          // Horse 3D shading: dark left flank, light highlight right
          ctx.fillStyle = "rgba(0,0,0,0.22)";
          ctx.beginPath();
          ctx.ellipse(-sz * (isLight ? 1.5 : 1.8), sz * 0.8, sz * (isLight ? 1.5 : 2.0), sz * 1.4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.08)";
          ctx.beginPath();
          ctx.ellipse(sz * 0.8, sz * 0.2, sz * (isLight ? 1.2 : 1.5), sz * 0.8, 0, 0, Math.PI * 2);
          ctx.fill();

          if (!isLight) {
            ctx.beginPath();
            ctx.ellipse(sz * 3, sz * 0.2, sz * 1.4, sz * 0.9, Math.PI/5, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.fillStyle = teamColor;
          ctx.fillRect(-sz, -sz, sz * 2, sz * 2.5);
          ctx.strokeRect(-sz, -sz, sz * 2, sz * 2.5);
          // Rider 3D shading
          ctx.fillStyle = "rgba(0,0,0,0.25)";
          ctx.fillRect(-sz, -sz, sz * 0.55, sz * 2.5);
          ctx.fillStyle = "rgba(255,255,255,0.12)";
          ctx.fillRect(sz * 0.65, -sz, sz * 0.35, sz * 2.5);

          ctx.fillStyle = teamColor;
          ctx.beginPath();
          ctx.arc(0, -sz * 1.5, sz * 0.9, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          // Head spherical highlight
          const kHdGrad = ctx.createRadialGradient(-sz * 0.25, -sz * 2.05, 0, 0, -sz * 1.5, sz * 0.9);
          kHdGrad.addColorStop(0, "rgba(255,255,255,0.28)");
          kHdGrad.addColorStop(1, "rgba(0,0,0,0.2)");
          ctx.fillStyle = kHdGrad;
          ctx.beginPath();
          ctx.arc(0, -sz * 1.5, sz * 0.9, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          if (isLight) {
            ctx.moveTo(-sz * 0.5, sz * 0.3);
            ctx.lineTo(sz * 4.5, -sz * 0.8);
          } else {
            ctx.moveTo(-sz, sz * 0.5);
            ctx.lineTo(sz * 7, sz * 0.5);
          }
          ctx.strokeStyle = s.team === "player" ? "#a0c0ff" : "#ffa0a0";
          ctx.lineWidth = 1.5;
          ctx.stroke();

        } else if (s.typeId === "catapult") {
          // Base frame
          ctx.fillStyle = s.team === "player" ? "#7a5020" : "#5a3010";
          ctx.fillRect(-sz * 3, -sz * 0.3, sz * 6, sz * 1.2);
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 1;
          ctx.strokeRect(-sz * 3, -sz * 0.3, sz * 6, sz * 1.2);

          // Throwing arm
          ctx.strokeStyle = "#a07040";
          ctx.lineWidth = sz * 0.7;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(-sz * 1.5, -sz * 0.3);
          ctx.lineTo(sz * 4, -sz * 2.5);
          ctx.stroke();
          ctx.lineCap = "butt";

          // Boulder in sling
          ctx.fillStyle = "#606060";
          ctx.beginPath();
          ctx.arc(sz * 4, -sz * 2.5, sz * 1.0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 1;
          ctx.stroke();
          // Boulder spherical highlight
          const bldGrad = ctx.createRadialGradient(sz * 3.4, -sz * 3.1, 0, sz * 4, -sz * 2.5, sz);
          bldGrad.addColorStop(0, "rgba(210,210,210,0.4)");
          bldGrad.addColorStop(1, "rgba(0,0,0,0.28)");
          ctx.fillStyle = bldGrad;
          ctx.beginPath();
          ctx.arc(sz * 4, -sz * 2.5, sz * 1.0, 0, Math.PI * 2);
          ctx.fill();

        } else {
          const bodyW = sz * 1.8;
          const bodyH = sz * 2.8;

          ctx.fillRect(-bodyW/2, -bodyH/2, bodyW, bodyH);
          ctx.strokeRect(-bodyW/2, -bodyH/2, bodyW, bodyH);
          // Body 3D shading: shadow left, highlight right
          ctx.fillStyle = "rgba(0,0,0,0.28)";
          ctx.fillRect(-bodyW/2, -bodyH/2, bodyW * 0.3, bodyH);
          ctx.fillStyle = "rgba(255,255,255,0.12)";
          ctx.fillRect(bodyW/2 - bodyW * 0.22, -bodyH/2, bodyW * 0.22, bodyH);

          ctx.fillStyle = teamColor;
          ctx.beginPath();
          ctx.arc(0, -bodyH/2 - sz * 0.9, sz, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          // Head spherical highlight
          const headHl = ctx.createRadialGradient(-sz * 0.3, -bodyH/2 - sz * 1.45, 0, 0, -bodyH/2 - sz * 0.9, sz);
          headHl.addColorStop(0, "rgba(255,255,255,0.3)");
          headHl.addColorStop(1, "rgba(0,0,0,0.22)");
          ctx.fillStyle = headHl;
          ctx.beginPath();
          ctx.arc(0, -bodyH/2 - sz * 0.9, sz, 0, Math.PI * 2);
          ctx.fill();

          if (s.typeId === "spearmen") {
            ctx.beginPath();
            ctx.moveTo(-sz, 0);
            ctx.lineTo(sz * 5.5, 0);
            ctx.strokeStyle = "#8b7355";
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(sz * 5.5, 0);
            ctx.lineTo(sz * 6.5, 0);
            ctx.strokeStyle = "#e0e0e0";
            ctx.lineWidth = 2;
            ctx.stroke();
          } else if (s.typeId === "heavyInf") {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(sz * 3.5, -sz);
            ctx.strokeStyle = "#e0e0e0";
            ctx.lineWidth = 1.8;
            ctx.stroke();

            const shieldBase = s.team === "player" ? "#3a4a5a" : "#5a2a2a";
            const shieldGrad = ctx.createLinearGradient(sz * 0.2, 0, sz * 1.4, 0);
            shieldGrad.addColorStop(0, shieldBase);
            shieldGrad.addColorStop(0.4, s.team === "player" ? "#4a5e72" : "#6e3a3a");
            shieldGrad.addColorStop(1, s.team === "player" ? "#2a3848" : "#4a2020");
            ctx.fillStyle = shieldGrad;
            ctx.fillRect(sz * 0.2, -bodyH/2, sz * 1.2, bodyH * 1.2);
            ctx.strokeRect(sz * 0.2, -bodyH/2, sz * 1.2, bodyH * 1.2);
            // Shield rim highlight
            ctx.fillStyle = "rgba(255,255,255,0.12)";
            ctx.fillRect(sz * 0.2, -bodyH/2, sz * 0.18, bodyH * 1.2);
          } else if (s.typeId === "militia") {
            ctx.beginPath();
            ctx.moveTo(-sz, sz);
            ctx.lineTo(sz * 3.5, -sz * 1.5);
            ctx.strokeStyle = "#795548";
            ctx.lineWidth = 1.5;
            ctx.stroke();
          } else if (s.typeId === "archers") {
            ctx.beginPath();
            ctx.arc(sz * 1.5, 0, sz * 1.8, -Math.PI/2.5, Math.PI/2.5);
            ctx.strokeStyle = "#5c4033";
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(sz * 1.5 + Math.cos(-Math.PI/2.5)*sz*1.8, Math.sin(-Math.PI/2.5)*sz*1.8);
            ctx.lineTo(sz * 1.5 + Math.cos(Math.PI/2.5)*sz*1.8, Math.sin(Math.PI/2.5)*sz*1.8);
            ctx.strokeStyle = "rgba(200,200,200,0.6)";
            ctx.lineWidth = 0.8;
            ctx.stroke();
          } else if (s.typeId === "musketeer") {
            // Long barrel
            ctx.beginPath();
            ctx.moveTo(-sz * 0.8, sz * 0.1);
            ctx.lineTo(sz * 6.5, sz * 0.1);
            ctx.strokeStyle = "#808080";
            ctx.lineWidth = 1.8;
            ctx.stroke();
            // Wooden stock
            ctx.fillStyle = "#5c3a18";
            ctx.fillRect(-sz * 0.8, sz * 0.1, sz * 2.5, sz * 0.6);
          }
        }

        ctx.restore();

        // HP bar (drawn un-rotated, in screen space)
        if (s.hp < s.maxHp) {
          const bw = Math.max(8, Math.round(sz * 2.2)), bh = 2, r = Math.max(0, s.hp / s.maxHp);
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(s.x - bw / 2, toSY(s.y) - elevation - sz * 3.5, bw, bh);
          ctx.fillStyle = r > 0.5 ? "#5a5" : r > 0.25 ? "#aa5" : "#a44";
          ctx.fillRect(s.x - bw / 2, toSY(s.y) - elevation - sz * 3.5, bw * r, bh);
        }
      }

      ctx.font = "11px monospace";
      ctx.fillStyle = "#8ab4f8"; ctx.fillText(`아군: ${pA.length}`, 10, H - 8);
      ctx.fillStyle = "#f88a8a"; ctx.fillText(`적군: ${eA.length}`, W - 80, H - 8);
      ctx.fillStyle = "#777"; ctx.fillText(`${G.time.toFixed(1)}s  공식${formula}`, W / 2 - 40, H - 8);

      afRef.current = requestAnimationFrame(loop);
    };
    soundRef?.current?.play('battleStart');
    afRef.current = requestAnimationFrame(loop);
    return () => { if (afRef.current) cancelAnimationFrame(afRef.current); };
  }, [formula, speed, setPhase, setResult, setStats, setBattleResult, gRef]);

  const canvasStyle = {
    border: `1px solid ${c.bd}`, borderRadius: 3, display: "block",
    width: "100%", maxWidth: MAP_W, height: "auto", aspectRatio: `${MAP_W}/${RENDER_H}`,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: MAP_W }}>
      <div style={{ display: "flex", gap: 5, marginBottom: 3 }}>
        <span style={{ fontSize: 9, color: c.dm }}>속도:</span>
        {[1, 2, 4].map(s => (
          <button key={s} onClick={() => setSpeed(s)} style={{
            padding: "1px 7px",
            border: `1px solid ${speed === s ? c.gl : c.bd}`, borderRadius: 3,
            background: speed === s ? `${c.gl}14` : "transparent",
            color: speed === s ? c.gl : c.dm, cursor: "pointer", fontSize: 10,
          }}>×{s}</button>
        ))}
        <button onClick={() => setMuted(m => !m)} style={{
          padding: "1px 7px",
          border: `1px solid ${c.bd}`, borderRadius: 3,
          background: "transparent",
          color: c.dm, cursor: "pointer", fontSize: 10,
        }}>{muted ? '🔇' : '🔊'}</button>
      </div>
      <canvas
        ref={cvRef}
        width={MAP_W}
        height={RENDER_H}
        style={canvasStyle}
      />
    </div>
  );
}
