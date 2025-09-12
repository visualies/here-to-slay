"use client";

import { useState, useEffect } from "react";
import { createRoom, joinRoom } from "../lib/multiplayer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { useSound } from "@/contexts/sound-context";
import { Swords, LogIn, Settings, ArrowLeft, Clock, Layers, Play } from "lucide-react";

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
  const { playThemeMusic, stopThemeMusic } = useSound();

  // Start background music when component mounts
  useEffect(() => {
    playThemeMusic();
    
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
    setPlayerColor(generatePlayerColor(randomName));
  }, []);

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
      
      // Store room ID and go to settings
      setCreatedRoomId(room.roomId);
      setMode('settings');
      setLoading(false);
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
      const playerColor = generatePlayerColor(playerName.trim());
      const playerId = Math.random().toString(36).substr(2, 9);
      
      // First, try to join the room via API
      await joinRoom(targetRoomId, playerId, playerName.trim(), playerColor);
      
      // Stop the theme music before joining the game
      stopThemeMusic();
      
      // If successful, connect to the multiplayer game
      onRoomJoined(targetRoomId, playerId, playerName.trim(), playerColor);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
      setLoading(false);
    }
  };

  const handleStartGame = async () => {
    if (!createdRoomId || !playerName.trim()) {
      setError('Missing room or player information');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Generate player color and ID
      const playerColor = generatePlayerColor(playerName.trim());
      const playerId = Math.random().toString(36).substr(2, 9);
      
      // Join the created room
      await joinRoom(createdRoomId, playerId, playerName.trim(), playerColor);
      
      // Stop the theme music before joining the game
      stopThemeMusic();
      
      // Connect to the multiplayer game
      onRoomJoined(createdRoomId, playerId, playerName.trim(), playerColor);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game');
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
              >
                {loading ? 'Creating...' : 'Create Room'}
              </Button>

              <Button
                onClick={() => setMode('join')}
                disabled={loading}
                variant="outline"
                className="w-full border-amber-600 text-amber-700 hover:bg-amber-50"
                size="lg"
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
                onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                placeholder="e.g., ABC123"
                className="text-center text-lg font-mono"
                maxLength={6}
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
                <ArrowLeft className="h-4 w-4 mr-2" />
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
              <h2 className="text-2xl">Room Settings</h2>
            </div>
            <CardDescription>Configure your game room</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Room ID</label>
              <Input
                type="text"
                value={createdRoomId}
                disabled
                className="text-center text-lg font-mono bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">Share this code with other players</p>
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
              >
                <Play className="h-4 w-4 mr-2" />
                {loading ? 'Starting...' : 'Start Game'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}