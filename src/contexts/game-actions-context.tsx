"use client";

import { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import { useRoom } from './room-context';
import { useDice } from '../hooks/use-dice';
import type { Card } from '../types';

interface HeroUsageState {
  [heroId: string]: boolean; // true if hero ability was used this turn
}

interface GameActionsContextValue {
  // Hero usage tracking
  heroUsageThisTurn: HeroUsageState;
  canUseHeroAbility: (hero: Card) => boolean;
  
  // Game actions
  useHeroAbility: (hero: Card) => Promise<void>;
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
    currentTurn
  } = useRoom();
  const { captureDiceResult } = useDice();
  
  // Track hero abilities used this turn
  const [heroUsageThisTurn, setHeroUsageThisTurn] = useState<HeroUsageState>({});
  
  // Reset hero usage when turn advances
  const resetHeroUsage = useCallback(() => {
    setHeroUsageThisTurn({});
  }, []);
  
  // Check if current player can use hero ability
  const canUseHeroAbility = useCallback((hero: Card): boolean => {
    if (!currentPlayer || currentTurn !== currentPlayer.id) return false;
    if (heroUsageThisTurn[hero.id]) return false; // Already used this turn
    
    // Check if hero is in current player's party
    if (currentPlayer.party.leader?.id === hero.id) return true;
    return currentPlayer.party.heroes.some(h => h?.id === hero.id);
  }, [currentPlayer, currentTurn, heroUsageThisTurn]);
  
  // Use hero ability method
  const useHeroAbility = useCallback(async (hero: Card): Promise<void> => {
    if (!canUseHeroAbility(hero)) {
      throw new Error(`Cannot use hero ability for ${hero.name}`);
    }
    
    // Mark hero as used this turn
    setHeroUsageThisTurn(prev => ({ ...prev, [hero.id]: true }));
    
    try {
      // Wait for user to throw dice and capture results
      console.log(`🎲 ${currentPlayer?.name}, throw the dice for ${hero.name}!`);
      
      // Pass the numeric requirement directly
      console.log(`DEBUG: Hero ${hero.name}, requirement:`, hero.requirement);
      const response = await captureDiceResult(hero.requirement);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      if (!response.data || response.data.length === 0) {
        throw new Error('No dice results captured');
      }
      
      const results = response.data;
      const sum = results.reduce((a, b) => a + b, 0);
      
      // Log the result
      if (hero.requirement) {
        const success = sum >= hero.requirement;
        console.log(`Hero ${hero.name} ability: Rolled ${sum}, required ${hero.requirement}+, ${success ? 'SUCCESS' : 'FAILED'}`);
      } else {
        console.log(`Hero ${hero.name} ability activated with roll: ${sum}`);
      }
      
    } catch (error) {
      // Revert hero usage state on error
      setHeroUsageThisTurn(prev => {
        const updated = { ...prev };
        delete updated[hero.id];
        return updated;
      });
      throw error;
    }
  }, [canUseHeroAbility, captureDiceResult, currentPlayer]);
  
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