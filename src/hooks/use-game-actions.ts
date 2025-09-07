"use client";

import { useRoom } from '../contexts/room-context';

export function useGameActions() {
  const { gameActions, initializeGame, addPlayerToGame, isHost } = useRoom();
  
  return {
    // Core game actions
    playCard: gameActions.playCard,
    drawCard: gameActions.drawCard,
    advanceTurn: gameActions.advanceTurn,
    
    // Host actions
    initializeGame,
    addPlayerToGame,
    canInitialize: isHost,
    canAddPlayers: isHost
  };
}

export function usePlayerActions() {
  const { gameActions, currentPlayer } = useRoom();
  
  const canPlayCard = currentPlayer?.actionPoints > 0;
  const canDrawCard = currentPlayer?.actionPoints > 0;
  
  return {
    playCard: gameActions.playCard,
    drawCard: gameActions.drawCard,
    canPlayCard,
    canDrawCard,
    actionPoints: currentPlayer?.actionPoints || 0
  };
}

export function useHostActions() {
  const { initializeGame, addPlayerToGame, isHost, players } = useRoom();
  
  return {
    initializeGame,
    addPlayerToGame,
    isHost,
    canInitialize: isHost && players.length >= 1,
    playerCount: players.length
  };
}