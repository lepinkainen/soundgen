import { progressions, drumPatterns, STEPS_PER_BAR } from "./config.js";
import { setupAudioGraph } from "./audio.js";
import { scheduleStep } from "./sequencer.js";
import { elements, initializeUi, updateStatus } from "./ui.js";

const state = {
  isPlaying: false,
  audioCtx: null,
  nodes: null,
  schedulerId: null,
  tempo: Number(elements.tempo.value),
  stepDuration: 60 / Number(elements.tempo.value) / 4,
  intensity: Number(elements.intensity.value) / 100,
  waveform: elements.waveform.value,
  drumsEnabled: elements.drums.checked,
  progression:
    progressions[elements.progression.value] || progressions["vi-IV-I-V"],
  drumPattern:
    drumPatterns[Number(elements.drumPattern.value)] || drumPatterns[1],
  nextNoteTime: 0,
  currentStep: 0,
  lookaheadMs: 30,
  scheduleAheadTime: 0.15,
};

function updateMasterVolume() {
  if (!state.nodes || !state.nodes.masterGain) {
    return;
  }
  const now = state.audioCtx.currentTime;
  const target = 0.4 + state.intensity * 0.35;
  state.nodes.masterGain.gain.cancelScheduledValues(now);
  state.nodes.masterGain.gain.setTargetAtTime(target, now, 0.08);
}

function schedulerTick() {
  if (!state.audioCtx || !state.isPlaying) {
    return;
  }
  const ctx = state.audioCtx;
  while (state.nextNoteTime < ctx.currentTime + state.scheduleAheadTime) {
    scheduleStep(state, state.currentStep, state.nextNoteTime);
    state.nextNoteTime += state.stepDuration;
    const cycleLength = STEPS_PER_BAR * state.progression.length;
    state.currentStep = (state.currentStep + 1) % cycleLength;
  }
}

async function startPlayback() {
  if (state.isPlaying) {
    return;
  }
  let nodes;
  try {
    nodes = setupAudioGraph();
    await nodes.audioCtx.resume();
  } catch (error) {
    console.error(error);
    updateStatus("Audio initialization failed. Try a different browser.");
    return;
  }
  state.audioCtx = nodes.audioCtx;
  state.nodes = nodes;
  state.isPlaying = true;
  state.currentStep = 0;
  state.stepDuration = 60 / state.tempo / 4;

  // Randomly select a progression and drum pattern
  const progressionKeys = Object.keys(progressions);
  const randomProgressionKey =
    progressionKeys[Math.floor(Math.random() * progressionKeys.length)];
  state.progression = progressions[randomProgressionKey];
  state.drumPattern =
    drumPatterns[Math.floor(Math.random() * drumPatterns.length)];

  state.nextNoteTime = state.audioCtx.currentTime + 0.1;
  updateMasterVolume();
  updateStatus(state);
  elements.toggle.textContent = "Stop";
  state.schedulerId = setInterval(schedulerTick, state.lookaheadMs);
}

async function stopPlayback() {
  if (!state.isPlaying) {
    return;
  }
  state.isPlaying = false;
  elements.toggle.textContent = "Start";
  updateStatus(state);
  if (state.schedulerId) {
    clearInterval(state.schedulerId);
    state.schedulerId = null;
  }
  if (state.audioCtx && state.nodes && state.nodes.masterGain) {
    const now = state.audioCtx.currentTime;
    state.nodes.masterGain.gain.cancelScheduledValues(now);
    state.nodes.masterGain.gain.setTargetAtTime(0.0001, now, 0.12);
  }
  const ctx = state.audioCtx;
  state.audioCtx = null;
  state.nodes = null;
  try {
    if (ctx) {
      await ctx.close();
    }
  } catch {
    // ignored
  } finally {
    updateStatus(state);
  }
}

initializeUi(state, {
  startPlayback,
  stopPlayback,
  updateMasterVolume,
});
