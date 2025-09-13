"use client";

import { useState, useCallback } from "react";
import { GameArea } from "./game-area";
import { ServerDiceCanvas } from "./server-dice-canvas";
import { MultiplayerPresence } from "./multiplayer-presence";
import { RoomManager } from "./room-manager";
import { DebugMenu } from "./debug-menu";
import { RoomProvider } from "../contexts/room-context";
import { GameActionsProvider } from "../contexts/game-actions-context";
import { DiceProvider } from "../contexts/dice-context";
import { StatusProvider } from "../contexts/status-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bug } from "lucide-react";

export default function GameBoard() {
  // Debug mode - set to true to show red border lines
  const DEBUG_MODE = false;
  
  const [diceResults, setDiceResults] = useState<number[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [playerData, setPlayerData] = useState<{id: string, name: string, color: string} | null>(null);
  const [isDebugMenuOpen, setIsDebugMenuOpen] = useState<boolean>(false);

  const handleDiceResults = useCallback((results: number[]) => {
    setDiceResults(results);
  }, []);

  const handleRoomJoined = useCallback((roomId: string, playerId: string, playerName: string, playerColor: string) => {
    setCurrentRoomId(roomId);
    setPlayerData({ id: playerId, name: playerName, color: playerColor });
  }, []);

  const handleLeaveRoom = useCallback(() => {
    // Room cleanup is handled automatically by the useRoom hook
    setCurrentRoomId(null);
    setPlayerData(null);
  }, []);

  // Show room manager if not in a room
  if (!currentRoomId || !playerData) {
    return <RoomManager onRoomJoined={handleRoomJoined} />;
  }


  return (
    <RoomProvider 
      roomId={currentRoomId} 
      playerId={playerData.id}
      playerName={playerData.name}
      playerColor={playerData.color}
    >
      <DiceProvider>
        <StatusProvider>
          <GameActionsProvider>
          <div className="w-full h-screen  relative">
          {/* Room Info and Action Buttons */}
          <div className="absolute top-4 left-4 z-50 flex items-center gap-3">
            <Badge
              variant="secondary"
              className="bg-white/90 backdrop-blur-sm px-4 py-2 text-sm"
              data-testid="room-id-badge"
            >
              Room: <span className="font-mono font-bold text-purple-600" data-testid="room-id-value">{currentRoomId}</span>
            </Badge>
            <Button
              onClick={() => setIsDebugMenuOpen(true)}
              variant="outline"
              size="sm"
              className="bg-white/90 backdrop-blur-sm border-gray-300 hover:bg-gray-100"
              data-testid="debug-menu-button"
              title="Open Debug Menu"
            >
              <Bug className="w-4 h-4" />
            </Button>
            <Button
              onClick={handleLeaveRoom}
              variant="destructive"
              size="sm"
              className="backdrop-blur-sm"
              data-testid="leave-room-button"
            >
              🚪 Leave Room
            </Button>
          </div>

          {/* Multiplayer Presence */}
          <MultiplayerPresence />

          {/* Game Area with hands */}
          <GameArea diceResults={diceResults} />
          
          {/* Server-controlled dice canvas - covers the entire game board */}
          <ServerDiceCanvas
            onDiceResults={handleDiceResults}
            roomId={currentRoomId}
          />

          {/* Debug Menu */}
          <DebugMenu
            isOpen={isDebugMenuOpen}
            onClose={() => setIsDebugMenuOpen(false)}
          />
          </div>
          </GameActionsProvider>
        </StatusProvider>
      </DiceProvider>
    </RoomProvider>
  );
}