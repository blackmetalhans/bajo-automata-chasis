import { PitchClass } from 'bajo-automata-core';

/**
 * MarkovImproviser - Stochastic melody generator using Markov chains
 * 
 * Generates melodic lines that favor:
 * - Root notes and perfect fifths
 * - Step-wise (diatonic) motion
 * - Penalizes large dissonant leaps
 * 
 * Configurable entropy and root note preferences
 */
export class MarkovImproviser {
  private readonly chromaticScale = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  
  // Weighted transition matrix: favors small intervals
  private readonly transitionWeights: Map<number, number> = new Map([
    [0, 8],   // Unison (strong for repetition)
    [1, 5],   // Minor 2nd (step)
    [2, 7],   // Major 2nd (step) - favored
    [3, 4],   // Minor 3rd (small skip)
    [4, 4],   // Major 3rd (small skip)
    [5, 6],   // Perfect 4th (good)
    [6, 1],   // Tritone (penalized)
    [7, 9],   // Perfect 5th (very favored)
    [8, 3],   // Minor 6th
    [9, 3],   // Major 6th
    [10, 2],  // Minor 7th
    [11, 2],  // Major 7th
  ]);

  // Musical "roots" get boosted probability as starting/anchor notes
  private readonly rootBias: Map<number, number> = new Map([
    [0, 2.0],  // C
    [2, 2.0],  // D
    [4, 1.5],  // E
    [5, 1.5],  // F
    [7, 2.0],  // G
    [9, 1.5],  // A
    [11, 1.0], // B
  ]);

  /**
   * Generate a melodic sequence using weighted Markov transitions
   * @param length - Number of notes to generate (default: 8)
   * @param entropy - Randomness level 0-100 (default: 50). Higher = wider leaps, lower = more diatonic
   * @param rootNote - Preferred root note 0-11 (default: null = use default root bias)
   * @returns Array of PitchClass objects
   */
  generate(length: number = 8, entropy: number = 50, rootNote: number | null = null): PitchClass[] {
    if (length < 1) {
      throw new Error('Length must be at least 1');
    }

    const sequence: number[] = [];
    
    // Start with a biased root note
    if (rootNote !== null) {
      sequence.push(rootNote);
    } else {
      sequence.push(this.selectWeightedPitch(this.rootBias));
    }

    // Generate remaining notes using Markov transitions
    for (let i = 1; i < length; i++) {
      const currentPitch = sequence[sequence.length - 1];
      const nextPitch = this.selectNextPitch(currentPitch, entropy, rootNote);
      sequence.push(nextPitch);
    }

    // Convert to PitchClass objects
    return sequence.map(pitch => new PitchClass(pitch));
  }

  /**
   * Select next pitch based on interval weights from current pitch
   * @param entropy - Randomness level 0-100. Higher = flatter distribution (more leaps)
   * @param rootNote - Preferred root note for bias
   */
  private selectNextPitch(currentPitch: number, entropy: number, rootNote: number | null): number {
    const weights = new Map<number, number>();

    // Calculate weights for all 12 chromatic pitches
    for (const targetPitch of this.chromaticScale) {
      // Calculate interval distance (ascending or descending, whichever is shorter)
      const ascendingInterval = (targetPitch - currentPitch + 12) % 12;
      const descendingInterval = (currentPitch - targetPitch + 12) % 12;
      const interval = Math.min(ascendingInterval, descendingInterval);
      
      // Get base weight from transition matrix
      const baseWeight = this.transitionWeights.get(interval) || 1;
      
      // Apply root bias if applicable
      let rootBonus = 1.0;
      if (rootNote !== null && targetPitch === rootNote) {
        rootBonus = 2.5; // Strong bias to custom root
      } else {
        rootBonus = this.rootBias.get(targetPitch) || 1.0;
      }
      
      // Apply entropy factor
      // Low entropy (0) = strong bias (use weights as-is)
      // High entropy (100) = flatten distribution (average toward uniform)
      const entropyFactor = entropy / 100;
      const uniformWeight = 5; // Average weight value
      const adjustedWeight = baseWeight * (1 - entropyFactor) + uniformWeight * entropyFactor;
      
      weights.set(targetPitch, adjustedWeight * rootBonus);
    }

    return this.selectWeightedPitch(weights);
  }

  /**
   * Weighted random selection from pitch-weight map
   */
  private selectWeightedPitch(weights: Map<number, number>): number {
    const totalWeight = Array.from(weights.values()).reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for (const [pitch, weight] of weights.entries()) {
      random -= weight;
      if (random <= 0) {
        return pitch;
      }
    }

    // Fallback (should never reach here)
    return Array.from(weights.keys())[0];
  }
}
