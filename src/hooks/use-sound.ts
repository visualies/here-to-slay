import { useContext } from 'react';
import { SoundContext } from '@/contexts/sound-context';

export function useSound() {
  const context = useContext(SoundContext);
  if (context === undefined) {
    throw new Error('useSound must be used within a SoundProvider');
  }
  return context;
}