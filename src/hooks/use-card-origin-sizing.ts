import { useContext } from 'react';
import { CardOriginSizingContext } from '@/contexts/card-origin-sizing-context';

export function useCardOriginSizing() {
  const context = useContext(CardOriginSizingContext);
  if (context === undefined) {
    throw new Error('useCardOriginSizing must be used within a CardOriginSizingProvider');
  }
  return context;
}