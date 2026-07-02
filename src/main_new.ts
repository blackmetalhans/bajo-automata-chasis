import './style.css'
import { SvgFretboard } from './renderer/SvgFretboard'
import { ViterbiRouter, Fretboard, PitchClass } from 'bajo-automata-core'

/**
 * Bass Automaton v1.0 - Algorithmic Route Planning
 * 
 * Renders an optimal D Dorian scale traversal on a 5-string bass fretboard
 * using the Viterbi algorithm for ergonomic routing.
 */

// Initialize the fretboard model (standard 5-string tuning: B0, E1, A1, D2, G2)
const fretboard = new Fretboard()

// Initialize the Viterbi router for optimal path finding
const router = new ViterbiRouter(fretboard, {
  fretShiftWeight: 1.0,      // Horizontal movement cost
  stringJumpWeight: 1.5,     // Vertical movement cost (higher penalty)
  maxFretStretch: 4          // Comfortable fret span
})

// Create D Dorian scale (D E F# G A B C# D)
// D Dorian intervals from D: D(0), E(2), F#(4), G(5), A(7), B(9), C#(1), D(0 octave up)
const dDorianScale: PitchClass[] = [
  new PitchClass(2),  // D
  new PitchClass(4),  // E
  new PitchClass(6),  // F#
  new PitchClass(7),  // G
  new PitchClass(9),  // A
  new PitchClass(11), // B
  new PitchClass(1),  // C#
  new PitchClass(2)   // D (octave)
]

// Calculate optimal path using Viterbi algorithm
const optimalPath = router.findOptimalPath(dDorianScale)

// Map PathNode[] to {string, fret}[] format for SvgFretboard
const rendererPath = optimalPath.map(node => ({
  string: node.string,
  fret: node.fret
}))

// Initialize the SVG fretboard and render the optimal path
const svgFretboard = new SvgFretboard({
  strings: 5,
  frets: 24,
  containerId: 'app'
})

svgFretboard.renderPath(rendererPath)
