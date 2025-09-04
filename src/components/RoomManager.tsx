"use client";

import { useState, useEffect } from "react";
import { createRoom, joinRoom } from "../lib/multiplayer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface RoomManagerProps {
  onRoomJoined: (roomId: string) => void;
}

export function RoomManager({ onRoomJoined }: RoomManagerProps) {
  const [mode, setMode] = useState<'menu' | 'join'>('menu');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Generate random player name and color on component mount
  useEffect(() => {
    const adjectives = ['Swift', 'Brave', 'Clever', 'Bold', 'Lucky', 'Mighty', 'Quick', 'Sharp'];
    const nouns = ['Dragon', 'Knight', 'Wizard', 'Archer', 'Rogue', 'Warrior', 'Mage', 'Hero'];
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNumber = Math.floor(Math.random() * 999) + 1;
    setPlayerName(`${randomAdjective}${randomNoun}${randomNumber}`);
  }, []);

  // Generate consistent player color based on name
  const generatePlayerColor = () => {
    const colors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff', '#ff8844', '#88ff44'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create room with a generic name
      const room = await createRoom('Game Room');
      console.log('Room created:', room);
      
      // Auto-join the created room
      await handleJoinExistingRoom(room.roomId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
      setLoading(false);
    }
  };

  const handleJoinExistingRoom = async (roomIdToJoin?: string) => {
    const targetRoomId = roomIdToJoin || joinRoomId.trim().toUpperCase();
    
    if (!targetRoomId || !playerName.trim()) {
      setError('Please enter both room ID and your name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Generate player color and ID
      const playerColor = generatePlayerColor();
      const playerId = Math.random().toString(36).substr(2, 9);
      
      // First, try to join the room via API
      await joinRoom(targetRoomId, playerId, playerName.trim(), playerColor);
      
      // If successful, connect to the multiplayer game
      onRoomJoined(targetRoomId);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
      setLoading(false);
    }
  };

  const handleQuickPlay = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    // Create a room and auto-join
    await handleCreateRoom();
  };

  if (mode === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl mb-2">🎲 Here to Slay</CardTitle>
            <CardDescription>Multiplayer Dice Rolling</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
              <Input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your player name"
                maxLength={20}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={handleQuickPlay}
                disabled={loading}
                className="w-full bg-green-500 hover:bg-green-600"
                size="lg"
              >
                {loading ? 'Creating...' : '🚀 Create & Join Room'}
              </Button>

              <Button
                onClick={() => setMode('join')}
                disabled={loading}
                variant="outline"
                className="w-full"
                size="lg"
              >
                🚪 Join Existing Room
              </Button>
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                Roll dice with friends in real-time!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }


  if (mode === 'join') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">🚪 Join Room</CardTitle>
            <CardDescription>Enter the room code</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Room ID</label>
              <Input
                type="text"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                placeholder="e.g., ABC123"
                className="text-center text-lg font-mono"
                maxLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
              <Input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your player name"
                maxLength={20}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={() => setMode('menu')}
                disabled={loading}
                variant="outline"
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={() => handleJoinExistingRoom()}
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Joining...' : 'Join'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}