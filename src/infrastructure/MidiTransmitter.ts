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

export class MidiTransmitter {
  private midiOutput: MIDIOutput | null = null;
  private playbackTimeouts: number[] = [];
  
  // 5-string bass standard tuning (B0 to G2)
  // B0=23, E1=28, A1=33, D2=38, G2=43
  private readonly tuningOffsets = [23, 28, 33, 38, 43];

  constructor() {
    this.initializeMidi();
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

    const noteDuration = this.calculateNoteDuration(bpm);
    const velocity = 100; // MIDI velocity (0-127)

    console.log(`🎵 Playing sequence: ${path.length} notes @ ${bpm} BPM`);

    for (let i = 0; i < path.length; i++) {
      const node = path[i];
      const midiNote = this.calculateMidiNote(node.string, node.fret);

      // Note ON (0x90 = note on, channel 0)
      this.midiOutput.send([0x90, midiNote, velocity]);
      console.log(`  ♪ Note ${i + 1}: String ${node.string}, Fret ${node.fret} → MIDI ${midiNote}`);

      // Wait for note duration
      await this.sleep(noteDuration * 0.8); // 80% duration for slight staccato

      // Note OFF (0x80 = note off, channel 0)
      this.midiOutput.send([0x80, midiNote, 0]);

      // Brief gap before next note (20% of duration)
      if (i < path.length - 1) {
        await this.sleep(noteDuration * 0.2);
      }
    }

    console.log('✅ Sequence complete');
  }

  /**
   * Stop any ongoing playback
   * Clears all scheduled timeouts and sends all notes off
   */
  stopPlayback(): void {
    // Clear all scheduled timeouts
    this.playbackTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    this.playbackTimeouts = [];

    // Send all notes off message (CC 123)
    if (this.midiOutput) {
      this.midiOutput.send([0xB0, 123, 0]); // All notes off
      console.log('🛑 Playback stopped, all notes off');
    }
  }

  /**
   * Promise-based sleep utility
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => {
      const timeoutId = window.setTimeout(resolve, ms);
      this.playbackTimeouts.push(timeoutId);
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
