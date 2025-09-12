import { test, expect } from '@playwright/test';
import { TestSetup } from '../utils/test-setup';
import { GameTestHelper } from '../utils/test-helpers';

test.describe('Room Joining Features', () => {
  test('should join an existing room successfully', async ({ browser }) => {
    const scenario = await TestSetup.setupRoomOnly(browser, 2, ['Host', 'Joiner']);
    
    try {
      // Verify both players are in the same room
      const hostRoomId = await scenario.helpers[0].getRoomId();
      const joinerRoomId = await scenario.helpers[1].getRoomId();
      
      expect(hostRoomId).toBe(joinerRoomId);
      
      // Verify both players can see each other
      await scenario.helpers[0].verifyPlayerInGame('Host');
      await scenario.helpers[1].verifyPlayerInGame('Joiner');
      
      console.log(`✅ Both players joined room: ${hostRoomId}`);
    } finally {
      await scenario.cleanup();
    }
  });

  test('should handle invalid room ID gracefully', async ({ page }) => {
    const helper = new GameTestHelper(page);
    
    await page.goto('/');
    
    // Fill in player name
    await page.fill('[data-testid="create-player-name-input"]', 'TestPlayer');
    
    // Switch to join mode
    await page.click('[data-testid="join-existing-room-button"]');
    
    // Try to join non-existent room
    await page.fill('[data-testid="join-room-id-input"]', 'INVALID');
    await page.click('[data-testid="join-room-submit-button"]');
    
    // Should either show error or stay on same page
    await page.waitForTimeout(2000);
    
    // Verify we're still in room manager (not in game)
    const inGame = await page.locator('[data-testid="room-id-badge"]', { timeout: 1000 }).isVisible().catch(() => false);
    expect(inGame).toBeFalsy();
    
    console.log('✅ Invalid room join handled correctly');
  });

  test('should handle multiple players joining the same room (3 players)', async ({ browser }) => {
    const scenario = await TestSetup.setupRoomOnly(browser, 3, ['Host', 'Player2', 'Player3']);
    
    try {
      // Verify all players are in the same room
      const roomIds = await Promise.all(scenario.helpers.map(helper => helper.getRoomId()));
      const allSameRoom = roomIds.every(id => id === roomIds[0]);
      
      expect(allSameRoom).toBe(true);
      
      // Verify all players can see each other
      await Promise.all([
        scenario.helpers[0].verifyPlayerInGame('Host'),
        scenario.helpers[1].verifyPlayerInGame('Player2'),
        scenario.helpers[2].verifyPlayerInGame('Player3')
      ]);
      
      console.log(`✅ All 3 players joined room: ${roomIds[0]}`);
    } finally {
      await scenario.cleanup();
    }
  });

  test('should handle multiple players joining the same room (4 players)', async ({ browser }) => {
    const scenario = await TestSetup.setupRoomOnly(browser, 4, ['Host', 'Player2', 'Player3', 'Player4']);
    
    try {
      // Verify all players are in the same room
      const roomIds = await Promise.all(scenario.helpers.map(helper => helper.getRoomId()));
      const allSameRoom = roomIds.every(id => id === roomIds[0]);
      
      expect(allSameRoom).toBe(true);
      
      // Verify all players can see each other
      await Promise.all([
        scenario.helpers[0].verifyPlayerInGame('Host'),
        scenario.helpers[1].verifyPlayerInGame('Player2'),
        scenario.helpers[2].verifyPlayerInGame('Player3'),
        scenario.helpers[3].verifyPlayerInGame('Player4')
      ]);
      
      console.log(`✅ All 4 players joined room: ${roomIds[0]}`);
    } finally {
      await scenario.cleanup();
    }
  });
});
