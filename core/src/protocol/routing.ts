/**
 * Cyberdeck Mesh Opportunistic Routing & Deduplication Engine
 */

import { CyberdeckPacket, BROADCAST_NODE_ID, PacketType } from './frame.js';

export interface RouteEntry {
  nodeId: string;
  pseudonym?: string;
  nextHop: string;
  hopCount: number;
  lastRssi: number;
  lastSeenMs: number;
}

export interface RoutingDecision {
  action: 'DELIVER_LOCAL' | 'FORWARD' | 'DELIVER_AND_FORWARD' | 'DROP';
  reason: string;
  packet?: CyberdeckPacket;
}

export class MeshRouter {
  private localNodeId: string;
  private seenPackets = new Map<string, number>(); // key: `${src}:${seq}` -> timestamp
  private maxCacheSize = 256;
  private routingTable = new Map<string, RouteEntry>();
  private defaultHopLimit = 5;

  constructor(localNodeId: string) {
    this.localNodeId = localNodeId.toLowerCase();
  }

  public getLocalNodeId(): string {
    return this.localNodeId;
  }

  public getRoutingTable(): RouteEntry[] {
    return Array.from(this.routingTable.values());
  }

  public processIncomingPacket(packet: CyberdeckPacket, receivedRssi: number = -60): RoutingDecision {
    const packetKey = `${packet.sourceNodeId}:${packet.sequenceId}`;
    const now = Date.now();

    // 1. Check Deduplication Cache
    if (this.seenPackets.has(packetKey)) {
      return { action: 'DROP', reason: 'Packet already processed (deduplication filter)' };
    }

    // Add to seen cache with LRU cleanup
    this.seenPackets.set(packetKey, now);
    if (this.seenPackets.size > this.maxCacheSize) {
      const oldestKey = this.seenPackets.keys().next().value;
      if (oldestKey) this.seenPackets.delete(oldestKey);
    }

    // 2. Drop own reflected packets
    if (packet.sourceNodeId.toLowerCase() === this.localNodeId) {
      return { action: 'DROP', reason: 'Loop prevention: originated from local node' };
    }

    // 3. Update routing table for source node
    this.routingTable.set(packet.sourceNodeId, {
      nodeId: packet.sourceNodeId,
      nextHop: packet.sourceNodeId,
      hopCount: packet.hopCount + 1,
      lastRssi: receivedRssi,
      lastSeenMs: now,
    });

    const isBroadcast = packet.destinationNodeId.toLowerCase() === BROADCAST_NODE_ID.toLowerCase();
    const isTargetingMe = packet.destinationNodeId.toLowerCase() === this.localNodeId;

    // 4. Verify Hop Limit
    const canForward = packet.hopLimit > 1;

    if (isTargetingMe) {
      return { action: 'DELIVER_LOCAL', reason: 'Target is local node' };
    }

    if (isBroadcast) {
      if (canForward) {
        const forwardedPacket: CyberdeckPacket = {
          ...packet,
          hopLimit: packet.hopLimit - 1,
          hopCount: packet.hopCount + 1,
        };
        return {
          action: 'DELIVER_AND_FORWARD',
          reason: 'Broadcast message (deliver locally and relay to peers)',
          packet: forwardedPacket,
        };
      }
      return { action: 'DELIVER_LOCAL', reason: 'Broadcast reached hop limit (deliver only)' };
    }

    // Unicast packet meant for another peer
    if (canForward) {
      const forwardedPacket: CyberdeckPacket = {
        ...packet,
        hopLimit: packet.hopLimit - 1,
        hopCount: packet.hopCount + 1,
      };
      return {
        action: 'FORWARD',
        reason: 'Unicast routing: forwarding towards destination node',
        packet: forwardedPacket,
      };
    }

    return { action: 'DROP', reason: 'Hop limit exhausted' };
  }

  public createOutboundPacket(
    destinationNodeId: string,
    type: PacketType,
    payload: Uint8Array,
    sequenceId: number
  ): CyberdeckPacket {
    return {
      version: 1,
      type,
      hopLimit: this.defaultHopLimit,
      hopCount: 0,
      sequenceId,
      sourceNodeId: this.localNodeId,
      destinationNodeId: destinationNodeId.toLowerCase(),
      payload,
    };
  }
}
