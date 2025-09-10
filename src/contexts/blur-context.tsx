"use client";

import { createContext, useContext, useState, ReactNode } from 'react';

interface BlurContextType {
  isBlurred: boolean;
  setBlurred: (blurred: boolean) => void;
}

const BlurContext = createContext<BlurContextType | undefined>(undefined);

export function BlurProvider({ children }: { children: ReactNode }) {
  const [isBlurred, setIsBlurred] = useState(false);

  const setBlurred = (blurred: boolean) => {
    setIsBlurred(blurred);
  };

  return (
    <BlurContext.Provider value={{ isBlurred, setBlurred }}>
      {children}
    </BlurContext.Provider>
  );
}

export function useBlur() {
  const context = useContext(BlurContext);
  if (context === undefined) {
    throw new Error('useBlur must be used within a BlurProvider');
  }
  return context;
}
