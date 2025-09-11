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
        >
          {children}
        </RotationWrapper>
      )}
    </div>
  );
}