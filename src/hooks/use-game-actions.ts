"use client";

import { useContext } from 'react';
import { GameActionsContext } from '../contexts/game-actions-context';

export function useGameActions() {
  const context = useContext(GameActionsContext);
  if (!context) {
    throw new Error('useGameActions must be used within a GameActionsProvider');
  }
  return context;
}