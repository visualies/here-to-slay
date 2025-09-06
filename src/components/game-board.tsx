"use client";

import { useState, useCallback } from "react";
import { GameArea } from "./game-area";
import { ServerDiceCanvas } from "./server-dice-canvas";
import { MultiplayerPresence } from "./multiplayer-presence";
import { RoomManager } from "./room-manager";
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
    // Room cleanup is handled automatically by the useRoom hook
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

      {/* Game Area with hands */}
      <GameArea roomId={currentRoomId} diceResults={diceResults} />
      
      {/* Server-controlled dice canvas - covers the entire game board */}
      <ServerDiceCanvas 
        onDiceResults={handleDiceResults}
        roomId={currentRoomId}
      />
    </div>
  );
}