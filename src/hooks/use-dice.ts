import { useContext } from 'react';
import { DiceContext } from '@/contexts/dice-context';

export function useDice() {
  const context = useContext(DiceContext);
  return context;
}