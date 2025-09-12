import { test, expect } from '@playwright/test';
import { GameTestHelper } from './utils/test-helpers';

test.describe('Here to Slay - Simple Game Flow', () => {

  test('should create room and verify UI elements', async ({ page }) => {
    const helper = new GameTestHelper(page);
    
    console.log('🎮 Navigating to home page...');
    await page.goto('/');
    
    // Take screenshot of initial state
    await page.screenshot({ path: 'tests/e2e/screenshots/00-initial-state.png' });
    
    // Step 1: Create room
    console.log('🎮 Creating room...');
    await helper.createRoom('TestPlayer');
    
    const roomId = await helper.getRoomId();
    console.log(`✅ Room created: ${roomId}`);
    
    // Verify we're in the game area
    await expect(page.locator('text=/Room:.*/')).toBeVisible();
    await expect(page.locator('button:has-text("Leave Room")')).toBeVisible();
    
    // Take screenshot after room creation
    await page.screenshot({ path: 'tests/e2e/screenshots/01-room-created.png' });
    
    // Step 2: Check if Start Round button exists (for host)
    console.log('🎮 Checking for Start Round button...');
    
    const startRoundButton = page.locator('button').filter({ hasText: /Start Round|🎮 Start Round/i });
    const startRoundExists = await startRoundButton.count() > 0;
    
    if (startRoundExists) {
      console.log('✅ Start Round button found - attempting to start game...');
      await startRoundButton.first().click();
      
      // Wait for game to start and check for hand cards or game elements
      await page.waitForTimeout(2000); // Give game time to initialize
      
      // Look for various game UI elements that might appear
      const gameElements = [
        '[data-testid="hand-cards"]',
        '.hand-cards',
        '[class*="hand"]',
        'text=/Hand|Cards/i',
        '[data-testid="game-area"]',
        '.game-area'
      ];
      
      let gameStarted = false;
      for (const selector of gameElements) {
        const elements = await page.locator(selector).count();
        if (elements > 0) {
          console.log(`✅ Found game element: ${selector} (${elements} elements)`);
          gameStarted = true;
          break;
        }
      }
      
      // Take screenshot after game start attempt
      await page.screenshot({ path: 'tests/e2e/screenshots/02-game-started.png' });
      
      if (gameStarted) {
        console.log('🎉 Game successfully started!');
      } else {
        console.log('⚠️  Game may need multiple players to start');
      }
      
    } else {
      console.log('⚠️  No Start Round button found - may need multiple players');
    }
    
    // Verify basic game UI elements exist
    await expect(page.locator('text=/Room:.*/')).toBeVisible();
    
    console.log('✅ Basic game flow test completed');
  });

  test('should verify room joining flow', async ({ page }) => {
    const helper = new GameTestHelper(page);
    
    await page.goto('/');
    
    // Fill in player name first
    await page.fill('input[placeholder*="name"]', 'JoinTestPlayer');
    
    // Click "Join Existing Room" button to switch to join mode
    await page.click('button:has-text("Join Existing Room")');
    
    // Verify join UI appears
    await expect(page.locator('input[placeholder*="Room"]')).toBeVisible();
    await expect(page.locator('button:has-text("Join"):not(:has-text("Existing"))')).toBeVisible();
    
    console.log('✅ Join room UI verified');
  });

  test('should handle invalid room joining', async ({ page }) => {
    const helper = new GameTestHelper(page);
    
    await page.goto('/');
    
    // Fill in player name
    await page.fill('input[placeholder*="name"]', 'TestPlayer');
    
    // Switch to join mode
    await page.click('button:has-text("Join Existing Room")');
    
    // Try to join non-existent room
    await page.fill('input[placeholder*="Room"]', 'INVALID');
    await page.click('button:has-text("Join"):not(:has-text("Existing"))');
    
    // Should either show error or stay on same page
    await page.waitForTimeout(2000);
    
    // Verify we're still in room manager (not in game)
    const inGame = await page.locator('text=/Room:.*/', { timeout: 1000 }).isVisible().catch(() => false);
    expect(inGame).toBeFalsy();
    
    console.log('✅ Invalid room join handled correctly');
  });
});