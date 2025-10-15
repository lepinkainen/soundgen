const elements = {
  toggle: document.getElementById('toggle'),
  tempo: document.getElementById('tempo'),
  tempoValue: document.getElementById('tempo-value'),
  intensity: document.getElementById('intensity'),
  intensityValue: document.getElementById('intensity-value'),
  waveform: document.getElementById('waveform'),
  drums: document.getElementById('drums-enabled'),
  status: document.getElementById('status'),
};

const WAVEFORMS = ['sawtooth', 'square', 'triangle'];

function parseSettingsFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const settings = {};
  const tempoParam = params.get('tempo');
  const intensityParam = params.get('intensity');
  const waveformParam = params.get('waveform');
  const drumsParam = params.get('drums');

  const tempoValue = Number(tempoParam);
  if (
    Number.isFinite(tempoValue)
    && tempoValue >= Number(elements.tempo.min)
    && tempoValue <= Number(elements.tempo.max)
  ) {
    settings.tempo = Math.round(tempoValue);
  }

  const intensityValue = Number(intensityParam);
  if (Number.isFinite(intensityValue) && intensityValue >= 0 && intensityValue <= 100) {
    settings.intensity = Math.round(intensityValue);
  }

  if (waveformParam && WAVEFORMS.includes(waveformParam)) {
    settings.waveform = waveformParam;
  }

  if (typeof drumsParam === 'string') {
    const normalized = drumsParam.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
      settings.drumsEnabled = true;
    } else if (['0', 'false', 'no', 'off'].includes(normalized)) {
      settings.drumsEnabled = false;
    }
  }

  return settings;
}

const initialSettings = parseSettingsFromUrl();
if (initialSettings.tempo !== undefined) {
  elements.tempo.value = String(initialSettings.tempo);
}
if (initialSettings.intensity !== undefined) {
  elements.intensity.value = String(initialSettings.intensity);
}
if (initialSettings.waveform !== undefined) {
  elements.waveform.value = initialSettings.waveform;
}
if (initialSettings.drumsEnabled !== undefined) {
  elements.drums.checked = initialSettings.drumsEnabled;
}

const progression = [
  { name: 'Am', chord: [57, 60, 64], bass: 45 },
  { name: 'F', chord: [53, 57, 60], bass: 41 },
  { name: 'C', chord: [60, 64, 67], bass: 48 },
  { name: 'G', chord: [55, 59, 62], bass: 43 },
];

const keyScale = [57, 59, 60, 62, 64, 65, 67, 69, 71];
const STEPS_PER_BAR = 16;

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
  nextNoteTime: 0,
  currentStep: 0,
  lookaheadMs: 30,
  scheduleAheadTime: 0.15,
};

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function createReverbBuffer(ctx, duration = 2.6) {
  const length = Math.floor(duration * ctx.sampleRate);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      const decay = Math.pow(1 - i / length, 2.5);
      data[i] = (Math.random() * 2 - 1) * decay;
    }
  }
  return impulse;
}

function createNoiseBuffer(ctx, duration = 1) {
  const length = Math.floor(duration * ctx.sampleRate);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function setupAudioGraph() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    throw new Error('Web Audio API is not supported in this browser.');
  }
  const audioCtx = new AudioCtx();
  const masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.55;

  const compressor = audioCtx.createDynamicsCompressor();
  compressor.threshold.value = -22;
  compressor.ratio.value = 2.5;
  compressor.knee.value = 18;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;
  masterGain.connect(compressor);
  compressor.connect(audioCtx.destination);

  const reverbInput = audioCtx.createGain();
  const reverb = audioCtx.createConvolver();
  reverb.buffer = createReverbBuffer(audioCtx, 2.9);
  const reverbMix = audioCtx.createGain();
  reverbMix.gain.value = 0.35;
  reverbInput.connect(reverb);
  reverb.connect(reverbMix);
  reverbMix.connect(masterGain);

  const delayInput = audioCtx.createGain();
  const delay = audioCtx.createDelay(1.5);
  delay.delayTime.value = 0.28;
  const delayFeedback = audioCtx.createGain();
  delayFeedback.gain.value = 0.35;
  const delayMix = audioCtx.createGain();
  delayMix.gain.value = 0.3;
  delayInput.connect(delay);
  delay.connect(delayFeedback);
  delayFeedback.connect(delay);
  delay.connect(delayMix);
  delayMix.connect(masterGain);

  const noiseBuffer = createNoiseBuffer(audioCtx, 1.5);

  return {
    audioCtx,
    masterGain,
    reverbInput,
    delayInput,
    noiseBuffer,
  };
}

function updateStatus(message) {
  if (message) {
    elements.status.textContent = message;
    return;
  }
  if (!state.isPlaying) {
    elements.status.textContent = 'Tap Start to begin.';
    return;
  }
  const parts = [
    'Playing',
    `${state.tempo} BPM`,
    `Intensity ${Math.round(state.intensity * 100)}%`,
    state.drumsEnabled ? 'Drums on' : 'Drums off',
    `Waveform ${state.waveform}`,
  ];
  elements.status.textContent = parts.join(' | ');
}

