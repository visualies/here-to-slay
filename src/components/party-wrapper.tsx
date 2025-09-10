"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PartyWrapperProps {
  children: ReactNode;
  orientation: "horizontal" | "vertical";
  debugMode?: boolean;
}

export function PartyWrapper({ children, orientation, debugMode = false }: PartyWrapperProps) {
  // Card aspect ratio from your sample: 645 x 174 ≈ 3.7:1
  const cardAspectRatio = 3.7;
  
  // Calculate the wrapper dimensions based on orientation
  const wrapperStyle = orientation === "horizontal" 
    ? {
        // For horizontal parties (top/bottom), use the card's natural aspect ratio
        aspectRatio: `${cardAspectRatio}/1`,
        width: "100%",
        height: "auto"
      }
    : {
        // For vertical parties (left/right), use the inverse aspect ratio
        aspectRatio: `1/${cardAspectRatio}`,
        width: "auto", 
        height: "100%"
      };

  return (
    <div 
      className={cn(
        "flex items-center justify-center",
        debugMode ? "bg-green-500/20 border-2 border-green-500 p-2" : ""
      )}
      style={wrapperStyle}
    >
      <div className={cn(
        "w-full h-full flex items-center justify-center",
        orientation === "vertical" ? "rotate-90" : ""
      )}>
        {children}
      </div>
    </div>
  );
}
