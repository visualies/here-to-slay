"use client";

import { useContext, useCallback, useState, useEffect, useRef } from 'react';
import { useRoom } from '../contexts/room-context';
import { DiceContext } from '../contexts/dice-context';
import { ServerDiceManager, ServerDiceStates } from '../lib/server-dice';

export function useDice() {
  const { roomId } = useRoom();
  const diceContext = useContext(DiceContext);
  
  console.log(`DEBUG: useDice returning requiredAmount:`, diceContext.requiredAmount);

  const [serverDiceStates, setServerDiceStates] = useState<ServerDiceStates>({});
  const [lastUpdate, setLastUpdate] = useState(0);
  const serverDiceManagerRef = useRef<ServerDiceManager | null>(null);
  const diceContextRef = useRef(diceContext);
  
  // Update the ref when diceContext changes
  // This prevents the ServerDiceManager from being recreated every time diceContext changes
  // by keeping a stable reference to the current diceContext in the callback
  useEffect(() => {
    diceContextRef.current = diceContext;
  }, [diceContext]);

  // Create dice manager for this room
  useEffect(() => {
    if (roomId && !serverDiceManagerRef.current) {
      console.log(`[DEBUG] useDice - Creating ServerDiceManager for room ${roomId}`);
      serverDiceManagerRef.current = new ServerDiceManager(roomId, (states: ServerDiceStates) => {
        try {
          setServerDiceStates(states);
          setLastUpdate(Date.now());
          diceContextRef.current.updateStates(states);
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

  // User-controlled dice capture workflow (legacy method)
  const captureDiceResults = useCallback(async (): Promise<number[]> => {
    const response = await diceContext.captureDiceResult();
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data || [];
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
    isCapturing: diceContext.isCapturing,
    captureStatus: diceContext.captureStatus,
    requiredAmount: diceContext.requiredAmount,
    lastUpdate,
    
    // State utilities
    updateDiceState,
    
    // Dice control actions
    enable: diceContext.enable,
    disable: diceContext.disable,
    captureDiceResults,
    captureDiceResult: diceContext.captureDiceResult,
    
    // Dice physics actions
    throwDice,
    throwAllDice,
    moveDice,
    moveAllDice,
    moveMultipleDice
  };
}