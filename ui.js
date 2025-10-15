import { progressions, drumPatterns, WAVEFORMS } from "./config.js";

export const elements = {
  toggle: document.getElementById("toggle"),
  tempo: document.getElementById("tempo"),
  tempoValue: document.getElementById("tempo-value"),
  intensity: document.getElementById("intensity"),
  intensityValue: document.getElementById("intensity-value"),
  waveform: document.getElementById("waveform"),
  progression: document.getElementById("progression"),
  drumPattern: document.getElementById("drum-pattern"),
  drums: document.getElementById("drums-enabled"),
  status: document.getElementById("status"),
};

export function populateControls() {
  const randomProgression = document.createElement("option");
  randomProgression.value = "random";
  randomProgression.textContent = "Random";
  elements.progression.appendChild(randomProgression);

  Object.keys(progressions).forEach((key) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = key;
    elements.progression.appendChild(option);
  });

  const randomDrums = document.createElement("option");
  randomDrums.value = "random";
  randomDrums.textContent = "Random";
  elements.drumPattern.appendChild(randomDrums);

  drumPatterns.forEach((pattern, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = pattern.name;
    elements.drumPattern.appendChild(option);
  });
}

export function parseSettingsFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const settings = {};
  const tempoParam = params.get("tempo");
  const intensityParam = params.get("intensity");
  const waveformParam = params.get("waveform");
  const drumsParam = params.get("drums");

  const tempoValue = Number(tempoParam);
  if (
    Number.isFinite(tempoValue) &&
    tempoValue >= Number(elements.tempo.min) &&
    tempoValue <= Number(elements.tempo.max)
  ) {
    settings.tempo = Math.round(tempoValue);
  }

  const intensityValue = Number(intensityParam);
  if (
    Number.isFinite(intensityValue) &&
    intensityValue >= 0 &&
    intensityValue <= 100
  ) {
    settings.intensity = Math.round(intensityValue);
  }

  if (waveformParam && WAVEFORMS.includes(waveformParam)) {
    settings.waveform = waveformParam;
  }

  if (typeof drumsParam === "string") {
    const normalized = drumsParam.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) {
      settings.drumsEnabled = true;
    } else if (["0", "false", "no", "off"].includes(normalized)) {
      settings.drumsEnabled = false;
    }
  }

  return settings;
}

export function updateStatus(state) {
  if (!state.isPlaying) {
    elements.status.textContent = "Tap Start to begin.";
    return;
  }
  const parts = [
    "Playing",
    `${state.tempo} BPM`,
    `Intensity ${Math.round(state.intensity * 100)}%`,
    state.drumsEnabled ? "Drums on" : "Drums off",
    `Waveform ${state.waveform}`,
  ];
  elements.status.textContent = parts.join(" | ");
}

export function syncUrlFromState(state) {
  const url = new URL(window.location.href);
  url.searchParams.set("tempo", String(state.tempo));
  const intensityPercent = Math.round(Number(elements.intensity.value));
  url.searchParams.set(
    "intensity",
    String(Math.max(0, Math.min(100, intensityPercent)))
  );
  url.searchParams.set("waveform", state.waveform);
  url.searchParams.set("drums", state.drumsEnabled ? "1" : "0");
  url.searchParams.set("progression", elements.progression.value);
  url.searchParams.set("drumPattern", elements.drumPattern.value);
  history.replaceState(null, "", url.toString());
}

export function updateDisplayValues(state) {
  elements.tempoValue.textContent = `${state.tempo} BPM`;
  elements.intensityValue.textContent = `${Math.round(state.intensity * 100)}%`;
  updateStatus(state);
  syncUrlFromState(state);
}

export function initializeUi(state, handlers) {
  const initialSettings = parseSettingsFromUrl();
  if (initialSettings.tempo !== undefined) {
    elements.tempo.value = String(initialSettings.tempo);
    state.tempo = initialSettings.tempo;
  }
  if (initialSettings.intensity !== undefined) {
    elements.intensity.value = String(initialSettings.intensity);
    state.intensity = initialSettings.intensity / 100;
  }
  if (initialSettings.waveform !== undefined) {
    elements.waveform.value = initialSettings.waveform;
    state.waveform = initialSettings.waveform;
  }
  if (initialSettings.drumsEnabled !== undefined) {
    elements.drums.checked = initialSettings.drumsEnabled;
    state.drumsEnabled = initialSettings.drumsEnabled;
  }

  populateControls();
  updateDisplayValues(state);

  elements.toggle.addEventListener("click", () => {
    if (state.isPlaying) {
      handlers.stopPlayback();
    } else {
      handlers.startPlayback();
    }
  });

  elements.tempo.addEventListener("input", () => {
    state.tempo = Number(elements.tempo.value);
    state.stepDuration = 60 / state.tempo / 4;
    handlers.updateMasterVolume();
    updateDisplayValues(state);
  });

  elements.intensity.addEventListener("input", () => {
    state.intensity = Number(elements.intensity.value) / 100;
    handlers.updateMasterVolume();
    updateDisplayValues(state);
  });

  elements.progression.addEventListener("change", () => {
    if (state.isPlaying) {
      handlers.stopPlayback();
      handlers.startPlayback();
    }
    syncUrlFromState(state);
  });

  elements.drumPattern.addEventListener("change", () => {
    if (state.isPlaying) {
      handlers.stopPlayback();
      handlers.startPlayback();
    }
    syncUrlFromState(state);
  });

  elements.waveform.addEventListener("change", () => {
    state.waveform = elements.waveform.value;
    updateStatus(state);
    syncUrlFromState(state);
  });

  elements.drums.addEventListener("change", () => {
    state.drumsEnabled = elements.drums.checked;
    updateStatus(state);
    syncUrlFromState(state);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.isPlaying) {
      handlers.stopPlayback();
    }
  });

  window.addEventListener("beforeunload", () => {
    if (state.isPlaying) {
      handlers.stopPlayback();
    }
  });
}
