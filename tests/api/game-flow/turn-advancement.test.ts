import { test, expect } from '@playwright/test'
import { getRoomInfo, createRoom, joinRoom } from '../rooms/test-utils';

test.describe('API: Turn Advancement', () => {
  let roomId: string;
  let player1Id: string;
  let player2Id: string;

  test.beforeEach(async ({ request }) => {
    const roomResponse = await createRoom(request, { name: 'Turn Advancement Test Room' });
    roomId = roomResponse.roomId;
    player1Id = 'test-player-1';
    player2Id = 'test-player-2';

    await joinRoom(request, roomId, { playerId: player1Id, playerName: 'Player 1', playerColor: 'red' });
    await joinRoom(request, roomId, { playerId: player2Id, playerName: 'Player 2', playerColor: 'blue' });
    
    const startResponse = await request.post('/api/game/start', {
      data: { roomId }
    });
    expect(startResponse.status()).toBe(200);
  });

  test('should advance turn after a player uses all action points', async ({ request }) => {
    // 1. Get initial game state to see whose turn it is
    const initialRoom = await getRoomInfo(request, roomId);
    const initialTurnPlayerId = initialRoom.gameState.currentTurn.player_id;
    expect(initialTurnPlayerId).toBeTruthy();

    const otherPlayerId = initialTurnPlayerId === player1Id ? player2Id : player1Id;

    // 2. The current player draws 3 cards, which costs 3 action points and should end their turn.
    // The player should have 3 action points at the start of their turn.
    const playerState = initialRoom.players[initialTurnPlayerId];
    expect(playerState.actionPoints).toBe(3);

    // Draw 3 cards using the new play-card endpoint
    for (let i = 0; i < 3; i++) {
      const drawResponse = await request.post('/api/game/play-card', {
        data: {
          roomId,
          playerId: initialTurnPlayerId,
          cardId: 'draw-001'
        }
      });
      expect(drawResponse.status()).toBe(200);
    }

    // 3. Wait a moment for Yjs sync
    await new Promise(resolve => setTimeout(resolve, 200));

    // 4. Get updated room state and verify the turn has advanced
    const updatedRoom = await getRoomInfo(request, roomId);
    const updatedTurnPlayerId = updatedRoom.gameState.currentTurn.player_id;

    // ✅ Requirement: The turn should have advanced to the other player.
    expect(updatedTurnPlayerId).toBe(otherPlayerId);

    // ✅ Bonus: The new player on turn should have their action points refilled to 3.
    const newPlayerState = updatedRoom.players[updatedTurnPlayerId];
    expect(newPlayerState.actionPoints).toBe(3);
  });

  test('should cycle back to the first player after all players take their turn', async ({ request }) => {
    // This test requires a separate setup with 4 players.
    // Since beforeEach is configured for 2 players, we'll do a full setup here.
    const roomResponse = await createRoom(request, { name: '4-Player Turn Cycle Test', maxPlayers: 4 });
    const newRoomId = roomResponse.roomId;
    
    const players = [
      { id: 'p1', name: 'Player 1', color: 'red' },
      { id: 'p2', name: 'Player 2', color: 'blue' },
      { id: 'p3', name: 'Player 3', color: 'green' },
      { id: 'p4', name: 'Player 4', color: 'yellow' }
    ];

    for (const player of players) {
      await joinRoom(request, newRoomId, { playerId: player.id, playerName: player.name, playerColor: player.color });
    }

    await request.post('/api/game/start', { data: { roomId: newRoomId } });

    // 1. Get initial game state to find the first player
    let roomState = await getRoomInfo(request, newRoomId);
    const firstPlayerId = roomState.gameState.currentTurn.player_id;
    expect(firstPlayerId).toBe('p1');

    const playerIdsInOrder = ['p1', 'p2', 'p3', 'p4'];
    
    // 2. Each player takes their turn by drawing 3 cards
    for (let i = 0; i < playerIdsInOrder.length; i++) {
      const currentPlayerId = playerIdsInOrder[i];
      const nextPlayerId = playerIdsInOrder[(i + 1) % playerIdsInOrder.length];

      // Verify it's the correct player's turn
      roomState = await getRoomInfo(request, newRoomId);
      expect(roomState.gameState.currentTurn.player_id).toBe(currentPlayerId);

      // Player uses all action points
      for (let j = 0; j < 3; j++) {
        const drawResponse = await request.post('/api/game/play-card', {
          data: {
            roomId: newRoomId,
            playerId: currentPlayerId,
            cardId: 'draw-001'
          }
        });
        expect(drawResponse.status()).toBe(200);
      }

      await new Promise(resolve => setTimeout(resolve, 200)); // Wait for server to process

      // Verify turn has advanced to the next player
      roomState = await getRoomInfo(request, newRoomId);
      expect(roomState.gameState.currentTurn.player_id).toBe(nextPlayerId);
    }

    // 3. Final check: After the last player's turn, it should be the first player's turn again.
    const finalRoomState = await getRoomInfo(request, newRoomId);
    expect(finalRoomState.gameState.currentTurn.player_id).toBe(firstPlayerId);
  });
});
