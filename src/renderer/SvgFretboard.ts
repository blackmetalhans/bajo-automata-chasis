const SVG_NS = 'http://www.w3.org/2000/svg';

interface FretboardOptions {
  strings: number;
  frets: number;
  containerId: string;
}

interface FretNode {
  string: number;
  fret: number;
}

export class SvgFretboard {
  private readonly svg: SVGSVGElement;
  private readonly activeGroup: SVGGElement;

  private readonly VIEW_W = 1000;
  private readonly VIEW_H = 350;

  private readonly PAD_LEFT = 40;
  private readonly PAD_RIGHT = 20;
  private readonly PAD_TOP = 45;
  private readonly PAD_BOTTOM = 45;

  private readonly strings: number;
  private readonly frets: number;

  constructor({ strings, frets, containerId }: FretboardOptions) {
    this.strings = strings;
    this.frets = frets;

    const container = document.querySelector<HTMLElement>(`#${containerId}`);
    if (!container) throw new Error(`Container #${containerId} not found`);

    this.svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
    this.svg.setAttribute('viewBox', `0 0 ${this.VIEW_W} ${this.VIEW_H}`);
    this.svg.setAttribute('xmlns', SVG_NS);
    this.svg.style.width = '100%';
    this.svg.style.height = 'auto';
    this.svg.style.display = 'block';

    const bg = document.createElementNS(SVG_NS, 'rect') as SVGRectElement;
    bg.setAttribute('width', String(this.VIEW_W));
    bg.setAttribute('height', String(this.VIEW_H));
    bg.setAttribute('fill', '#16161a');
    this.svg.appendChild(bg);

    this._buildDefs();
    this._drawFrets();
    this._drawInlays();
    this._drawNut();
    this._drawStrings();

    this.activeGroup = document.createElementNS(SVG_NS, 'g') as SVGGElement;
    this.activeGroup.setAttribute('id', 'active-layer');
    this.svg.appendChild(this.activeGroup);

    container.innerHTML = '';
    container.appendChild(this.svg);
  }

  // ─── Coordinate helpers ──────────────────────────────────────────────────────

  /** Logarithmic equal-temperament fret x-position within the usable drawing area. */
  private fretX(fret: number): number {
    const usableW = this.VIEW_W - this.PAD_LEFT - this.PAD_RIGHT;
    return this.PAD_LEFT + usableW * (1 - 1 / Math.pow(2, fret / 12));
  }

  /** Y position for a string. string 1 = top (highest pitch), strings = bottom (lowest pitch / thickest). */
  private stringY(stringIndex: number): number {
    const usableH = this.VIEW_H - this.PAD_TOP - this.PAD_BOTTOM;
    const step = usableH / (this.strings - 1);
    return this.PAD_TOP + (stringIndex - 1) * step;
  }

  /** X center of the slot between fret-1 and fret (used for inlays and note placement). */
  private fretSlotCenterX(fret: number): number {
    return (this.fretX(fret - 1) + this.fretX(fret)) / 2;
  }

  // ─── Build ───────────────────────────────────────────────────────────────────

  private _buildDefs(): void {
    const defs = document.createElementNS(SVG_NS, 'defs') as SVGDefsElement;

    const filter = document.createElementNS(SVG_NS, 'filter') as SVGFilterElement;
    filter.setAttribute('id', 'cyan-glow');
    filter.setAttribute('x', '-50%');
    filter.setAttribute('y', '-50%');
    filter.setAttribute('width', '200%');
    filter.setAttribute('height', '200%');

    const blur = document.createElementNS(SVG_NS, 'feGaussianBlur') as SVGFEGaussianBlurElement;
    blur.setAttribute('stdDeviation', '4');
    blur.setAttribute('result', 'coloredBlur');

    const merge = document.createElementNS(SVG_NS, 'feMerge') as SVGFEMergeElement;
    const n1 = document.createElementNS(SVG_NS, 'feMergeNode') as SVGFEMergeNodeElement;
    n1.setAttribute('in', 'coloredBlur');
    const n2 = document.createElementNS(SVG_NS, 'feMergeNode') as SVGFEMergeNodeElement;
    n2.setAttribute('in', 'SourceGraphic');

    merge.appendChild(n1);
    merge.appendChild(n2);
    filter.appendChild(blur);
    filter.appendChild(merge);
    defs.appendChild(filter);
    this.svg.appendChild(defs);
  }

  private _drawNut(): void {
    const nut = document.createElementNS(SVG_NS, 'line') as SVGLineElement;
    nut.setAttribute('x1', String(this.PAD_LEFT));
    nut.setAttribute('x2', String(this.PAD_LEFT));
    nut.setAttribute('y1', String(this.PAD_TOP));
    nut.setAttribute('y2', String(this.VIEW_H - this.PAD_BOTTOM));
    nut.setAttribute('stroke', '#c8a96e');
    nut.setAttribute('stroke-width', '5');
    nut.setAttribute('stroke-linecap', 'round');
    this.svg.appendChild(nut);
  }

