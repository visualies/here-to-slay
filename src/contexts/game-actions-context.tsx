"use client";

import { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import { useRoom } from './room-context';

interface HeroUsageState {
  [heroId: string]: boolean; // true if hero ability was used this turn
}

interface GameActionsContextValue {
  // Hero usage tracking
  heroUsageThisTurn: HeroUsageState;
  canUseHeroAbility: (heroId: string) => boolean;
  
  // Game actions
  useHeroAbility: (heroId: string) => Promise<void>;
  playCard: (cardId: string) => void;
  drawCard: () => void;
  advanceTurn: () => void;
}

export const GameActionsContext = createContext<GameActionsContextValue | null>(null);

interface GameActionsProviderProps {
  children: ReactNode;
}

export function GameActionsProvider({ children }: GameActionsProviderProps) {
  const { 
    gameActions, 
    currentPlayer, 
    currentTurn, 
    serverDiceManager 
  } = useRoom();
  
  // Track hero abilities used this turn
  const [heroUsageThisTurn, setHeroUsageThisTurn] = useState<HeroUsageState>({});
  
  // Reset hero usage when turn advances
  const resetHeroUsage = useCallback(() => {
    setHeroUsageThisTurn({});
  }, []);
  
  // Check if current player can use hero ability
  const canUseHeroAbility = useCallback((heroId: string): boolean => {
    if (!currentPlayer || currentTurn !== currentPlayer.id) return false;
    if (heroUsageThisTurn[heroId]) return false; // Already used this turn
    
    // Check if hero is in current player's party
    if (currentPlayer.party.leader?.id === heroId) return true;
    return currentPlayer.party.heroes.some(hero => hero?.id === heroId);
  }, [currentPlayer, currentTurn, heroUsageThisTurn]);
  
  // Use hero ability method
  const useHeroAbility = useCallback(async (heroId: string): Promise<void> => {
    if (!canUseHeroAbility(heroId)) {
      throw new Error(`Cannot use hero ability for ${heroId}`);
    }
    
    if (!serverDiceManager) {
      throw new Error('Dice manager not available');
    }
    
    // Mark hero as used this turn
    setHeroUsageThisTurn(prev => ({ ...prev, [heroId]: true }));
    
    try {
      // Roll dice for hero ability (2 dice as per game rules)
      await serverDiceManager.throwAllDice([0, 5, 0], [2, 2, 2]);
      
      // TODO: Parse hero effect requirements and process results
      // This will be implemented in the next phase
      console.log(`Hero ability activated for ${heroId}`);
      
    } catch (error) {
      // Revert hero usage state on error
      setHeroUsageThisTurn(prev => {
        const updated = { ...prev };
        delete updated[heroId];
        return updated;
      });
      throw error;
    }
  }, [canUseHeroAbility, serverDiceManager]);
  
  // Enhanced advanceTurn that resets hero usage
  const handleAdvanceTurn = useCallback(() => {
    resetHeroUsage();
    gameActions.advanceTurn();
  }, [resetHeroUsage, gameActions]);
  
  const contextValue: GameActionsContextValue = {
    // Hero usage tracking
    heroUsageThisTurn,
    canUseHeroAbility,
    
    // Game actions
    useHeroAbility,
    playCard: gameActions.playCard,
    drawCard: gameActions.drawCard,
    advanceTurn: handleAdvanceTurn
  };
  
  return (
    <GameActionsContext.Provider value={contextValue}>
      {children}
    </GameActionsContext.Provider>
  );
}