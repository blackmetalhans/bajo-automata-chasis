/**
 * MidiTransmitter - Web MIDI API bridge to DAW (Reaper)
 * 
 * Converts PathNode sequences into MIDI messages and transmits them
 * to the first available MIDI output device.
 */

interface PathNode {
  string: number;
  fret: number;
  pitch?: number;
  cost?: number;
}

export type PlaybackState = 'stopped' | 'playing' | 'paused';

export class MidiTransmitter {
  private midiOutput: MIDIOutput | null = null;
  private playbackTimeouts: number[] = [];
  private playbackResolves: Array<() => void> = [];
  private _playbackState: PlaybackState = 'stopped';
  
  // 5-string bass standard tuning (B0 to G2)
  // B0=23, E1=28, A1=33, D2=38, G2=43
  private readonly tuningOffsets = [23, 28, 33, 38, 43];

  constructor() {
    this.initializeMidi();
  }

  /**
   * Current transport state.
   */
  get playbackState(): PlaybackState {
    return this._playbackState;
  }

  /**
   * Request MIDI access and store the first available output
   */
  private async initializeMidi() {
    try {
      if (!navigator.requestMIDIAccess) {
        console.error('⚠️ Web MIDI API not supported in this browser');
        return;
      }

      const midiAccess = await navigator.requestMIDIAccess();
      const outputs = Array.from(midiAccess.outputs.values());

      if (outputs.length === 0) {
        console.warn('⚠️ No MIDI output devices found. Connect a virtual MIDI port or hardware interface.');
        return;
      }

      this.midiOutput = outputs[0];
      console.log(`✅ MIDI connected: ${this.midiOutput.name || 'Unknown Device'}`);
      console.log(`📡 Available outputs: ${outputs.map(o => o.name).join(', ')}`);
    } catch (error) {
      console.error('❌ MIDI initialization failed:', error);
    }
  }

  /**
   * Convert physical bass position to absolute MIDI note number
   * @param string - String index (0-4)
   * @param fret - Fret number (0-24)
   * @returns MIDI note number (0-127)
   */
  private calculateMidiNote(string: number, fret: number): number {
    if (string < 0 || string >= this.tuningOffsets.length) {
      throw new Error(`Invalid string index: ${string}. Must be 0-4.`);
    }
    return this.tuningOffsets[string] + fret;
  }

  /**
   * Calculate note duration in milliseconds from BPM
   * Assumes quarter notes
   * @param bpm - Beats per minute
   * @returns Duration in milliseconds
   */
  private calculateNoteDuration(bpm: number): number {
    const quarterNoteDuration = (60 / bpm) * 1000;
    return quarterNoteDuration;
  }

  /**
   * Play a sequence of notes with timing based on BPM
   * @param path - Array of PathNode objects from Viterbi router
   * @param bpm - Beats per minute (default: 120)
   */
  async playSequence(path: PathNode[], bpm: number = 120): Promise<void> {
    if (!this.midiOutput) {
      console.warn('⚠️ Cannot play sequence: No MIDI output available');
      return;
    }

    if (path.length === 0) {
      console.warn('⚠️ Cannot play empty sequence');
      return;
    }

    // Stop any prior playback before starting
    this._cancelTimeouts();
    this._playbackState = 'playing';

    const noteDuration = this.calculateNoteDuration(bpm);
    const velocity = 100; // MIDI velocity (0-127)

    console.log(`🎵 Playing sequence: ${path.length} notes @ ${bpm} BPM`);

    for (let i = 0; i < path.length; i++) {
      if (this._playbackState !== 'playing') break;

      const node = path[i];
      const midiNote = this.calculateMidiNote(node.string, node.fret);

      // Note ON (0x90 = note on, channel 0)
      this.midiOutput.send([0x90, midiNote, velocity]);
      console.log(`  ♪ Note ${i + 1}: String ${node.string}, Fret ${node.fret} → MIDI ${midiNote}`);

      // Wait for note duration (sleep resolves early if cancelled by pause/stop)
      await this.sleep(noteDuration * 0.8); // 80% duration for slight staccato

      // Note OFF (0x80 = note off, channel 0) — always send to prevent hanging notes
      this.midiOutput.send([0x80, midiNote, 0]);

      if (this._playbackState !== 'playing') break;

      // Brief gap before next note (20% of duration)
      if (i < path.length - 1) {
        await this.sleep(noteDuration * 0.2);
      }
    }

    if (this._playbackState === 'playing') {
      this._playbackState = 'stopped';
      console.log('✅ Sequence complete');
    }
  }

  /**
   * Pause any ongoing playback.
   * Clears all scheduled timeouts and sends All Notes Off (CC 123) on channel 0.
   */
  pause(): void {
    if (this._playbackState !== 'playing') return;
    this._playbackState = 'paused';
    this._cancelTimeouts();
    this._allNotesOff();
    console.log('⏸ Playback paused');
  }

  /**
   * Stop any ongoing playback.
   * Clears all scheduled timeouts and sends All Notes Off (CC 123) on channel 0.
   */
  stop(): void {
    this._playbackState = 'stopped';
    this._cancelTimeouts();
    this._allNotesOff();
    console.log('🛑 Playback stopped, all notes off');
  }

  /**
   * Stop any ongoing playback (alias kept for backwards compatibility).
   */
  stopPlayback(): void {
    this.stop();
  }

  /**
   * Send MIDI CC 123 (All Notes Off) on channel 0 to prevent hanging notes.
   */
  private _allNotesOff(): void {
    if (this.midiOutput) {
      this.midiOutput.send([0xB0, 123, 0]); // CC 123 = All Notes Off, channel 0
    }
  }

  /**
   * Clear all pending timeout handles and immediately resolve any awaiting sleeps,
   * so the async playSequence loop can observe the state change and exit cleanly.
   */
  private _cancelTimeouts(): void {
    this.playbackTimeouts.forEach(id => clearTimeout(id));
    this.playbackTimeouts = [];
    // Resolve pending sleeps so the async loop exits rather than hanging forever
    this.playbackResolves.forEach(resolve => resolve());
    this.playbackResolves = [];
  }

  /**
   * Promise-based sleep utility
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => {
      const timeoutId = window.setTimeout(() => {
        this.playbackResolves = this.playbackResolves.filter(r => r !== resolve);
        resolve();
      }, ms);
      this.playbackTimeouts.push(timeoutId);
      this.playbackResolves.push(resolve);
    });
  }

  /**
   * Get current MIDI output device name
   */
  getOutputName(): string {
    return this.midiOutput?.name || 'Not connected';
  }

  /**
   * Check if MIDI is ready
   */
  isReady(): boolean {
    return this.midiOutput !== null;
  }
}
