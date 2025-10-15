# Copilot Instructions

This document provides guidance for AI agents working on the Synthwave Background Generator project.

## Project Overview

This is a self-contained, single-page web application that uses the Web Audio API to generate procedural synthwave music. The application logic is modular, with `main.js` as the entry point. The UI is defined in `index.html` and styled by `styles.css`. There are no external dependencies or build steps.

## Core Architecture & Concepts

Understanding these core concepts and the file structure is key to contributing effectively.

### 1. File Structure & Responsibilities

- `main.js`: The application's entry point. It manages the global `state` object, contains the main scheduler loop (`schedulerTick`), and orchestrates the other modules.
- `ui.js`: Handles all DOM interaction, event listeners, and UI updates. It also manages synchronizing the application state with URL query parameters.
- `config.js`: Contains static data for music generation, such as chord `progressions`, `drumPatterns`, and musical constants like `STEPS_PER_BAR`.
- `audio.js`: Responsible for setting up the core Web Audio API graph (`setupAudioGraph`), including the `AudioContext`, master gain, compressor, and effect nodes like reverb and delay.
- `sequencer.js`: Contains the high-level musical logic. The `scheduleStep` function is called for each 16th note to arrange the different instrument parts (`schedulePad`, `scheduleBass`, `scheduleLead`, `scheduleDrums`).
- `synthesis.js`: Contains the low-level sound design logic. Functions like `triggerSynthVoice`, `triggerKick`, and `triggerSnare` create and configure the oscillators, envelopes, and filters to produce the actual sounds.

### 2. State Management

- A single global `state` object in `main.js` holds the entire application state (e.g., `isPlaying`, `tempo`, `intensity`).
- UI controls, managed by `ui.js`, update this `state` object through event listeners.
- The application state is synchronized with the URL query parameters via functions in `ui.js` (`syncUrlFromState`, `parseSettingsFromUrl`).

### 3. Audio Generation & Scheduling

- **Audio Graph**: `audio.js`'s `setupAudioGraph()` function creates the core Web Audio API nodes. The created nodes are stored in the `state.nodes` object.
- **Scheduler**: A `setInterval` loop (`schedulerTick` in `main.js`) runs every few milliseconds. It schedules audio events in the near future (`state.scheduleAheadTime`) to ensure precise timing.
- **Sequencing**: The `schedulerTick` calls `scheduleStep()` from `sequencer.js` for each 16th note. This function then calls other functions in the same file to schedule the bass, lead, pads, and drums based on the selected chord progression and drum pattern.
- **Sound Synthesis**: The functions in `synthesis.js` (`triggerSynthVoice`, `triggerKick`, etc.) are called by the sequencer to generate the final sounds by creating and connecting oscillators, filters, and gain nodes with specific envelopes.

## Developer Workflow

- **Running Locally**: This is a static website. Serve the project directory using a simple local web server. The `README.md` recommends:
  ```bash
  python3 -m http.server 8000
  ```
- **Making Changes**:
  1.  Edit the appropriate file based on the new modular structure.
  2.  Refresh the browser to see the changes.
  3.  There is no build process or test suite.

## Key Files

- `main.js`: The heart of the application, holding state and the main loop.
- `sequencer.js` & `synthesis.js`: The core of the audio generation logic.
- `config.js`: The source for all musical patterns and scales.
- `index.html`: Defines the UI and user controls.
