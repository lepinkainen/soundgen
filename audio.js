export function midiToFreq(midi) {
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

export function setupAudioGraph() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    throw new Error("Web Audio API is not supported in this browser.");
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
