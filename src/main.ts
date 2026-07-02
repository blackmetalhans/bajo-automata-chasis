import './style.css';
import { SvgFretboard } from './renderer/SvgFretboard';
// Importamos tu núcleo matemático compilado
import { ViterbiRouter, Fretboard, PitchClass } from 'bajo-automata-core';

// 1. Instanciar el renderizador vectorial
const fretboard = new SvgFretboard({
  strings: 5,
  frets: 24,
  containerId: 'app',
});

// 2. Topología del Mástil (Afinación estándar de tu 5 cuerdas)
const tuning = [
  new PitchClass('B', 0),
  new PitchClass('E', 1),
  new PitchClass('A', 1),
  new PitchClass('D', 2),
  new PitchClass('G', 2)
];
const graph = new Fretboard(tuning, 24);

// 3. Instanciar el motor de programación dinámica
const router = new ViterbiRouter(graph);

// 4. Input: Escala D Dorian ascendente (El cerebro musical)
const dDorianScale = [
  new PitchClass('D', 2),
  new PitchClass('E', 2),
  new PitchClass('F', 2),
  new PitchClass('G', 2),
  new PitchClass('A', 2),
  new PitchClass('B', 2),
  new PitchClass('C', 3),
  new PitchClass('D', 3)
];

// 5. Output: Cálculo de la matriz ergónomica (El cerebro físico)
const optimalPath = router.route(dDorianScale);

// 6. Puente de Transformación (Adaptar los tipos del Core al Chasis visual)
// Nota: Ajusta 'stringIndex' y 'fretNumber' si las propiedades de tu ViterbiNode se llaman distinto.
// Sumamos +1 al string porque tu renderizador SVG maneja cuerdas del 1 al 5.
const renderNodes = optimalPath.map(node => ({
  string: node.stringIndex + 1, 
  fret: node.fretNumber
}));

// 7. Disparar el renderizado en el navegador
fretboard.renderPath(renderNodes);
console.log("Viterbi Path Cost:", router.calculatePathCost(optimalPath));