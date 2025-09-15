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

import { ReactNode, useLayoutEffect, useRef } from "react";

interface RotationWrapperProps {
  children: ReactNode;
  orientation: "horizontal" | "vertical";
  side?: "top" | "bottom" | "left" | "right";
  debugMode?: boolean;
  parentScale?: number; // Scale applied to the CardOrigin itself (e.g., 1.5 for party leaders)
}

export function RotationWrapper({ 
  children, 
  orientation, 
  side, 
  debugMode = false,
  parentScale = 1
}: RotationWrapperProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  // Determine if content needs rotation based on orientation and side
  const needsRotation = (orientation === "vertical" && (side === "left" || side === "right")) || 
                        (orientation === "horizontal" && side === "top");
  const rotationDegrees = side === "left" ? 90 : side === "right" ? -90 : side === "top" ? 180 : 0;

  useLayoutEffect(() => {
    if (!parentRef.current?.parentElement) return;
    
    const el = parentRef.current;
    const parent = el.parentElement as HTMLElement;
    const updateDimensions = () => {
      // Use layout dimensions that are not affected by transforms on ancestors
      let parentWidth = parent.clientWidth;
      let parentHeight = parent.clientHeight;
      if ((parentWidth === 0 || parentHeight === 0)) {
        // Fallback to rect if client metrics are momentarily zero
        const rect = parent.getBoundingClientRect();
        parentWidth = rect.width;
        parentHeight = rect.height;
      }

      if (needsRotation && side !== 'top') {
        // Absolute center and size using swapped dimensions when needed
        el.style.position = 'absolute';
        el.style.right = 'auto';
        el.style.bottom = 'auto';
        el.style.top = '50%';
        el.style.left = '50%';
        el.style.width = `${(orientation === "vertical" && (side === "left" || side === "right")) ? parentHeight : parentWidth}px`;
        el.style.height = `${(orientation === "vertical" && (side === "left" || side === "right")) ? parentWidth : parentHeight}px`;
        el.style.transformOrigin = 'center';
        el.style.transform = `translate(-50%, -50%) rotate(${rotationDegrees}deg)`;
      } else {
        // Fill parent with no rotation
        el.style.position = 'relative';
        el.style.top = '';
        el.style.left = '';
        el.style.right = '';
        el.style.bottom = '';
        el.style.width = '100%';
        el.style.height = '100%';
        el.style.transform = needsRotation && side === 'top' ? `rotate(${rotationDegrees}deg)` : '';
        el.style.transformOrigin = '';
      }
    };
    
    updateDimensions();
    
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(parent);
    
    return () => resizeObserver.disconnect();
  }, [parentScale, needsRotation, orientation, side, rotationDegrees]);


  return (
    <div
      ref={parentRef}
      className={`flex items-center justify-center ${needsRotation ? 'absolute inset-0' : 'w-full h-full'} ${debugMode && needsRotation ? "outline outline-2 outline-orange-500" : ""}`}
    >
      {children}
    </div>
  );
}