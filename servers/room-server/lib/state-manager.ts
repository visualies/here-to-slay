import * as Y from 'yjs';
import type { Player, Turn } from '../../../shared/types';

/**
 * Global state manager for accessing room documents
 * Provides centralized access to game state across all services
 */

// Global docs reference
let docs: Map<string, Y.Doc> | null = null;

/**
 * Initialize the state manager with the global docs map
 * Should be called once during server startup
 */
export function initialize(docsMap: Map<string, Y.Doc>): void {
  docs = docsMap;
  console.log('🎮 State Manager initialized');
}

/**
 * Get a room's Yjs document
 */
export function getDoc(roomId: string): Y.Doc | null {
  if (!docs) {
    throw new Error('State Manager not initialized. Call initialize() first.');
  }
  return docs.get(roomId) || null;
}

/**
 * Get a room's game state map
 */
export function getGameStateMap(roomId: string): Y.Map<unknown> | null {
  const doc = getDoc(roomId);
  return doc ? doc.getMap('gameState') : null;
}

/**
 * Get a room's players map
 */
export function getPlayersMap(roomId: string): Y.Map<unknown> | null {
  const doc = getDoc(roomId);
  return doc ? doc.getMap('players') : null;
}

/**
 * Get a room's room metadata map
 */
export function getRoomMap(roomId: string): Y.Map<unknown> | null {
  const doc = getDoc(roomId);
  return doc ? doc.getMap('room') : null;
}

/**
 * Get a specific player from a room
 */
export function getPlayer(roomId: string, playerId: string): Player | null {
  const playersMap = getPlayersMap(roomId);
  if (!playersMap) {
    return null;
  }
  return (playersMap.get(playerId) as Player) || null;
}

/**
 * Get all players from a room
 */
export function getPlayers(roomId: string): Player[] {
  const playersMap = getPlayersMap(roomId);
  if (!playersMap) {
    return [];
  }
  return Array.from(playersMap.values()) as Player[];
}

/**
 * Get current turn data
 */
export function getCurrentTurn(roomId: string): Turn | null {
  const gameStateMap = getGameStateMap(roomId);
  if (!gameStateMap) {
    return null;
  }
  return (gameStateMap.get('currentTurn') as Turn) || null;
}

/**
 * Get current game phase
 */
export function getGamePhase(roomId: string): 'waiting' | 'playing' | 'ended' | null {
  const gameStateMap = getGameStateMap(roomId);
  if (!gameStateMap) {
    return null;
  }
  return (gameStateMap.get('phase') as 'waiting' | 'playing' | 'ended') || null;
}

/**
 * Check if a room exists
 */
export function hasRoom(roomId: string): boolean {
  if (!docs) {
    return false;
  }
  return docs.has(roomId);
}

/**
 * Get all active room IDs
 */
export function getActiveRooms(): string[] {
  if (!docs) {
    return [];
  }
  return Array.from(docs.keys());
}

/**
 * Validate that a room and player exist
 */
export function validateRoomAndPlayer(roomId: string, playerId: string): { valid: boolean; error?: string } {
  if (!hasRoom(roomId)) {
    return { valid: false, error: `Room ${roomId} not found` };
  }

  const player = getPlayer(roomId, playerId);
  if (!player) {
    return { valid: false, error: `Player ${playerId} not found in room ${roomId}` };
  }

  return { valid: true };
}