import { test, expect } from '@playwright/test';
import { TestSetup } from '../utils/test-setup';

test.describe('Card Drawing Features', () => {
  test('should draw cards and update hand count correctly', async ({ page }) => {
    const { helper } = await TestSetup.setupSinglePlayerGame(page, 'CardDrawer');
    
    // Verify initial hand cards (5)
    const initialHandCards = await helper.waitForHandCards('CardDrawer');
    expect(initialHandCards).toBe(5);
    console.log(`✅ Initial hand: ${initialHandCards} cards`);

    // Draw first card
    await helper.drawCard();
    const handAfterFirstDraw = await helper.waitForHandCards('CardDrawer');
    expect(handAfterFirstDraw).toBe(6);
    console.log(`✅ After 1st draw: ${handAfterFirstDraw} cards`);

    // Draw second card
    await helper.drawCard();
    const handAfterSecondDraw = await helper.waitForHandCards('CardDrawer');
    expect(handAfterSecondDraw).toBe(7);
    console.log(`✅ After 2nd draw: ${handAfterSecondDraw} cards`);

    // Draw third card
    await helper.drawCard();
    const handAfterThirdDraw = await helper.waitForHandCards('CardDrawer');
    expect(handAfterThirdDraw).toBe(8);
    console.log(`✅ After 3rd draw: ${handAfterThirdDraw} cards`);

    console.log('🎉 Card drawing test completed successfully!');
  });

  test('should handle multiple consecutive card draws', async ({ page }) => {
    const { helper } = await TestSetup.setupSinglePlayerGame(page, 'MultiDrawer');
    
    // Draw 5 cards in a row
    for (let i = 1; i <= 5; i++) {
      await helper.drawCard();
      const handCount = await helper.waitForHandCards('MultiDrawer');
      expect(handCount).toBe(5 + i);
      console.log(`✅ After ${i} draws: ${handCount} cards`);
    }

    console.log('🎉 Multiple card draws test completed!');
  });

  test('should maintain hand cards across multiple players (2 players)', async ({ browser }) => {
    const scenario = await TestSetup.setupMultiplayerGame(browser, 2, ['Player1', 'Player2']);
    
    try {
      // Verify both players start with 5 cards
      const [player1Initial, player2Initial] = await Promise.all([
        scenario.helpers[0].waitForHandCards('Player1'),
        scenario.helpers[1].waitForHandCards('Player2')
      ]);
      expect(player1Initial).toBe(5);
      expect(player2Initial).toBe(5);
      
      // Player 1 draws a card
      await scenario.helpers[0].drawCard();
      const player1Cards = await scenario.helpers[0].getHandCardCount();
      expect(player1Cards).toBe(6);
      
      // Player 2 should still have 5 cards (other players don't see the draw)
      const player2Cards = await scenario.helpers[1].getHandCardCount();
      expect(player2Cards).toBe(5);
      
      // Player 2 draws a card
      await scenario.helpers[1].drawCard();
      const player2CardsAfter = await scenario.helpers[1].getHandCardCount();
      expect(player2CardsAfter).toBe(6);
      
      console.log('✅ Card drawing works correctly in 2-player game');
    } finally {
      await scenario.cleanup();
    }
  });

  test('should maintain hand cards across multiple players (3 players)', async ({ browser }) => {
    const scenario = await TestSetup.setupMultiplayerGame(browser, 3, ['Player1', 'Player2', 'Player3']);
    
    try {
      // Verify all players start with 5 cards
      const cardCounts = await Promise.all([
        scenario.helpers[0].waitForHandCards('Player1'),
        scenario.helpers[1].waitForHandCards('Player2'),
        scenario.helpers[2].waitForHandCards('Player3')
      ]);
      expect(cardCounts.every(count => count === 5)).toBe(true);
      
      // Each player draws a card
      for (let i = 0; i < 3; i++) {
        await scenario.helpers[i].drawCard();
        const cardCount = await scenario.helpers[i].getHandCardCount();
        expect(cardCount).toBe(6);
      }
      
      console.log('✅ Card drawing works correctly in 3-player game');
    } finally {
      await scenario.cleanup();
    }
  });

  test('should maintain hand cards across multiple players (4 players)', async ({ browser }) => {
    const scenario = await TestSetup.setupMultiplayerGame(browser, 4, ['Player1', 'Player2', 'Player3', 'Player4']);
    
    try {
      // Verify all players start with 5 cards
      const cardCounts = await Promise.all([
        scenario.helpers[0].waitForHandCards('Player1'),
        scenario.helpers[1].waitForHandCards('Player2'),
        scenario.helpers[2].waitForHandCards('Player3'),
        scenario.helpers[3].waitForHandCards('Player4')
      ]);
      expect(cardCounts.every(count => count === 5)).toBe(true);
      
      // Each player draws a card
      for (let i = 0; i < 4; i++) {
        await scenario.helpers[i].drawCard();
        const cardCount = await scenario.helpers[i].getHandCardCount();
        expect(cardCount).toBe(6);
      }
      
      console.log('✅ Card drawing works correctly in 4-player game');
    } finally {
      await scenario.cleanup();
    }
  });
});
