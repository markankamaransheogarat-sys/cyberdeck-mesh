/**
 * Cyberdeck Acoustic Ultrasonic Modem DSP Engine
 * Frequency-Shift Keying (BFSK) & Goertzel Tone Discriminator
 */

export interface FskConfig {
  sampleRate: number;      // e.g. 44100 or 48000 Hz
  freqMark: number;        // 19500 Hz (Bit 1)
  freqSpace: number;       // 18500 Hz (Bit 0)
  freqPreamble: number;    // 17500 Hz (Sync Tone)
  baudRate: number;        // 100 baud (10ms per bit)
}

export const DEFAULT_FSK_CONFIG: FskConfig = {
  sampleRate: 44100,
  freqMark: 19500,
  freqSpace: 18500,
  freqPreamble: 17500,
  baudRate: 100,
};

export class GoertzelFilter {
  private coeff: number;
  private sPrev: number = 0;
  private sPrev2: number = 0;
  private blockSize: number;

  constructor(targetFreq: number, sampleRate: number, blockSize: number) {
    this.blockSize = blockSize;
    const k = Math.round((blockSize * targetFreq) / sampleRate);
    const omega = (2 * Math.PI * k) / blockSize;
    this.coeff = 2 * Math.cos(omega);
    this.reset();
  }

  public reset(): void {
    this.sPrev = 0;
    this.sPrev2 = 0;
  }

  public processSample(x: number): void {
    const s = x + this.coeff * this.sPrev - this.sPrev2;
    this.sPrev2 = this.sPrev;
    this.sPrev = s;
  }

  public computePower(): number {
    const power = this.sPrev * this.sPrev + this.sPrev2 * this.sPrev2 - this.sPrev * this.sPrev2 * this.coeff;
    this.reset();
    return Math.max(0, power);
  }
}

export class FskModulator {
  private config: FskConfig;

  constructor(config: FskConfig = DEFAULT_FSK_CONFIG) {
    this.config = config;
  }

  /**
   * Modulates binary bitstream into raw PCM audio float samples [-1.0 .. +1.0]
   */
  public modulateBits(bits: number[]): Float32Array {
    const samplesPerBit = Math.round(this.config.sampleRate / this.config.baudRate);
    const preambleBits = 8; // 8 sync bits
    const totalBits = preambleBits + bits.length;
    const totalSamples = totalBits * samplesPerBit;

    const audioBuffer = new Float32Array(totalSamples);
    let sampleIdx = 0;
    let phase = 0;

    // 1. Generate Preamble Tone (17.5 kHz)
    const phaseIncPreamble = (2 * Math.PI * this.config.freqPreamble) / this.config.sampleRate;
    for (let b = 0; b < preambleBits; b++) {
      for (let s = 0; s < samplesPerBit; s++) {
        audioBuffer[sampleIdx++] = Math.sin(phase) * 0.9;
        phase += phaseIncPreamble;
        if (phase > 2 * Math.PI) phase -= 2 * Math.PI;
      }
    }

    // 2. Modulate Payload Bits (Mark = 19.5kHz, Space = 18.5kHz)
    for (let b = 0; b < bits.length; b++) {
      const bit = bits[b];
      const freq = bit === 1 ? this.config.freqMark : this.config.freqSpace;
      const phaseInc = (2 * Math.PI * freq) / this.config.sampleRate;

      for (let s = 0; s < samplesPerBit; s++) {
        // Apply Tukey / Hann window at bit edges to reduce spectral splatter
        const windowEnvelope = Math.sin((Math.PI * s) / samplesPerBit);
        audioBuffer[sampleIdx++] = Math.sin(phase) * windowEnvelope * 0.95;
        phase += phaseInc;
        if (phase > 2 * Math.PI) phase -= 2 * Math.PI;
      }
    }

    return audioBuffer;
  }

  /**
   * Converts byte array to bit array (MSB first)
   */
  public static bytesToBits(bytes: Uint8Array): number[] {
    const bits: number[] = [];
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];
      for (let b = 7; b >= 0; b--) {
        bits.push((byte >> b) & 1);
      }
    }
    return bits;
  }

  /**
   * Converts bit array back to byte array
   */
  public static bitsToBytes(bits: number[]): Uint8Array {
    const byteCount = Math.floor(bits.length / 8);
    const bytes = new Uint8Array(byteCount);
    for (let i = 0; i < byteCount; i++) {
      let byte = 0;
      for (let b = 0; b < 8; b++) {
        byte = (byte << 1) | bits[i * 8 + b];
      }
      bytes[i] = byte;
    }
    return bytes;
  }
}

export class FskDemodulator {
  private config: FskConfig;
  private filterMark: GoertzelFilter;
  private filterSpace: GoertzelFilter;
  private filterPreamble: GoertzelFilter;
  private samplesPerBit: number;

  constructor(config: FskConfig = DEFAULT_FSK_CONFIG) {
    this.config = config;
    this.samplesPerBit = Math.round(config.sampleRate / config.baudRate);
    this.filterMark = new GoertzelFilter(config.freqMark, config.sampleRate, this.samplesPerBit);
    this.filterSpace = new GoertzelFilter(config.freqSpace, config.sampleRate, this.samplesPerBit);
    this.filterPreamble = new GoertzelFilter(config.freqPreamble, config.sampleRate, this.samplesPerBit);
  }

  /**
   * Demodulates audio buffer into recovered bits
   */
  public demodulateAudio(samples: Float32Array): number[] {
    const recoveredBits: number[] = [];
    let idx = 0;

    // Scan for preamble sync tone
    let inPreamble = false;
    while (idx + this.samplesPerBit <= samples.length) {
      for (let i = 0; i < this.samplesPerBit; i++) {
        const x = samples[idx + i];
        this.filterPreamble.processSample(x);
        this.filterMark.processSample(x);
        this.filterSpace.processSample(x);
      }

      const pPreamble = this.filterPreamble.computePower();
      const pMark = this.filterMark.computePower();
      const pSpace = this.filterSpace.computePower();

      if (!inPreamble) {
        if (pPreamble > pMark && pPreamble > pSpace && pPreamble > 0.1) {
          inPreamble = true;
        }
        idx += this.samplesPerBit;
      } else {
        // We synced past preamble, now slice mark vs space
        if (pPreamble > pMark * 2 && pPreamble > pSpace * 2) {
          // Still in preamble
          idx += this.samplesPerBit;
          continue;
        }

        if (pMark > pSpace) {
          recoveredBits.push(1);
        } else {
          recoveredBits.push(0);
        }
        idx += this.samplesPerBit;
      }
    }

    return recoveredBits;
  }
}
