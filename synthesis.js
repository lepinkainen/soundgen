import { midiToFreq } from "./audio.js";

export function triggerSynthVoice(
  state,
  {
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
  }
) {
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
  filter.type = "lowpass";
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
  const releaseStart =
    time + Math.max(envelope.attack + envelope.decay, duration);
  voiceGain.gain.setTargetAtTime(
    0,
    releaseStart,
    Math.max(0.05, envelope.release)
  );

  const stopTime = releaseStart + envelope.release * 3;
  osc1.start(time);
  osc2.start(time);
  osc1.stop(stopTime);
  osc2.stop(stopTime);
}

export function triggerKick(state, time) {
  if (!state.audioCtx || !state.nodes) {
    return;
  }
  const ctx = state.audioCtx;
  const osc = ctx.createOscillator();
  osc.type = "sine";
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(1, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.5);
  osc.frequency.setValueAtTime(140, time);
  osc.frequency.exponentialRampToValueAtTime(36, time + 0.35);
  osc.connect(gain);
  gain.connect(state.nodes.masterGain);

  const click = ctx.createOscillator();
  const clickGain = ctx.createGain();
  click.type = "triangle";
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

export function triggerSnare(state, time) {
  if (!state.audioCtx || !state.nodes) {
    return;
  }
  const ctx = state.audioCtx;
  const noise = ctx.createBufferSource();
  noise.buffer = state.nodes.noiseBuffer;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.setValueAtTime(1800, time);
  noiseFilter.Q.setValueAtTime(1.2, time);
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.7, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.25);
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(state.nodes.masterGain);

  const tone = ctx.createOscillator();
  tone.type = "triangle";
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

export function triggerHat(state, time, duration) {
  if (!state.audioCtx || !state.nodes) {
    return;
  }
  const ctx = state.audioCtx;
  const noise = ctx.createBufferSource();
  noise.buffer = state.nodes.noiseBuffer;
  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
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
