import { describe, expect, it } from 'vitest';
import { Fretboard } from '../src/Fretboard.js';
import { PitchClass } from '../src/PitchClass.js';
import { ViterbiRouter } from '../src/ViterbiRouter.js';

/**
 * Builds a sequence of mocked PitchClass inputs, isolating the ViterbiRouter
 * from any note-parsing/generation concerns.
 */
function toSequence(pitches: number[]): PitchClass[] {
  return pitches.map(pitch => new PitchClass(pitch));
}

describe('ViterbiRouter.findOptimalPath', () => {
  it('never returns fret positions outside the [0, 24] range', () => {
    const router = new ViterbiRouter(new Fretboard());
    // A chromatic run covering all 12 pitch classes twice to exercise many edges.
    const sequence = toSequence([0, 4, 7, 11, 2, 9, 5, 3, 8, 6, 1, 10, 0, 7]);

    const path = router.findOptimalPath(sequence);

    expect(path).toHaveLength(sequence.length);
    for (const node of path) {
      expect(node.fret).toBeGreaterThanOrEqual(0);
      expect(node.fret).toBeLessThanOrEqual(24);
      expect(Number.isInteger(node.fret)).toBe(true);
    }
  });

  it('never selects a transition that violates the maxFretStretch window', () => {
    const maxFretStretch = 3;
    const router = new ViterbiRouter(new Fretboard(), { maxFretStretch });
    const sequence = toSequence([0, 6, 1, 7, 2, 8, 3, 9]);

    const path = router.findOptimalPath(sequence);

    for (let i = 1; i < path.length; i++) {
      const fretDiff = Math.abs(path[i].fret - path[i - 1].fret);
      expect(fretDiff).toBeLessThanOrEqual(maxFretStretch);
    }
  });

  it('does not produce NaN or Infinity costs even with severe penalty weights', () => {
    const router = new ViterbiRouter(new Fretboard(), {
      fretShiftWeight: 1000,
      stringJumpWeight: 1000,
      maxFretStretch: 1,
    });
    const sequence = toSequence([0, 11, 1, 10, 2, 9]);

    const path = router.findOptimalPath(sequence);

    expect(path).toHaveLength(sequence.length);
    for (const node of path) {
      expect(Number.isNaN(node.cost)).toBe(false);
      expect(Number.isFinite(node.cost)).toBe(true);
      expect(Number.isNaN(node.fret)).toBe(false);
    }

    const totalCost = router.calculatePathCost(path);
    expect(Number.isNaN(totalCost)).toBe(false);
  });

  it('returns an empty array for an empty input sequence', () => {
    const router = new ViterbiRouter(new Fretboard());
    expect(router.findOptimalPath([])).toEqual([]);
  });
});
