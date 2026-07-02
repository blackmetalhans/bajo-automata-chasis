import './style.css';
import { SvgFretboard } from './renderer/SvgFretboard';
import { TabRenderer } from './renderer/TabRenderer';
import { ViterbiRouter, Fretboard } from 'bajo-automata-core';
import { MarkovImproviser } from './generator/MarkovImproviser';
import { MidiTransmitter } from './infrastructure/MidiTransmitter';

// 1. Instanciar el renderizador vectorial
const fretboard = new SvgFretboard({
  strings: 5,
  frets: 24,
  containerId: 'app',
});

// 2. Instanciar el renderizador de tablatura (se inyecta debajo del mástil)
const tabRenderer = new TabRenderer('app');

// 3. Crear instancia del fretboard (usa afinación estándar hardcodeada)
const graph = new Fretboard();

// 4. Instanciar el motor de programación dinámica
const router = new ViterbiRouter(graph, {
  fretShiftWeight: 0.8,    // λ₁ – penaliza movimiento horizontal
  stringJumpWeight: 0.5,   // λ₂ – penaliza salto de cuerda
  maxFretStretch: 5,       // Hard constraint: |Δf| > 5 → transición inválida
});

// 5. Instanciar el motor estocástico
const improviser = new MarkovImproviser();

// 6. Instanciar el transmisor MIDI
const midiTransmitter = new MidiTransmitter();

// 7. Seleccionar elementos del UI
const bpmSlider = document.getElementById('bpm-slider') as HTMLInputElement;
const bpmValue = document.getElementById('bpm-value') as HTMLSpanElement;
const entropySlider = document.getElementById('entropy-slider') as HTMLInputElement;
const entropyValue = document.getElementById('entropy-value') as HTMLSpanElement;
const rootSelect = document.getElementById('root-select') as HTMLSelectElement;
const generateBtn = document.getElementById('generate-btn') as HTMLButtonElement;

// Transport buttons
const transportBtnPlay = document.getElementById('transport-btn-play') as HTMLButtonElement;
const transportBtnPause = document.getElementById('transport-btn-pause') as HTMLButtonElement;
const transportBtnStop = document.getElementById('transport-btn-stop') as HTMLButtonElement;
const transportStateLabel = document.getElementById('transport-state-label') as HTMLDivElement;

// Telemetry elements
const telePathCost = document.getElementById('tele-path-cost') as HTMLSpanElement;
const teleNotes = document.getElementById('tele-notes') as HTMLSpanElement;
const teleMidiOut = document.getElementById('tele-midi-out') as HTMLSpanElement;

// 8. State variables
let currentBPM = 120;
let currentEntropy = 50;
let currentRootNote: number | null = 7; // G by default
let lastOptimalPath: ReturnType<typeof router.findOptimalPath> = [];

// 9. Hook up BPM slider
if (bpmSlider && bpmValue) {
  bpmSlider.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    currentBPM = parseInt(target.value);
    bpmValue.textContent = currentBPM.toString();
  });
}

// 10. Hook up Entropy slider
if (entropySlider && entropyValue) {
  entropySlider.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    currentEntropy = parseInt(target.value);
    entropyValue.textContent = currentEntropy.toString();
  });
}

// 11. Hook up Root Note selector
if (rootSelect) {
  rootSelect.addEventListener('change', (e) => {
    const target = e.target as HTMLSelectElement;
    currentRootNote = parseInt(target.value);
    console.log(`Root note changed to: ${currentRootNote}`);
  });
}

// 12. Update transport UI to reflect current playback state
function updateTransportUI(): void {
  const state = midiTransmitter.playbackState;
  transportStateLabel.textContent = state;

  transportBtnPlay.classList.toggle('active', state === 'playing');
  transportBtnPause.classList.toggle('active', state === 'paused');

  transportBtnPlay.disabled = state === 'playing';
  transportBtnPause.disabled = state !== 'playing';
  transportBtnStop.disabled = state === 'stopped';
}

// 13. Update telemetry panel
function updateTelemetry(path: ReturnType<typeof router.findOptimalPath>): void {
  const cost = router.calculatePathCost(path);
  telePathCost.textContent = isFinite(cost) ? cost.toFixed(2) : '∞';
  teleNotes.textContent = String(path.length);
  teleMidiOut.textContent = midiTransmitter.getOutputName();
}

// 14. Función para generar y renderizar una nueva línea melódica
function generateAndRender() {
  // Detener reproducción anterior si existe
  midiTransmitter.stop();
  
  // Generar secuencia usando Markov con parámetros actuales
  const generatedSequence = improviser.generate(8, currentEntropy, currentRootNote);
  
  // Calcular ruta óptima usando Viterbi
  const optimalPath = router.findOptimalPath(generatedSequence);
  lastOptimalPath = optimalPath;
  
  // Transformar a formato de renderizado
  const renderNodes = optimalPath.map(node => ({
    string: node.string, 
    fret: node.fret
  }));
  
  // Renderizar en el fretboard
  fretboard.renderPath(renderNodes);

  // Renderizar tablatura dinámica debajo del mástil
  tabRenderer.render(renderNodes);

  // Actualizar telemetría
  updateTelemetry(optimalPath);
  
  // Transmitir secuencia a DAW vía MIDI con BPM actual
  midiTransmitter.playSequence(optimalPath, currentBPM).then(() => {
    updateTransportUI();
  });

  updateTransportUI();
  
  // Log para debug
  console.log("Generated sequence:", generatedSequence.map(p => p.pitch));
  console.log("Viterbi Path Cost:", router.calculatePathCost(optimalPath));
  console.log(`Settings: BPM=${currentBPM}, Entropy=${currentEntropy}, Root=${currentRootNote}`);
}

// 15. Transport button handlers
if (transportBtnPlay) {
  transportBtnPlay.addEventListener('click', () => {
    if (midiTransmitter.playbackState === 'paused' && lastOptimalPath.length > 0) {
      midiTransmitter.playSequence(lastOptimalPath, currentBPM).then(() => {
        updateTransportUI();
      });
      updateTransportUI();
    }
  });
}

if (transportBtnPause) {
  transportBtnPause.addEventListener('click', () => {
    midiTransmitter.pause();
    updateTransportUI();
  });
}

if (transportBtnStop) {
  transportBtnStop.addEventListener('click', () => {
    midiTransmitter.stop();
    updateTransportUI();
  });
}

// 16. Conectar el botón de UI
if (generateBtn) {
  generateBtn.addEventListener('click', generateAndRender);
} else {
  console.error('Generate button not found in DOM');
}

// 17. Generar línea inicial al cargar la página
generateAndRender();