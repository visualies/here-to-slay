"use client";

import { useState, useEffect } from "react";
import { createRoom, joinRoom } from "../lib/multiplayer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface RoomManagerProps {
  onRoomJoined: (roomId: string, playerId: string, playerName: string, playerColor: string) => void;
}

export function RoomManager({ onRoomJoined }: RoomManagerProps) {
  const [mode, setMode] = useState<'menu' | 'join'>('menu');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Start background music and ensure video loops properly
  useEffect(() => {
    const audio = new Audio('/soundtrack.mp3');
    audio.loop = true;
    audio.volume = 0.09; // Set to 9% volume (reduced by 70%)
    
    // Store reference to prevent garbage collection
    (window as any).gameAudio = audio;
    
    // Try to play audio, but handle if autoplay is blocked
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        console.log('Audio started successfully');
      }).catch((error) => {
        // Autoplay was blocked, audio will need user interaction to start
        console.log('Autoplay blocked - audio will start on first user interaction', error);
        
        // Add click listener to start audio on first user interaction
        const startAudio = () => {
          audio.play().then(() => {
            console.log('Audio started after user interaction');
            document.removeEventListener('click', startAudio);
          }).catch(console.error);
        };
        document.addEventListener('click', startAudio);
      });
    }





    return () => {
      // Cleanup audio
      if ((window as any).gameAudio) {
        (window as any).gameAudio.pause();
        (window as any).gameAudio.currentTime = 0;
        (window as any).gameAudio = null;
      }
      
    };
  }, []);

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
      onRoomJoined(targetRoomId, playerId, playerName.trim(), playerColor);
      
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
      <div className="min-h-screen relative flex items-center justify-center p-4">
        {/* Background video */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/flute_boomerang_simple.mp4" type="video/mp4" />
        </video>
        {/* Dark overlay for better readability */}
        <div className="absolute inset-0 bg-black/40" />
        <Card className="w-full max-w-md ml-18 bg-white/95 backdrop-blur-sm relative z-10">
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
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                size="lg"
              >
                {loading ? 'Creating...' : '🚀 Create & Join Room'}
              </Button>

              <Button
                onClick={() => setMode('join')}
                disabled={loading}
                variant="outline"
                className="w-full border-amber-600 text-amber-700 hover:bg-amber-50"
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
      <div className="min-h-screen relative flex items-center justify-center p-4">
        {/* Background video */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/flute_boomerang_simple.mp4" type="video/mp4" />
        </video>
        {/* Dark overlay for better readability */}
        <div className="absolute inset-0 bg-black/40" />
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm relative z-10">
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
                className="flex-1 border-amber-600 text-amber-700 hover:bg-amber-50"
              >
                Back
              </Button>
              <Button
                onClick={() => handleJoinExistingRoom()}
                disabled={loading}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
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