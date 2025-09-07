"use client";

import { useContext, useCallback, useState, useEffect, useRef } from 'react';
import { useRoom } from '../contexts/room-context';
import { DiceContext } from '../contexts/dice-context';
import { ServerDiceManager, ServerDiceStates } from '../lib/server-dice';

export function useDice() {
  const { roomId } = useRoom();
  const diceContext = useContext(DiceContext);
  
  if (!diceContext) {
    throw new Error('useDice must be used within a DiceProvider');
  }

  const [isCapturing, setIsCapturing] = useState(false);
  const [serverDiceStates, setServerDiceStates] = useState<ServerDiceStates>({});
  const [lastUpdate, setLastUpdate] = useState(0);
  const serverDiceManagerRef = useRef<ServerDiceManager | null>(null);

  // Create dice manager for this room
  useEffect(() => {
    if (roomId && !serverDiceManagerRef.current) {
      console.log(`[DEBUG] useDice - Creating ServerDiceManager for room ${roomId}`);
      serverDiceManagerRef.current = new ServerDiceManager(roomId, (states: ServerDiceStates) => {
        console.log(`[DEBUG] useDice - Received dice states:`, states);
        try {
          setServerDiceStates(states);
          setLastUpdate(Date.now());
          diceContext.updateStates(states);
        } catch (error) {
          console.error(`[DEBUG] useDice - Error updating dice context:`, error);
        }
      });
    }

    return () => {
      if (serverDiceManagerRef.current) {
        console.log(`[DEBUG] useDice - Cleaning up ServerDiceManager for room ${roomId}`);
        serverDiceManagerRef.current.cleanup();
        serverDiceManagerRef.current = null;
      }
    };
  }, [roomId]); // Remove diceContext from dependencies to prevent recreation

  // User-controlled dice capture workflow
  const captureDiceResults = useCallback(async (): Promise<number[]> => {
    if (!serverDiceManagerRef.current) {
      throw new Error('Dice manager not available');
    }

    setIsCapturing(true);
    
    // Enable the 3D dice plane for user interaction
    diceContext.enable();
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        setIsCapturing(false);
        diceContext.disable();
        reject(new Error('Dice capture timeout - user did not throw dice'));
      }, 30000);

      let stabilityTimer: NodeJS.Timeout | null = null;
      let wasRolling = false;

      const checkDiceState = () => {
        // Check if dice started moving (not stable)
        if (!diceContext.stable && !wasRolling) {
          wasRolling = true;
          console.log('Dice movement detected - user is throwing...');
        }
        
        // Check for stability after dice were moving
        if (wasRolling && diceContext.stable && diceContext.results.length > 0) {
          // Start 500ms stability timer
          if (stabilityTimer) clearTimeout(stabilityTimer);
          
          stabilityTimer = setTimeout(() => {
            if (diceContext.stable && diceContext.results.length > 0) {
              clearTimeout(timeout);
              setIsCapturing(false);
              diceContext.disable();
              
              resolve(diceContext.results);
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
  }, [diceContext]);

  // Utility for individual dice components to get their state
  const updateDiceState = useCallback((diceId: string, setState: (state: any) => void) => {
    const state = serverDiceStates[diceId] || null;
    setState(state);
  }, [serverDiceStates]);

  // Dice management methods - wrapping ServerDiceManager functionality
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
  
  return {
    // Dice state
    enabled: diceContext.enabled,
    stable: diceContext.stable,
    results: diceContext.results,
    diceStates: serverDiceStates,
    isConnected: serverDiceManagerRef.current !== null,
    isCapturing,
    lastUpdate,
    
    // State utilities
    updateDiceState,
    
    // Dice control actions
    enable: diceContext.enable,
    disable: diceContext.disable,
    captureDiceResults,
    
    // Dice physics actions
    throwDice,
    throwAllDice,
    moveDice,
    moveAllDice,
    moveMultipleDice
  };
}