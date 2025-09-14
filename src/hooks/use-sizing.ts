import { useContext } from 'react';
import { SizingContext } from '@/contexts/sizing-context';

export function useSizing() {
  const context = useContext(SizingContext);
  if (context === undefined) {
    throw new Error('useSizing must be used within a SizingProvider');
  }
  return context;
}