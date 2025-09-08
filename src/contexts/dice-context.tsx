"use client";

import { createContext, useContext, ReactNode, useState, useCallback, useEffect } from 'react';

interface DiceState {
  isStable: boolean;
  result: number;
  lastUpdate: number;
}

export type DiceCaptureStatus = 'waiting' | 'rolling' | 'stable' | 'complete';

export interface DiceCaptureResponse {
  status: DiceCaptureStatus;
  error: string | null;
  data: number[] | null;
}

export interface DiceData {
  enabled: boolean;
  results: number[];
  stable: boolean;
  hasRolled: boolean;
  isCapturing: boolean;
  captureStatus: DiceCaptureStatus;
  requiredAmount: number | null;
  
  enable: () => void;
  disable: () => void;
  updateStates: (states: Record<string, DiceState>) => void;
  captureDiceResult: (requiredAmount?: number) => Promise<DiceCaptureResponse>;
}

export const DiceContext = createContext<DiceData | null>(null);

interface DiceProviderProps {
  children: ReactNode;
}

export function DiceProvider({ children }: DiceProviderProps) {
  const [enabled, setEnabled] = useState(false);
  const [results, setResults] = useState<number[]>([]);
  const [diceStates, setDiceStates] = useState<Record<string, DiceState>>({});
  const [hasRolled, setHasRolled] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureStatus, setCaptureStatus] = useState<DiceCaptureStatus>('complete');
  const [requiredAmount, setRequiredAmount] = useState<number | null>(null);
  const [stable, setStable] = useState(false);
  
  // Check if all dice are stable (immediate check)
  const allDiceStable = enabled && Object.keys(diceStates).length > 0 && 
    Object.values(diceStates).every(dice => dice.isStable);

  // Handle 500ms stability delay
  useEffect(() => {
    if (allDiceStable) {
      // Start 500ms timer when dice become stable
      const timer = setTimeout(() => {
        setStable(true);
      }, 500);
      
      return () => clearTimeout(timer);
    } else {
      // Reset stable state when dice are not stable
      setStable(false);
    }
  }, [allDiceStable]);

  // Track when dice start rolling
  useEffect(() => {
    if (enabled && Object.keys(diceStates).length > 0 && !allDiceStable) {
      setHasRolled(true);
    }
  }, [enabled, allDiceStable, diceStates]);

  // Update captureStatus based on dice state
  useEffect(() => {
    if (isCapturing) {
      if (enabled && !stable) {
        setCaptureStatus('rolling');
      } else if (enabled && stable && !hasRolled) {
        setCaptureStatus('waiting');
      } else if (enabled && stable && hasRolled) {
        setCaptureStatus('stable');
      }
    }
  }, [isCapturing, enabled, stable, hasRolled]);

  // Update results in real-time (both while rolling and when stable)
  useEffect(() => {
    if (enabled && Object.keys(diceStates).length > 0) {
      const newResults = Object.values(diceStates)
        .sort((a, b) => a.lastUpdate - b.lastUpdate)
        .map(dice => dice.result);
      
      setResults(newResults);
    }
  }, [enabled, diceStates]);
  
  const enable = useCallback(() => {
    setEnabled(true);
    setResults([]);
    setHasRolled(false);
  }, []);
  
  const disable = useCallback(() => {
    setEnabled(false);
  }, []);
  
  const updateStates = useCallback((states: Record<string, DiceState>) => {
    setDiceStates(states);
  }, []);

  // Capture dice result - ensures only one capture at a time
  const captureDiceResult = useCallback((requiredAmount?: number): Promise<DiceCaptureResponse> => {
    if (isCapturing) {
      return Promise.resolve({
        status: 'complete',
        error: 'Dice capture already in progress',
        data: null
      });
    }

    // Initialize capture state
    setIsCapturing(true);
    setCaptureStatus('waiting');
    setEnabled(true);
    setResults([]);
    setHasRolled(false);
    setStable(true); // Start as stable (waiting for user to throw)
    setRequiredAmount(requiredAmount || null);
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        setIsCapturing(false);
        setEnabled(false);
        setCaptureStatus('complete');
        setRequiredAmount(null);
        resolve({
          status: 'complete',
          error: 'Dice capture timeout - user did not throw dice',
          data: null
        });
      }, 30000);

      // Wait for dice to be stable and hasRolled
      const checkForCompletion = () => {
        if (stable && hasRolled && results.length > 0) {
          // 500ms stability delay before completing
          setTimeout(() => {
            if (stable && hasRolled && results.length > 0) {
              clearTimeout(timeout);
              setIsCapturing(false);
              setEnabled(false);
              setCaptureStatus('complete');
              setRequiredAmount(null);
              
              resolve({
                status: 'complete',
                error: null,
                data: results
              });
            } else {
              setTimeout(checkForCompletion, 100);
            }
          }, 500);
        } else {
          setTimeout(checkForCompletion, 100);
        }
      };
      
      checkForCompletion();
    });
  }, [isCapturing, stable, hasRolled, results]);
  
  const diceData: DiceData = {
    enabled,
    results,
    stable,
    hasRolled,
    isCapturing,
    captureStatus,
    requiredAmount,
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