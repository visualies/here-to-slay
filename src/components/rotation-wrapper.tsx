/**
 * RotationWrapper - Handles content rotation for card slots on left/right sides
 *
 * This wrapper solves a fundamental layout problem: when CardOrigin containers are
 * rotated (e.g., for left/right party areas), the content inside calculates its
 * dimensions BEFORE rotation is applied, leading to incorrect aspect ratios.
 *
 * Solution:
 * 1. Measures the parent CardOrigin's actual pixel dimensions
 * 2. When rotation is needed (vertical orientation + left/right side):
 *    - Uses absolute positioning to avoid affecting parent layout
 *    - Applies SWAPPED dimensions (height->width, width->height) to itself
 *    - Children see "landscape" dimensions and calculate accordingly
 *    - Applies rotation transform to make content appear upright
 * 3. Result: Properly proportioned, readable content on rotated sides
 *
 * Rotation directions (all content tops face screen center):
 * - Left side: +90° | Right side: -90° | Top side: 180°
 */
"use client";

import { ReactNode, useLayoutEffect, useRef, useState } from "react";
import { useSizing } from "@/contexts/sizing-context";
import { useCardOriginSizing } from "@/contexts/card-origin-sizing-context";

interface RotationWrapperProps {
  children: ReactNode;
  orientation: "horizontal" | "vertical";
  side?: "top" | "bottom" | "left" | "right";
  aspectRatio: string;
  debugMode?: boolean;
  parentScale?: number; // Scale applied to the CardOrigin itself (e.g., 1.5 for party leaders)
}

export function RotationWrapper({ 
  children, 
  orientation, 
  side, 
  aspectRatio, 
  debugMode = false,
  parentScale = 1
}: RotationWrapperProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [parentDimensions, setParentDimensions] = useState({ width: 0, height: 0 });
  const { scales } = useSizing();
  const { getAllSizes } = useCardOriginSizing(); // Available for future use if needed
  
  // Determine if content needs rotation based on orientation and side
  const needsRotation = (orientation === "vertical" && (side === "left" || side === "right")) || 
                        (orientation === "horizontal" && side === "top");
  const rotationDegrees = side === "left" ? 90 : side === "right" ? -90 : side === "top" ? 180 : 0;
  
  // Get the scale for this side
  const scale = side ? scales[side] ?? 1 : 1;

  useLayoutEffect(() => {
    if (!parentRef.current?.parentElement) return;
    
    const updateDimensions = () => {
      const parent = parentRef.current?.parentElement;
      if (parent) {
        const rect = parent.getBoundingClientRect();
        // Use both the PartyWrapper scale and CardOrigin scale to get true unscaled dimensions
        const totalScale = scale * parentScale;
        setParentDimensions({ 
          width: rect.width / totalScale, 
          height: rect.height / totalScale 
        });
      }
    };
    
    updateDimensions();
    
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(parentRef.current.parentElement);
    
    return () => resizeObserver.disconnect();
  }, [scale, parentScale]);


  // Check if we need dimension swapping (left/right sides) vs just rotation (top)
  const needsDimensionSwap = (orientation === "vertical" && (side === "left" || side === "right"));
  const needsJustRotation = (orientation === "horizontal" && side === "top");

  return (
    <div
      ref={parentRef}
      className={`flex items-center justify-center ${needsRotation ? 'absolute inset-0' : 'w-full h-full'} ${debugMode && needsRotation ? "outline outline-2 outline-orange-500" : ""}`}
      style={{
        // Apply exact swapped dimensions when rotation with dimension swap is needed (left/right)
        ...(needsDimensionSwap && parentDimensions.width && parentDimensions.height ? {
          width: `${parentDimensions.height}px`,
          height: `${parentDimensions.width}px`,
          left: '50%',
          top: '50%',
          marginLeft: `${-parentDimensions.height / 2}px`,
          marginTop: `${-parentDimensions.width / 2}px`
        } : needsJustRotation && parentDimensions.width && parentDimensions.height ? {
          // For top cards, use original dimensions (no swapping) with same centering pattern
          width: `${parentDimensions.width}px`,
          height: `${parentDimensions.height}px`,
          left: '50%',
          top: '50%',
          marginLeft: `${-parentDimensions.width / 2}px`,
          marginTop: `${-parentDimensions.height / 2}px`
        } : {}),
        transform: needsRotation ? `rotate(${rotationDegrees}deg)` : undefined,
        transformOrigin: 'center'
      }}
    >
      {children}
    </div>
  );
}