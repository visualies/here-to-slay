"use client";

import { createContext, useContext, useLayoutEffect, useMemo, useRef, useState, ReactNode, useCallback } from "react";

type Position = 'top' | 'right' | 'bottom' | 'left';

interface SizingContextType {
  // Legacy field to avoid breaking callers; not used for layout anymore
  cardSize: number;
  // Per-position content scale so that both sides in a pair match the smaller side
  scales: Record<Position, number>;
  // Register an element that should be measured for a given position
  register: (position: Position, element: HTMLElement | null) => void;
}

const SizingContext = createContext<SizingContextType | undefined>(undefined);

interface SizingProviderProps {
  children: ReactNode;
}

export function SizingProvider({ children }: SizingProviderProps) {
  // Keep a stable map of elements per position
  const elementsRef = useRef<Partial<Record<Position, HTMLElement>>>({});
  const [scales, setScales] = useState<Record<Position, number>>({ top: 1, right: 1, bottom: 1, left: 1 });

  const observersRef = useRef<Map<Element, ResizeObserver>>(new Map());

  const measureAll = useCallback(() => {
    const nextSizes: Partial<Record<Position, { width: number; height: number }>> = {};
    (['top','right','bottom','left'] as Position[]).forEach((pos) => {
      const el = elementsRef.current[pos];
      if (el) {
        nextSizes[pos] = { width: el.clientWidth, height: el.clientHeight };
      }
    });

    // Update scales based on size changes
    setScales((prev) => {
      const positions: Position[] = ['top','right','bottom','left'];
      const newScales = { ...prev };
      
      positions.forEach((pos) => {
        const currentSize = nextSizes[pos];
        if (currentSize) {
          // Calculate scale based on size - this is a simplified version
          // You might want to implement more sophisticated scaling logic here
          newScales[pos] = Math.min(1, Math.min(currentSize.width, currentSize.height) / 200);
        }
      });
      
      return newScales;
    });

    // Compute global minimum target so all sides match the same smaller dimension
    const topH = nextSizes.top?.height ?? null;
    const bottomH = nextSizes.bottom?.height ?? null;
    const leftW = nextSizes.left?.width ?? null;
    const rightW = nextSizes.right?.width ?? null;

    const pairMinH = topH !== null && bottomH !== null ? Math.min(topH, bottomH) : null;
    const pairMinW = leftW !== null && rightW !== null ? Math.min(leftW, rightW) : null;
    const candidates = [pairMinH, pairMinW].filter((v): v is number => v !== null);
    const globalMin = candidates.length > 0 ? Math.min(...candidates) : null;

    let topScale = 1, bottomScale = 1, leftScale = 1, rightScale = 1;
    if (globalMin !== null) {
      if (topH !== null) topScale = topH > 0 ? globalMin / topH : 1;
      if (bottomH !== null) bottomScale = bottomH > 0 ? globalMin / bottomH : 1;
      if (leftW !== null) leftScale = leftW > 0 ? globalMin / leftW : 1;
      if (rightW !== null) rightScale = rightW > 0 ? globalMin / rightW : 1;
    }

    // Round to 3 decimals to reduce churn
    const round = (n: number) => Math.max(0.01, Math.round(n * 1000) / 1000);
    const nextScales: Record<Position, number> = { top: round(topScale), right: round(rightScale), bottom: round(bottomScale), left: round(leftScale) };
    setScales((prev) => {
      const same = ['top','right','bottom','left'].every((p) => prev[p as Position] === nextScales[p as Position]);
      return same ? prev : nextScales;
    });
  }, []);

  const register = useCallback((position: Position, element: HTMLElement | null) => {
    const current = elementsRef.current[position];
    if (element === current) return;

    // Cleanup previous observer if any
    if (!element && current) {
      const ro = observersRef.current.get(current);
      if (ro) {
        ro.unobserve(current);
        ro.disconnect();
        observersRef.current.delete(current);
      }
      delete elementsRef.current[position];
      return;
    }

    if (element) {
      elementsRef.current[position] = element;
      if (!observersRef.current.has(element)) {
        const ro = new ResizeObserver(() => {
          measureAll();
        });
        ro.observe(element);
        observersRef.current.set(element, ro);
      }
      // Measure immediately on registration
      measureAll();
    }
  }, [measureAll]);

  // Initial measure and window resize listener
  useLayoutEffect(() => {
    measureAll();
    const onResize = () => measureAll();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [measureAll]);

  // Debug scales visibility
  useLayoutEffect(() => {
     
    console.debug('[Sizing] scales', scales);
  }, [scales]);

  // Keep legacy cardSize for compatibility; not used for scaling logic
  const cardSize = 80;

  const value = useMemo(() => ({ cardSize, scales, register }), [cardSize, scales, register]);

  return (
    <SizingContext.Provider value={value}>
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
