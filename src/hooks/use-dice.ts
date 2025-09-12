"use client";

// DEPRECATED: This hook has been moved to dice-context.tsx to prevent multiple ServerDiceManager instances
// All components should now import { useDice } from '../contexts/dice-context' instead

import { useContext } from 'react';
import { DiceContext } from '../contexts/dice-context';

export function useDice() {
  console.warn('[DEPRECATED] useDice from hooks/use-dice.ts is deprecated. Use import { useDice } from "../contexts/dice-context" instead.');
  
  const diceContext = useContext(DiceContext);
  
  // Return the centralized context data
  return diceContext;
}