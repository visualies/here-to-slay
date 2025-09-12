import { Page, expect } from '@playwright/test';

export class GameTestHelper {
  constructor(private page: Page) {}

  async createRoom(playerName: string = 'TestPlayer') {
    // Fill in player name
    await this.page.fill('[data-testid="create-player-name-input"]', playerName);
    
    // Click create room button
    await this.page.click('[data-testid="create-room-button"]');
    
    // After creating room, we're likely in a settings mode, look for Start Game button
    await this.page.waitForSelector('[data-testid="start-game-button"]', { timeout: 10000 });
    
    // Click Start Game to actually join the room
    await this.page.click('[data-testid="start-game-button"]');
    
    // Wait for room to be joined - look for room badge
    await this.page.waitForSelector('[data-testid="room-id-badge"]', { timeout: 10000 });
  }

  async joinRoom(roomId: string, playerName: string = 'TestPlayer2') {
    // Click "Join Existing Room" to switch to join mode
    await this.page.click('[data-testid="join-existing-room-button"]');
    
    // Fill in player name and room ID
    await this.page.fill('[data-testid="join-player-name-input"]', playerName);
    await this.page.fill('[data-testid="join-room-id-input"]', roomId);
    
    // Click join button
    await this.page.click('[data-testid="join-room-submit-button"]');
    
    // Wait for successful join
    await this.page.waitForSelector('[data-testid="room-id-badge"]', { timeout: 10000 });
  }

  async startGame() {
    // Look for "Start Round" button using data-testid
    const startRoundButton = this.page.locator('[data-testid="start-round-button"]');
    
    await expect(startRoundButton).toBeVisible({ timeout: 15000 });
    await startRoundButton.click();
    
    // Wait for the game to start - look for hand cards or game elements
    await this.page.waitForSelector('.card', { 
      timeout: 15000 
    });
  }

  async waitForHandCards(playerName?: string) {
    // Wait for hand cards to appear - look for cards with the .card class
    await this.page.waitForSelector('.card', { timeout: 10000 });
    
    // Verify cards are actually present
    const cards = await this.page.locator('.card').count();
    expect(cards).toBeGreaterThan(0);
    
    return cards;
  }

  async getRoomId(): Promise<string> {
    // Extract room ID from the data-testid element
    const roomElement = await this.page.locator('[data-testid="room-id-value"]');
    await expect(roomElement).toBeVisible();
    
    const roomId = await roomElement.textContent();
    
    if (!roomId) {
      throw new Error(`Could not extract room ID from element`);
    }
    
    return roomId.trim();
  }

  async verifyPlayerInGame(playerName: string) {
    // Look for player name in the game interface using data-testid
    // Check both the player list in game area and player avatars
    const playerNameSelectors = [
      `[data-testid*="player-name-"]:has-text("${playerName}")`,
      `[data-testid*="player-initial-"]:has-text("${playerName.charAt(0).toUpperCase()}")`
    ];
    
    let found = false;
    for (const selector of playerNameSelectors) {
      const elements = await this.page.locator(selector).count();
      if (elements > 0) {
        found = true;
        break;
      }
    }
    
    expect(found).toBeTruthy();
  }

  async verifyGamePhase(phase: 'waiting' | 'playing') {
    // This might need adjustment based on how game phase is displayed
    if (phase === 'playing') {
      // In playing phase, we should see game elements - look for cards or game board
      await expect(this.page.locator('.card').first()).toBeVisible({ timeout: 5000 });
    }
  }

  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `tests/e2e/screenshots/${name}.png`,
      fullPage: true 
    });
  }
}

export async function createMultiplePlayersInRoom(pages: Page[], roomId?: string) {
  const helpers = pages.map(page => new GameTestHelper(page));
  
  // First player creates room
  await helpers[0].createRoom(`Player1`);
  const finalRoomId = roomId || await helpers[0].getRoomId();
  
  // Other players join
  for (let i = 1; i < helpers.length; i++) {
    await helpers[i].joinRoom(finalRoomId, `Player${i + 1}`);
  }
  
  return { helpers, roomId: finalRoomId };
}