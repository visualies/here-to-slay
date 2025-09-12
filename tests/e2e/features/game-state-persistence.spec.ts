import { test, expect } from '@playwright/test';
import { TestSetup } from '../utils/test-setup';

test.describe('Game State Persistence Features', () => {
  test('should preserve game state when player leaves and rejoins', async ({ page }) => {
    const { helper, roomId } = await TestSetup.setupSinglePlayerGame(page, 'StatePlayer');
    
    // Draw 3 cards to create some game state
    for (let i = 0; i < 3; i++) {
      await helper.drawCard();
    }
    
    const handAfterDraws = await helper.getHandCardCount();
    expect(handAfterDraws).toBe(8); // 5 initial + 3 drawn
    console.log(`✅ After drawing 3 cards: ${handAfterDraws} cards`);

    // Leave the room
    await helper.leaveRoom();
    console.log('✅ Left the room');

    // Wait for recent rooms to load and rejoin
    await helper.waitForRecentRoomsToLoad();
    await helper.rejoinFromRecentRooms(roomId);
    console.log('✅ Rejoined the room');

    // Verify game state is preserved
    await helper.verifyGameStatePreserved(8); // Should still have 8 cards
    console.log('✅ Game state successfully preserved');

    // Verify we're back in the same room
    const rejoinedRoomId = await helper.getRoomId();
    expect(rejoinedRoomId).toBe(roomId);
    console.log(`✅ Rejoined same room: ${rejoinedRoomId}`);

    // Verify player is still in the game
    await helper.verifyPlayerInGame('StatePlayer');
    console.log('✅ Player still in game');

    console.log('🎉 Game state persistence test completed!');
  });

  test('should maintain game state across browser refresh', async ({ page }) => {
    const { helper, roomId } = await TestSetup.setupSinglePlayerGame(page, 'RefreshPlayer');
    
    // Draw 2 cards
    await helper.drawCard();
    await helper.drawCard();
    
    const handBeforeRefresh = await helper.getHandCardCount();
    expect(handBeforeRefresh).toBe(7);
    console.log(`✅ Before refresh: ${handBeforeRefresh} cards`);

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Rejoin the room
    await helper.rejoinFromRecentRooms(roomId);
    
    // Verify game state is preserved
    const handAfterRefresh = await helper.getHandCardCount();
    expect(handAfterRefresh).toBe(7);
    console.log(`✅ After refresh: ${handAfterRefresh} cards`);

    console.log('🎉 Browser refresh state persistence test completed!');
  });

  test('should handle multiple players leaving and rejoining (3 players)', async ({ browser }) => {
    const scenario = await TestSetup.setupMultiplayerGame(browser, 3, ['Host', 'Player2', 'Player3']);
    
    try {
      // All players draw some cards
      await scenario.helpers[0].drawCard();
      await scenario.helpers[1].drawCard();
      await scenario.helpers[2].drawCard();
      
      // Player 2 leaves
      await scenario.helpers[1].leaveRoom();
      console.log('✅ Player 2 left');
      
      // Player 2 rejoins
      await scenario.helpers[1].rejoinFromRecentRooms(scenario.roomId);
      console.log('✅ Player 2 rejoined');
      
      // Verify all players are still in the game
      await Promise.all([
        scenario.helpers[0].verifyPlayerInGame('Host'),
        scenario.helpers[1].verifyPlayerInGame('Player2'),
        scenario.helpers[2].verifyPlayerInGame('Player3')
      ]);
      
      console.log('✅ All players still in game after leave/rejoin');
    } finally {
      await scenario.cleanup();
    }
  });

  test('should handle multiple players leaving and rejoining (4 players)', async ({ browser }) => {
    const scenario = await TestSetup.setupMultiplayerGame(browser, 4, ['Host', 'Player2', 'Player3', 'Player4']);
    
    try {
      // All players draw some cards
      await scenario.helpers[0].drawCard();
      await scenario.helpers[1].drawCard();
      await scenario.helpers[2].drawCard();
      await scenario.helpers[3].drawCard();
      
      // Player 2 and Player 3 leave
      await scenario.helpers[1].leaveRoom();
      await scenario.helpers[2].leaveRoom();
      console.log('✅ Player 2 and Player 3 left');
      
      // They rejoin
      await scenario.helpers[1].rejoinFromRecentRooms(scenario.roomId);
      await scenario.helpers[2].rejoinFromRecentRooms(scenario.roomId);
      console.log('✅ Player 2 and Player 3 rejoined');
      
      // Verify all players are still in the game
      await Promise.all([
        scenario.helpers[0].verifyPlayerInGame('Host'),
        scenario.helpers[1].verifyPlayerInGame('Player2'),
        scenario.helpers[2].verifyPlayerInGame('Player3'),
        scenario.helpers[3].verifyPlayerInGame('Player4')
      ]);
      
      console.log('✅ All players still in game after leave/rejoin');
    } finally {
      await scenario.cleanup();
    }
  });
});
