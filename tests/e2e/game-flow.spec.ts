import { test, expect } from '@playwright/test';
import { TestSetup } from './utils/test-setup';

test.describe('Here to Slay - Core Game Flow', () => {
  test.describe.configure({ mode: 'serial' });

  test('should complete full multiplayer game flow', async ({ browser }) => {
    const scenario = await TestSetup.setupMultiplayerGame(browser, 2, ['Player1', 'Player2']);
    
    try {
      // Verify both players are in the game
      console.log('🎮 Verifying players are in game...');
      await scenario.helpers[0].verifyPlayerInGame('Player1');
      await scenario.helpers[1].verifyPlayerInGame('Player2');
      console.log('✅ Both players in game');

      // Verify both players have hand cards
      console.log('🎮 Verifying hand cards...');
      const [player1Cards, player2Cards] = await Promise.all([
        scenario.helpers[0].waitForHandCards('Player1'),
        scenario.helpers[1].waitForHandCards('Player2')
      ]);

      console.log(`✅ Player 1 has ${player1Cards} cards`);
      console.log(`✅ Player 2 has ${player2Cards} cards`);

      // Verify each player has exactly 5 hand cards
      expect(player1Cards).toBe(5);
      expect(player2Cards).toBe(5);

      // Verify game phase is playing
      await Promise.all([
        scenario.helpers[0].verifyGamePhase('playing'),
        scenario.helpers[1].verifyGamePhase('playing')
      ]);

      console.log('🎉 Core game flow test completed successfully!');
    } finally {
      await scenario.cleanup();
    }
  });

  test('should handle single player game flow', async ({ page }) => {
    const { helper, roomId } = await TestSetup.setupSinglePlayerGame(page, 'SinglePlayer');
    
    // Verify room was created
    expect(roomId).toMatch(/^[A-Z0-9]{4,8}$/);
    
    // Verify player is in the game
    await helper.verifyPlayerInGame('SinglePlayer');
    
    // Verify game phase is playing
    await helper.verifyGamePhase('playing');
    
    console.log(`✅ Single player game flow completed: ${roomId}`);
  });
});