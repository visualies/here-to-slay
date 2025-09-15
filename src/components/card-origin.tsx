/**
 * CardOrigin - Responsive layout container that participates fully in DOM flow
 * 
 * CORE PRINCIPLE: This container never escapes normal layout flow, ensuring
 * it works seamlessly with CSS Grid, Flexbox, and responsive design systems.
 * 
 * Layout Integration:
 * - **Stays in DOM flow**: Maintains CSS aspect-ratio, flex-shrink, sizing props
 * - **Grid/Flex friendly**: Can be measured, positioned, and scaled by parents
 * - **Responsive**: Automatically adapts to container queries and viewport changes
 * - **Transforms safely**: Only applies transforms that don't affect layout
 *   (scale for party leaders), never escapes positioning context
 * 
 * Rotation Architecture:
 * - **Automatic detection**: When orientation=vertical + side=left/right detected
 * - **Preserves container**: CardOrigin itself never rotates or repositions
 * - **Delegates rotation**: Passes rotation responsibility to RotationWrapper child
 * - **Maintains aspect ratios**: Container keeps its defined proportions while
 *   content inside gets properly oriented
 * 
 * This design ensures rotated card areas integrate seamlessly with the overall
 * layout system, maintaining responsive behavior and predictable positioning
 * across all screen sizes and orientations.
 * 
 * Props:
 * - aspectRatio: "large" (party leaders) | "default" (regular cards)
 * - orientation: "horizontal" (top/bottom) | "vertical" (left/right)  
 * - side: Determines rotation direction when needed
 * - children: Any content (CardSlots, Cards, etc.)
 * - id: Unique identifier for this card origin (auto-generated if not provided)
 *
 * - Also see rotation-wrapper.tsx
 */
"use client";

import { ReactNode, useLayoutEffect, useRef, useMemo } from "react";
import { RotationWrapper } from "./rotation-wrapper";
import { useCardOriginSizing } from "../hooks/use-card-origin-sizing";

interface CardOriginProps {
  aspectRatio: "large" | "default";
  orientation: "horizontal" | "vertical";
  side?: "top" | "bottom" | "left" | "right";
  debugMode?: boolean;
  children?: ReactNode;
  id?: string; // Unique identifier for this card origin
  dimensions?: { width: number; height: number }; // Custom dimensions to override default sizing
}

export function CardOrigin({ aspectRatio, orientation, side, debugMode = false, children, id, dimensions }: CardOriginProps) {
  const { registerCardOrigin, getCenterScale } = useCardOriginSizing();
  const elementRef = useRef<HTMLDivElement>(null);
  
  // Generate unique ID if not provided
  const cardOriginId = useMemo(() => {
    if (id) return id;
    
    // Auto-generate ID based on side and aspect ratio
    if (side) {
      return `party-${side}-${aspectRatio}`;
    } else {
      return `center-${aspectRatio}-${Math.random().toString(36).substr(2, 9)}`;
    }
  }, [id, side, aspectRatio]);

  // Register with sizing context
  useLayoutEffect(() => {
    registerCardOrigin(cardOriginId, elementRef.current, aspectRatio, orientation);
    return () => registerCardOrigin(cardOriginId, null, aspectRatio, orientation);
  }, [registerCardOrigin, cardOriginId, aspectRatio, orientation]);

  // For center elements, synchronously copy target dimensions from party-bottom-* before paint
  useLayoutEffect(() => {
    if (side) return;
    const targetId = `party-bottom-${aspectRatio}`;
    const targetEl = document.getElementById(targetId);
    const el = elementRef.current;
    if (!targetEl || !el) return;
    const rect = targetEl.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      el.style.width = `${rect.width}px`;
      el.style.height = `${rect.height}px`;
      // Ensure aspect-ratio doesn't override explicit dimensions
      (el.style as any)["aspectRatio"] = "unset";
    }
  }, [side, aspectRatio]);

  // Determine colors and aspect ratio based on props
  const isLarge = aspectRatio === "large";
  const bgColor = debugMode ? (isLarge ? "bg-green-500/30" : "bg-blue-500/30") : "";
  const outlineColor = debugMode ? (isLarge ? "outline-green-500" : "outline-blue-500") : "";
  
  // Calculate aspect ratio based on orientation and size
  let cardAspectRatio: string;
  if (orientation === "horizontal") {
    cardAspectRatio = isLarge ? "3/5" : "5/7";
  } else {
    cardAspectRatio = isLarge ? "5/3" : "7/5";
  }
  
  // Apply scaling for large cards (party leader)
  let transform = isLarge ? "scale(1.5)" : undefined;
  
  // Set dimensions based on props
  let sizeProps: React.CSSProperties;
  
  if (dimensions) {
    // Custom dimensions provided - use them directly
    sizeProps = {
      width: `${dimensions.width}px`,
      height: `${dimensions.height}px`,
      aspectRatio: 'unset' // Override the CSS aspect-ratio
    };
  } else {
    const isCenter = !side;
    if (isCenter) {
      // Stable non-zero fallback for center elements until party sizes arrive
      if (orientation === "horizontal") {
        sizeProps = { width: 'clamp(72px, 12vw, 144px)' };
      } else {
        sizeProps = { height: 'clamp(72px, 12vh, 144px)' };
      }
    } else {
      // Party wrappers rely on their container height/width
      sizeProps = orientation === "horizontal" 
        ? { height: '100%' }
        : { width: '100%' };
    }
    
    // Apply center area scaling for center elements without custom dimensions
    if (!side) {
      const centerScale = getCenterScale(aspectRatio, orientation);
      transform = transform ? `${transform} scale(${centerScale})` : `scale(${centerScale})`;
    }
  }

  return (
    <div
      ref={elementRef}
      id={cardOriginId}
      className={`${bgColor} ${outlineColor ? `outline outline-2 ${outlineColor}` : ""} flex-shrink-0 flex items-center justify-center relative has-[.card:hover]:z-[60]`}
      style={{
        ...sizeProps,
        ...(!dimensions ? { aspectRatio: cardAspectRatio } : {}),
        transform,
        ...(orientation === "vertical" && !isLarge ? { maxHeight: `${100/6 - 2}%` } : {})
      }}
    >
      {debugMode && (
        <div className="absolute top-0 left-0 text-xs bg-black text-white px-1 rounded outline outline-1 outline-white z-50">
          {cardOriginId}
          {dimensions && (
            <div className="text-green-300">
              → custom dims: {dimensions.width}x{dimensions.height}
            </div>
          )}
        </div>
      )}
      {children && (
        <RotationWrapper
          orientation={orientation}
          side={side}
          debugMode={debugMode}
          parentScale={isLarge ? 1.5 : 1}
        >
          {children}
        </RotationWrapper>
      )}
    </div>
  );
}