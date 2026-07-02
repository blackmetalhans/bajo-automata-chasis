# Architecture — Bajo-Autómata V2

## Technical Stack

| Layer | Technology |
|---|---|
| Build / bundler | Vite 8 + TypeScript 6 |
| Core engine | `bajo-automata-core` (local monorepo package) |
| UI renderer | Vanilla TypeScript + SVG DOM API |
| MIDI bridge | Web MIDI API (`navigator.requestMIDIAccess`) |
| DAW integration | loopMIDI virtual port → Reaper / any DAW |

---

## Repository Structure

```
bajo-automata-chasis/
├── index.html                        # Entry point: UI shell, styles, transport controls
├── src/
│   ├── main.ts                       # Application bootstrap & UI wiring
│   ├── generator/
│   │   └── MarkovImproviser.ts       # Stochastic sequence generator
│   ├── renderer/
│   │   ├── SvgFretboard.ts           # SVG fretboard with Viterbi path overlay
│   │   └── TabRenderer.ts            # ASCII-style tablature renderer
│   └── infrastructure/
│       └── MidiTransmitter.ts        # Web MIDI API bridge (play / pause / stop)
└── packages/
    └── bajo-automata-core/
        └── src/
            ├── Fretboard.ts          # 5-string fretboard graph (positions per pitch)
            ├── ViterbiRouter.ts      # Dynamic-programming path optimizer
            ├── PitchClass.ts         # Chromatic pitch representation
            └── index.ts              # Public package exports
```

---

## Data Flow

```
User clicks "⚡ Generate Line"
        │
        ▼
MarkovImproviser.generate(length, entropy, rootNote)
  → PitchClass[]          (ordered chromatic pitch sequence)
        │
        ▼
ViterbiRouter.findOptimalPath(PitchClass[])
  → PathNode[]            (optimal [string, fret] route, 1-indexed strings)
        │
        ├──► SvgFretboard.renderPath()   → SVG fretboard with glowing cyan nodes
        ├──► TabRenderer.render()        → ASCII tablature below the fretboard
        ├──► Telemetry panel update      → Viterbi Path Cost, note count, MIDI out
        └──► MidiTransmitter.playSequence()
               → Note ON / OFF messages via Web MIDI API
               → loopMIDI virtual port
               → DAW (Reaper + bass VST)
```

---

## ViterbiRouter

**File:** `packages/bajo-automata-core/src/ViterbiRouter.ts`

The router implements the classic Viterbi dynamic-programming algorithm adapted to fretboard ergonomics.

### Hard Constraints

| Constraint | Rule |
|---|---|
| Fret range | `f ∈ {0, 1, …, 24}` — enforced by the `Fretboard` graph |
| Position window | `\|f_u − f_v\| > maxFretStretch` → transition probability = 0 (edge blocked) |

`maxFretStretch` defaults to **5** frets (configurable via `ViterbiOptions`).

### Heuristic Cost Function

$$\text{cost}(u \to v) = \lambda_1 \cdot |\Delta f| + \lambda_2 \cdot |\Delta s|$$

where:
- **λ₁** (`fretShiftWeight`, default `0.8`) penalises horizontal (fret) movement.
- **λ₂** (`stringJumpWeight`, default `0.5`) penalises vertical (string) movement.
- **|Δf|** = absolute fret distance between consecutive notes.
- **|Δs|** = absolute string distance between consecutive notes.

This is equivalent to a log-probability model: `P(v|u) ∝ exp(−cost(u → v))`.

### Algorithm Steps

1. **Lattice construction** — for each pitch in the sequence, retrieve all valid `[string, fret]` positions from `Fretboard.getPositionsForPitch()`.
2. **Forward pass** — fill a `ViterbiCell[][]` DP table minimising cumulative cost column by column.
3. **Backtrack** — trace the minimum-cost path from the final column back to the first.
4. **Output** — `PathNode[]` with `string`, `fret`, `pitch`, and per-node cumulative `cost`.

---

## MarkovImproviser

**File:** `src/generator/MarkovImproviser.ts`

Generates melodic sequences using a first-order Markov chain over chromatic pitch classes. An `entropy` parameter (0–100) controls the temperature of the transition probability distribution:

- **entropy = 0** → deterministic (always picks the most probable next note).
- **entropy = 100** → uniform random (all transitions equally likely).

The `rootNote` parameter biases the initial state towards the tonic pitch class.

---

## MidiTransmitter

**File:** `src/infrastructure/MidiTransmitter.ts`

Bridges the generated `PathNode[]` sequence to a real DAW via the **Web MIDI API**.

### Transport States

| State | Description |
|---|---|
| `'stopped'` | No playback in progress |
| `'playing'` | Actively sending Note ON / OFF messages |
| `'paused'`  | Playback interrupted; last path retained for resume |

### Key Methods

| Method | MIDI Messages Sent |
|---|---|
| `playSequence(path, bpm)` | Note ON (`0x90`) + Note OFF (`0x80`) per note |
| `pause()` | CC 123 All Notes Off (`0xB0, 123, 0`) on channel 0 |
| `stop()` | CC 123 All Notes Off (`0xB0, 123, 0`) on channel 0 |

Sending **CC 123 (All Notes Off)** on stop/pause is essential to prevent **hanging MIDI notes** in the DAW when playback is interrupted mid-sequence.

### 5-String Bass Tuning Offsets

```
String 1 (G2)  → MIDI offset 43
String 2 (D2)  → MIDI offset 38
String 3 (A1)  → MIDI offset 33
String 4 (E1)  → MIDI offset 28
String 5 (B0)  → MIDI offset 23
```

MIDI note = `tuningOffset[string - 1] + fret`

> Note: `MidiTransmitter` uses 0-indexed strings internally (`string - 1`) while the rest of the system uses 1-indexed strings.

---

## SvgFretboard

**File:** `src/renderer/SvgFretboard.ts`

Renders a 5-string, 24-fret bass fretboard as a scalable SVG element.

### Coordinate System

| Parameter | Value | Description |
|---|---|---|
| `VIEW_W` | `1000` | SVG viewport width |
| `VIEW_H` | `350` | SVG viewport height |
| `PAD_LEFT` | `40` | Space for the nut |
| `PAD_RIGHT` | `20` | Right margin |
| `PAD_TOP` | `45` | Top margin |
| `PAD_BOTTOM` | `45` | Bottom margin |

Fret x-positions follow **equal-temperament logarithmic spacing**:
```
x = PAD_LEFT + usableW × (1 − 1 / 2^(fret/12))
```

String y-positions are linearly distributed between `PAD_TOP` and `VIEW_H − PAD_BOTTOM`.

### Active Path Rendering

`renderPath(nodes: FretNode[])` draws:
1. A cyan polyline connecting all nodes (with `cyan-glow` SVG filter).
2. A cyan circle at each node position.
3. A dark `<text>` label centered inside each circle showing the **fret number**.
