"use client";

import { createContext, ReactNode, useState, useCallback } from 'react';

interface StatusMessage {
  id: string;
  message: string;
  type: 'error' | 'warning' | 'success' | 'info';
  duration?: number; // in milliseconds
}

interface StatusContextValue {
  currentMessage: StatusMessage | null;
  showMessage: (message: string, type?: 'error' | 'warning' | 'success' | 'info', duration?: number) => void;
  clearMessage: () => void;
}

export const StatusContext = createContext<StatusContextValue | null>(null);

interface StatusProviderProps {
  children: ReactNode;
}

export function StatusProvider({ children }: StatusProviderProps) {
  const [currentMessage, setCurrentMessage] = useState<StatusMessage | null>(null);

  const showMessage = useCallback((message: string, type: 'error' | 'warning' | 'success' | 'info' = 'error', duration: number = 3000) => {
    const messageId = Date.now().toString();
    setCurrentMessage({
      id: messageId,
      message,
      type,
      duration
    });

    // Auto-clear after duration
    setTimeout(() => {
      setCurrentMessage(prev => prev?.id === messageId ? null : prev);
    }, duration);
  }, []);

  const clearMessage = useCallback(() => {
    setCurrentMessage(null);
  }, []);

  const contextValue: StatusContextValue = {
    currentMessage,
    showMessage,
    clearMessage
  };

  return (
    <StatusContext.Provider value={contextValue}>
      {children}
    </StatusContext.Provider>
  );
}