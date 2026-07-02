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

// 8. State variables
let currentBPM = 120;
let currentEntropy = 50;
let currentRootNote: number | null = 7; // G by default

// 9. Hook up BPM slider
if (bpmSlider && bpmValue) {
  bpmSlider.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    currentBPM = parseInt(target.value);
    bpmValue.textContent = currentBPM.toString();
  });
}

// 9. Hook up Entropy slider
if (entropySlider && entropyValue) {
  entropySlider.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    currentEntropy = parseInt(target.value);
    entropyValue.textContent = currentEntropy.toString();
  });
}

// 10. Hook up Root Note selector
if (rootSelect) {
  rootSelect.addEventListener('change', (e) => {
    const target = e.target as HTMLSelectElement;
    currentRootNote = parseInt(target.value);
    console.log(`Root note changed to: ${currentRootNote}`);
  });
}

// 11. Función para generar y renderizar una nueva línea melódica
function generateAndRender() {
  // Detener reproducción anterior si existe
  midiTransmitter.stopPlayback();
  
  // Generar secuencia usando Markov con parámetros actuales
  const generatedSequence = improviser.generate(8, currentEntropy, currentRootNote);
  
  // Calcular ruta óptima usando Viterbi
  const optimalPath = router.findOptimalPath(generatedSequence);
  
  // Transformar a formato de renderizado
  const renderNodes = optimalPath.map(node => ({
    string: node.string, 
    fret: node.fret
  }));
  
  // Renderizar en el fretboard
  fretboard.renderPath(renderNodes);

  // Renderizar tablatura dinámica debajo del mástil
  tabRenderer.render(renderNodes);
  
  // Transmitir secuencia a DAW vía MIDI con BPM actual
  midiTransmitter.playSequence(optimalPath, currentBPM);
  
  // Log para debug
  console.log("Generated sequence:", generatedSequence.map(p => p.pitch));
  console.log("Viterbi Path Cost:", router.calculatePathCost(optimalPath));
  console.log(`Settings: BPM=${currentBPM}, Entropy=${currentEntropy}, Root=${currentRootNote}`);
}

// 12. Conectar el botón de UI
if (generateBtn) {
  generateBtn.addEventListener('click', generateAndRender);
} else {
  console.error('Generate button not found in DOM');
}

// 13. Generar línea inicial al cargar la página
generateAndRender();