/**
 * ViterbiRouter – Ergonomic path-finder for 5-string bass fretboard
 *
 * Uses the Viterbi dynamic-programming algorithm to find the optimal sequence
 * of [string, fret] positions for a given sequence of pitch classes, minimising
 * total hand-movement cost while respecting hard topological constraints.
 *
 * Hard constraints
 * ────────────────
 * • Fret range:     f ∈ {0, 1, …, 24}               (enforced by Fretboard)
 * • Position window: |f_u − f_v| > maxFretStretch  →  P(v|u) = 0  (invalid edge)
 *
 * Heuristic cost (log-probability)
 * ─────────────────────────────────
 *   cost(u → v) = λ₁·|f_u − f_v| + λ₂·|s_u − s_v|
 *
 * where λ₁ = fretShiftWeight (default 0.8) and λ₂ = stringJumpWeight (default 0.5).
 * This is equivalent to P(v|u) ∝ exp(−(λ₁·|Δf| + λ₂·|Δs|)).
 */

import { type FretPosition, Fretboard } from './Fretboard.js';
import type { PitchClass } from './PitchClass.js';

export interface PathNode {
  /** 1-indexed string (1 = G2 … 5 = B0). */
  string: number;
  /** Fret number in [0, 24]. */
  fret: number;
  /** Chromatic pitch class of this note (0–11). */
  pitch?: number;
  /** Accumulated Viterbi cost at this node. */
  cost?: number;
}

export interface ViterbiOptions {
  /** λ₁ – weight for horizontal (fret) movement. Default: 0.8 */
  fretShiftWeight?: number;
  /** λ₂ – weight for vertical (string) movement. Default: 0.5 */
  stringJumpWeight?: number;
  /**
   * Maximum allowed fret distance between consecutive notes.
   * Transitions where |Δf| > maxFretJump are hard-blocked (P = 0).
   * Default: 5
   */
  maxFretStretch?: number;
}

// ─── Internal types ──────────────────────────────────────────────────────────

interface ViterbiCell {
  /** Cumulative minimum cost to reach this cell, or Infinity if unreachable. */
  cost: number;
  /** Index into the previous time-step's state array, or -1 for t = 0. */
  prevIndex: number;
}

// ─── ViterbiRouter ───────────────────────────────────────────────────────────

export class ViterbiRouter {
  private readonly fretboard: Fretboard;
  private readonly lambda1: number;
  private readonly lambda2: number;
  private readonly maxFretStretch: number;

  constructor(fretboard: Fretboard, options: ViterbiOptions = {}) {
    this.fretboard = fretboard;
    this.lambda1 = options.fretShiftWeight ?? 0.8;
    this.lambda2 = options.stringJumpWeight ?? 0.5;
    this.maxFretStretch = options.maxFretStretch ?? 5;
  }

  // ─── Transition cost ───────────────────────────────────────────────────────

  /**
   * Returns the edge cost between two adjacent nodes u → v.
   *
   * • Returns Infinity when the hard fret-window constraint is violated
   *   (|f_u − f_v| > maxFretStretch).
   * • Otherwise returns λ₁·|Δf| + λ₂·|Δs|  (≥ 0).
   */
  private transitionCost(u: FretPosition, v: FretPosition): number {
    const fretDiff = Math.abs(u.fret - v.fret);

    // Hard constraint: fret jump exceeds allowed window → invalid transition
    if (fretDiff > this.maxFretStretch) {
      return Infinity;
    }

    const stringDiff = Math.abs(u.string - v.string);
    return this.lambda1 * fretDiff + this.lambda2 * stringDiff;
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Finds the ergonomically optimal path through the fretboard for the given
   * sequence of pitch classes using the Viterbi algorithm.
   *
   * @param sequence - Ordered array of pitch classes to route.
   * @returns Array of PathNode with string/fret positions, same length as input.
   */
  findOptimalPath(sequence: PitchClass[]): PathNode[] {
    if (sequence.length === 0) return [];

    // Build the state lattice: one column of candidate positions per time step
    const lattice: FretPosition[][] = sequence.map(pc =>
      this.fretboard.getPositionsForPitch(pc.pitch),
    );

    // Guard: if any column is empty the pitch has no representation → return []
    for (const col of lattice) {
      if (col.length === 0) return [];
    }

    const T = sequence.length;
    const dp: ViterbiCell[][] = new Array(T);

    // Initialise first column – no transition cost at t = 0
    dp[0] = lattice[0].map(() => ({ cost: 0, prevIndex: -1 }));

    // Forward pass: fill the DP table column by column
    for (let t = 1; t < T; t++) {
      const prevStates = lattice[t - 1];
      const currStates = lattice[t];
      const prevDp = dp[t - 1];

      dp[t] = currStates.map(v => {
        let bestCost = Infinity;
        let bestPrev = -1;

        for (let i = 0; i < prevStates.length; i++) {
          const prevCost = prevDp[i].cost;
          if (prevCost === Infinity) continue;

          const edge = this.transitionCost(prevStates[i], v);
          if (edge === Infinity) continue;

          const total = prevCost + edge;
          if (total < bestCost) {
            bestCost = total;
            bestPrev = i;
          }
        }

        return { cost: bestCost, prevIndex: bestPrev };
      });
    }

    // Find the best final state in the last column
    const lastCol = dp[T - 1];
    let bestFinalIdx = 0;
    let bestFinalCost = Infinity;

    for (let j = 0; j < lastCol.length; j++) {
      if (lastCol[j].cost < bestFinalCost) {
        bestFinalCost = lastCol[j].cost;
        bestFinalIdx = j;
      }
    }

    // Backtrack through the DP table to recover the optimal path
    const path: PathNode[] = new Array(T);
    let idx = bestFinalIdx;

    for (let t = T - 1; t >= 0; t--) {
      const pos = lattice[t][idx];
      path[t] = {
        string: pos.string,
        fret: pos.fret,
        pitch: pos.midiNote % 12,
        cost: dp[t][idx].cost,
      };
      idx = dp[t][idx].prevIndex;
    }

    return path;
  }

  /**
   * Calculates the total transition cost of an already-computed path.
   * Useful for comparing alternative routings or logging diagnostics.
   *
   * @returns Total cost, or Infinity if any edge violates the hard constraint.
   */
  calculatePathCost(path: PathNode[]): number {
    if (path.length < 2) return 0;

    let total = 0;

    for (let i = 1; i < path.length; i++) {
      const u: FretPosition = {
        string: path[i - 1].string,
        fret: path[i - 1].fret,
        midiNote: 0, // not needed for cost calculation
      };
      const v: FretPosition = {
        string: path[i].string,
        fret: path[i].fret,
        midiNote: 0,
      };

      const edge = this.transitionCost(u, v);
      if (edge === Infinity) return Infinity;
      total += edge;
    }

    return total;
  }
}
