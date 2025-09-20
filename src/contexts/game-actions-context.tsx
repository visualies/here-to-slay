"use client";

import { createContext, ReactNode, useCallback, useEffect, useRef } from 'react';
import { useRoom } from '../hooks/use-room';
import { useStatus } from '../hooks/use-status';
import { gameServerAPI } from '../lib/game-server-api';
import { useDice } from '../hooks/use-dice';
import type { Card } from '../types';
import { StatusKey } from '../types';

interface GameActionsContextValue {
  playCard: (cardId: string) => Promise<void>;
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
  const { status, showMessage } = useStatus();
  const { captureDiceResult } = useDice();
  const autoCaptureActionRef = useRef<string | null>(null);

  const handleApiResponse = useCallback((result: ApiResponse) => {
    if (!result.success) {
      showMessage(result.message || 'Action failed', 'error');
    }
    // Status is now entirely managed by server via Yjs document
  }, [showMessage]);

  // Automatically handle dice capture requests from the server action queue
  useEffect(() => {
    const waitingAction = room.waitingForAction;
    const currentPlayerId = room.currentPlayer?.id;

    if (!waitingAction || !currentPlayerId) {
      autoCaptureActionRef.current = null;
      return;
    }

    if (waitingAction.playerId !== currentPlayerId) {
      return;
    }

    if (status.key !== StatusKey.CAPTURE_DICE) {
      return;
    }

    const { actionId } = waitingAction;

    if (!actionId || autoCaptureActionRef.current === actionId) {
      return;
    }

    autoCaptureActionRef.current = actionId;

    let cancelled = false;

    const currentAction = room.currentTurnData?.action_queue.find(action => action.id === actionId);

    const parseRequiredAmount = (value: unknown): number | undefined => {
      if (typeof value === 'number') {
        return value;
      }
      if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) {
          return parsed;
        }
      }
      return undefined;
    };

    let requiredAmount: number | undefined;
    if (currentAction) {
      const amountParam = currentAction.parameters.find(param => param.name === 'amount');
      requiredAmount = parseRequiredAmount(amountParam?.value);
    }

    if (requiredAmount === undefined && typeof room.currentTurnData?.last_amount === 'number') {
      requiredAmount = room.currentTurnData.last_amount;
    }

    const handleCapture = async () => {
      try {
        const diceResponse = await captureDiceResult(requiredAmount);
        if (cancelled) {
          return;
        }

        if (diceResponse.error || !diceResponse.data || diceResponse.data.length === 0) {
          autoCaptureActionRef.current = null;
          showMessage(diceResponse.error || 'Dice roll failed or timed out.', 'error');
          return;
        }

        const diceTotal = diceResponse.data.reduce((sum, value) => sum + value, 0);
        const response = await gameServerAPI.provideActionInput(
          room.roomId,
          currentPlayerId,
          actionId,
          [diceTotal.toString()]
        );

        if (!response.success) {
          autoCaptureActionRef.current = null;
          showMessage(response.message || 'Failed to submit dice result.', 'error');
        }
      } catch (error) {
        console.error('Failed to handle automatic dice capture:', error);
        autoCaptureActionRef.current = null;
        showMessage('Failed to submit dice result.', 'error');
      }
    };

    handleCapture();

    return () => {
      cancelled = true;
    };
  }, [
    room.waitingForAction,
    room.currentPlayer?.id,
    status.key,
    captureDiceResult,
    showMessage,
    room.roomId,
    room.currentTurnData?.last_amount,
    room.currentTurnData?.action_queue
  ]);

  const playCard = useCallback(async (cardId: string) => {
    if (!room?.roomId || !room?.currentPlayer?.id) return;
    const result = await gameServerAPI.playCard(room.roomId, room.currentPlayer.id, cardId);
    handleApiResponse(result);
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
    handleApiResponse(result);
  }, [room, captureDiceResult, handleApiResponse, showMessage]);

  const discardHandRedraw = useCallback(async () => {
    if (!room?.roomId || !room?.currentPlayer?.id) return;
    const result = await gameServerAPI.discardHandAndRedraw(room.roomId, room.currentPlayer.id);
    handleApiResponse(result);
  }, [room, handleApiResponse]);

  const heroAbility = useCallback(async (hero: Card) => {
    console.log('Using hero ability', hero);
  }, []);

  const canUseHeroAbility = useCallback(() => {
    return true;
  }, []);

  const contextValue: GameActionsContextValue = {
    playCard,
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
