import { Page, expect } from '@playwright/test';

export class GameTestHelper {
  constructor(private page: Page) {}

  async createRoom(playerName: string = 'TestPlayer') {
    // Fill in player name
    await this.page.fill('input[placeholder*="name"]', playerName);
    
    // Click create room button
    await this.page.click('button:has-text("Create Room")');
    
    // After creating room, we're likely in a settings mode, look for Start Game button
    await this.page.waitForSelector('button:has-text("Start Game")', { timeout: 10000 });
    
    // Click Start Game to actually join the room
    await this.page.click('button:has-text("Start Game")');
    
    // Wait for room to be joined - look for room badge or text
    await this.page.waitForSelector('text=/Room:.*/', { timeout: 10000 });
  }

  async joinRoom(roomId: string, playerName: string = 'TestPlayer2') {
    // Click "Join Room" to switch to join mode
    await this.page.click('button:has-text("Join Room")');
    
    // Fill in player name and room ID
    await this.page.fill('input[placeholder*="name"]', playerName);
    await this.page.fill('input[placeholder*="Room ID"]', roomId);
    
    // Click join button
    await this.page.click('button:has-text("Join"):not(:has-text("Room"))');
    
    // Wait for successful join
    await this.page.waitForSelector('text=/Room:.*/', { timeout: 10000 });
  }

  async startGame() {
    // Look for "Start Round" button in the center area or right panel 
    const startRoundButton = this.page.locator('button').filter({ 
      hasText: /Start Round|🎮 Start Round/i 
    }).first();
    
    await expect(startRoundButton).toBeVisible({ timeout: 15000 });
    await startRoundButton.click();
    
    // Wait for the game to start - look for hand cards or game elements
    await this.page.waitForSelector('[data-testid="hand-cards"], .hand-cards, [class*="hand"]', { 
      timeout: 15000 
    });
  }

  async waitForHandCards(playerName?: string) {
    // Wait for hand cards to appear - they might be in different selectors
    const handSelector = '[data-testid="hand-cards"], .hand-cards, [class*="hand"]';
    await this.page.waitForSelector(handSelector, { timeout: 10000 });
    
    // Verify cards are actually present
    const cards = await this.page.locator(handSelector + ' [class*="card"], [data-testid="card"]').count();
    expect(cards).toBeGreaterThan(0);
    
    return cards;
  }

  async getRoomId(): Promise<string> {
    // Extract room ID from the badge or text
    const roomElement = await this.page.locator('text=/Room:.*/').first();
    await expect(roomElement).toBeVisible();
    
    const roomText = await roomElement.textContent();
    const match = roomText?.match(/Room:\s*([A-Z0-9]+)/i);
    
    if (!match) {
      throw new Error(`Could not extract room ID from text: ${roomText}`);
    }
    
    return match[1];
  }

  async verifyPlayerInGame(playerName: string) {
    // Look for player name in the game interface
    await expect(this.page.locator(`text=${playerName}`)).toBeVisible({ timeout: 5000 });
  }

  async verifyGamePhase(phase: 'waiting' | 'playing') {
    // This might need adjustment based on how game phase is displayed
    if (phase === 'playing') {
      // In playing phase, we should see game elements
      await expect(this.page.locator('[data-testid="game-area"], .game-area')).toBeVisible({ timeout: 5000 });
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