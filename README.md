# Bajo-Autómata V2

An algorithmic 5-string bass line generator built with **Vite + TypeScript**. It combines a stochastic Markov improviser with a Viterbi dynamic-programming router to produce ergonomically playable bass lines, rendered as an interactive SVG fretboard and transmitted in real time to any DAW via the Web MIDI API.

---

## Overview

```
MarkovImproviser  →  sequence of PitchClass objects
        ↓
ViterbiRouter     →  optimal [string, fret] path (min hand-movement cost)
        ↓
SvgFretboard      →  interactive SVG fretboard with glowing nodes
TabRenderer       →  ASCII-style tablature rendered below the fretboard
MidiTransmitter   →  Web MIDI bridge → loopMIDI virtual port → DAW (Reaper)
```

The router minimises the cost function **λ₁·|Δf| + λ₂·|Δs|** across all valid fingering paths, where Δf is fret distance and Δs is string distance. Hard constraints prevent physically impossible stretches.

---

## Setup

### 1. Install local packages

The core engine lives in `packages/bajo-automata-core`. Link it as a local dependency:

```bash
cd packages/bajo-automata-core
npm install
npm run build   # compiles the TypeScript library
cd ../..
```

> If you want the package symlinked globally, run `npm link` inside `packages/bajo-automata-core` and then `npm link bajo-automata-core` from the project root. The `package.json` already resolves it via `"file:../bajo-automata-core"`.

### 2. Install project dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev
```

Open `http://localhost:5173` in a Chromium-based browser (Chrome / Edge) — Firefox does **not** support the Web MIDI API.

---

## DAW Integration Requirements

| Requirement | Notes |
|---|---|
| **loopMIDI** (Windows) | Creates virtual MIDI ports visible to the browser and the DAW. Download from [tobias-erichsen.de](https://www.tobias-erichsen.de/software/loopmidi.html). |
| **Reaper** (or any DAW) | Create a MIDI track with the loopMIDI port as input. Arm the track for recording or monitoring. |
| **Chromium-based browser** | Required for Web MIDI API (`navigator.requestMIDIAccess`). |

### Quick start with Reaper

1. Open loopMIDI and create a new virtual port (e.g. `BajoAutomata`).
2. Open Reaper → Preferences → MIDI Devices → enable the `BajoAutomata` input.
3. Create a bass track with a VST instrument plugin.
4. Open `http://localhost:5173` in Chrome.
5. Click **⚡ Generate Line** — the browser will request MIDI access permission; accept it.
6. The bass line plays in real time through the DAW instrument.
7. Use the **▶ / ⏸ / ⏹** transport buttons to control playback. Stop sends **CC 123 (All Notes Off)** to prevent hanging notes.

---

## UI Controls

| Control | Description |
|---|---|
| **BPM slider** | Tempo (60 – 200 BPM) |
| **Entropy slider** | Markov randomness (0 = deterministic, 100 = fully random) |
| **Root Note** | Tonic of the generated line |
| **⚡ Generate Line** | Generate a new 8-note Viterbi-routed line and start playback |
| **▶ Play** | Resume playback of the last generated line after a pause |
| **⏸ Pause** | Pause playback (sends All Notes Off) |
| **⏹ Stop** | Stop playback and send CC 123 All Notes Off |
| **Telemetry panel** | Live display of Viterbi Path Cost, note count, and MIDI output name |
