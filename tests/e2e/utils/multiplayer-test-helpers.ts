import { Browser, BrowserContext, Page } from '@playwright/test';
import { GameTestHelper } from './test-helpers';

export class MultiplayerTestHelper {
  private browser: Browser;
  private contexts: BrowserContext[] = [];
  private pages: Page[] = [];
  private helpers: GameTestHelper[] = [];

  constructor(browser: Browser) {
    this.browser = browser;
  }

  async setupPlayers(playerCount: number, playerNames?: string[]): Promise<{
    helpers: GameTestHelper[];
    roomId: string;
  }> {
    console.log(`🎮 Setting up ${playerCount} players...`);
    
    // Create contexts and pages
    this.contexts = await Promise.all(
      Array.from({ length: playerCount }, () => this.browser.newContext())
    );
    
    this.pages = await Promise.all(
      this.contexts.map(context => context.newPage())
    );

    console.log(`🎮 Created ${this.pages.length} pages, navigating to home...`);

    // Navigate all players to the home page
    try {
      await Promise.all(this.pages.map(page => page.goto('/', { timeout: 60000 })));
      console.log('✅ All players navigated to home page');
    } catch (error) {
      console.error('❌ Failed to navigate to home page:', error);
      throw error;
    }

    // Create helpers
    this.helpers = this.pages.map(page => new GameTestHelper(page));

    // Default player names if not provided
    const names = playerNames || Array.from({ length: playerCount }, (_, i) => `Player${i + 1}`);

    // First player creates room
    console.log(`🎮 Player 1 creating room...`);
    await this.helpers[0].createRoom(names[0]);
    const roomId = await this.helpers[0].getRoomId();
    console.log(`✅ Room created: ${roomId}`);

    // Other players join
    for (let i = 1; i < playerCount; i++) {
      console.log(`🎮 Player ${i + 1} joining room...`);
      await this.helpers[i].joinRoom(roomId, names[i]);
    }

    console.log(`✅ All ${playerCount} players set up successfully`);
    return { helpers: this.helpers, roomId };
  }

  async startGame(hostIndex: number = 0): Promise<void> {
    await this.helpers[hostIndex].startGame();
    // Wait for game state to synchronize across all players
    await Promise.all(this.pages.map(page => page.waitForTimeout(2000)));
  }

  async verifyAllPlayersInGame(playerNames: string[]): Promise<void> {
    await Promise.all(
      this.helpers.map((helper, index) => 
        helper.verifyPlayerInGame(playerNames[index])
      )
    );
  }

  async verifyAllPlayersHaveHandCards(expectedCardCount: number = 5): Promise<number[]> {
    const cardCounts = await Promise.all(
      this.helpers.map(helper => helper.waitForHandCards())
    );
    
    cardCounts.forEach((count, index) => {
      expect(count).toBe(expectedCardCount);
    });
    
    return cardCounts;
  }

  async takeScreenshots(prefix: string): Promise<void> {
    await Promise.all(
      this.helpers.map((helper, index) => 
        helper.takeScreenshot(`${prefix}-player${index + 1}`)
      )
    );
  }

  async cleanup(): Promise<void> {
    // Close all pages and contexts
    for (const page of this.pages) {
      await page.close().catch(() => {});
    }
    for (const context of this.contexts) {
      await context.close().catch(() => {});
    }
    
    // Reset arrays
    this.pages = [];
    this.contexts = [];
    this.helpers = [];
  }

  // Get specific player helper
  getPlayerHelper(index: number): GameTestHelper {
    return this.helpers[index];
  }

  // Get all helpers
  getAllHelpers(): GameTestHelper[] {
    return this.helpers;
  }
}

// Utility function for common multiplayer test patterns
export async function runMultiplayerTest(
  browser: Browser,
  playerCount: number,
  testFn: (helper: MultiplayerTestHelper) => Promise<void>,
  playerNames?: string[]
): Promise<void> {
  const multiplayerHelper = new MultiplayerTestHelper(browser);
  
  try {
    await multiplayerHelper.setupPlayers(playerCount, playerNames);
    await testFn(multiplayerHelper);
  } finally {
    await multiplayerHelper.cleanup();
  }
}
