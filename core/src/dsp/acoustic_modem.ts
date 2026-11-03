/**
 * Cyberdeck Acoustic Modem Transceiver
 * End-to-end Air-Gap Data Transmission
 */

import { CyberdeckPacket, serializePacket, deserializePacket } from '../protocol/frame.js';
import { FskModulator, FskDemodulator, DEFAULT_FSK_CONFIG, FskConfig } from './fsk_engine.js';

export class AcousticModem {
  private modulator: FskModulator;
  private demodulator: FskDemodulator;

  constructor(config: FskConfig = DEFAULT_FSK_CONFIG) {
    this.modulator = new FskModulator(config);
    this.demodulator = new FskDemodulator(config);
  }

  /**
   * Encodes a Cyberdeck packet into raw audio waveform (ultrasonic BFSK)
   */
  public packetToAudio(packet: CyberdeckPacket): Float32Array {
    const wireBytes = serializePacket(packet);
    const bits = FskModulator.bytesToBits(wireBytes);
    return this.modulator.modulateBits(bits);
  }

  /**
   * Demodulates raw audio PCM samples into a verified Cyberdeck packet
   */
  public audioToPacket(audioSamples: Float32Array): CyberdeckPacket | null {
    try {
      const recoveredBits = this.demodulator.demodulateAudio(audioSamples);
      if (recoveredBits.length < 48 * 8) {
        return null; // Less than minimum packet header size
      }
      const rawBytes = FskModulator.bitsToBytes(recoveredBits);
      return deserializePacket(rawBytes);
    } catch {
      return null; // Corrupted or invalid CRC
    }
  }
}
