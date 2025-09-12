import { test, expect } from '@playwright/test';
import { ApiTestHelper } from './utils/api-helpers';

test.describe('Here to Slay - Database & API Tests', () => {
  let apiHelper: ApiTestHelper;

  test.beforeEach(() => {
    apiHelper = new ApiTestHelper();
  });

  test('should create room via API and verify in database', async () => {
    const roomName = 'Test Room API';
    
    // Create room via API
    const roomData = await apiHelper.createRoom(roomName);
    const roomId = roomData.roomId;
    console.log(`✅ Room created via API: ${roomId}`);
    
    // Verify room exists in database
    const roomInfo = await apiHelper.verifyRoomExists(roomId, roomName);
    await apiHelper.verifyPlayerCount(roomId, 0);
    
    console.log(`✅ Room verified in database: ${JSON.stringify(roomInfo)}`);
  });

  test('should join room via API and verify player count', async () => {
    // First create a room
    const roomData = await apiHelper.createRoom('Join Test Room');
    const roomId = roomData.roomId;
    
    // Join room with first player
    const player1Id = apiHelper.generatePlayerId('player1');
    await apiHelper.joinRoom(roomId, player1Id, 'TestPlayer1', '#FF6B6B');
    
    // Verify room info shows 1 player
    await apiHelper.verifyPlayerCount(roomId, 1);
    
    // Join room with second player
    const player2Id = apiHelper.generatePlayerId('player2');
    await apiHelper.joinRoom(roomId, player2Id, 'TestPlayer2', '#4ECDC4');
    
    // Verify room info shows 2 players
    const roomInfo = await apiHelper.verifyPlayerCount(roomId, 2);
    
    console.log(`✅ Both players joined successfully. Final room info:`, roomInfo);
  });

  test('should handle invalid room operations', async () => {
    // Try to join non-existent room
    const playerId = apiHelper.generatePlayerId('invalid-player');
    await apiHelper.expectJoinToFail('INVALID', playerId, 'TestPlayer', '#FF6B6B');
    
    // Try to get info for non-existent room
    await apiHelper.expectRoomNotFound('INVALID');
    
    console.log('✅ Invalid room operations handled correctly');
  });

  test('should list active rooms', async () => {
    // Create multiple rooms
    const room1 = await apiHelper.createRoom('Room 1');
    const room2 = await apiHelper.createRoom('Room 2');
    const room3 = await apiHelper.createRoom('Room 3');
    
    // Get list of active rooms
    const activeRooms = await apiHelper.getActiveRooms();
    expect(activeRooms.length).toBeGreaterThanOrEqual(3);
    
    // Verify our created rooms are in the list
    await apiHelper.verifyRoomInActiveList(room1.roomId);
    await apiHelper.verifyRoomInActiveList(room2.roomId);
    await apiHelper.verifyRoomInActiveList(room3.roomId);
    
    const roomIds = activeRooms.map((room: any) => room.id);
    console.log(`✅ Found ${activeRooms.length} active rooms:`, roomIds);
  });

  test('should handle room capacity limits', async () => {
    // Create room with max 2 players
    const roomData = await apiHelper.createRoom('Capacity Test Room', 2);
    const roomId = roomData.roomId;
    
    // Check room info to verify max_players is set
    const roomInfo = await apiHelper.getRoomInfo(roomId);
    console.log(`Room info: max_players=${roomInfo.max_players}, current_players=${roomInfo.player_count}`);
    
    // Join first player
    const player1Id = apiHelper.generatePlayerId('player1');
    await apiHelper.joinRoom(roomId, player1Id, 'Player1', '#FF6B6B');
    
    // Join second player
    const player2Id = apiHelper.generatePlayerId('player2');
    await apiHelper.joinRoom(roomId, player2Id, 'Player2', '#4ECDC4');
    
    // Check room info after 2 players
    const roomInfo2 = await apiHelper.getRoomInfo(roomId);
    console.log(`After 2 players: max_players=${roomInfo2.max_players}, current_players=${roomInfo2.player_count}`);
    
    // Try to join third player (should fail)
    const player3Id = apiHelper.generatePlayerId('player3');
    await apiHelper.expectJoinToFail(roomId, player3Id, 'Player3', '#45B7D1');
    
    console.log('✅ Room capacity limit enforced correctly');
  });

  test('should verify database persistence', async () => {
    // Create room
    const roomData = await apiHelper.createRoom('Persistence Test');
    const roomId = roomData.roomId;
    
    // Join player
    const playerId = apiHelper.generatePlayerId('persistent-player');
    await apiHelper.joinRoom(roomId, playerId, 'PersistentPlayer', '#96CEB4');
    
    // Verify room exists
    await apiHelper.verifyPlayerCount(roomId, 1);
    await apiHelper.verifyRoomExists(roomId, 'Persistence Test');
    
    // Wait a moment to ensure persistence
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify room still exists after delay
    await apiHelper.verifyPlayerCount(roomId, 1);
    await apiHelper.verifyRoomExists(roomId, 'Persistence Test');
    
    console.log('✅ Database persistence verified');
  });
});
