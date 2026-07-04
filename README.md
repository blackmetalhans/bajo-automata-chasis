# Bajo-Autómata V2

Algorithmic 5-string bass improvisation system built as a Vite + TypeScript chasis with a decoupled core engine. It combines stochastic generation, ergonomic routing, and real-time MIDI output to turn abstract pitch material into playable bass lines for a DAW.

## Core Features

- Viterbi-based routing in `bajo-automata-core` computes the most ergonomic path on a 5-string bass fretboard, rejecting impossible jumps and respecting the physical limits of the instrument.
- Markov-chain generation creates stochastic melodic material before routing, giving the system controlled variation instead of fixed patterns.
- Web MIDI API connectivity sends the generated notes directly to Reaper or any compatible DAW through a browser MIDI port.
- SVG fretboard rendering and 5-line dynamic tablature stay synchronized in real time with the current route.
- Vitest and GitHub Actions support automated quality assurance for the core and the UI chasis.

## Architecture

The project follows a monorepo-style split between a logical core and a presentation chasis. The core package owns musical decisions, while the UI package handles visualization and transport control.

```text
MarkovImproviser  ->  PitchClass sequence
        |
        v
ViterbiRouter     ->  optimal [string, fret] path
        |
        +--> SvgFretboard  ->  SVG bass fretboard
        +--> TabRenderer    ->  synchronized 5-line tablature
        +--> MidiTransmitter -> Web MIDI API -> DAW
```

In MVC terms, the core package acts as the model, the renderer modules act as the view, and the bootstrap / transport layer in the Vite app acts as the controller. This separation keeps the routing logic testable and independent from the browser UI.

## Installation and Usage

```bash
npm install
npm run dev
npm run test
```

`npm install` prepares both the Vite chasis and the local `bajo-automata-core` dependency. `npm run dev` starts the browser app, and `npm run test` runs the Vitest suite.

## DAW Connectivity

Use a Chromium-based browser, a virtual MIDI port such as loopMIDI on Windows, and a DAW like Reaper.

1. Create a virtual MIDI input in loopMIDI.
2. Enable that input inside Reaper or another DAW.
3. Open the app in Chrome or Edge.
4. Generate a line and accept the browser MIDI permission prompt.
5. Route the output to the DAW instrument for live playback.

---

# Bajo-Autómata V2

Sistema algorítmico de improvisación para bajo de 5 cuerdas construido como un chasis en Vite + TypeScript con un motor core desacoplado. Combina generación estocástica, ruteo ergonómico y salida MIDI en tiempo real para convertir material melódico abstracto en líneas tocables dentro de un DAW.

## Funcionalidades Principales

- El ruteo basado en Viterbi en `bajo-automata-core` calcula el camino más ergonómico sobre un mástil de bajo de 5 cuerdas, evitando saltos imposibles y respetando los límites físicos del instrumento.
- El motor generativo con cadenas de Markov crea material melódico estocástico antes del ruteo, aportando variación controlada en lugar de patrones fijos.
- La conectividad con Web MIDI API envía las notas generadas directamente a Reaper o a cualquier DAW compatible mediante un puerto MIDI del navegador.
- El renderizado del diapasón en SVG y la tablatura dinámica de 5 líneas permanecen sincronizados en tiempo real con la ruta actual.
- Vitest y GitHub Actions sostienen una estrategia de QA automatizada para el core y el chasis de UI.

## Arquitectura

El proyecto sigue una separación estilo monorepo entre un core lógico y un chasis de presentación. El paquete core gobierna las decisiones musicales, mientras que el paquete UI se encarga de la visualización y del control de transporte.

```text
MarkovImproviser  ->  secuencia de PitchClass
        |
        v
ViterbiRouter     ->  camino óptimo [string, fret]
        |
        +--> SvgFretboard   ->  diapasón SVG
        +--> TabRenderer     ->  tablatura sincronizada de 5 líneas
        +--> MidiTransmitter  ->  Web MIDI API -> DAW
```

En términos de MVC, el paquete core actúa como modelo, los módulos de renderizado actúan como vista, y la capa de bootstrap / transporte dentro de la app Vite actúa como controlador. Esta separación mantiene la lógica de ruteo testeable e independiente de la UI del navegador.

## Instalación y Uso

```bash
npm install
npm run dev
npm run test
```

`npm install` prepara tanto el chasis Vite como la dependencia local `bajo-automata-core`. `npm run dev` inicia la aplicación en el navegador y `npm run test` ejecuta la suite de Vitest.

## Conectividad con DAW

Usa un navegador basado en Chromium, un puerto MIDI virtual como loopMIDI en Windows y un DAW como Reaper.

1. Crea una entrada MIDI virtual en loopMIDI.
2. Activa esa entrada dentro de Reaper u otro DAW.
3. Abre la aplicación en Chrome o Edge.
4. Genera una línea y acepta el permiso de MIDI del navegador.
5. Rutea la salida al instrumento del DAW para reproducción en vivo.
