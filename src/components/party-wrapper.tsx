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
  
  // Calculate the aspect ratio based on orientation
  const aspectRatio = orientation === "horizontal" 
    ? `${cardAspectRatio}/1` 
    : `1/${cardAspectRatio}`;

  return (
    <div 
      className={cn(
        "flex items-center justify-center party-wrapper",
        debugMode ? "bg-green-500/20 border-2 border-green-500 p-2" : ""
      )}
      style={{ 
        aspectRatio
      }}
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
