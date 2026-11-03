/**
 * Cyberdeck Mesh Packet Frame Serializer & Parser
 * Wire format compliance: RFC 2026-CD-01
 */

export const CYBERDECK_MAGIC = 0x5cdb;
export const CYBERDECK_VERSION = 1;

export enum PacketType {
  DISCOVERY_BEACON = 0x01,
  DIRECT_MESSAGE = 0x02,
  BROADCAST_CHAT = 0x03,
  TELEMETRY_PING = 0x04,
  ROUTE_ACK = 0x05,
}

export const BROADCAST_NODE_ID = 'ffffffffffffffffffffffffffffffff';

export interface CyberdeckPacket {
  version: number;
  type: PacketType;
  hopLimit: number;
  hopCount: number;
  sequenceId: number;
  sourceNodeId: string; // 32-hex string (16 bytes)
  destinationNodeId: string; // 32-hex string (16 bytes)
  payload: Uint8Array;
}

export function crc32(buffer: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];
    crc ^= byte;
    for (let j = 0; j < 8; j++) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function serializePacket(packet: CyberdeckPacket): Uint8Array {
  if (packet.payload.length > 512) {
    throw new Error(`Payload exceeds maximum frame capacity (512 bytes): ${packet.payload.length}`);
  }

  const headerSize = 44; // 2 (magic) + 1 (ver) + 1 (type) + 1 (hopL) + 1 (hopC) + 2 (len) + 4 (seq) + 16 (src) + 16 (dst)
  const totalSize = headerSize + packet.payload.length + 4; // + 4 (crc32)
  const buffer = new Uint8Array(totalSize);
  const view = new DataView(buffer.buffer);

  // Magic & Version & Type
  view.setUint16(0, CYBERDECK_MAGIC, false);
  view.setUint8(2, packet.version);
  view.setUint8(3, packet.type);

  // Hops & Length
  view.setUint8(4, packet.hopLimit);
  view.setUint8(5, packet.hopCount);
  view.setUint16(6, packet.payload.length, false);

  // Sequence ID
  view.setUint32(8, packet.sequenceId, false);

  // Source Node ID (16 bytes)
  const srcBytes = hexToBytes(packet.sourceNodeId.padEnd(32, '0'));
  buffer.set(srcBytes, 12);

  // Destination Node ID (16 bytes)
  const dstBytes = hexToBytes(packet.destinationNodeId.padEnd(32, '0'));
  buffer.set(dstBytes, 28);

  // Payload
  buffer.set(packet.payload, headerSize);

  // Calculate CRC-32 over everything before CRC field
  const contentForCrc = buffer.subarray(0, headerSize + packet.payload.length);
  const checksum = crc32(contentForCrc);
  view.setUint32(headerSize + packet.payload.length, checksum, false);

  return buffer;
}

export function deserializePacket(buffer: Uint8Array): CyberdeckPacket {
  if (buffer.length < 48) {
    throw new Error(`Packet buffer too short: ${buffer.length} bytes (minimum 48)`);
  }

  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  // Verify Magic
  const magic = view.getUint16(0, false);
  if (magic !== CYBERDECK_MAGIC) {
    throw new Error(`Invalid Cyberdeck Magic Header: 0x${magic.toString(16)} (expected 0x${CYBERDECK_MAGIC.toString(16)})`);
  }

  const version = view.getUint8(2);
  const type = view.getUint8(3) as PacketType;
  const hopLimit = view.getUint8(4);
  const hopCount = view.getUint8(5);
  const payloadLength = view.getUint16(6, false);

  if (buffer.length < 44 + payloadLength + 4) {
    throw new Error(`Buffer truncated: expected ${44 + payloadLength + 4} bytes, got ${buffer.length}`);
  }

  const sequenceId = view.getUint32(8, false);
  const sourceNodeId = bytesToHex(buffer.subarray(12, 28));
  const destinationNodeId = bytesToHex(buffer.subarray(28, 44));

  const payload = buffer.subarray(44, 44 + payloadLength);
  const expectedChecksum = view.getUint32(44 + payloadLength, false);

  const actualChecksum = crc32(buffer.subarray(0, 44 + payloadLength));
  if (actualChecksum !== expectedChecksum) {
    throw new Error(`CRC-32 Checksum mismatch: expected 0x${expectedChecksum.toString(16)}, computed 0x${actualChecksum.toString(16)}`);
  }

  return {
    version,
    type,
    hopLimit,
    hopCount,
    sequenceId,
    sourceNodeId,
    destinationNodeId,
    payload: new Uint8Array(payload),
  };
}

export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(16);
  const cleanHex = hex.replace(/[^0-9a-fA-F]/g, '').slice(0, 32).padEnd(32, '0');
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}