function syncUrlFromState() {
  const url = new URL(window.location.href);
  url.searchParams.set('tempo', String(state.tempo));
  const intensityPercent = Math.round(Number(elements.intensity.value));
  url.searchParams.set('intensity', String(Math.max(0, Math.min(100, intensityPercent))));
  url.searchParams.set('waveform', state.waveform);
  url.searchParams.set('drums', state.drumsEnabled ? '1' : '0');
  history.replaceState(null, '', url.toString());
}

function updateDisplayValues() {
  elements.tempoValue.textContent = `${state.tempo} BPM`;
  elements.intensityValue.textContent = `${Math.round(state.intensity * 100)}%`;
  updateStatus();
  syncUrlFromState();
}

function updateMasterVolume() {
  if (!state.nodes || !state.nodes.masterGain) {
    return;
  }
  const now = state.audioCtx.currentTime;
  const target = 0.4 + state.intensity * 0.35;
  state.nodes.masterGain.gain.cancelScheduledValues(now);
  state.nodes.masterGain.gain.setTargetAtTime(target, now, 0.08);
}

function triggerSynthVoice({
  midi,
  time,
  duration,
  waveform = state.waveform,
  detune = 0,
  detuneSpread = 12,
  gain = 0.3,
  filterFreq = 1200,
  filterQ = 0.8,
  envelope = { attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.4 },
  reverbSend = 0.4,
  delaySend = 0.35,
  pan = 0,
}) {
  if (!state.isPlaying || !state.audioCtx || !state.nodes) {
    return;
  }
  const ctx = state.audioCtx;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  osc1.type = waveform;
  osc2.type = waveform;
  const baseFreq = midiToFreq(midi);
  osc1.frequency.setValueAtTime(baseFreq, time);
  osc2.frequency.setValueAtTime(baseFreq, time);
  const halfSpread = detuneSpread / 2;
  osc1.detune.setValueAtTime(detune + halfSpread, time);
  osc2.detune.setValueAtTime(detune - halfSpread, time);

  const voiceGain = ctx.createGain();
  voiceGain.gain.setValueAtTime(0, time);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.setValueAtTime(filterQ, time);
  filter.frequency.setValueAtTime(filterFreq, time);

  const panNode = ctx.createStereoPanner();
  panNode.pan.setValueAtTime(pan, time);

  osc1.connect(voiceGain);
  osc2.connect(voiceGain);
  voiceGain.connect(filter);
  filter.connect(panNode);
  panNode.connect(state.nodes.masterGain);

  if (reverbSend > 0.001) {
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = reverbSend;
    panNode.connect(reverbGain);
    reverbGain.connect(state.nodes.reverbInput);
  }

  if (delaySend > 0.001) {
    const delayGain = ctx.createGain();
    delayGain.gain.value = delaySend;
    panNode.connect(delayGain);
    delayGain.connect(state.nodes.delayInput);
  }

  const attackEnd = time + envelope.attack;
  voiceGain.gain.linearRampToValueAtTime(gain, attackEnd);
  const decayEnd = attackEnd + envelope.decay;
  voiceGain.gain.linearRampToValueAtTime(gain * envelope.sustain, decayEnd);
  const releaseStart = time + Math.max(envelope.attack + envelope.decay, duration);
  voiceGain.gain.setTargetAtTime(0, releaseStart, Math.max(0.05, envelope.release));

  const stopTime = releaseStart + envelope.release * 3;
  osc1.start(time);
  osc2.start(time);
  osc1.stop(stopTime);
  osc2.stop(stopTime);
}

function triggerKick(time) {
  if (!state.audioCtx || !state.nodes) {
    return;
  }
  const ctx = state.audioCtx;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(1, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.5);
  osc.frequency.setValueAtTime(140, time);
  osc.frequency.exponentialRampToValueAtTime(36, time + 0.35);
  osc.connect(gain);
  gain.connect(state.nodes.masterGain);

  const click = ctx.createOscillator();
  const clickGain = ctx.createGain();
  click.type = 'triangle';
  click.frequency.setValueAtTime(200, time);
  clickGain.gain.setValueAtTime(0.2, time);
  clickGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.08);
  click.connect(clickGain);
  clickGain.connect(state.nodes.masterGain);

  osc.start(time);
  osc.stop(time + 0.6);
  click.start(time);
  click.stop(time + 0.15);
}

function triggerSnare(time) {
  if (!state.audioCtx || !state.nodes) {
    return;
  }
  const ctx = state.audioCtx;
  const noise = ctx.createBufferSource();
  noise.buffer = state.nodes.noiseBuffer;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.setValueAtTime(1800, time);
  noiseFilter.Q.setValueAtTime(1.2, time);
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.7, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.25);
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(state.nodes.masterGain);

  const tone = ctx.createOscillator();
  tone.type = 'triangle';
  tone.frequency.setValueAtTime(180, time);
  const toneGain = ctx.createGain();
  toneGain.gain.setValueAtTime(0.3, time);
  toneGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.2);
  tone.connect(toneGain);
  toneGain.connect(state.nodes.masterGain);

  const reverbGain = ctx.createGain();
  reverbGain.gain.value = 0.3;
  noiseGain.connect(reverbGain);
  reverbGain.connect(state.nodes.reverbInput);

  noise.start(time);
  noise.stop(time + 0.3);
  tone.start(time);
  tone.stop(time + 0.25);
}

