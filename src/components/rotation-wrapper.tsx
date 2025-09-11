"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

interface RotationWrapperProps {
  children: ReactNode;
  orientation: "horizontal" | "vertical";
  side?: "top" | "bottom" | "left" | "right";
  aspectRatio: string;
  debugMode?: boolean;
}

export function RotationWrapper({ 
  children, 
  orientation, 
  side, 
  aspectRatio, 
  debugMode = false 
}: RotationWrapperProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [parentDimensions, setParentDimensions] = useState({ width: 0, height: 0 });
  
  // Determine if content needs rotation based on orientation and side
  const needsRotation = (orientation === "vertical" && (side === "left" || side === "right"));
  const rotationDegrees = side === "left" ? -90 : side === "right" ? 90 : 0;

  useEffect(() => {
    if (!parentRef.current?.parentElement) return;
    
    const updateDimensions = () => {
      const parent = parentRef.current?.parentElement;
      if (parent) {
        const rect = parent.getBoundingClientRect();
        setParentDimensions({ width: rect.width, height: rect.height });
      }
    };
    
    updateDimensions();
    
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(parentRef.current.parentElement);
    
    return () => resizeObserver.disconnect();
  }, []);


  return (
    <div
      ref={parentRef}
      className={`flex items-center justify-center ${needsRotation ? 'absolute inset-0' : 'w-full h-full'} ${debugMode && needsRotation ? "outline outline-2 outline-orange-500" : ""}`}
      style={{
        // Apply exact swapped dimensions when rotation is needed
        ...(needsRotation && parentDimensions.width && parentDimensions.height ? {
          width: `${parentDimensions.height}px`,
          height: `${parentDimensions.width}px`,
          left: '50%',
          top: '50%',
          marginLeft: `${-parentDimensions.height / 2}px`,
          marginTop: `${-parentDimensions.width / 2}px`
        } : {}),
        transform: needsRotation ? `rotate(${rotationDegrees}deg)` : undefined,
        transformOrigin: 'center'
      }}
    >
      {children}
    </div>
  );
}