"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PartyWrapperProps {
  children?: ReactNode;
  orientation: "horizontal" | "vertical";
  debugMode?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function PartyWrapper({ children, orientation, debugMode = false, position }: PartyWrapperProps) {
  // Calculate aspect ratio for 1 party leader + 6 cards with 5:7 ratio
  // Reduced from 37/7 to 4.5:1 for better proportions
  const cardAspectRatio = position === 'top' || position === 'bottom' ? 5 : 3.7;

  // Render cards directly for top/bottom positions
  const renderCards = () => {
    if (position === 'top' || position === 'bottom') {
      return (
        <div className="w-full h-full flex items-center justify-center">
          {/* Debug info */}
          {debugMode && (
            <div className="absolute top-0 left-0 text-xs bg-black text-white px-1 rounded outline outline-1 outline-white">
              {position} - PartyWrapper Cards
            </div>
          )}
          
          {/* Party Leader card slot with light blue outline */}
          <div className="outline outline-1 outline-blue-300 flex items-center justify-center" style={{ padding: '1%', height: '100%', aspectRatio: '7/7' }}>
            <div
              className="bg-green-500/30 outline outline-2 outline-green-500"
              style={{
                height: '100%',
                aspectRatio: '3/5',
                transform: 'scale(1.5)'
              }}
            />
          </div>
          
          {/* Container for the 6 cards with light blue outline */}
          <div className="flex items-center justify-center outline outline-1 outline-blue-300" style={{ gap: '2%', padding: '1%', height: '100%', flex: 1 }}>
            {/* Blue squares with 5:7 aspect ratio */}
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="bg-blue-500/30 outline outline-2 outline-blue-500 flex-shrink-0"
                style={{
                  height: '100%',
                  aspectRatio: '5/7'
                }}
              />
            ))}
          </div>
        </div>
      );
    }
    return children;
  };

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
            {renderCards()}
          </div>
        </div>
      ) : (
        <div className="w-full h-full">
          {renderCards()}
        </div>
      )}
    </div>
  );
}