function triggerHat(time, duration) {
  if (!state.audioCtx || !state.nodes) {
    return;
  }
  const ctx = state.audioCtx;
  const noise = ctx.createBufferSource();
  noise.buffer = state.nodes.noiseBuffer;
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.setValueAtTime(6000, time);
  highpass.Q.setValueAtTime(0.7, time);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.3, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  noise.connect(highpass);
  highpass.connect(gain);
  gain.connect(state.nodes.masterGain);
  noise.start(time);
  noise.stop(time + duration);
}

function scheduleBass(stepInBar, time, pattern) {
  const intensity = state.intensity;
  const shouldPlayQuarter = stepInBar % 4 === 0;
  const shouldPlayEighth = intensity > 0.4 && stepInBar % 4 === 2;
  if (!shouldPlayQuarter && !shouldPlayEighth) {
    return;
  }
  const octaveShift = intensity > 0.7 && Math.random() < 0.3 ? 12 : 0;
  const velocity = 0.22 + intensity * 0.25;
  const duration = state.stepDuration * (shouldPlayQuarter ? 3.5 : 2);
  triggerSynthVoice({
    midi: pattern.bass + octaveShift,
    time,
    duration,
    waveform: 'sawtooth',
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

function scheduleLead(stepInBar, time, pattern) {
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
  triggerSynthVoice({
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

function schedulePad(stepInBar, time, pattern) {
  if (stepInBar !== 0) {
    return;
  }
  const chordDuration = state.stepDuration * STEPS_PER_BAR * 0.95;
  pattern.chord.forEach((note, index) => {
    triggerSynthVoice({
      midi: note,
      time,
      duration: chordDuration,
      waveform: 'triangle',
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

function scheduleDrums(stepInBar, time) {
  if (stepInBar === 0 || (stepInBar === 8 && state.intensity > 0.5)) {
    triggerKick(time);
  }
  if (stepInBar === 4 || stepInBar === 12) {
    triggerSnare(time);
  }
  if (stepInBar % 2 === 0) {
    const probability = 0.5 + state.intensity * 0.4;
    if (Math.random() < probability) {
      triggerHat(time, state.stepDuration * (Math.random() < 0.3 ? 1.4 : 0.9));
    }
  }
}

function scheduleStep(stepIndex, time) {
  const barIndex = Math.floor(stepIndex / STEPS_PER_BAR) % progression.length;
  const stepInBar = stepIndex % STEPS_PER_BAR;
  const pattern = progression[barIndex];
  scheduleBass(stepInBar, time, pattern);
  schedulePad(stepInBar, time, pattern);
  scheduleLead(stepInBar, time, pattern);
  if (state.drumsEnabled) {
    scheduleDrums(stepInBar, time);
  }
}

function schedulerTick() {
  if (!state.audioCtx || !state.isPlaying) {
    return;
  }
  const ctx = state.audioCtx;
  while (state.nextNoteTime < ctx.currentTime + state.scheduleAheadTime) {
    scheduleStep(state.currentStep, state.nextNoteTime);
    state.nextNoteTime += state.stepDuration;
    const cycleLength = STEPS_PER_BAR * progression.length;
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
    updateStatus('Audio initialization failed. Try a different browser.');
    return;
  }
  state.audioCtx = nodes.audioCtx;
  state.nodes = nodes;
  state.isPlaying = true;
  state.currentStep = 0;
  state.stepDuration = 60 / state.tempo / 4;
  state.nextNoteTime = state.audioCtx.currentTime + 0.1;
  updateMasterVolume();
  updateStatus();
  elements.toggle.textContent = 'Stop';
  state.schedulerId = setInterval(schedulerTick, state.lookaheadMs);
}

async function stopPlayback() {
  if (!state.isPlaying) {
    return;
  }
  state.isPlaying = false;
  elements.toggle.textContent = 'Start';
  updateStatus('Stopping...');
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
    updateStatus();
  }
}

elements.toggle.addEventListener('click', () => {
  if (state.isPlaying) {
    stopPlayback();
  } else {
    startPlayback();
  }
});

elements.tempo.addEventListener('input', () => {
  state.tempo = Number(elements.tempo.value);
  state.stepDuration = 60 / state.tempo / 4;
  updateDisplayValues();
});

elements.intensity.addEventListener('input', () => {
  state.intensity = Number(elements.intensity.value) / 100;
  updateMasterVolume();
  updateDisplayValues();
});

elements.waveform.addEventListener('change', () => {
  state.waveform = elements.waveform.value;
  updateStatus();
  syncUrlFromState();
});

elements.drums.addEventListener('change', () => {
  state.drumsEnabled = elements.drums.checked;
  updateStatus();
  syncUrlFromState();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.isPlaying) {
    stopPlayback();
  }
});

window.addEventListener('beforeunload', () => {
  if (state.isPlaying) {
    stopPlayback();
  }
});

updateDisplayValues();
