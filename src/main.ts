import './style.css';
import { SvgFretboard } from './renderer/SvgFretboard';
import { ViterbiRouter, Fretboard } from 'bajo-automata-core';
import { MarkovImproviser } from './generator/MarkovImproviser';
import { MidiTransmitter } from './infrastructure/MidiTransmitter';

// 1. Instanciar el renderizador vectorial
const fretboard = new SvgFretboard({
  strings: 5,
  frets: 24,
  containerId: 'app',
});

// 2. Crear instancia del fretboard (usa afinación estándar hardcodeada)
const graph = new Fretboard();

// 3. Instanciar el motor de programación dinámica
const router = new ViterbiRouter(graph);

// 4. Instanciar el motor estocástico
const improviser = new MarkovImproviser();

// 5. Instanciar el transmisor MIDI
const midiTransmitter = new MidiTransmitter();

// 6. Función para generar y renderizar una nueva línea melódica
function generateAndRender() {
  // Detener reproducción anterior si existe
  midiTransmitter.stopPlayback();
  
  // Generar secuencia usando Markov
  const generatedSequence = improviser.generate(8);
  
  // Calcular ruta óptima usando Viterbi
  const optimalPath = router.findOptimalPath(generatedSequence);
  
  // Transformar a formato de renderizado
  const renderNodes = optimalPath.map(node => ({
    string: node.string, 
    fret: node.fret
  }));
  
  // Renderizar en el fretboard
  fretboard.renderPath(renderNodes);
  
  // Transmitir secuencia a DAW vía MIDI
  midiTransmitter.playSequence(optimalPath, 120);
  
  // Log para debug
  console.log("Generated sequence:", generatedSequence.map(p => p.pitch));
  console.log("Viterbi Path Cost:", router.calculatePathCost(optimalPath));
}

// 7. Conectar el botón de UI
const generateBtn = document.getElementById('generate-btn');
if (generateBtn) {
  generateBtn.addEventListener('click', generateAndRender);
} else {
  console.error('Generate button not found in DOM');
}

// 8. Generar línea inicial al cargar la página
generateAndRender();