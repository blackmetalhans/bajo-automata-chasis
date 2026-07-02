/**
 * Fretboard - Physical model of a 5-string bass guitar
 *
 * Standard 5-string tuning (low-to-high): B0, E1, A1, D2, G2
 *
 * String numbering convention (matches SvgFretboard):
 *   1 = G2  (highest pitch, thinnest string, top of visual fretboard)
 *   2 = D2
 *   3 = A1
 *   4 = E1
 *   5 = B0  (lowest pitch, thickest string, bottom of visual fretboard)
 *
 * Fret range: 0 (open) to 24.
 */

export interface FretPosition {
  /** 1-indexed string (1 = G2 … 5 = B0). */
  string: number;
  /** Fret number in [0, 24]. */
  fret: number;
  /** Absolute MIDI note number. */
  midiNote: number;
}

export class Fretboard {
  static readonly NUM_STRINGS = 5;
  static readonly MIN_FRET = 0;
  static readonly MAX_FRET = 24;

  /**
   * Open-string MIDI note numbers, indexed 1–5
   * (index 0 is unused to keep 1-based alignment).
   */
  private readonly openStringMidi: readonly number[] = [
    0,   // unused (padding for 1-based indexing)
    43,  // string 1 – G2
    38,  // string 2 – D2
    33,  // string 3 – A1
    28,  // string 4 – E1
    23,  // string 5 – B0
  ];

  /**
   * Returns every fretboard position that produces the given pitch class.
   * Results are bounded to frets [0, 24] and ordered string-first, fret-second.
   */
  getPositionsForPitch(pitchClass: number): FretPosition[] {
    const positions: FretPosition[] = [];
    const targetPc = ((pitchClass % 12) + 12) % 12;

    for (let s = 1; s <= Fretboard.NUM_STRINGS; s++) {
      for (let f = Fretboard.MIN_FRET; f <= Fretboard.MAX_FRET; f++) {
        const midiNote = this.openStringMidi[s] + f;
        if (((midiNote % 12) + 12) % 12 === targetPc) {
          positions.push({ string: s, fret: f, midiNote });
        }
      }
    }

    return positions;
  }

  /** MIDI note number for a given string/fret pair. */
  midiNoteAt(string: number, fret: number): number {
    if (string < 1 || string > Fretboard.NUM_STRINGS) {
      throw new RangeError(`Invalid string index: ${string}. Must be 1–${Fretboard.NUM_STRINGS}.`);
    }
    if (fret < Fretboard.MIN_FRET || fret > Fretboard.MAX_FRET) {
      throw new RangeError(`Invalid fret: ${fret}. Must be ${Fretboard.MIN_FRET}–${Fretboard.MAX_FRET}.`);
    }
    return this.openStringMidi[string] + fret;
  }
}
