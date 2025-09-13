"use client";

import { useState, useEffect } from "react";
import { createRoom, joinRoom } from "../lib/multiplayer";
import { getStoredPlayerData, storePlayerData, generatePersistentPlayerId, getAllPlayerRooms, clearRoomData } from "../lib/player-persistence";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { useSound } from "@/contexts/sound-context";
import { Swords, LogIn, Settings, ArrowLeft, Clock, Layers, Play, Trash2, Loader2, Check, X } from "lucide-react";

interface RoomManagerProps {
  onRoomJoined: (roomId: string, playerId: string, playerName: string, playerColor: string) => void;
}

export function RoomManager({ onRoomJoined }: RoomManagerProps) {
  const [mode, setMode] = useState<'menu' | 'join' | 'settings'>('menu');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [playerColor, setPlayerColor] = useState('#FF6B6B');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdRoomId, setCreatedRoomId] = useState('');
  const [turnDuration, setTurnDuration] = useState(30);
  const [selectedDeck, setSelectedDeck] = useState('standard');
  const [recentRooms, setRecentRooms] = useState<Array<{ roomId: string; playerData: any }>>([]);
  const [rejoiningRooms, setRejoiningRooms] = useState<Set<string>>(new Set());
  const [isReturningPlayer, setIsReturningPlayer] = useState(false);
  const [originalPlayerName, setOriginalPlayerName] = useState('');
  const [rejoinStatus, setRejoinStatus] = useState<Record<string, 'idle' | 'connecting' | 'restoring' | 'ready' | 'error'>>({});
  const { playThemeMusic, stopThemeMusic } = useSound();

  // Start background music and load recent rooms when component mounts
  useEffect(() => {
    playThemeMusic();
    
    // Load recent rooms from localStorage
    const rooms = getAllPlayerRooms();
    setRecentRooms(rooms);
    console.log(`🔒 Loaded ${rooms.length} recent rooms from localStorage`);
    
    return () => {
      // Stop theme music when leaving room manager
      stopThemeMusic();
    };
  }, []); // Empty dependency array - only run on mount/unmount

  // Generate consistent player color based on name
  const generatePlayerColor = (name: string) => {
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

  // Generate random player name and color on component mount
  useEffect(() => {
    const heroNames = [
      // Fighter Class
      'Bad Axe', 'Bear Claw', 'Beary Wise', 'Fury Knuckle', 'Heavy Bear', 'Pan Chucks', 'Qi Bear', 'Tough Teddy',
      // Bard Class
      'Dodgy Dealer', 'Fuzzy Cheeks', 'Greedy Cheeks', 'Lucky Bucky', 'Mellow Dee', 'Napping Nibbles', 'Peanut', 'Tipsy Tootie',
      // Guardian Class
      'Calming Voice', 'Guiding Light', 'Holy Curselifter', 'Iron Resolve', 'Mighty Blade', 'Radiant Horn', 'Vibrant Glow', 'Wise Shield',
      // Ranger Class
      'Bullseye', 'Hook', 'Lookie Rookie', 'Quick Draw', 'Serious Grey', 'Sharp Fox', 'Wildshot', 'Wily Red',
      // Thief Class
      'Kit Napper', 'Meowzio', 'Plundering Puma', 'Shurikitty', 'Silent Shadow', 'Slippery Paws', 'Sly Pickings', 'Smooth Mimimeow',
      // Wizard Class
      'Bun Bun', 'Buttons', 'Fluffy', 'Hopper', 'Snowball', 'Spooky', 'Whiskers', 'Wiggles',
      // Warrior Class
      'Agile Dagger', 'Blinding Blade', 'Critical Fang', 'Hardened Hunter', 'Looting Lupo', 'Silent Shield', 'Tenacious Timber', 'Wolfgang Pack',
      // Druid Class
      'Big Buckley', 'Buck Omens', 'Doe Fallow', 'Glowing Antler', 'Maegisty', 'Magus Moose', 'Majestelk', 'Stagguard',
      // Berserker Class
      'Blood-Crazed Feline', 'Feral Cat', 'Rabid Beast', 'Reckless Raccoon', 'Spiky Bulldog', 'Untamed Orangutan', 'Vicious Wildcat', 'Wild Marmot',
      // Necromancer Class
      'Bone Collector', 'Boston Terrier', 'Dark-Magic Dog', 'Grim Puffer', 'Perfect Vessel', 'Plague-Ridden Puppy', 'Soul Stealer', 'Undead Chihuahua',
      // Sorcerer Class
      'Dragalter', 'Dystortivern', 'Extraga', 'Luut', 'Mirroryu', 'Oracon', 'Renovern', 'Shamanaga', 'Smok'
    ];
    
    const randomName = heroNames[Math.floor(Math.random() * heroNames.length)];
    setPlayerName(randomName);
    setOriginalPlayerName(randomName);
    setPlayerColor(generatePlayerColor(randomName));
  }, []);

  // Helper function to format time since last active
  const formatTimeSince = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  // Handle rejoining a recent room
  const handleRejoinRoom = async (roomId: string) => {
    // Prevent multiple clicks
    if (rejoinStatus[roomId] === 'connecting' || rejoinStatus[roomId] === 'restoring') {
      return;
    }

    setRejoinStatus(prev => ({ ...prev, [roomId]: 'connecting' }));
    setRejoiningRooms(prev => new Set(prev).add(roomId));
    
    try {
      // First, join the room
      await handleJoinExistingRoom(roomId);
      
      // Set status to restoring - this indicates we're waiting for game state restoration
      setRejoinStatus(prev => ({ ...prev, [roomId]: 'restoring' }));
      
      // Wait for game state to be fully restored
      // This gives time for the Yjs document to synchronize and restore hand cards
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Mark as ready
      setRejoinStatus(prev => ({ ...prev, [roomId]: 'ready' }));
      
    } catch (err) {
      setRejoinStatus(prev => ({ ...prev, [roomId]: 'error' }));
      console.error('Failed to rejoin room:', err);
    } finally {
      setRejoiningRooms(prev => {
        const newSet = new Set(prev);
        newSet.delete(roomId);
        return newSet;
      });
    }
  };

  // Handle removing a room from recent list
  const handleRemoveRoom = (roomId: string) => {
    clearRoomData(roomId);
    const updatedRooms = recentRooms.filter(r => r.roomId !== roomId);
    setRecentRooms(updatedRooms);
    // Clear rejoin status for this room
    setRejoinStatus(prev => {
      const newStatus = { ...prev };
      delete newStatus[roomId];
      return newStatus;
    });
    console.log(`🔒 Removed room ${roomId} from recent rooms`);
  };

  // Reset rejoin status for a room
  const resetRejoinStatus = (roomId: string) => {
    setRejoinStatus(prev => ({ ...prev, [roomId]: 'idle' }));
  };

  // Handle room ID input and check for existing player data
  const handleRoomIdChange = (roomId: string) => {
    const formattedRoomId = roomId.toUpperCase();
    setJoinRoomId(formattedRoomId);
    
    if (formattedRoomId.length >= 3) { // Check once they've typed at least 3 characters
      const existingPlayerData = getStoredPlayerData(formattedRoomId);
      
      if (existingPlayerData) {
        // Player has been in this room before - lock in their previous identity
        setIsReturningPlayer(true);
        setOriginalPlayerName(playerName); // Store their current name so we can restore it if they change room ID
        setPlayerName(existingPlayerData.playerName);
        setPlayerColor(existingPlayerData.playerColor);
        setError(''); // Clear any previous errors
        console.log(`🔄 Detected returning player for room ${formattedRoomId}: ${existingPlayerData.playerName}`);
      } else {
        // Reset to original state if switching to a new room
        if (isReturningPlayer) {
          setIsReturningPlayer(false);
          setPlayerName(originalPlayerName);
          setPlayerColor(generatePlayerColor(originalPlayerName));
        }
      }
    } else {
      // Room ID is too short, reset returning player state
      if (isReturningPlayer) {
        setIsReturningPlayer(false);
        setPlayerName(originalPlayerName);
        setPlayerColor(generatePlayerColor(originalPlayerName));
      }
    }
  };

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
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

    setLoading(true);
    setError('');

    try {
      // Check for stored player data for reconnection
      const storedPlayer = getStoredPlayerData(targetRoomId);
      
      let playerId: string;
      let finalPlayerName: string;
      let playerColor: string;
      
      if (storedPlayer) {
        // ALWAYS use stored session if it exists - never create new player
        console.log(`🔄 Found existing session for room ${targetRoomId} - using stored player data`);
        playerId = storedPlayer.playerId;
        finalPlayerName = storedPlayer.playerName;
        playerColor = storedPlayer.playerColor;
        setPlayerName(finalPlayerName); // Update UI to show reconnected name
        setPlayerColor(playerColor);
        // Note: Using existing session - this is expected behavior, no need to show message
      } else {
        // Only create new player if NO stored session exists
        console.log(`👋 No existing session found - creating new player: ${playerName.trim()}`);
        playerId = generatePersistentPlayerId();
        finalPlayerName = playerName.trim();
        playerColor = generatePlayerColor(finalPlayerName);
      }
      
      // First, try to join the room via API
      await joinRoom(targetRoomId, playerId, finalPlayerName, playerColor);
      
      // Store player data for future reconnection
      storePlayerData(targetRoomId, playerId, finalPlayerName, playerColor);
      
      // Stop the theme music before joining the game
      stopThemeMusic();
      
      // If successful, connect to the multiplayer game
      onRoomJoined(targetRoomId, playerId, finalPlayerName, playerColor);
      
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

      // Immediately join the created room as the host
      const playerId = generatePersistentPlayerId();
      const finalPlayerName = playerName.trim();
      const playerColor = generatePlayerColor(finalPlayerName);

      await joinRoom(room.roomId, playerId, finalPlayerName, playerColor);

      // Store player data for future reconnection
      storePlayerData(room.roomId, playerId, finalPlayerName, playerColor);

      console.log(`🏠 Starting game as host: ${finalPlayerName}`);

      // Stop the theme music before joining the game
      stopThemeMusic();

      // Connect to the multiplayer game
      onRoomJoined(room.roomId, playerId, finalPlayerName, playerColor);

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

            {/* Recent Rooms Section */}
            {recentRooms.length > 0 && (
              <div className="space-y-3" data-testid="recent-rooms-section">
                <h3 className="text-sm font-medium text-foreground flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Recent Rooms ({recentRooms.length})
                </h3>
                
                {/* Restoration Status Messages */}
                {Object.entries(rejoinStatus).map(([roomId, status]) => {
                  if (status === 'idle' || status === 'error') return null;
                  
                  return (
                    <div key={roomId} className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                      {status === 'connecting' && `Connecting to room ${roomId}...`}
                      {status === 'restoring' && `Restoring game state for room ${roomId}...`}
                      {status === 'ready' && `Game state restored for room ${roomId}! You can continue playing.`}
                    </div>
                  );
                })}
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {recentRooms.slice(0, 3).map(({ roomId, playerData }) => (
                    <div key={roomId} className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800" data-testid={`recent-room-${roomId}`}>
                      <div className="flex items-center space-x-3 flex-1">
                        <div
                          className="w-3 h-3 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: playerData.playerColor }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{roomId}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {playerData.playerName} • {formatTimeSince(playerData.lastActive)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        {rejoinStatus[roomId] === 'ready' ? (
                          <Button
                            onClick={() => {
                              // The game should already be joined at this point
                              // This is just a visual confirmation
                              console.log('Game state restored, player can continue');
                            }}
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs bg-green-100 border-green-300 text-green-700 hover:bg-green-200"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Continue
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleRejoinRoom(roomId)}
                            size="sm"
                            variant="outline"
                            disabled={rejoinStatus[roomId] === 'connecting' || rejoinStatus[roomId] === 'restoring'}
                            className={`h-7 px-2 text-xs border-amber-300 text-amber-700 hover:bg-amber-100 ${
                              rejoinStatus[roomId] === 'error' ? 'bg-red-100 border-red-300 text-red-700' : ''
                            }`}
                          >
                            {rejoinStatus[roomId] === 'connecting' ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Connecting...
                              </>
                            ) : rejoinStatus[roomId] === 'restoring' ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Restoring...
                              </>
                            ) : rejoinStatus[roomId] === 'error' ? (
                              <>
                                <X className="h-3 w-3 mr-1" />
                                Error
                              </>
                            ) : (
                              'Rejoin'
                            )}
                          </Button>
                        )}
                        <Button
                          onClick={() => handleRemoveRoom(roomId)}
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
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
                  setIsReturningPlayer(false);
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
                onChange={(e) => !isReturningPlayer && setPlayerName(e.target.value)}
                placeholder="Enter your player name"
                maxLength={20}
                disabled={isReturningPlayer}
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
                  // Reset returning player state when going back
                  if (isReturningPlayer) {
                    setIsReturningPlayer(false);
                    setPlayerName(originalPlayerName || '');
                    setPlayerColor(generatePlayerColor(originalPlayerName || ''));
                  }
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