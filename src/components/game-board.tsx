"use client";

import { useState, useCallback } from "react";
import { PlayerArea } from "./player-area";
import { CenterArea } from "./center-area";
import { ServerDiceCanvas } from "./server-dice-canvas";
import { MultiplayerPresence } from "./multiplayer-presence";
import { RoomManager } from "./room-manager";
import { disconnectMultiplayer } from "../lib/multiplayer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function GameBoard() {
  // Debug mode - set to true to show red border lines
  const DEBUG_MODE = false;
  
  const [diceResults, setDiceResults] = useState<number[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);

  const handleDiceResults = useCallback((results: number[]) => {
    setDiceResults(results);
  }, []);

  const handleRoomJoined = useCallback((roomId: string) => {
    setCurrentRoomId(roomId);
  }, []);

  const handleLeaveRoom = useCallback(() => {
    disconnectMultiplayer();
    setCurrentRoomId(null);
  }, []);

  // Show room manager if not in a room
  if (!currentRoomId) {
    return <RoomManager onRoomJoined={handleRoomJoined} />;
  }


  return (
    <div className="w-full h-screen bg-white relative">
      {/* Room Info and Leave Button */}
      <div className="absolute top-4 left-4 z-50 flex items-center gap-3">
        <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm px-4 py-2 text-sm">
          Room: <span className="font-mono font-bold text-purple-600">{currentRoomId}</span>
        </Badge>
        <Button
          onClick={handleLeaveRoom}
          variant="destructive"
          size="sm"
          className="backdrop-blur-sm"
        >
          🚪 Leave Room
        </Button>
      </div>

      {/* Multiplayer Presence */}
      <MultiplayerPresence roomId={currentRoomId} />

      {/* Dotted background pattern */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle, #666 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }}
      />
      
      {/* Game board container */}
      <div className={`relative h-full grid grid-rows-[200px_1fr_200px] grid-cols-[200px_1fr_200px] ${DEBUG_MODE ? '[&>div]:border-2 [&>div]:border-red-500' : ''}`}>
        {/* Top player */}
        <div className={`col-start-2 row-start-1 flex items-end justify-center ${DEBUG_MODE ? 'border-2 border-red-500' : ''}`}>
          <PlayerArea position="top" />
        </div>
        
        {/* Right player */}
        <div className={`col-start-3 row-start-2 flex items-center justify-center ${DEBUG_MODE ? 'border-2 border-red-500' : ''}`}>
          <PlayerArea position="right" />
        </div>
        
        {/* Bottom player */}
        <div className={`col-start-2 row-start-3 flex items-start justify-center ${DEBUG_MODE ? 'border-2 border-red-500' : ''}`}>
          <PlayerArea position="bottom" />
        </div>
        
        {/* Left player */}
        <div className={`col-start-1 row-start-2 flex items-center justify-center ${DEBUG_MODE ? 'border-2 border-red-500' : ''}`}>
          <PlayerArea position="left" />
        </div>
        
        {/* Center area */}
        <div className={`col-start-2 row-start-2 flex items-center justify-center ${DEBUG_MODE ? 'border-2 border-red-500' : ''}`}>
          <CenterArea 
            diceResults={diceResults} 
          />
        </div>
      </div>
      
      {/* Server-controlled dice canvas - covers the entire game board */}
      <ServerDiceCanvas 
        onDiceResults={handleDiceResults}
        roomId={currentRoomId}
      />
    </div>
  );
}