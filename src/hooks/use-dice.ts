"use client";

import { useRoom } from '../contexts/room-context';

export function useDice() {
  const { serverDiceManager } = useRoom();
  
  return {
    serverDiceManager,
    isConnected: serverDiceManager !== null
  };
}