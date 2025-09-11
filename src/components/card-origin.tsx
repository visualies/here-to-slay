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
 *
 * - Also see rotation-wrapper.tsx
 */
"use client";

import { ReactNode } from "react";
import { RotationWrapper } from "./rotation-wrapper";

interface CardOriginProps {
  aspectRatio: "large" | "default";
  orientation: "horizontal" | "vertical";
  side?: "top" | "bottom" | "left" | "right";
  debugMode?: boolean;
  children?: ReactNode;
}

export function CardOrigin({ aspectRatio, orientation, side, debugMode = false, children }: CardOriginProps) {
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
  const transform = isLarge ? "scale(1.5)" : undefined;
  
  
  // Set dimensions based on orientation
  const sizeProps = orientation === "horizontal" 
    ? { height: '100%' }
    : { width: '100%' };

  return (
    <div
      className={`${bgColor} ${outlineColor ? `outline outline-2 ${outlineColor}` : ""} flex-shrink-0 flex items-center justify-center relative`}
      style={{
        ...sizeProps,
        aspectRatio: cardAspectRatio,
        transform,
        ...(orientation === "vertical" && !isLarge ? { maxHeight: `${100/6 - 2}%` } : {})
      }}
    >
      {children && (
        <RotationWrapper
          orientation={orientation}
          side={side}
          aspectRatio={cardAspectRatio}
          debugMode={debugMode}
          parentScale={isLarge ? 1.5 : 1}
        >
          {children}
        </RotationWrapper>
      )}
    </div>
  );
}