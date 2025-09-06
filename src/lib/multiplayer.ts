"use client";

// Room API interface
export interface Room {
  roomId: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
}

// Room API functions
export async function createRoom(name: string = 'Here to Slay Game'): Promise<Room> {
  const response = await fetch('http://localhost:1234/api/create-room', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create room');
  }
  
  return await response.json();
}

export async function joinRoom(roomId: string, playerId: string, playerName: string, playerColor: string): Promise<{ success: boolean; room: Room }> {
  const response = await fetch('http://localhost:1234/api/join-room', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, playerId, playerName, playerColor })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to join room');
  }
  
  return await response.json();
}

export async function getRoomInfo(roomId: string): Promise<Room> {
  const response = await fetch(`http://localhost:1234/api/room-info?id=${roomId}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get room info');
  }
  
  return await response.json();
}

