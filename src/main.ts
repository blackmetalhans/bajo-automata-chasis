import './style.css';
import { SvgFretboard } from './renderer/SvgFretboard';
import { ViterbiRouter, Fretboard, PitchClass } from 'bajo-automata-core';

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

// 4. Input: Escala D Dorian ascendente (El cerebro musical)
// PitchClass toma un solo argumento numérico (0-11)
// D=2, E=4, F#=6, G=7, A=9, B=11, C#=1, D=2
const dDorianScale = [
  new PitchClass(2),  // D
  new PitchClass(4),  // E
  new PitchClass(6),  // F#
  new PitchClass(7),  // G
  new PitchClass(9),  // A
  new PitchClass(11), // B
  new PitchClass(1),  // C#
  new PitchClass(2)   // D
];

// 5. Output: Cálculo de la matriz ergónomica usando Viterbi
const optimalPath = router.findOptimalPath(dDorianScale);

// 6. Puente de Transformación (PathNode tiene properties: string, fret, pitch, cost)
// Los strings están en rango 0-4, lo que maneja SvgFretboard correctamente.
const renderNodes = optimalPath.map(node => ({
  string: node.string, 
  fret: node.fret
}));

// 7. Disparar el renderizado en el navegador
fretboard.renderPath(renderNodes);
console.log("Viterbi Path Cost:", router.calculatePathCost(optimalPath));