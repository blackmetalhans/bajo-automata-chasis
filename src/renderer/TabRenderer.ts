/**
 * TabRenderer – Dynamic bass tablature renderer
 *
 * Consumes an array of [string, fret] tuples produced by ViterbiRouter and
 * renders a standard 5-line bass tablature below the main fretboard using SVG.
 *
 * String layout (top → bottom, matching standard tab notation):
 *   G  (string 1 – highest pitch)
 *   D  (string 2)
 *   A  (string 3)
 *   E  (string 4)
 *   B  (string 5 – lowest pitch)
 *
 * Features
 * ─────────
 * • SVG-based, sharp at any resolution.
 * • Horizontal autoscroll when the sequence exceeds the viewport width.
 * • Fully re-rendered on every `render()` call.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

// ─── Constants ───────────────────────────────────────────────────────────────

const NUM_STRINGS = 5;
const STRING_LABELS = ['G', 'D', 'A', 'E', 'B'] as const;

const PAD_LEFT = 44;      // space for string labels
const PAD_RIGHT = 24;
const PAD_TOP = 16;
const PAD_BOTTOM = 16;
const STRING_SPACING = 22; // vertical distance between string lines (px)
const NOTE_SPACING = 44;   // horizontal distance between note columns (px)
const LINE_COLOR = '#555566';
const LABEL_COLOR = '#8888aa';
const NUMBER_COLOR = '#00e5ff';
const DASH_COLOR = '#3a3a50';
const BG_COLOR = '#12121a';
const FONT_FAMILY = "ui-monospace, 'Cascadia Code', 'Fira Mono', monospace";

// Total SVG height (fixed)
const SVG_HEIGHT = PAD_TOP + (NUM_STRINGS - 1) * STRING_SPACING + PAD_BOTTOM;

// ─── Public API types ─────────────────────────────────────────────────────────

export interface TabNote {
  /** 1-indexed string (1 = G … 5 = B). */
  string: number;
  /** Fret number in [0, 24]. */
  fret: number;
}

// ─── TabRenderer ─────────────────────────────────────────────────────────────

export class TabRenderer {
  private readonly wrapper: HTMLDivElement;

  /**
   * @param fretboardContainerId – ID of the element that contains the
   *   SvgFretboard (defaults to `'app'`).  The tab view is injected
   *   immediately after that element.
   */
  constructor(fretboardContainerId: string = 'app') {
    const anchor = document.getElementById(fretboardContainerId);
    if (!anchor) {
      throw new Error(`TabRenderer: container '#${fretboardContainerId}' not found.`);
    }

    // Reuse or create the wrapper element
    const existing = document.getElementById('tab-view');
    if (existing instanceof HTMLDivElement) {
      this.wrapper = existing;
    } else {
      this.wrapper = document.createElement('div');
      this.wrapper.id = 'tab-view';
      this.wrapper.style.overflowX = 'auto';
      this.wrapper.style.width = '100%';
      this.wrapper.style.background = BG_COLOR;
      this.wrapper.style.borderTop = '1px solid #2a2a3a';
      this.wrapper.style.paddingTop = '4px';
      anchor.insertAdjacentElement('afterend', this.wrapper);
    }
  }

  // ─── Coordinate helpers ──────────────────────────────────────────────────

  /** Y-coordinate of a string line (string 1 = top). */
  private stringY(stringIndex: number): number {
    return PAD_TOP + (stringIndex - 1) * STRING_SPACING;
  }

  /** X-coordinate of a note column. */
  private noteX(colIndex: number): number {
    return PAD_LEFT + colIndex * NOTE_SPACING + NOTE_SPACING / 2;
  }

  // ─── SVG helpers ─────────────────────────────────────────────────────────

