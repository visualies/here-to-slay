import { test, expect } from '@playwright/test';
import { TestSetup } from '../utils/test-setup';
import { GameTestHelper } from '../utils/test-helpers';

test.describe('Room Creation Features', () => {
  test('should create a room successfully', async ({ page }) => {
    const { helper, roomId } = await TestSetup.setupSinglePlayerGame(page, 'RoomCreator');
    
    // Verify room was created
    expect(roomId).toMatch(/^[A-Z0-9]{4,8}$/);
    
    // Verify UI elements are present
    await expect(page.locator('[data-testid="room-id-badge"]')).toBeVisible();
    await expect(page.locator('[data-testid="leave-room-button"]')).toBeVisible();
    
    console.log(`✅ Room created successfully: ${roomId}`);
  });

  test('should handle room creation with different player names', async ({ page }) => {
    const playerNames = ['Alice', 'Bob', 'Charlie'];
    
    for (const playerName of playerNames) {
      const { helper, roomId } = await TestSetup.setupSinglePlayerGame(page, playerName);
      
      // Verify room was created
      expect(roomId).toMatch(/^[A-Z0-9]{4,8}$/);
      
      // Verify player is in the game
      await helper.verifyPlayerInGame(playerName);
      
      console.log(`✅ Room created for ${playerName}: ${roomId}`);
    }
  });

  test('should show start game button for room host', async ({ page }) => {
    const helper = new GameTestHelper(page);
    
    // Navigate to home page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Create room but don't start the game
    await helper.createRoom('HostPlayer');
    const roomId = await helper.getRoomId();
    
    // Verify start game button is visible
    await expect(page.locator('[data-testid="start-round-button"]')).toBeVisible();
    
    console.log('✅ Start game button visible for host');
  });
});
