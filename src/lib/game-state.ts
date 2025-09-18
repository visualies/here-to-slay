import * as Y from 'yjs';
import type { Player, Card, Turn } from '../types';

export function syncPlayersFromYjs(playersMap: Y.Map<Player>): Player[] {
  const players: Player[] = [];
  
  playersMap.forEach((value, key) => {
    if (typeof value === 'object' && value !== null && 'id' in value) {
      console.log('Found player:', key, value);
      players.push(value as Player);
    }
  });
  
  // Sort players by joinTime to ensure consistent ordering across all clients
  return players.sort((a, b) => a.joinTime - b.joinTime);
}

export function syncGameStateFromYjs(gameStateMap: Y.Map<unknown>): {
  phase: string;
  currentTurn: string;
  currentTurnData: Turn | null;
  supportStack: Card[];
  monsters: Card[];
} {
  let phase = 'waiting';
  let currentTurn = '';
  let currentTurnData: Turn | null = null;
  let supportStack: Card[] = [];
  let monsters: Card[] = [];

  gameStateMap.forEach((value, key) => {
    console.log('Game state key:', key, 'value:', value);
    if (key === 'phase') {
      phase = value as string;
    } else if (key === 'currentTurn') {
      // Handle both old string format and new Turn object format
      if (typeof value === 'string') {
        currentTurn = value;
        currentTurnData = null;
      } else if (value && typeof value === 'object' && 'player_id' in value) {
        const turnData = value as Turn;
        currentTurn = turnData.player_id;
        currentTurnData = turnData;
      }
    } else if (key === 'supportStack') {
      supportStack = value as Card[];
    } else if (key === 'monsters') {
      monsters = value as Card[];
    }
  });

  return { phase, currentTurn, currentTurnData, supportStack, monsters };
}

export function createYjsObserver(
  playersMap: Y.Map<Player>,
  gameStateMap: Y.Map<unknown>,
  onStateUpdate: (players: Player[], gameState: { phase: string; currentTurn: string; currentTurnData: Turn | null; supportStack: Card[]; monsters: Card[] }) => void
): () => void {
  const updateState = () => {
    console.log('=== STATE UPDATE ===');
    
    const players = syncPlayersFromYjs(playersMap);
    const gameState = syncGameStateFromYjs(gameStateMap);
    
    console.log('State update result:', { 
      playersCount: players.length, 
      phase: gameState.phase, 
      currentTurn: gameState.currentTurn 
    });
    
    onStateUpdate(players, gameState);
  };
  
  // Observe both maps
  playersMap.observe(updateState);
  gameStateMap.observe(updateState);
  
  // Initial call
  updateState();
  
  // Return cleanup function
  return () => {
    playersMap.unobserve(updateState);
    gameStateMap.unobserve(updateState);
  };
}