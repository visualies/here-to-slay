import { useContext } from 'react';
import { RoomContext } from '@/contexts/room-context';
import type { Room } from '@/types';

export function useRoom(): Room {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error('useRoom must be used within a RoomProvider');
  }
  return context;
}