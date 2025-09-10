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

  return (
    // The green wrapper IS the aspect-ratio box (object-fit: contain behavior)
    <div
      className={cn(
        "cq-contain flex items-center justify-center",
        debugMode ? "bg-green-500/20 border-2 border-green-500 p-2" : ""
      )}
      style={{
        "--w": orientation === "horizontal" ? cardAspectRatio : 1,
        "--h": orientation === "horizontal" ? 1 : cardAspectRatio
      } as React.CSSProperties}
    >
      {/* For vertical parties, we need to handle the rotation differently */}
      {orientation === "vertical" ? (
        <div className="w-full h-full flex items-center justify-center">
          <div className="rotate-90 w-full h-full flex items-center justify-center">
            {children}
          </div>
        </div>
      ) : (
        <div className="w-full h-full">
          {children}
        </div>
      )}
    </div>
  );
}
