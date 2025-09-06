"use client";

import { createContext, useContext, ReactNode, useState, useCallback, useEffect } from 'react';

interface DiceState {
  isStable: boolean;
  result: number;
  lastUpdate: number;
}

export interface DiceData {
  // Simple state only
  enabled: boolean;
  results: number[];
  stable: boolean;
  
  // Simple actions
  enable: () => void;
  disable: () => void;
  updateStates: (states: Record<string, DiceState>) => void;
}

const DiceContext = createContext<DiceData | null>(null);

interface DiceProviderProps {
  children: ReactNode;
}

export function DiceProvider({ children }: DiceProviderProps) {
  // Simple state management - no game logic
  const [enabled, setEnabled] = useState(false);
  const [results, setResults] = useState<number[]>([]);
  const [diceStates, setDiceStates] = useState<Record<string, DiceState>>({});
  
  // Check if all dice are stable (only when we have dice states and are enabled)
  const stable = enabled && Object.keys(diceStates).length > 0 && 
    Object.values(diceStates).every(dice => dice.isStable);

  // Update results when all dice become stable (only if enabled)
  useEffect(() => {
    if (enabled && stable && Object.keys(diceStates).length > 0) {
      const newResults = Object.values(diceStates)
        .sort((a, b) => a.lastUpdate - b.lastUpdate)
        .map(dice => dice.result);
      
      setResults(newResults);
    }
  }, [enabled, stable, diceStates]);
  
  const enable = useCallback(() => {
    setEnabled(true);
    setResults([]); // Clear previous results
  }, []);
  
  const disable = useCallback(() => {
    setEnabled(false);
  }, []);
  
  const updateStates = useCallback((states: Record<string, DiceState>) => {
    setDiceStates(states);
  }, []);
  
  const diceData: DiceData = {
    enabled,
    results,
    stable,
    enable,
    disable,
    updateStates
  };
  
  return (
    <DiceContext.Provider value={diceData}>
      {children}
    </DiceContext.Provider>
  );
}

export function useDice(): DiceData {
  const context = useContext(DiceContext);
  if (!context) {
    throw new Error('useDice must be used within a DiceProvider');
  }
  return context;
}