import test from 'node:test';
import assert from 'node:assert/strict';
import {
  serializePacket,
  deserializePacket,
  PacketType,
  CyberdeckPacket,
  crc32,
} from '../src/protocol/frame.js';

test('Packet Frame Serialization & Deserialization roundtrip', () => {
  const originalPayload = new TextEncoder().encode('SITREP: Grid 7 secured. Radio silent.');
  const packet: CyberdeckPacket = {
    version: 1,
    type: PacketType.DIRECT_MESSAGE,
    hopLimit: 5,
    hopCount: 1,
    sequenceId: 1042,
    sourceNodeId: '0123456789abcdef0123456789abcdef',
    destinationNodeId: 'fedcba9876543210fedcba9876543210',
    payload: originalPayload,
  };

  const serialized = serializePacket(packet);
  assert.ok(serialized.length > 44, 'Serialized packet must be longer than header size');

  const deserialized = deserializePacket(serialized);
  assert.equal(deserialized.version, 1);
  assert.equal(deserialized.type, PacketType.DIRECT_MESSAGE);
  assert.equal(deserialized.hopLimit, 5);
  assert.equal(deserialized.hopCount, 1);
  assert.equal(deserialized.sequenceId, 1042);
  assert.equal(deserialized.sourceNodeId, packet.sourceNodeId);
  assert.equal(deserialized.destinationNodeId, packet.destinationNodeId);
  assert.deepEqual(deserialized.payload, originalPayload);
});

test('Corrupted CRC32 raises verification error', () => {
  const packet: CyberdeckPacket = {
    version: 1,
    type: PacketType.BROADCAST_CHAT,
    hopLimit: 3,
    hopCount: 0,
    sequenceId: 77,
    sourceNodeId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    destinationNodeId: 'ffffffffffffffffffffffffffffffff',
    payload: new Uint8Array([1, 2, 3, 4]),
  };

  const serialized = serializePacket(packet);
  // Corrupt 1 byte in payload
  serialized[45] ^= 0xff;

  assert.throws(() => {
    deserializePacket(serialized);
  }, /CRC-32 Checksum mismatch/);
});
