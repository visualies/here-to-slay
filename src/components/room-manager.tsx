"use client";

import { useState, useEffect } from "react";
import { createRoom, joinRoom } from "../lib/multiplayer";
import { gameServerAPI } from "../lib/game-server-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { useSound } from "@/contexts/sound-context";
import { useUser } from "@/hooks/use-user";
import { Swords, LogIn, Settings, ArrowLeft, Layers, Play, Trash2, Loader2, Clock } from "lucide-react";

interface RoomManagerProps {
  onRoomJoined: (roomId: string, playerId: string, playerName: string, playerColor: string) => void;
  initialPlayerData?: {
    playerId: string;
    playerName: string;
    playerColor: string;
  };
}



export function RoomManager(props: RoomManagerProps) {
  const { onRoomJoined } = props;
  const [mode, setMode] = useState<'menu' | 'join' | 'settings'>('menu');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [turnDuration, setTurnDuration] = useState(30);
  const [selectedDeck, setSelectedDeck] = useState('standard');
  const { playThemeMusic, stopThemeMusic } = useSound();
  const { user, updateUser } = useUser();

  // Start background music and initialize player name from user context
  useEffect(() => {
    playThemeMusic();

    // Initialize player name from user context
    if (user) {
      setPlayerName(user.playerName);
      console.log(`👤 Using user data from context: ${user.playerName}`);
    }

    return () => {
      // Stop theme music when leaving room manager
      stopThemeMusic();
    };
  }, [user]); // Add initialPlayerData as dependency

  // Generate consistent player color based on name
  const generatePlayerColor = (name: string): string => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
      '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2',
      '#A9DFBF', '#F9E79F', '#D5A6BD', '#A3E4D7', '#FADBD8'
    ];
    
    // Use name hash for consistent color assignment
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      const char = name.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Create a player when name is entered
  const createPlayerIfNeeded = (name: string) => {
    if (!user && name.trim()) {
      const newPlayer = {
        playerId: `player-${Date.now()}`,
        playerName: name.trim(),
        playerColor: generatePlayerColor(name.trim()),
        lastSeen: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      updateUser(newPlayer);
      return newPlayer;
    }
    return user;
  };



  // Handle room ID input
  const handleRoomIdChange = (roomId: string) => {
    const formattedRoomId = roomId.toUpperCase();
    setJoinRoomId(formattedRoomId);
  };

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    // Create player if needed
    const player = createPlayerIfNeeded(playerName.trim());
    if (!player) {
      setError('Failed to create player');
      return;
    }

    // Go to settings first to configure the room
    setMode('settings');
  };

  const handleJoinExistingRoom = async (roomIdToJoin?: string) => {
    const targetRoomId = roomIdToJoin || joinRoomId.trim().toUpperCase();
    
    if (!targetRoomId || !playerName.trim()) {
      setError('Please enter both room ID and your name');
      return;
    }

    // Create a default player if none exists
    if (!user) {
      const defaultPlayer = {
        playerId: `player-${Date.now()}`,
        playerName: playerName.trim(),
        playerColor: generatePlayerColor(playerName.trim()),
        lastSeen: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      updateUser(defaultPlayer);
    }

    setLoading(true);
    setError('');

    try {
      // Update player name if it changed
      let finalPlayerName = playerName.trim();
      let finalPlayerColor = user?.playerColor || generatePlayerColor(playerName.trim());
      
      if (user && finalPlayerName !== user.playerName) {
        const response = await gameServerAPI.updateCurrentPlayer(finalPlayerName);
        if (response.success && response.data) {
          updateUser({
            playerId: user.playerId,
            playerName: response.data.playerName,
            playerColor: response.data.playerColor
          });
          finalPlayerColor = response.data.playerColor;
        }
      }
      
      // Join the room via API
      await joinRoom(targetRoomId, user?.playerId || `player-${Date.now()}`, finalPlayerName, finalPlayerColor);
      
      // Player data is managed by the API, no need to save locally
      
      // Stop the theme music before joining the game
      stopThemeMusic();
      
      // If successful, connect to the multiplayer game
      onRoomJoined(targetRoomId, user?.playerId || `player-${Date.now()}`, finalPlayerName, finalPlayerColor);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    // Create a default player if none exists
    if (!user) {
      const defaultPlayer = {
        playerId: `player-${Date.now()}`,
        playerName: playerName.trim(),
        playerColor: generatePlayerColor(playerName.trim()),
        lastSeen: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      updateUser(defaultPlayer);
    }

    setLoading(true);
    setError('');

    try {
      // Create room with the configured settings
      const room = await createRoom('Game Room', {
        maxPlayers: 4, // Could be made configurable later
        turnDuration,
        selectedDeck
      });
      console.log('Room created:', room);

      // Update player name if it changed
      let finalPlayerName = playerName.trim();
      let finalPlayerColor = user?.playerColor || generatePlayerColor(playerName.trim());
      
      // Update local player data if name changed
      if (user && finalPlayerName !== user.playerName) {
        updateUser({
          ...user,
          playerName: finalPlayerName
        });
      }

      // Immediately join the created room as the host
      await joinRoom(room.roomId, user?.playerId || `player-${Date.now()}`, finalPlayerName, finalPlayerColor);

      console.log(`🏠 Starting game as host: ${finalPlayerName}`);

      // Player data is managed by the API, no need to save locally

      // Stop the theme music before joining the game
      stopThemeMusic();

      // Connect to the multiplayer game
      onRoomJoined(room.roomId, user?.playerId || `player-${Date.now()}`, finalPlayerName, finalPlayerColor);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create and start game');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'menu') {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4">
        {/* Theme Toggle */}
        <div className="absolute top-4 right-4 z-20">
          <ThemeToggle />
        </div>
        
        {/* Background image */}
        <div 
          className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url("/flute.png")' }}
        />
        {/* Dark overlay for better readability */}
        <div className="absolute inset-0 bg-black/40" />
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm relative z-10">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Swords className="h-8 w-8 text-amber-600" />
              <h1 className="text-3xl">Here to Slay</h1>
            </div>
            <CardDescription>A strategic card game. A role-playing adventure. <br /> A dangerous new world.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Your Name</label>
              <Input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your player name"
                maxLength={20}
                data-testid="create-player-name-input"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}


            <div className="space-y-3">
              <Button
                onClick={handleCreateRoom}
                disabled={loading}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                size="lg"
                data-testid="create-room-button"
              >
                {loading ? 'Creating...' : 'Create Room'}
              </Button>

              <Button
                onClick={() => {
                  setMode('join');
                  // Reset state when entering join mode
                  setJoinRoomId('');
                  setError('');
                }}
                disabled={loading}
                variant="outline"
                className="w-full border-amber-600 text-amber-700 hover:bg-amber-50"
                size="lg"
                data-testid="join-existing-room-button"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Join Existing Room
              </Button>

              <Button
                onClick={() => {
                  // Settings functionality to be implemented
                  console.log('Settings clicked');
                }}
                disabled={loading}
                variant="outline"
                className="w-full border-amber-600 text-amber-700 hover:bg-amber-50"
                size="lg"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>

            <div className="text-center">
              <p className="text-xs text-muted-foreground">
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
        {/* Theme Toggle */}
        <div className="absolute top-4 right-4 z-20">
          <ThemeToggle />
        </div>
        
        {/* Background image */}
        <div 
          className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url("/flute.png")' }}
        />
        {/* Dark overlay for better readability */}
        <div className="absolute inset-0 bg-black/40" />
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm relative z-10">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2">
              <LogIn className="h-6 w-6 text-amber-600" />
              <h2 className="text-2xl">Join Room</h2>
            </div>
            <CardDescription>Enter the room code</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Room ID</label>
              <Input
                type="text"
                value={joinRoomId}
                onChange={(e) => handleRoomIdChange(e.target.value)}
                placeholder="e.g., ABC123"
                className="text-center text-lg font-mono"
                maxLength={6}
                data-testid="join-room-id-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Your Name</label>
              <Input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your player name"
                maxLength={20}
                data-testid="join-player-name-input"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setMode('menu');
                  setJoinRoomId('');
                  setError('');
                }}
                disabled={loading}
                variant="outline"
                className="flex-1 border-amber-600 text-amber-700 hover:bg-amber-50"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={() => handleJoinExistingRoom()}
                disabled={loading}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                data-testid="join-room-submit-button"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4 mr-2" />
                    Join
                  </>
                )}
              </Button>
            </div>

            <div className="pt-2">
              <Button
                onClick={() => {
                  // Settings functionality to be implemented
                  console.log('Settings clicked');
                }}
                disabled={loading}
                variant="ghost"
                className="w-full text-muted-foreground hover:text-foreground hover:bg-muted/50"
                size="sm"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (mode === 'settings') {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4">
        {/* Theme Toggle */}
        <div className="absolute top-4 right-4 z-20">
          <ThemeToggle />
        </div>
        
        {/* Background image */}
        <div 
          className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url("/flute.png")' }}
        />
        {/* Dark overlay for better readability */}
        <div className="absolute inset-0 bg-black/40" />
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm relative z-10">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2">
              <Settings className="h-6 w-6 text-amber-600" />
              <h2 className="text-2xl">New Room Settings</h2>
            </div>
            <CardDescription>Configure your new game room</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Player Name</label>
              <Input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your player name"
                maxLength={20}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Clock className="h-4 w-4 inline mr-2" />
                Turn Duration (seconds)
              </label>
              <Input
                type="number"
                value={turnDuration}
                onChange={(e) => setTurnDuration(parseInt(e.target.value) || 30)}
                min="10"
                max="300"
                className="text-center"
              />
              <p className="text-xs text-muted-foreground mt-1">How long each player has per turn</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Layers className="h-4 w-4 inline mr-2" />
                Card Deck
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => setSelectedDeck('standard')}
                  variant={selectedDeck === 'standard' ? 'default' : 'outline'}
                  className={selectedDeck === 'standard' ? 'bg-amber-600 hover:bg-amber-700' : 'border-amber-600 text-amber-700 hover:bg-amber-50'}
                >
                  Standard
                </Button>
                <Button
                  onClick={() => setSelectedDeck('expanded')}
                  variant={selectedDeck === 'expanded' ? 'default' : 'outline'}
                  className={selectedDeck === 'expanded' ? 'bg-amber-600 hover:bg-amber-700' : 'border-amber-600 text-amber-700 hover:bg-amber-50'}
                >
                  Expanded
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Choose your card deck</p>
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
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleStartGame}
                disabled={loading}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                data-testid="create-and-start-game-button"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Create & Start Game
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}