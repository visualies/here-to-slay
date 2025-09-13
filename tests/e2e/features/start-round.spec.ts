import { test, expect } from '@playwright/test';
import { GameTestHelper } from '../utils/test-helpers';
import { MultiplayerTestHelper } from '../utils/multiplayer-test-helpers';

test.describe('Start Round Feature', () => {
  
  test.describe('Single Player', () => {
    test('should deal 5 hand cards and 1 party leader to single player when starting round', async ({ page }) => {
      const helper = new GameTestHelper(page);
      
      console.log('🎮 Setting up single player game...');
      await page.goto('/');
      
      // Create room with single player
      await helper.createRoom('TestPlayer');
      const roomId = await helper.getRoomId();
      console.log(`✅ Room created: ${roomId}`);
      
      // Verify we're in the game area
      await expect(page.locator('[data-testid="room-id-badge"]')).toBeVisible();
      
      // Start the round
      console.log('🎮 Starting round...');
      await helper.startGame();
      
      // Verify player has exactly 5 hand cards
      console.log('🎮 Verifying hand cards...');
      const handCards = page.locator('[data-testid="current-player-hand-container"] .card');
      await expect(handCards).toHaveCount(5);
      
      // Verify player has exactly 1 party leader
      console.log('🎮 Verifying party leader...');
      await helper.waitForPartyLeaders(1, 15000);
      
      console.log('✅ Single player start round validation completed');
    });
  });
  
  test.describe('Multiplayer', () => {
    test('should deal 5 hand cards and 1 party leader to each player when starting round', async ({ browser }) => {
      const multiHelper = new MultiplayerTestHelper(browser);
      
      console.log('🎮 Setting up multiplayer game...');
      
      // Create two players
      const { player1, player2, roomId } = await multiHelper.createTwoPlayerGame('Player1', 'Player2');
      console.log(`✅ Multiplayer room created: ${roomId}`);
      
      // Start the round from player 1 (host) after all players are ready
      console.log('🎮 Starting round from host...');
      await multiHelper.startGame(0);
      
      // Wait for game initialization by waiting for party leaders to appear
      console.log('🎮 Waiting for party leaders to be assigned...');
      await player1.waitForPartyLeaders(2, 15000);
      
      // Verify Player 1 has exactly 5 hand cards
      console.log('🎮 Verifying Player 1 cards...');
      const player1HandCards = player1.page.locator('[data-testid="current-player-hand-container"] .card');
      await expect(player1HandCards).toHaveCount(5);
      
      // Verify total party leaders visible (should be 2 - one for each player)
      console.log('🎮 Verifying all party leaders are visible...');
      await player1.waitForPartyLeaders(2, 15000);
      
      // Verify Player 2 has exactly 5 hand cards and 1 party leader  
      console.log('🎮 Verifying Player 2 cards...');
      const player2HandCards = player2.page.locator('[data-testid="current-player-hand-container"] .card');
      await expect(player2HandCards).toHaveCount(5);
      
      // Verify Player 2 also sees all party leaders
      console.log('🎮 Verifying Player 2 sees all party leaders...');
      await player2.waitForPartyLeaders(2, 15000);
      
      console.log('✅ Multiplayer start round validation completed');
      
      // Cleanup
      await multiHelper.cleanup();
    });
    
    test('should deal 5 hand cards and 1 party leader to each player in 3-player game', async ({ browser }) => {
      const multiHelper = new MultiplayerTestHelper(browser);
      
      console.log('🎮 Setting up 3-player game...');
      
      // Create three players
      const { players, roomId } = await multiHelper.createThreePlayerGame('Player1', 'Player2', 'Player3');
      console.log(`✅ 3-player room created: ${roomId}`);
      
      // Start the round from player 1 (host) after all players are ready
      console.log('🎮 Starting round from host...');
      await multiHelper.startGame(0);
      
      // Wait for game initialization by waiting for party leaders to appear on player 1
      console.log('🎮 Waiting for party leaders to be assigned...');
      await players[0].waitForPartyLeaders(3, 15000);
      
      // Verify each player has exactly 5 hand cards and can see all 3 party leaders
      for (let i = 0; i < 3; i++) {
        console.log(`🎮 Verifying Player ${i + 1} cards...`);
        
        const handCards = players[i].page.locator('[data-testid="current-player-hand-container"] .card');
        await expect(handCards).toHaveCount(5);
        
        // Verify player sees all 3 party leaders (1 for each player in the game)
        console.log(`🎮 Verifying Player ${i + 1} sees all party leaders...`);
        await players[i].waitForPartyLeaders(3, 15000);
      }
      
      console.log('✅ 3-player start round validation completed');
      
      // Cleanup
      await multiHelper.cleanup();
    });
    
    test('should deal 5 hand cards and 1 party leader to each player in 4-player game', async ({ browser }) => {
      const multiHelper = new MultiplayerTestHelper(browser);
      
      console.log('🎮 Setting up 4-player game...');
      
      // Create four players
      const { players, roomId } = await multiHelper.createFourPlayerGame('Player1', 'Player2', 'Player3', 'Player4');
      console.log(`✅ 4-player room created: ${roomId}`);
      
      // Start the round from player 1 (host) after all players are ready
      console.log('🎮 Starting round from host...');
      await multiHelper.startGame(0);
      
      // Wait for game initialization by waiting for party leaders to appear on player 1
      console.log('🎮 Waiting for party leaders to be assigned...');
      await players[0].waitForPartyLeaders(4, 15000);
      
      // Verify each player has exactly 5 hand cards and can see all 4 party leaders
      for (let i = 0; i < 4; i++) {
        console.log(`🎮 Verifying Player ${i + 1} cards...`);
        
        const handCards = players[i].page.locator('[data-testid="current-player-hand-container"] .card');
        await expect(handCards).toHaveCount(5);
        
        // Verify player sees all 4 party leaders (1 for each player in the game)
        console.log(`🎮 Verifying Player ${i + 1} sees all party leaders...`);
        await players[i].waitForPartyLeaders(4, 15000);
      }
      
      console.log('✅ 4-player start round validation completed');
      
      // Cleanup
      await multiHelper.cleanup();
    });
  });
});