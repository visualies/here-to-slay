"use client";

import { createContext, ReactNode, useState, useCallback, useEffect, useRef } from 'react';
import { useRoom } from '../hooks/use-room';
import { ServerDiceManager, ServerDiceStates } from '../lib/server-dice';

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
  requiredAmount: number;
  
  // Server dice states
  diceStates: ServerDiceStates;
  isConnected: boolean;
  lastUpdate: number;
  
  enable: () => void;
  disable: () => void;
  updateStates: (states: Record<string, DiceState>) => void;
  captureDiceResult: (requiredAmount?: number) => Promise<DiceCaptureResponse>;
  
  // Server dice actions
  throwDice: (diceId: string, velocity: [number, number, number], angularVelocity: [number, number, number]) => Promise<void>;
  throwAllDice: (velocity: [number, number, number], angularVelocity: [number, number, number]) => Promise<void>;
  moveDice: (diceId: string, position: [number, number, number], isKinematic?: boolean) => Promise<void>;
  moveAllDice: (leadDiceId: string, leadPosition: [number, number, number], isKinematic?: boolean) => Promise<void>;
  moveMultipleDice: (dicePositions: Record<string, [number, number, number]>, isKinematic?: boolean) => Promise<void>;
}

const defaultDiceData: DiceData = {
  enabled: false,
  results: [],
  stable: false,
  hasRolled: false,
  isCapturing: false,
  captureStatus: 'complete',
  requiredAmount: 0,
  diceStates: {},
  isConnected: false,
  lastUpdate: 0,
  enable: () => {},
  disable: () => {},
  updateStates: () => {},
  captureDiceResult: async () => ({ status: 'complete', error: 'Not initialized', data: null }),
  throwDice: async () => {},
  throwAllDice: async () => {},
  moveDice: async () => {},
  moveAllDice: async () => {},
  moveMultipleDice: async () => {}
};

export const DiceContext = createContext<DiceData>(defaultDiceData);

interface DiceProviderProps {
  children: ReactNode;
}

