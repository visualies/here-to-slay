"use client";

import { createContext, useContext, useState, ReactNode } from 'react';

interface BlurContextType {
  isBlurred: boolean;
  setBlurred: (blurred: boolean) => void;
}

export const BlurContext = createContext<BlurContextType | undefined>(undefined);

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

