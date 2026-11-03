import test from 'node:test';
import assert from 'node:assert/strict';
import { FskModulator, FskDemodulator, DEFAULT_FSK_CONFIG } from '../src/dsp/fsk_engine.js';
import { SignalAnalyzer } from '../src/telemetry/signal_analyzer.js';

test('FSK Bitstream conversion consistency', () => {
  const originalBytes = new Uint8Array([0x4e, 0x45, 0x55, 0x52, 0x4f]); // "NEURO"
  const bits = FskModulator.bytesToBits(originalBytes);
  assert.equal(bits.length, originalBytes.length * 8);

  const restoredBytes = FskModulator.bitsToBytes(bits);
  assert.deepEqual(restoredBytes, originalBytes);
});

test('FSK Audio Modulation generates non-zero ultrasonic waveform', () => {
  const modulator = new FskModulator(DEFAULT_FSK_CONFIG);
  const testBits = [1, 0, 1, 1, 0, 0, 1];
  const audio = modulator.modulateBits(testBits);

  assert.ok(audio.length > 0);
  let maxAmp = 0;
  for (let i = 0; i < audio.length; i++) {
    const abs = Math.abs(audio[i]);
    if (abs > maxAmp) maxAmp = abs;
  }
  assert.ok(maxAmp > 0.5, 'Modulated waveform must have sufficient amplitude');
});

test('SignalAnalyzer calculates distance and quality from RSSI', () => {
  const closeProximity = SignalAnalyzer.evaluateProximity('node-alpha', -50);
  assert.equal(closeProximity.linkHealth, 'OPTIMAL');
  assert.ok(closeProximity.estimatedDistanceMeters < 2.0);

  const edgeProximity = SignalAnalyzer.evaluateProximity('node-bravo', -88);
  assert.equal(edgeProximity.linkHealth, 'CRITICAL');
  assert.ok(edgeProximity.estimatedDistanceMeters > 5.0);
});
