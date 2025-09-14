"use server";

import { gameServerAPI } from "@/lib/game-server-api";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";


export async function createRoomAction(formData: FormData) {
  try {
    const playerName = formData.get('playerName') as string;
    const turnDuration = parseInt(formData.get('turnDuration') as string) || 30;
    const selectedDeck = formData.get('selectedDeck') as string || 'standard';

    // Create room with the configured settings
    const room = await createRoom('Game Room', {
      maxPlayers: 4, // Could be made configurable later
      turnDuration,
      selectedDeck
    });

    // Update player name if needed
    const response = await gameServerAPI.updateCurrentPlayer(playerName);
    if (response.success && response.data) {
      // Redirect to the game with room data
      redirect(`/room/${room.roomId}?playerId=${response.data.playerId}&playerName=${encodeURIComponent(response.data.playerName)}&playerColor=${encodeURIComponent(response.data.playerColor)}`);
    }
  } catch (error) {
    console.error('Failed to create room:', error);
    // In a real app, you might want to redirect to an error page or show an error message
    redirect('/?error=create-room-failed');
  }
}

export async function joinRoomAction(formData: FormData) {
  try {
    const roomId = formData.get('roomId') as string;
    const playerName = formData.get('playerName') as string;

    // Get current player or create one
    let playerResponse = await gameServerAPI.getCurrentPlayer();
    let playerId = playerResponse.success && playerResponse.data ? playerResponse.data.playerId : `player-${Date.now()}`;
    
    // Update player name if it changed
    if (playerResponse.success && playerResponse.data && playerName !== playerResponse.data.playerName) {
      const updateResponse = await gameServerAPI.updateCurrentPlayer(playerName);
      if (updateResponse.success && updateResponse.data) {
        playerId = updateResponse.data.playerId;
      }
    } else if (!playerResponse.success || !playerResponse.data) {
      // Create new player
      const createResponse = await gameServerAPI.createPlayer(playerName);
      if (createResponse.success && createResponse.data) {
        playerId = createResponse.data.playerId;
      }
    }

    // Join the room
    const joinResult = await joinRoom(
      roomId.toUpperCase(), 
      playerId, 
      playerName, 
      playerResponse.success && playerResponse.data ? playerResponse.data.playerColor : '#FF6B6B'
    );

    if (joinResult.success) {
      // Redirect to the game with room data
      redirect(`/room/${roomId}?playerId=${playerId}&playerName=${encodeURIComponent(playerName)}&playerColor=${encodeURIComponent(playerResponse.success && playerResponse.data ? playerResponse.data.playerColor : '#FF6B6B')}`);
    }
  } catch (error) {
    console.error('Failed to join room:', error);
    // In a real app, you might want to redirect to an error page or show an error message
    redirect('/?error=join-room-failed');
  }
}
