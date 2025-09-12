import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import { GameTestHelper, createMultiplePlayersInRoom } from './utils/test-helpers';

test.describe('Here to Slay - Game Flow', () => {
  test.describe.configure({ mode: 'serial' });

  test('should create room, start round, and assign hand cards to players', async ({ browser }) => {
    let contexts: BrowserContext[] = [];
    let pages: Page[] = [];

    try {
      // Create two browser contexts to simulate two players
      contexts = await Promise.all([
        browser.newContext(),
        browser.newContext()
      ]);

      pages = await Promise.all([
        contexts[0].newPage(),
        contexts[1].newPage()
      ]);

      // Navigate both players to the home page
      await Promise.all(pages.map(page => page.goto('/')));

      const helpers = pages.map(page => new GameTestHelper(page));

      // Step 1: Player 1 creates a room
      console.log('🎮 Step 1: Creating room...');
      await helpers[0].createRoom('Player1');
      
      // Take screenshot after room creation
      await helpers[0].takeScreenshot('01-room-created');
      
      const roomId = await helpers[0].getRoomId();
      console.log(`✅ Room created: ${roomId}`);

      // Step 2: Player 2 joins the room
      console.log('🎮 Step 2: Player 2 joining room...');
      await helpers[1].joinRoom(roomId, 'Player2');
      await helpers[1].takeScreenshot('02-player2-joined');
      
      // Verify both players are in the room
      await helpers[0].verifyPlayerInGame('Player1');
      await helpers[1].verifyPlayerInGame('Player2');
      console.log('✅ Both players in room');

      // Step 3: Start the game/round
      console.log('🎮 Step 3: Starting game...');
      
      // Player 1 (host) starts the game
      await helpers[0].startGame();
      
      // Wait a moment for game state to synchronize
      await pages[0].waitForTimeout(2000);
      
      await helpers[0].takeScreenshot('03-game-started');
      console.log('✅ Game started');

      // Step 4: Verify both players have hand cards
      console.log('🎮 Step 4: Verifying hand cards...');
      
      const [player1Cards, player2Cards] = await Promise.all([
        helpers[0].waitForHandCards('Player1'),
        helpers[1].waitForHandCards('Player2')
      ]);

      console.log(`✅ Player 1 has ${player1Cards} cards`);
      console.log(`✅ Player 2 has ${player2Cards} cards`);

      // Verify each player has a reasonable number of hand cards (typically 5-7 in card games)
      expect(player1Cards).toBeGreaterThanOrEqual(3);
      expect(player1Cards).toBeLessThanOrEqual(10);
      expect(player2Cards).toBeGreaterThanOrEqual(3);
      expect(player2Cards).toBeLessThanOrEqual(10);

      // Take final screenshots
      await helpers[0].takeScreenshot('04-final-player1');
      await helpers[1].takeScreenshot('04-final-player2');

      // Step 5: Verify game phase is playing
      await Promise.all([
        helpers[0].verifyGamePhase('playing'),
        helpers[1].verifyGamePhase('playing')
      ]);

      console.log('🎉 Test completed successfully!');

    } finally {
      // Cleanup: close all pages and contexts
      for (const page of pages) {
        await page.close().catch(() => {});
      }
      for (const context of contexts) {
        await context.close().catch(() => {});
      }
    }
  });

  test('should handle single player room creation and game initialization', async ({ page }) => {
    const helper = new GameTestHelper(page);
    
    // Navigate to home page
    await page.goto('/');
    
    // Create room
    await helper.createRoom('SinglePlayer');
    await helper.takeScreenshot('single-player-room');
    
    // Verify room was created
    const roomId = await helper.getRoomId();
    expect(roomId).toMatch(/^[A-Z0-9]{4,8}$/);
    
    await helper.verifyPlayerInGame('SinglePlayer');
    console.log(`✅ Single player room created: ${roomId}`);
  });

  test('should prevent starting game with insufficient players', async ({ page }) => {
    const helper = new GameTestHelper(page);
    
    await page.goto('/');
    await helper.createRoom('LonePlayer');
    
    // Try to find and click start game button
    const startButtons = page.locator('button').filter({ hasText: /Start|Initialize|Begin|Play/i });
    const count = await startButtons.count();
    
    if (count > 0) {
      // If there is a start button, it should either be disabled or show an error
      const firstButton = startButtons.first();
      const isDisabled = await firstButton.isDisabled();
      
      if (!isDisabled) {
        // If not disabled, clicking should not start the game or show an error
        await firstButton.click();
        
        // Verify game doesn't start (no hand cards appear)
        await expect(page.locator('[data-testid="hand-cards"], .hand-cards')).not.toBeVisible({ timeout: 3000 });
      }
    }
    
    console.log('✅ Game correctly prevents starting with insufficient players');
  });
});