export function DiceProvider({ children }: DiceProviderProps) {
  const { roomId } = useRoom();
  const [enabled, setEnabled] = useState(false);
  const [results, setResults] = useState<number[]>([]);
  const [diceStates, setDiceStates] = useState<Record<string, DiceState>>({});
  const [hasRolled, setHasRolled] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureStatus, setCaptureStatus] = useState<DiceCaptureStatus>('complete');
  const [requiredAmount, setRequiredAmount] = useState<number>(0);
  const [stable, setStable] = useState(false);
  
  // Server dice management
  const [serverDiceStates, setServerDiceStates] = useState<ServerDiceStates>({});
  const [lastUpdate, setLastUpdate] = useState(0);
  const serverDiceManagerRef = useRef<ServerDiceManager | null>(null);
  
  // Stable callback for dice state updates
  const onServerStatesUpdate = useCallback((states: ServerDiceStates) => {
    try {
      setServerDiceStates(states);
      setLastUpdate(Date.now());
      setDiceStates(states);
    } catch (error) {
      console.error(`[DEBUG] DiceProvider - Error updating dice states:`, error);
    }
  }, []);

  // Create dice manager for this room
  useEffect(() => {
    if (roomId && !serverDiceManagerRef.current) {
      console.log(`[DEBUG] DiceProvider - Creating ServerDiceManager for room ${roomId}`);
      serverDiceManagerRef.current = new ServerDiceManager(roomId, onServerStatesUpdate);
    }

    return () => {
      if (serverDiceManagerRef.current) {
        console.log(`[DEBUG] DiceProvider - Cleaning up ServerDiceManager for room ${roomId}`);
        serverDiceManagerRef.current.cleanup();
        serverDiceManagerRef.current = null;
      }
    };
  }, [roomId, onServerStatesUpdate]); // Include onServerStatesUpdate dependency
  
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
        
        // Auto-transition to complete after stability delay
        const timer = setTimeout(() => {
          if (enabled && stable && hasRolled && results.length > 0) {
            setCaptureStatus('complete');
          }
        }, 500);
        
        return () => clearTimeout(timer);
      }
    }
  }, [isCapturing, enabled, stable, hasRolled, results.length]);

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

  // Server dice action methods
  const throwDice = useCallback(async (diceId: string, velocity: [number, number, number], angularVelocity: [number, number, number]) => {
    if (!serverDiceManagerRef.current) {
      throw new Error('Dice manager not available');
    }
    return serverDiceManagerRef.current.throwDice(diceId, velocity, angularVelocity);
  }, []);

  const throwAllDice = useCallback(async (velocity: [number, number, number], angularVelocity: [number, number, number]) => {
    if (!serverDiceManagerRef.current) {
      throw new Error('Dice manager not available');
    }
    return serverDiceManagerRef.current.throwAllDice(velocity, angularVelocity);
  }, []);

  const moveDice = useCallback(async (diceId: string, position: [number, number, number], isKinematic: boolean = true) => {
    if (!serverDiceManagerRef.current) {
      throw new Error('Dice manager not available');
    }
    return serverDiceManagerRef.current.moveDice(diceId, position, isKinematic);
  }, []);

  const moveAllDice = useCallback(async (leadDiceId: string, leadPosition: [number, number, number], isKinematic: boolean = true) => {
    if (!serverDiceManagerRef.current) {
      throw new Error('Dice manager not available');
    }
    return serverDiceManagerRef.current.moveAllDice(leadDiceId, leadPosition, isKinematic);
  }, []);

  const moveMultipleDice = useCallback(async (dicePositions: Record<string, [number, number, number]>, isKinematic: boolean = true) => {
    if (!serverDiceManagerRef.current) {
      throw new Error('Dice manager not available');
    }
    return serverDiceManagerRef.current.moveMultipleDice(dicePositions, isKinematic);
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
    setRequiredAmount(requiredAmount || 0);
    
    return new Promise((resolve) => {
      const checkTimeout = () => {
        // Don't timeout if dice are actively rolling
        if (captureStatus === 'rolling') {
          setTimeout(checkTimeout, 1000);
          return;
        }
        
        // Timeout occurred - gracefully end the action
        setIsCapturing(false);
        setEnabled(false);
        setCaptureStatus('complete');
        setRequiredAmount(0);
        resolve({
          status: 'complete',
          error: null, // No error - just end the action gracefully
          data: []
        });
      };
      
      const timeout = setTimeout(checkTimeout, 30000);

      // Wait for dice to be stable and hasRolled
      const checkForCompletion = () => {
        if (stable && hasRolled && results.length > 0) {
          // 500ms stability delay before starting the 4-second completion timer
          setTimeout(() => {
            if (stable && hasRolled && results.length > 0) {
              // Start the 4-second completion timer
              setCaptureStatus('complete');
              
              setTimeout(() => {
                clearTimeout(timeout);
                setIsCapturing(false);
                setEnabled(false);
                // Don't reset requiredAmount here - let it persist for the UI
                
                resolve({
                  status: 'complete',
                  error: null,
                  data: results
                });
              }, 4000); // 4-second completion timer
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
  }, [isCapturing, stable, hasRolled, results, captureStatus]);
  
  const diceData: DiceData = {
    enabled,
    results,
    stable,
    hasRolled,
    isCapturing,
    captureStatus,
    requiredAmount,
    diceStates: serverDiceStates,
    isConnected: serverDiceManagerRef.current !== null,
    lastUpdate,
    enable,
    disable,
    updateStates,
    captureDiceResult,
    throwDice,
    throwAllDice,
    moveDice,
    moveAllDice,
    moveMultipleDice
  };
  
  return (
    <DiceContext.Provider value={diceData}>
      {children}
    </DiceContext.Provider>
  );
}

