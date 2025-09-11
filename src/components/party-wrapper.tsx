"use client";

import { ReactNode, useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useSizing } from "@/contexts/sizing-context";
import { CardOrigin } from "./card-origin";
import {CardSlot} from "@/components/card-slot";

interface PartyWrapperProps {
  children?: ReactNode;
  orientation: "horizontal" | "vertical";
  debugMode?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function PartyWrapper({ children, orientation, debugMode = false, position }: PartyWrapperProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { scales, register } = useSizing();
  const scale = position ? scales[position] ?? 1 : 1;

  // Register this wrapper for measurement. Done in layout effect to run before paint.
  useLayoutEffect(() => {
    if (position) {
      register(position, containerRef.current);
      return () => register(position, null);
    }
  }, [position, register]);
  // Calculate aspect ratio for 1 party leader + 6 cards with 5:7 ratio
  // Reduced from 37/7 to 4.5:1 for better proportions
  const cardAspectRatio = position === 'top' || position === 'bottom' ? 5 : 5;

  // Render cards directly for top/bottom positions (horizontal layout)
  const renderHorizontalCards = () => {
    return (
      <div className="w-full h-full flex items-center justify-center">
        {/* Debug info */}
        {debugMode && (
          <div className="absolute top-0 left-0 text-xs bg-black text-white px-1 rounded outline outline-1 outline-white">
            {position} - PartyWrapper Cards (scale: {scale.toFixed(3)})
          </div>
        )}
        
        {/* Party Leader card slot with light blue outline */}
        <div className={`${debugMode ? "outline outline-1 outline-blue-300" : ""} flex items-center justify-center`} style={{ padding: '1%', height: '100%', aspectRatio: '7/7' }}>
          <CardOrigin aspectRatio="large" orientation="horizontal" side={position} debugMode={debugMode} />
        </div>
        
        {/* Container for the 6 cards with light blue outline */}
        <div className={`flex items-center justify-center ${debugMode ? "outline outline-1 outline-blue-300" : ""}`} style={{ gap: '2%', padding: '1%', height: '100%', flex: 1 }}>
          {/* Blue squares with 5:7 aspect ratio */}
          {Array.from({ length: 6 }, (_, i) => (
            <CardOrigin key={i} aspectRatio="default" orientation="horizontal" side={position} debugMode={debugMode}>
              <CardSlot size="auto" cardType="hero" />
            </CardOrigin>
          ))}
        </div>
      </div>
    );
  };

  // Render cards for left/right positions (vertical layout)
  const renderVerticalCards = () => {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        {/* Debug info */}
        {debugMode && (
          <div className="absolute top-0 left-0 text-xs bg-black text-white px-1 rounded outline outline-1 outline-white">
            {position} - PartyWrapper Cards (Vertical, scale: {scale.toFixed(3)})
          </div>
        )}
        
        {/* Party Leader card slot with light blue outline */}
        <div className={`${debugMode ? "outline outline-1 outline-blue-300" : ""} flex items-center justify-center`} style={{ padding: '1%', width: '100%', aspectRatio: '7/7' }}>
          <CardOrigin aspectRatio="large" orientation="vertical" side={position} debugMode={debugMode} />
        </div>
        
        {/* Container for the 6 cards with light blue outline */}
        <div className={`flex flex-col items-center justify-center ${debugMode ? "outline outline-1 outline-blue-300" : ""}`} style={{ gap: '2%', padding: '1%', width: '100%', flex: 1 }}>
          {/* Blue squares with 7:5 aspect ratio (swapped from 5:7) */}
          {Array.from({ length: 6 }, (_, i) => (
            <CardOrigin key={i} aspectRatio="default" orientation="vertical" side={position} debugMode={debugMode}>
              <CardSlot size="auto" cardType="hero" />
            </CardOrigin>
          ))}
        </div>
      </div>
    );
  };

  return (
    // The green wrapper IS the aspect-ratio box (object-fit: contain behavior)
    <div
      className={cn(
        "cq-contain flex items-center justify-center",
        debugMode ? "bg-red-200 outline outline-2 outline-red-300 p-2" : ""
      )}
      style={{
        "--w": orientation === "horizontal" ? cardAspectRatio : 1,
        "--h": orientation === "horizontal" ? 1 : cardAspectRatio
      } as React.CSSProperties}
      ref={containerRef}
    >
      <div
        className="w-full h-full"
        data-scale={scale.toFixed(3)}
        style={{ transform: `scale(${scale})`, transformOrigin: "center", willChange: "transform" }}
      >
        {/* Use appropriate render function based on position */}
        {position === 'top' || position === 'bottom' ? renderHorizontalCards() : renderVerticalCards()}
      </div>
    </div>
  );
}
