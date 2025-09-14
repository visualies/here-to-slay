import { useContext } from 'react';
import { BlurContext } from '@/contexts/blur-context';

export function useBlur() {
  const context = useContext(BlurContext);
  if (context === undefined) {
    throw new Error('useBlur must be used within a BlurProvider');
  }
  return context;
}