  private makeSvgElement<K extends keyof SVGElementTagNameMap>(
    tag: K,
  ): SVGElementTagNameMap[K] {
    return document.createElementNS(SVG_NS, tag) as SVGElementTagNameMap[K];
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  /**
   * Renders the tablature for the given sequence of notes.
   * Clears and replaces any previously rendered content.
   *
   * @param notes – Array of TabNote objects from ViterbiRouter.
   */
  render(notes: readonly TabNote[]): void {
    this.wrapper.innerHTML = '';

    const numCols = notes.length;
    const svgWidth = PAD_LEFT + numCols * NOTE_SPACING + PAD_RIGHT;

    const svg = this.makeSvgElement('svg');
    svg.setAttribute('viewBox', `0 0 ${svgWidth} ${SVG_HEIGHT}`);
    svg.setAttribute('xmlns', SVG_NS);
    svg.style.display = 'block';
    svg.style.minWidth = `${svgWidth}px`;
    svg.style.height = `${SVG_HEIGHT}px`;

    // Background
    const bg = this.makeSvgElement('rect');
    bg.setAttribute('width', String(svgWidth));
    bg.setAttribute('height', String(SVG_HEIGHT));
    bg.setAttribute('fill', BG_COLOR);
    svg.appendChild(bg);

    // String lines and labels
    for (let s = 1; s <= NUM_STRINGS; s++) {
      const y = this.stringY(s);

      // Horizontal string line
      const line = this.makeSvgElement('line');
      line.setAttribute('x1', String(PAD_LEFT));
      line.setAttribute('x2', String(svgWidth - PAD_RIGHT));
      line.setAttribute('y1', String(y));
      line.setAttribute('y2', String(y));
      line.setAttribute('stroke', LINE_COLOR);
      line.setAttribute('stroke-width', '1');
      svg.appendChild(line);

      // String label (G, D, A, E, B)
      const label = this.makeSvgElement('text');
      label.setAttribute('x', String(PAD_LEFT - 8));
      label.setAttribute('y', String(y + 4));
      label.setAttribute('text-anchor', 'end');
      label.setAttribute('font-family', FONT_FAMILY);
      label.setAttribute('font-size', '11');
      label.setAttribute('fill', LABEL_COLOR);
      label.setAttribute('font-weight', '600');
      label.textContent = STRING_LABELS[s - 1];
      svg.appendChild(label);
    }

    if (numCols === 0) {
      this.wrapper.appendChild(svg);
      return;
    }

    // Build a lookup: colIndex → stringIndex that has a note
    const noteMap = new Map<number, TabNote>();
    for (let i = 0; i < notes.length; i++) {
      noteMap.set(i, notes[i]);
    }

    // Render dashes and fret numbers column by column
    for (let col = 0; col < numCols; col++) {
      const activeNote = noteMap.get(col);
      const cx = this.noteX(col);

      for (let s = 1; s <= NUM_STRINGS; s++) {
        const y = this.stringY(s);

        if (activeNote && activeNote.string === s) {
          // Fret number on the active string
          const num = this.makeSvgElement('text');
          num.setAttribute('x', String(cx));
          num.setAttribute('y', String(y + 4));
          num.setAttribute('text-anchor', 'middle');
          num.setAttribute('font-family', FONT_FAMILY);
          num.setAttribute('font-size', '12');
          num.setAttribute('font-weight', '700');
          num.setAttribute('fill', NUMBER_COLOR);
          num.textContent = String(activeNote.fret);
          svg.appendChild(num);
        } else {
          // Dash on inactive strings
          const dash = this.makeSvgElement('text');
          dash.setAttribute('x', String(cx));
          dash.setAttribute('y', String(y + 4));
          dash.setAttribute('text-anchor', 'middle');
          dash.setAttribute('font-family', FONT_FAMILY);
          dash.setAttribute('font-size', '11');
          dash.setAttribute('fill', DASH_COLOR);
          dash.textContent = '-';
          svg.appendChild(dash);
        }
      }
    }

    this.wrapper.appendChild(svg);

    // Autoscroll to the end when the content overflows
    this.wrapper.scrollLeft = this.wrapper.scrollWidth;
  }
}
