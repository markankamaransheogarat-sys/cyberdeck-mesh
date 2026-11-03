import test from 'node:test';
import assert from 'node:assert/strict';
import { MeshRouter } from '../src/protocol/routing.js';
import { PacketType, BROADCAST_NODE_ID, CyberdeckPacket } from '../src/protocol/frame.js';

test('MeshRouter deduplicates identical packet deliveries', () => {
  const router = new MeshRouter('11112222333344445555666677778888');
  const packet: CyberdeckPacket = {
    version: 1,
    type: PacketType.BROADCAST_CHAT,
    hopLimit: 4,
    hopCount: 1,
    sequenceId: 4001,
    sourceNodeId: 'aaaabbbbccccddddeeeeffff00001111',
    destinationNodeId: BROADCAST_NODE_ID,
    payload: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
  };

  const decision1 = router.processIncomingPacket(packet, -65);
  assert.equal(decision1.action, 'DELIVER_AND_FORWARD');

  // Second arrival of same packet should be dropped
  const decision2 = router.processIncomingPacket(packet, -65);
  assert.equal(decision2.action, 'DROP');
  assert.match(decision2.reason, /deduplication/i);
});

test('MeshRouter loop prevention: drops own reflected packet', () => {
  const myId = '99998888777766665555444433332222';
  const router = new MeshRouter(myId);
  const reflectedPacket: CyberdeckPacket = {
    version: 1,
    type: PacketType.DISCOVERY_BEACON,
    hopLimit: 4,
    hopCount: 2,
    sequenceId: 501,
    sourceNodeId: myId,
    destinationNodeId: BROADCAST_NODE_ID,
    payload: new Uint8Array(),
  };

  const decision = router.processIncomingPacket(reflectedPacket, -50);
  assert.equal(decision.action, 'DROP');
  assert.match(decision.reason, /Loop prevention/i);
});

test('MeshRouter decrements hop limit on forward', () => {
  const router = new MeshRouter('22222222222222222222222222222222');
  const packet: CyberdeckPacket = {
    version: 1,
    type: PacketType.DIRECT_MESSAGE,
    hopLimit: 3,
    hopCount: 1,
    sequenceId: 99,
    sourceNodeId: '11111111111111111111111111111111',
    destinationNodeId: '33333333333333333333333333333333',
    payload: new Uint8Array([1, 2]),
  };

  const decision = router.processIncomingPacket(packet, -70);
  assert.equal(decision.action, 'FORWARD');
  assert.ok(decision.packet);
  assert.equal(decision.packet.hopLimit, 2);
  assert.equal(decision.packet.hopCount, 2);
});
