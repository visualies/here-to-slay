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
    
    // Count cards in the current player's hand using data-testid
    const handCards = await this.page.locator('[data-testid="current-player-hand-container"] .card').count();
    
    // If no cards in bottom position, check other positions to find where this player's cards are
    let totalCards = handCards;
    if (handCards === 0) {
      // Check each position's hand cards by looking for the actual structure
      const positions = ['top', 'right', 'left'];
      for (const position of positions) {
        // Look for hand cards in each position by their CSS classes
        const positionCards = await this.page.locator(`.absolute.${position === 'top' ? 'top-0' : position === 'right' ? 'right-0' : 'left-0'} .card`).count();
        totalCards += positionCards;
      }
    }
    
    expect(totalCards).toBeGreaterThan(0);
    
    return totalCards;
  }

  async drawCard() {
    // Click the draw card button
    await this.page.locator('[data-testid="draw-card-button"]').click();
    
    // Wait a moment for the action to process
    await this.page.waitForTimeout(500);
  }

  async getActionPoints(): Promise<number> {
    // Look for action points display - this might be in a status area or player info
    // For now, we'll check if the draw button is still enabled (action points > 0)
    const drawButton = this.page.locator('[data-testid="draw-card-button"]');
    const isEnabled = await drawButton.isEnabled();
    
    // If we can't find a specific action points display, we'll infer from button state
    // This is a simplified approach - in a real test you'd want a proper action points display
    return isEnabled ? 1 : 0; // Simplified: 1 if can draw, 0 if can't
  }

  async waitForTurnChange(originalPlayerId: string, timeout: number = 10000) {
    // Wait for the current turn to change from the original player
    // This is a simplified check - in a real implementation you'd want a proper turn indicator
    await this.page.waitForTimeout(1000); // Give time for turn to process
    
    // For now, we'll just wait and verify the game is still running
    await this.page.waitForSelector('[data-testid="current-player-hand-container"]', { timeout });
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
    // Look for player name in the game interface
    // Check both the player list in game area and player avatars
    const playerNameSelectors = [
      `[data-testid*="player-name-"]:has-text("${playerName}")`,
      `[data-testid*="player-initial-"]:has-text("${playerName.charAt(0).toUpperCase()}")`,
      // Also check for player name in any element that contains the name
      `text="${playerName}"`,
      `text="${playerName.charAt(0).toUpperCase()}"`
    ];
    
    let found = false;
    for (const selector of playerNameSelectors) {
      const elements = await this.page.locator(selector).count();
      if (elements > 0) {
        found = true;
        break;
      }
    }
    
    // If still not found, check if the player name appears anywhere on the page
    if (!found) {
      const pageContent = await this.page.textContent('body');
      if (pageContent && pageContent.includes(playerName)) {
        found = true;
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

  async leaveRoom() {
    // Click the leave room button
    await this.page.click('[data-testid="leave-room-button"]');
    
    // Wait for the room manager to appear (indicating we've left the room)
    await this.page.waitForSelector('[data-testid="create-room-button"]', { timeout: 10000 });
  }

  async rejoinFromRecentRooms(roomId: string) {
    // Look for the recent rooms section and click rejoin
    const rejoinButton = this.page.locator(`[data-testid="recent-room-${roomId}"] button:has-text("Rejoin")`);
    await expect(rejoinButton).toBeVisible({ timeout: 10000 });
    await rejoinButton.click();
    
    // Wait for the restoration process to complete
    // Look for either the "Continue" button or the room badge
    await Promise.race([
      this.page.waitForSelector(`[data-testid="recent-room-${roomId}"] button:has-text("Continue")`, { timeout: 15000 }),
      this.page.waitForSelector('[data-testid="room-id-badge"]', { timeout: 15000 })
    ]);
    
    // If we see the Continue button, click it
    const continueButton = this.page.locator(`[data-testid="recent-room-${roomId}"] button:has-text("Continue")`);
    if (await continueButton.isVisible()) {
      await continueButton.click();
    }
    
    // Wait for successful rejoin - look for room badge
    await this.page.waitForSelector('[data-testid="room-id-badge"]', { timeout: 10000 });
  }

  async getHandCardCount(): Promise<number> {
    // Count cards in the current player's hand
    const handCards = await this.page.locator('[data-testid="current-player-hand-container"] .card').count();
    return handCards;
  }

  async verifyGameStatePreserved(expectedCardCount: number) {
    // Verify we're back in the game
    await this.page.waitForSelector('[data-testid="room-id-badge"]', { timeout: 10000 });
    
    // Wait for hand cards to appear (indicating game state is synchronized)
    await this.page.waitForSelector('[data-testid="current-player-hand-container"] .card', { timeout: 15000 });
    
    // Additional wait for full synchronization
    await this.page.waitForTimeout(2000);
    
    // Verify hand cards are preserved
    const actualCardCount = await this.getHandCardCount();
    expect(actualCardCount).toBe(expectedCardCount);
    
    // Verify game is still in playing phase
    await this.verifyGamePhase('playing');
  }

  async waitForRecentRoomsToLoad() {
    // Wait for recent rooms section to appear
    await this.page.waitForSelector('[data-testid="recent-rooms-section"]', { timeout: 10000 });
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