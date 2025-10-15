import {
  triggerSynthVoice,
  triggerKick,
  triggerSnare,
  triggerHat,
} from "./synthesis.js";
import { STEPS_PER_BAR, keyScale } from "./config.js";

function scheduleBass(state, stepInBar, time, pattern) {
  const intensity = state.intensity;
  const shouldPlayQuarter = stepInBar % 4 === 0;
  const shouldPlayEighth = intensity > 0.4 && stepInBar % 4 === 2;
  if (!shouldPlayQuarter && !shouldPlayEighth) {
    return;
  }
  const octaveShift = intensity > 0.7 && Math.random() < 0.3 ? 12 : 0;
  const velocity = 0.22 + intensity * 0.25;
  const duration = state.stepDuration * (shouldPlayQuarter ? 3.5 : 2);
  triggerSynthVoice(state, {
    midi: pattern.bass + octaveShift,
    time,
    duration,
    waveform: "sawtooth",
    detuneSpread: 6,
    gain: velocity,
    filterFreq: 420 + intensity * 480,
    filterQ: 1.2,
    envelope: { attack: 0.01, decay: 0.25, sustain: 0.5, release: 0.3 },
    reverbSend: 0.15,
    delaySend: 0.1,
    pan: -0.1,
  });
}

function scheduleLead(state, stepInBar, time, pattern) {
  if (stepInBar % 2 !== 0) {
    return;
  }
  const intensity = state.intensity;
  const probability = 0.35 + intensity * 0.45;
  if (Math.random() > probability) {
    return;
  }
  const pool = [
    ...pattern.chord.map((note) => note + 12),
    ...pattern.chord.map((note) => note + 19),
    ...keyScale,
  ];
  const midi = pool[Math.floor(Math.random() * pool.length)];
  const duration = state.stepDuration * (Math.random() < 0.5 ? 2 : 3);
  const filterFreq = 1200 + intensity * 1400;
  triggerSynthVoice(state, {
    midi,
    time,
    duration,
    waveform: state.waveform,
    detuneSpread: 8 + intensity * 10,
    gain: 0.12 + intensity * 0.18,
    filterFreq,
    filterQ: 0.7,
    envelope: { attack: 0.015, decay: 0.18, sustain: 0.5, release: 0.28 },
    reverbSend: 0.55,
    delaySend: 0.45 + intensity * 0.2,
    pan: (Math.random() - 0.5) * 1.2,
  });
}

function schedulePad(state, stepInBar, time, pattern) {
  if (stepInBar !== 0) {
    return;
  }
  const chordDuration = state.stepDuration * STEPS_PER_BAR * 0.95;
  pattern.chord.forEach((note, index) => {
    triggerSynthVoice(state, {
      midi: note,
      time,
      duration: chordDuration,
      waveform: "triangle",
      detuneSpread: 4 + index * 2,
      gain: 0.08 + index * 0.02,
      filterFreq: 900 + state.intensity * 600,
      filterQ: 0.6,
      envelope: { attack: 0.6, decay: 0.7, sustain: 0.75, release: 1.4 },
      reverbSend: 0.65,
      delaySend: 0.28,
      pan: index === 0 ? -0.25 : index === 1 ? 0 : 0.25,
    });
  });
}

function scheduleDrums(state, stepInBar, time) {
  const pattern = state.drumPattern;
  if (pattern.kick.includes(stepInBar)) {
    triggerKick(state, time);
  }
  if (pattern.snare.includes(stepInBar)) {
    triggerSnare(state, time);
  }
  if (pattern.hat.includes(stepInBar)) {
    const probability = 0.5 + state.intensity * 0.4;
    if (Math.random() < probability) {
      triggerHat(
        state,
        time,
        state.stepDuration * (Math.random() < 0.3 ? 1.4 : 0.9)
      );
    }
  }
}

export function scheduleStep(state, stepIndex, time) {
  const barIndex =
    Math.floor(stepIndex / STEPS_PER_BAR) % state.progression.length;
  const stepInBar = stepIndex % STEPS_PER_BAR;
  const pattern = state.progression[barIndex];
  scheduleBass(state, stepInBar, time, pattern);
  schedulePad(state, stepInBar, time, pattern);
  scheduleLead(state, stepInBar, time, pattern);
  if (state.drumsEnabled) {
    scheduleDrums(state, stepInBar, time);
  }
}
