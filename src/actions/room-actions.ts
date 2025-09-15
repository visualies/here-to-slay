"use server";

import { gameServerAPI } from "@/lib/game-server-api";
import { redirect } from "next/navigation";

export type ActionState = {
  error?: string;
  success?: boolean;
};

export async function createRoomAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const playerName = formData.get('playerName') as string;
  const providedPlayerId = (formData.get('playerId') as string) || '';
  const turnDuration = parseInt(formData.get('turnDuration') as string) || 30;
  const selectedDeck = formData.get('selectedDeck') as string || 'standard';

  if (!playerName || playerName.trim().length === 0) {
    return { error: 'Player name is required' };
  }

  if (playerName.trim().length > 20) {
    return { error: 'Player name must be 20 characters or less' };
  }

  let roomResponse: Awaited<ReturnType<typeof gameServerAPI.createRoom>>;
  let playerResponse: Awaited<ReturnType<typeof gameServerAPI.getCurrentPlayer>>;

  try {
    // Create room with the configured settings
    roomResponse = await gameServerAPI.createRoom('Game Room', {
      maxPlayers: 4, // Could be made configurable later
      turnDuration,
      selectedDeck
    });

    if (!roomResponse.success || !roomResponse.data) {
      return { error: roomResponse.message || 'Failed to create room' };
    }

    // Get current player (cookie-based on room server)
    playerResponse = await gameServerAPI.getCurrentPlayer();
    if (!playerResponse.success || !playerResponse.data) {
      return { error: playerResponse.message || 'Failed to get or create player' };
    }

    // Update player name if it's different from the default
    if (playerResponse.data.playerName !== playerName) {
      const updateResponse = await gameServerAPI.updateCurrentPlayer(playerName);
      if (updateResponse.success && updateResponse.data) {
        playerResponse = updateResponse;
      } else {
        return { error: updateResponse.message || 'Failed to update player information' };
      }
    }

    // Ensure we have player data after possible update
    if (!playerResponse.data) {
      return { error: 'Failed to determine player information' };
    }

    const { playerId: cookiePlayerId, playerName: finalPlayerName, playerColor } = playerResponse.data;
    const playerId = providedPlayerId || cookiePlayerId;

    // Join the room that was just created
    const joinResult = await gameServerAPI.joinRoom(
      roomResponse.data.roomId,
      playerId,
      finalPlayerName,
      playerColor
    );

    if (!joinResult.success) {
      return { error: joinResult.message || 'Failed to join the created room' };
    }
  } catch (error) {
    console.error('Failed to create room:', error);
    return { error: error instanceof Error ? error.message : 'Failed to create room' };
  }

  // Redirect happens outside try-catch so it's not caught as an error
  redirect(`/room/${roomResponse.data.roomId}`);
}

export async function joinRoomAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const roomId = formData.get('roomId') as string;
    const playerName = formData.get('playerName') as string;
    const providedPlayerId = (formData.get('playerId') as string) || '';

    if (!roomId || roomId.trim().length === 0) {
      return { error: 'Room ID is required' };
    }

    if (!playerName || playerName.trim().length === 0) {
      return { error: 'Player name is required' };
    }

    if (playerName.trim().length > 20) {
      return { error: 'Player name must be 20 characters or less' };
    }

    if (roomId.trim().length !== 6) {
      return { error: 'Room ID must be 6 characters' };
    }

    // Get current player from room server cookie
    const playerResponse = await gameServerAPI.getCurrentPlayer();
    let playerId = providedPlayerId || (playerResponse.success && playerResponse.data ? playerResponse.data.playerId : '');

    // Update player name if it changed
    if (playerResponse.success && playerResponse.data && playerName !== playerResponse.data.playerName) {
      const updateResponse = await gameServerAPI.updateCurrentPlayer(playerName);
      if (updateResponse.success && updateResponse.data) {
        playerId = providedPlayerId || updateResponse.data.playerId;
      } else {
        return { error: updateResponse.message || 'Failed to update player information' };
      }
    } else if (!playerId) {
      // Create new player via room server, which sets cookie
      const createResponse = await gameServerAPI.createPlayer(playerName);
      if (createResponse.success && createResponse.data) {
        playerId = createResponse.data.playerId;
      } else {
        return { error: createResponse.message || 'Failed to create player' };
      }
    }

    // Join the room
    const joinResult = await gameServerAPI.joinRoom(
      roomId.toUpperCase(),
      playerId,
      playerName,
      playerResponse.success && playerResponse.data ? playerResponse.data.playerColor : '#FF6B6B'
    );

    if (joinResult.success) {
      // Redirect to the game with room data
      redirect(`/room/${roomId.toUpperCase()}`);
    } else {
      return { error: joinResult.message || 'Failed to join room. Please check the room ID.' };
    }
  } catch (error) {
    console.error('Failed to join room:', error);
    return { error: error instanceof Error ? error.message : 'Failed to create room' };
  }
}
