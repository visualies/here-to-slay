import { useContext } from 'react';
import { DiceContext } from '@/contexts/dice-context';

export function useDice() {
  const context = useContext(DiceContext);
  if (!context) {
    throw new Error('useDice must be used within a DiceProvider');
  }
  return context;
}