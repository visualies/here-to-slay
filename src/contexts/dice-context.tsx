"use client";

import { createContext, useContext, ReactNode, useState, useCallback, useEffect } from 'react';

interface DiceState {
  isStable: boolean;
  result: number;
  lastUpdate: number;
}

export interface DiceCaptureResponse {
  rolling: boolean;
  error: string | null;
  data: number[] | null;
}

export interface DiceData {
  // Simple state only
  enabled: boolean;
  results: number[];
  stable: boolean;
  isCapturing: boolean;
  
  // Simple actions
  enable: () => void;
  disable: () => void;
  updateStates: (states: Record<string, DiceState>) => void;
  captureDiceResult: () => Promise<DiceCaptureResponse>;
}

export const DiceContext = createContext<DiceData | null>(null);

interface DiceProviderProps {
  children: ReactNode;
}

export function DiceProvider({ children }: DiceProviderProps) {
  // Simple state management - no game logic
  const [enabled, setEnabled] = useState(false);
  const [results, setResults] = useState<number[]>([]);
  const [diceStates, setDiceStates] = useState<Record<string, DiceState>>({});
  const [isCapturing, setIsCapturing] = useState(false);
  
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

  // Capture dice result method - ensures only one capture at a time
  const captureDiceResult = useCallback((): Promise<DiceCaptureResponse> => {
    if (isCapturing) {
      return Promise.resolve({
        rolling: false,
        error: 'Dice capture already in progress',
        data: null
      });
    }

    setIsCapturing(true);
    
    // Enable the 3D dice plane for user interaction
    setEnabled(true);
    setResults([]); // Clear previous results
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        setIsCapturing(false);
        setEnabled(false);
        resolve({
          rolling: false,
          error: 'Dice capture timeout - user did not throw dice',
          data: null
        });
      }, 30000);

      let stabilityTimer: NodeJS.Timeout | null = null;
      let wasRolling = false;

      const checkDiceState = () => {
        // Check if dice started moving (not stable)
        if (!stable && !wasRolling) {
          wasRolling = true;
          console.log('Dice movement detected - user is throwing...');
        }
        
        // Check for stability after dice were moving
        if (wasRolling && stable && results.length > 0) {
          // Start 500ms stability timer
          if (stabilityTimer) clearTimeout(stabilityTimer);
          
          stabilityTimer = setTimeout(() => {
            if (stable && results.length > 0) {
              clearTimeout(timeout);
              setIsCapturing(false);
              setEnabled(false);
              
              resolve({
                rolling: false,
                error: null,
                data: results
              });
            } else {
              setTimeout(checkDiceState, 100);
            }
          }, 500);
        } else {
          setTimeout(checkDiceState, 100);
        }
      };
      
      checkDiceState();
    });
  }, [isCapturing, stable, results]);
  
  const diceData: DiceData = {
    enabled,
    results,
    stable,
    isCapturing,
    enable,
    disable,
    updateStates,
    captureDiceResult
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