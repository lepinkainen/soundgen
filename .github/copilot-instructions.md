# Copilot Instructions

This document provides guidance for AI agents working on the Synthwave Background Generator project.

## Project Overview

This is a self-contained, single-page web application that uses the Web Audio API to generate procedural synthwave music. All the application logic is in `script.js`. The UI is defined in `index.html` and styled by `styles.css`. There are no external dependencies or build steps.

## Core Architecture & Concepts

The application's logic resides entirely in `script.js`. Understanding these core concepts is key to contributing effectively.

### 1. State Management

- A single global `state` object holds the entire application state (e.g., `isPlaying`, `tempo`, `intensity`).
- UI controls in `index.html` update this `state` object through event listeners.
- The application state is synchronized with the URL query parameters (`syncUrlFromState`, `parseSettingsFromUrl`). This allows sharing links with specific settings.

### 2. Audio Generation & Scheduling

- **Audio Graph**: The `setupAudioGraph()` function creates the core Web Audio API nodes (e.g., `AudioContext`, `GainNode`, `DynamicsCompressor`, `ConvolverNode` for reverb). The created nodes are stored in the `state.nodes` object.
- **Scheduler**: A `setInterval` loop (`schedulerTick`) runs every `state.lookaheadMs` milliseconds. It schedules audio events in the near future (`state.scheduleAheadTime`) to ensure precise timing without being affected by main thread blocking.
- **Sequencing**: The `schedulerTick` calls `scheduleStep()` for each 16th note. `scheduleStep` determines the current chord from the `progression` array and calls functions to schedule individual instrument parts:
  - `schedulePad()`: Plays long, atmospheric chords.
  - `scheduleBass()`: Plays the bassline.
  - `scheduleLead()`: Plays melodic, arpeggiated notes.
  - `scheduleDrums()`: Triggers drum sounds if enabled.
- **Sound Synthesis**:
  - `triggerSynthVoice()` is the generic function for creating melodic sounds (pads, bass, lead). It sets up oscillators, filters, and envelopes.
  - `triggerKick()`, `triggerSnare()`, and `triggerHat()` generate the drum sounds programmatically.

## Developer Workflow

- **Running Locally**: This is a static website. Serve the project directory using a simple local web server. The `README.md` recommends:
  ```bash
  python3 -m http.server 8000
  ```
- **Making Changes**:
  1. Edit `script.js` for logic, `index.html` for structure, or `styles.css` for visuals.
  2. Refresh the browser to see the changes.
  3. There is no build process or test suite.

## Key Files

- `script.js`: The heart of the application. Contains all state management, audio synthesis, and scheduling logic.
- `index.html`: Defines the UI and user controls.
- `README.md`: Contains basic setup instructions.
