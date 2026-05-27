import { useRef, useState, useEffect } from "react";

const THROTTLE_SEC = {
  meleeHit:    0.060,
  chargeBlow:  0.600,
  arrowFire:   0.080,
  musketFire:  0.080,
  siegeImpact: 0.400,
  unitDeath:   0.080,
  battleStart: 0,
  victory:     0,
  defeat:      0,
};

function makeNoise(ctx, duration) {
  const bufSize = Math.ceil(ctx.sampleRate * duration);
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  return src;
}

function playMeleeHit(ctx, dest, gainMult, extraDur) {
  const dur = 0.090 + extraDur;
  const t = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(220, t);
  osc.frequency.linearRampToValueAtTime(120, t + dur);
  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(0.4 * gainMult, t);
  oscGain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(oscGain); oscGain.connect(dest);
  osc.start(t); osc.stop(t + dur);

  const noise = makeNoise(ctx, dur);
  const nf = ctx.createBiquadFilter();
  nf.type = "lowpass"; nf.frequency.value = 400;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.3 * gainMult, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + dur);
  noise.connect(nf); nf.connect(ng); ng.connect(dest);
  noise.start(t); noise.stop(t + dur);
}

function playArrowFire(ctx, dest) {
  const dur = 0.120;
  const t = ctx.currentTime;
  const noise = makeNoise(ctx, dur);
  const f = ctx.createBiquadFilter();
  f.type = "bandpass"; f.frequency.value = 1400; f.Q.value = 1.2;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.5, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  noise.connect(f); f.connect(g); g.connect(dest);
  noise.start(t); noise.stop(t + dur);
}

function playMusketFire(ctx, dest) {
  const dur = 0.100;
  const t = ctx.currentTime;

  const noise = makeNoise(ctx, dur);
  const f = ctx.createBiquadFilter();
  f.type = "bandpass"; f.frequency.value = 1500; f.Q.value = 0.5;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.8, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + dur);
  noise.connect(f); f.connect(ng); ng.connect(dest);
  noise.start(t); noise.stop(t + dur);

  const osc = ctx.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(800, t);
  osc.frequency.linearRampToValueAtTime(200, t + dur * 0.5);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.3, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.5);
  osc.connect(og); og.connect(dest);
  osc.start(t); osc.stop(t + dur);
}

function playSiegeImpact(ctx, dest) {
  const dur = 0.700;
  const t = ctx.currentTime;

  const noise = makeNoise(ctx, dur);
  const f = ctx.createBiquadFilter();
  f.type = "lowpass"; f.frequency.value = 80;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(1.0, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + dur);
  noise.connect(f); f.connect(ng); ng.connect(dest);
  noise.start(t); noise.stop(t + dur);

  const osc = ctx.createOscillator();
  osc.type = "sine"; osc.frequency.value = 55;
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.8, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(og); og.connect(dest);
  osc.start(t); osc.stop(t + dur);
}

function playUnitDeath(ctx, dest) {
  const dur = 0.200;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(400, t);
  osc.frequency.linearRampToValueAtTime(80, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.3, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(g); g.connect(dest);
  osc.start(t); osc.stop(t + dur);
}

const NOTES = { C4: 261.63, E4: 329.63, G4: 392.00, C5: 523.25, E5: 659.25 };

function playArpeggio(ctx, dest, notes, noteLen, gain) {
  const t = ctx.currentTime;
  notes.forEach((freq, i) => {
    const st = t + i * noteLen;
    const osc = ctx.createOscillator();
    osc.type = "triangle"; osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, st);
    g.gain.exponentialRampToValueAtTime(0.001, st + noteLen);
    osc.connect(g); g.connect(dest);
    osc.start(st); osc.stop(st + noteLen);
  });
}

function playBattleStart(ctx, dest) {
  playArpeggio(ctx, dest, [NOTES.C4, NOTES.E4, NOTES.G4, NOTES.C5], 0.15, 0.4);
}

function playVictory(ctx, dest) {
  playArpeggio(ctx, dest, [NOTES.C4, NOTES.E4, NOTES.G4, NOTES.C5, NOTES.E5], 0.18, 0.5);
}

function playDefeat(ctx, dest) {
  const dur = 1.200;
  const t = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(300, t);
  osc.frequency.linearRampToValueAtTime(80, t + dur);

  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(0.5, t);
  oscGain.gain.linearRampToValueAtTime(0.0, t + dur);

  const lfo = ctx.createOscillator();
  lfo.type = "sine"; lfo.frequency.value = 6;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.2;
  lfo.connect(lfoGain); lfoGain.connect(oscGain.gain);

  osc.connect(oscGain); oscGain.connect(dest);
  osc.start(t); lfo.start(t);
  osc.stop(t + dur); lfo.stop(t + dur);
}

export function useSoundEngine() {
  const [muted, setMuted] = useState(false);
  const soundRef   = useRef(null);
  const ctxRef     = useRef(null);
  const masterRef  = useRef(null);
  const throttleMap = useRef(new Map());

  useEffect(() => {
    soundRef.current = {
      resume() {
        if (!ctxRef.current) {
          const AC = window.AudioContext || window.webkitAudioContext;
          ctxRef.current = new AC();
          const master = ctxRef.current.createGain();
          master.gain.value = 1;
          master.connect(ctxRef.current.destination);
          masterRef.current = master;
        }
        if (ctxRef.current.state === "suspended") {
          ctxRef.current.resume();
        }
      },
      play(id) {
        if (!ctxRef.current || !masterRef.current) return;
        const ctx = ctxRef.current;
        const dest = masterRef.current;
        const now = ctx.currentTime;
        const throttleSec = THROTTLE_SEC[id];
        if (throttleSec > 0) {
          const last = throttleMap.current.get(id) ?? -Infinity;
          if (now - last < throttleSec) return;
        }
        throttleMap.current.set(id, now);
        switch (id) {
          case "meleeHit":    playMeleeHit(ctx, dest, 1, 0); break;
          case "chargeBlow":  playMeleeHit(ctx, dest, 2, 0.150); break;
          case "arrowFire":   playArrowFire(ctx, dest); break;
          case "musketFire":  playMusketFire(ctx, dest); break;
          case "siegeImpact": playSiegeImpact(ctx, dest); break;
          case "unitDeath":   playUnitDeath(ctx, dest); break;
          case "battleStart": playBattleStart(ctx, dest); break;
          case "victory":     playVictory(ctx, dest); break;
          case "defeat":      playDefeat(ctx, dest); break;
        }
      },
    };
  }, []);

  useEffect(() => {
    if (masterRef.current) {
      masterRef.current.gain.value = muted ? 0 : 1;
    }
  }, [muted]);

  return { soundRef, muted, setMuted };
}
