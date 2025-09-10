import * as Y from 'yjs';
import type { Player, Card } from '../types';

export function syncPlayersFromYjs(playersMap: Y.Map<Player>): Player[] {
  const players: Player[] = [];
  
  playersMap.forEach((value, key) => {
    if (typeof value === 'object' && value !== null && 'id' in value) {
      console.log('Found player:', key, value);
      players.push(value as Player);
    }
  });
  
  return players;
}

export function syncGameStateFromYjs(gameStateMap: Y.Map<unknown>): {
  gamePhase: string;
  currentTurn: string;
  supportStack: Card[];
  monsters: Card[];
} {
  let gamePhase = 'waiting';
  let currentTurn = '';
  let supportStack: Card[] = [];
  let monsters: Card[] = [];
  
  gameStateMap.forEach((value, key) => {
    console.log('Game state key:', key, 'value:', value);
    if (key === 'phase') {
      gamePhase = value as string;
    } else if (key === 'currentTurn') {
      currentTurn = value as string;
    } else if (key === 'supportStack') {
      supportStack = value as Card[];
    } else if (key === 'monsters') {
      monsters = value as Card[];
    }
  });
  
  return { gamePhase, currentTurn, supportStack, monsters };
}

export function createYjsObserver(
  playersMap: Y.Map<Player>,
  gameStateMap: Y.Map<unknown>,
  onStateUpdate: (players: Player[], gameState: { gamePhase: string; currentTurn: string; supportStack: Card[]; monsters: Card[] }) => void
): () => void {
  const updateState = () => {
    console.log('=== STATE UPDATE ===');
    
    const players = syncPlayersFromYjs(playersMap);
    const gameState = syncGameStateFromYjs(gameStateMap);
    
    console.log('State update result:', { 
      playersCount: players.length, 
      gamePhase: gameState.gamePhase, 
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