"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface SizingContextType {
  cardSize: number;
  isCalculating: boolean;
}

const SizingContext = createContext<SizingContextType | undefined>(undefined);

interface SizingProviderProps {
  children: ReactNode;
}

export function SizingProvider({ children }: SizingProviderProps) {
  const [cardSize, setCardSize] = useState(80);
  const [isCalculating, setIsCalculating] = useState(true);

  useEffect(() => {
    const calculateOptimalCardSize = () => {
      setIsCalculating(true);
      
      // Get viewport dimensions
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Calculate the actual available space for each party position
      // Top/Bottom parties: horizontal space (2fr column)
      // Left/Right parties: vertical space (2fr row)
      const horizontalSpace = viewportWidth * 0.6; // Approximate 2fr column space
      const verticalSpace = viewportHeight * 0.6; // Approximate 2fr row space
      
      // Calculate how many cards can fit in each direction
      const cardsPerParty = 6;
      const cardGap = 4; // 4px gap between cards
      const totalGapSpace = (cardsPerParty - 1) * cardGap;
      
      // Calculate available space per card for each direction
      const horizontalSpacePerCard = (horizontalSpace - totalGapSpace) / cardsPerParty;
      const verticalSpacePerCard = (verticalSpace - totalGapSpace) / cardsPerParty;
      
      // Use the larger of the two as the base size
      // The smaller side will be allowed to overflow into corners
      const baseCardSize = Math.max(horizontalSpacePerCard, verticalSpacePerCard);
      
      // Apply reasonable bounds
      const minSize = 40;
      const maxSize = 120;
      const boundedSize = Math.max(minSize, Math.min(maxSize, baseCardSize));
      
      // Debug logging
      console.log('Sizing Context:', {
        viewport: { width: viewportWidth, height: viewportHeight },
        spaces: { horizontal: horizontalSpace, vertical: verticalSpace },
        perCard: { horizontal: horizontalSpacePerCard, vertical: verticalSpacePerCard },
        base: baseCardSize,
        final: boundedSize,
        smallerSide: horizontalSpacePerCard < verticalSpacePerCard ? 'horizontal' : 'vertical'
      });
      
      setCardSize(boundedSize);
      setIsCalculating(false);
    };

    calculateOptimalCardSize();
    window.addEventListener('resize', calculateOptimalCardSize);
    
    return () => window.removeEventListener('resize', calculateOptimalCardSize);
  }, []);

  return (
    <SizingContext.Provider value={{ cardSize, isCalculating }}>
      {children}
    </SizingContext.Provider>
  );
}

export function useSizing() {
  const context = useContext(SizingContext);
  if (context === undefined) {
    throw new Error('useSizing must be used within a SizingProvider');
  }
  return context;
}
