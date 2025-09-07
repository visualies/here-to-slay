import { WebsocketProvider } from 'y-websocket';
import type { Player } from '../types';
import { updatePlayerPresence } from './players';
import * as Y from 'yjs';

export function setupPlayerAwareness(
  provider: WebsocketProvider,
  playerId: string,
  playerName: string,
  playerColor: string
): void {
  const awareness = provider.awareness;
  const joinTime = Date.now();
  
  awareness.setLocalStateField('user', {
    id: playerId,
    name: playerName,
    color: playerColor,
    lastSeen: joinTime
  });
}

export function updateCursor(
  provider: WebsocketProvider | null,
  x: number,
  y: number
): void {
  if (provider?.awareness) {
    provider.awareness.setLocalStateField('cursor', { x, y });
  }
}

export function createHeartbeatInterval(
  playersMap: Y.Map<Player> | null,
  playerId: string,
  intervalMs: number = 5000
): NodeJS.Timeout | null {
  if (!playersMap) return null;
  
  return setInterval(() => {
    updatePlayerPresence(playersMap, playerId);
  }, intervalMs);
}

export function cleanupHeartbeat(heartbeatId: NodeJS.Timeout | null): void {
  if (heartbeatId) {
    clearInterval(heartbeatId);
  }
}

export function getConnectedPlayers(players: Player[], timeoutMs: number = 30000): Player[] {
  return players.filter(p => Date.now() - p.lastSeen < timeoutMs);
}

export function getConnectedPlayersCount(players: Player[], timeoutMs: number = 30000): number {
  return getConnectedPlayers(players, timeoutMs).length;
}