  private _drawFrets(): void {
    const group = document.createElementNS(SVG_NS, 'g') as SVGGElement;
    group.setAttribute('id', 'frets');

    for (let f = 1; f <= this.frets; f++) {
      const x = this.fretX(f);
      const line = document.createElementNS(SVG_NS, 'line') as SVGLineElement;
      line.setAttribute('x1', String(x));
      line.setAttribute('x2', String(x));
      line.setAttribute('y1', String(this.PAD_TOP));
      line.setAttribute('y2', String(this.VIEW_H - this.PAD_BOTTOM));
      line.setAttribute('stroke', '#4a4a5a');
      line.setAttribute('stroke-width', '1.5');
      group.appendChild(line);
    }

    this.svg.appendChild(group);
  }

  private _drawStrings(): void {
    const group = document.createElementNS(SVG_NS, 'g') as SVGGElement;
    group.setAttribute('id', 'strings');

    const maxThickness = 3.5;
    const minThickness = 1.0;

    for (let s = 1; s <= this.strings; s++) {
      const y = this.stringY(s);
      // Higher string index = lower pitch = thicker gauge
      const t = (s - 1) / (this.strings - 1);
      const strokeW = minThickness + t * (maxThickness - minThickness);

      const line = document.createElementNS(SVG_NS, 'line') as SVGLineElement;
      line.setAttribute('x1', String(this.PAD_LEFT));
      line.setAttribute('x2', String(this.VIEW_W - this.PAD_RIGHT));
      line.setAttribute('y1', String(y));
      line.setAttribute('y2', String(y));
      line.setAttribute('stroke', '#8888aa');
      line.setAttribute('stroke-width', String(strokeW));
      group.appendChild(line);
    }

    this.svg.appendChild(group);
  }

  private _drawInlays(): void {
    const group = document.createElementNS(SVG_NS, 'g') as SVGGElement;
    group.setAttribute('id', 'inlays');

    const singleFrets = [3, 5, 7, 9, 15, 17, 19, 21];
    const doubleFrets = [12, 24];
    const midY = this.VIEW_H / 2;
    const r = 5;
    const color = '#3a3a50';

    const makeCircle = (cx: number, cy: number): SVGCircleElement => {
      const c = document.createElementNS(SVG_NS, 'circle') as SVGCircleElement;
      c.setAttribute('cx', String(cx));
      c.setAttribute('cy', String(cy));
      c.setAttribute('r', String(r));
      c.setAttribute('fill', color);
      return c;
    };

    for (const f of singleFrets) {
      if (f > this.frets) continue;
      group.appendChild(makeCircle(this.fretSlotCenterX(f), midY));
    }

    for (const f of doubleFrets) {
      if (f > this.frets) continue;
      const cx = this.fretSlotCenterX(f);
      group.appendChild(makeCircle(cx, midY - 18));
      group.appendChild(makeCircle(cx, midY + 18));
    }

    this.svg.appendChild(group);
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  renderPath(nodes: FretNode[]): void {
    while (this.activeGroup.firstChild) {
      this.activeGroup.removeChild(this.activeGroup.firstChild);
    }

    if (nodes.length === 0) return;

    const coords = nodes.map(({ string, fret }) => ({
      x: fret === 0 ? this.PAD_LEFT : this.fretSlotCenterX(fret),
      y: this.stringY(string),
    }));

    if (coords.length > 1) {
      const points = coords.map(({ x, y }) => `${x},${y}`).join(' ');
      const poly = document.createElementNS(SVG_NS, 'polyline') as SVGPolylineElement;
      poly.setAttribute('points', points);
      poly.setAttribute('fill', 'none');
      poly.setAttribute('stroke', '#00e5ff');
      poly.setAttribute('stroke-width', '2');
      poly.setAttribute('stroke-linecap', 'round');
      poly.setAttribute('stroke-linejoin', 'round');
      poly.setAttribute('filter', 'url(#cyan-glow)');
      this.activeGroup.appendChild(poly);
    }

    for (let i = 0; i < coords.length; i++) {
      const { x, y } = coords[i];
      const circle = document.createElementNS(SVG_NS, 'circle') as SVGCircleElement;
      circle.setAttribute('cx', String(x));
      circle.setAttribute('cy', String(y));
      circle.setAttribute('r', '10');
      circle.setAttribute('fill', '#00e5ff');
      circle.setAttribute('filter', 'url(#cyan-glow)');
      this.activeGroup.appendChild(circle);

      const label = document.createElementNS(SVG_NS, 'text') as SVGTextElement;
      label.setAttribute('x', String(x));
      label.setAttribute('y', String(y));
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('dominant-baseline', 'central');
      label.setAttribute('font-size', '9');
      label.setAttribute('font-weight', 'bold');
      label.setAttribute('fill', '#0a2a2a');
      label.setAttribute('pointer-events', 'none');
      label.textContent = String(nodes[i].fret);
      this.activeGroup.appendChild(label);
    }
  }
}
