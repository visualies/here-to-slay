"use client";

import { createContext, ReactNode, useCallback } from 'react';
import { useRoom } from '../hooks/use-room';
import { useStatus } from '../hooks/use-status';
import { gameServerAPI } from '../lib/game-server-api';
import { useDice } from '../hooks/use-dice';
import type { Card } from '../types';

interface GameActionsContextValue {
  drawCard: () => Promise<void>;
  playHeroToParty: (cardId: string) => Promise<void>;
  attackMonster: (monsterId: string) => Promise<void>;
  discardHandRedraw: () => Promise<void>;
  heroAbility: (hero: Card) => Promise<void>;
  canUseHeroAbility: () => boolean;
}

export const GameActionsContext = createContext<GameActionsContextValue | null>(null);

interface GameActionsProviderProps {
  children: ReactNode;
}

interface ApiResponse {
  success: boolean;
  message?: string;
}

export function GameActionsProvider({ children }: GameActionsProviderProps) {
  const room = useRoom();
  const { showMessage } = useStatus();
  const { captureDiceResult } = useDice();

  const handleApiResponse = useCallback((result: ApiResponse, successMessage: string) => {
    if (result.success) {
      showMessage(successMessage, 'success');
    } else {
      showMessage(result.message || 'Action failed', 'error');
    }
  }, [showMessage]);

  const drawCard = useCallback(async () => {
    if (!room?.roomId || !room?.currentPlayer?.id) return;
    const result = await gameServerAPI.drawCard(room.roomId, room.currentPlayer.id);
    handleApiResponse(result, 'Card drawn!');
  }, [room, handleApiResponse]);

  const playHeroToParty = useCallback(async (cardId: string) => {
    if (!room?.roomId || !room?.currentPlayer?.id) return;
    const result = await gameServerAPI.playHeroToParty(room.roomId, room.currentPlayer.id, cardId);
    handleApiResponse(result, 'Hero played!');
  }, [room, handleApiResponse]);

  const attackMonster = useCallback(async (monsterId: string) => {
    if (!room?.roomId || !room?.currentPlayer?.id) return;

    // First, capture the dice result from the client
    const diceResponse = await captureDiceResult();
    if (diceResponse.error || !diceResponse.data) {
      showMessage(diceResponse.error || 'Dice roll failed or was cancelled.', 'error');
      return;
    }
    const diceResult = diceResponse.data.reduce((sum, val) => sum + val, 0);

    // Then, send the dice result to the server for validation
    const result = await gameServerAPI.attackMonster(room.roomId, room.currentPlayer.id, monsterId, diceResult);
    handleApiResponse(result, `Attack on monster finished!`);
  }, [room, captureDiceResult, handleApiResponse, showMessage]);

  const discardHandRedraw = useCallback(async () => {
    if (!room?.roomId || !room?.currentPlayer?.id) return;
    const result = await gameServerAPI.discardHandAndRedraw(room.roomId, room.currentPlayer.id);
    handleApiResponse(result, 'Hand discarded and redrawn!');
  }, [room, handleApiResponse]);

  const heroAbility = useCallback(async (hero: Card) => {
    console.log('Using hero ability', hero);
  }, []);

  const canUseHeroAbility = useCallback(() => {
    return true;
  }, []);

  const contextValue: GameActionsContextValue = {
    drawCard,
    playHeroToParty,
    attackMonster,
    discardHandRedraw,
    heroAbility,
    canUseHeroAbility
  };

  return (
    <GameActionsContext.Provider value={contextValue}>
      {children}
    </GameActionsContext.Provider>
  );
}