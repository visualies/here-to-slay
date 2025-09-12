import { Page, Browser, BrowserContext } from '@playwright/test';
import { GameTestHelper } from './test-helpers';

export interface TestScenario {
  roomId: string;
  helpers: GameTestHelper[];
  pages: Page[];
  contexts: BrowserContext[];
  cleanup: () => Promise<void>;
}

export class TestSetup {
  /**
   * Setup a single player test scenario with room created and game started
   */
  static async setupSinglePlayerGame(page: Page, playerName: string = 'TestPlayer'): Promise<{
    helper: GameTestHelper;
    roomId: string;
  }> {
    const helper = new GameTestHelper(page);
    
    // Navigate to home page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Create room
    await helper.createRoom(playerName);
    const roomId = await helper.getRoomId();
    
    // Start game
    await helper.startGame();
    await page.waitForTimeout(2000);
    
    return { helper, roomId };
  }

  /**
   * Setup a multiplayer test scenario with room created, players joined, and game started
   */
  static async setupMultiplayerGame(
    browser: Browser, 
    playerCount: number, 
    playerNames?: string[]
  ): Promise<TestScenario> {
    const contexts: BrowserContext[] = [];
    const pages: Page[] = [];
    const helpers: GameTestHelper[] = [];
    
    try {
      // Create browser contexts and pages
      for (let i = 0; i < playerCount; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        contexts.push(context);
        pages.push(page);
        helpers.push(new GameTestHelper(page));
      }

      // Navigate all pages to home
      await Promise.all(pages.map(page => page.goto('/')));

      // Player 1 creates room
      const player1Name = playerNames?.[0] || 'Player1';
      await helpers[0].createRoom(player1Name);
      const roomId = await helpers[0].getRoomId();

      // Other players join the room
      for (let i = 1; i < playerCount; i++) {
        const playerName = playerNames?.[i] || `Player${i + 1}`;
        await helpers[i].joinRoom(roomId, playerName);
      }

      // Start the game
      await helpers[0].startGame();
      await pages[0].waitForTimeout(2000);

      // Verify all players are in the game
      for (let i = 0; i < playerCount; i++) {
        const playerName = playerNames?.[i] || `Player${i + 1}`;
        await helpers[i].verifyPlayerInGame(playerName);
      }

      return {
        roomId,
        helpers,
        pages,
        contexts,
        cleanup: async () => {
          for (const page of pages) {
            await page.close().catch(() => {});
          }
          for (const context of contexts) {
            await context.close().catch(() => {});
          }
        }
      };
    } catch (error) {
      // Cleanup on error
      for (const page of pages) {
        await page.close().catch(() => {});
      }
      for (const context of contexts) {
        await context.close().catch(() => {});
      }
      throw error;
    }
  }

  /**
   * Setup a room with players but don't start the game
   */
  static async setupRoomOnly(
    browser: Browser, 
    playerCount: number, 
    playerNames?: string[]
  ): Promise<TestScenario> {
    const contexts: BrowserContext[] = [];
    const pages: Page[] = [];
    const helpers: GameTestHelper[] = [];
    
    try {
      // Create browser contexts and pages
      for (let i = 0; i < playerCount; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        contexts.push(context);
        pages.push(page);
        helpers.push(new GameTestHelper(page));
      }

      // Navigate all pages to home
      await Promise.all(pages.map(page => page.goto('/')));

      // Player 1 creates room
      const player1Name = playerNames?.[0] || 'Player1';
      await helpers[0].createRoom(player1Name);
      const roomId = await helpers[0].getRoomId();

      // Other players join the room
      for (let i = 1; i < playerCount; i++) {
        const playerName = playerNames?.[i] || `Player${i + 1}`;
        await helpers[i].joinRoom(roomId, playerName);
      }

      return {
        roomId,
        helpers,
        pages,
        contexts,
        cleanup: async () => {
          for (const page of pages) {
            await page.close().catch(() => {});
          }
          for (const context of contexts) {
            await context.close().catch(() => {});
          }
        }
      };
    } catch (error) {
      // Cleanup on error
      for (const page of pages) {
        await page.close().catch(() => {});
      }
      for (const context of contexts) {
        await context.close().catch(() => {});
      }
      throw error;
    }
  }
}
