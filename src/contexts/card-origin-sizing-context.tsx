"use client";

import { createContext, useLayoutEffect, useRef, useState, useCallback, ReactNode } from "react";

interface CardOriginSize {
  width: number;
  height: number;
  aspectRatio: "large" | "default";
  orientation: "horizontal" | "vertical";
}

interface CardOriginSizingContextType {
  // Register a card origin with its measurements
  registerCardOrigin: (id: string, element: HTMLElement | null, aspectRatio: "large" | "default", orientation: "horizontal" | "vertical") => void;
  // Get the target size for a card origin (based on party wrapper card origins)
  getTargetSize: (aspectRatio: "large" | "default", orientation: "horizontal" | "vertical") => CardOriginSize | null;
  // Get a specific card origin's size by ID
  getCardOriginSize: (id: string) => CardOriginSize | null;
  // Get all registered sizes (for debugging)
  getAllSizes: () => Record<string, CardOriginSize>;
  // Get scale factor for center area card origins to match party wrapper sizes
  getCenterScale: (aspectRatio: "large" | "default", orientation: "horizontal" | "vertical") => number;
  // Get exact dimensions to copy from target
  getTargetDimensions: (targetId: string) => { width: number; height: number } | null;
  // Get unscaled dimensions (removes scale transforms like party leader 1.5x)
  getUnscaledTargetDimensions: (targetId: string) => { width: number; height: number } | null;
}

export const CardOriginSizingContext = createContext<CardOriginSizingContextType | undefined>(undefined);

interface CardOriginSizingProviderProps {
  children: ReactNode;
}

export function CardOriginSizingProvider({ children }: CardOriginSizingProviderProps) {
  const elementsRef = useRef<Record<string, HTMLElement>>({});
  const observersRef = useRef<Map<HTMLElement, ResizeObserver>>(new Map());
  const [sizes, setSizes] = useState<Record<string, CardOriginSize>>({});

  const measureElement = useCallback((id: string, element: HTMLElement, aspectRatio: "large" | "default", orientation: "horizontal" | "vertical") => {
    const rect = element.getBoundingClientRect();
    // Ignore initial zero measurements and retry next frame to avoid flash-from-0
    if (rect.width <= 0 || rect.height <= 0) {
      requestAnimationFrame(() => measureElement(id, element, aspectRatio, orientation));
      return;
    }
    const newSize: CardOriginSize = {
      width: rect.width,
      height: rect.height,
      aspectRatio,
      orientation
    };

    setSizes(prev => {
      const current = prev[id];
      if (current && 
          current.width === newSize.width && 
          current.height === newSize.height &&
          current.aspectRatio === newSize.aspectRatio &&
          current.orientation === newSize.orientation) {
        return prev; // No change
      }
      return { ...prev, [id]: newSize };
    });
  }, []);

  const registerCardOrigin = useCallback((id: string, element: HTMLElement | null, aspectRatio: "large" | "default", orientation: "horizontal" | "vertical") => {
    const currentElement = elementsRef.current[id];
    
    // Cleanup previous observer
    if (currentElement) {
      const observer = observersRef.current.get(currentElement);
      if (observer) {
        observer.unobserve(currentElement);
        observer.disconnect();
        observersRef.current.delete(currentElement);
      }
      delete elementsRef.current[id];
    }

    if (!element) {
      // Remove from sizes when unregistering
      setSizes(prev => {
        const newSizes = { ...prev };
        delete newSizes[id];
        return newSizes;
      });
      return;
    }

    // Register new element
    elementsRef.current[id] = element;
    
    // Create observer
    const observer = new ResizeObserver(() => {
      measureElement(id, element, aspectRatio, orientation);
    });
    observer.observe(element);
    observersRef.current.set(element, observer);
    
    // Measure immediately
    measureElement(id, element, aspectRatio, orientation);
  }, [measureElement]);

  const getTargetSize = useCallback((aspectRatio: "large" | "default", orientation: "horizontal" | "vertical"): CardOriginSize | null => {
    // Find party wrapper card origins with matching criteria
    const partyOrigins = Object.entries(sizes).filter(([id, size]) => 
      id.startsWith('party-') && 
      size.aspectRatio === aspectRatio && 
      size.orientation === orientation
    );

    if (partyOrigins.length === 0) return null;

    // Use the smallest size to ensure center cards don't exceed party card sizes
    const minSize = partyOrigins.reduce((min, [, size]) => ({
      width: Math.min(min.width, size.width),
      height: Math.min(min.height, size.height),
      aspectRatio,
      orientation
    }), { width: Infinity, height: Infinity, aspectRatio, orientation });

    return minSize.width === Infinity ? null : minSize;
  }, [sizes]);

  const getCenterScale = useCallback((aspectRatio: "large" | "default", orientation: "horizontal" | "vertical"): number => {
    const targetSize = getTargetSize(aspectRatio, orientation);
    if (!targetSize) return 1;

    // For center area, we'll scale based on a reasonable base size
    // This ensures center cards match party card sizes
    const baseSize = orientation === "horizontal" ? targetSize.width : targetSize.height;
    const targetBaseSize = 96; // Base card size in pixels
    
    return Math.min(1, baseSize / targetBaseSize);
  }, [getTargetSize]);

  const getCardOriginSize = useCallback((id: string): CardOriginSize | null => {
    return sizes[id] || null;
  }, [sizes]);

  const getTargetDimensions = useCallback((targetId: string): { width: number; height: number } | null => {
    const targetSize = sizes[targetId];
    if (!targetSize) return null;
    
    return { width: targetSize.width, height: targetSize.height };
  }, [sizes]);

  const getUnscaledTargetDimensions = useCallback((targetId: string): { width: number; height: number } | null => {
    const targetSize = sizes[targetId];
    if (!targetSize) return null;
    
    // If this is a large aspect ratio (party leader), remove the 1.5x scale
    if (targetSize.aspectRatio === "large") {
      return { 
        width: targetSize.width / 1.5, 
        height: targetSize.height / 1.5 
      };
    }
    
    return { width: targetSize.width, height: targetSize.height };
  }, [sizes]);

  const getAllSizes = useCallback(() => sizes, [sizes]);

  // Cleanup on unmount
  useLayoutEffect(() => {
    const observers = observersRef.current;
    return () => {
      observers.forEach(observer => {
        observer.disconnect();
      });
      observers.clear();
    };
  }, []);

  const value = {
    registerCardOrigin,
    getTargetSize,
    getCardOriginSize,
    getAllSizes,
    getCenterScale,
    getTargetDimensions,
    getUnscaledTargetDimensions
  };

  return (
    <CardOriginSizingContext.Provider value={value}>
      {children}
    </CardOriginSizingContext.Provider>
  );
}

