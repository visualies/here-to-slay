# Testing Guide

This document outlines the testing strategy and best practices for the Here to Slay game.

## Test Structure

The project uses Playwright for end-to-end testing with two main test categories:

- **UI Tests**: Test user interactions and visual elements
- **API Tests**: Test backend functionality and database operations

## Test Commands

```bash
# Run all tests (UI + API)
npm run test

# Run tests with HTML report (opens in browser)
npm run test:report

# Run only UI tests
npm run test:ui

# Run only API/database tests
npm run test:api

# Run specific test (hand cards)
npm run test:cards

# Run tests in debug mode
npm run test:debug

# Run tests headless (no browser window)
npm run test:headless

# Stop all development servers
npm run stop
```

## Testing Best Practices

### 1. Always Use `data-testid` Attributes

**✅ DO:**
```typescript
// Use data-testid for reliable element selection
await page.locator('[data-testid="start-round-button"]').click();
await page.locator('[data-testid="room-id-badge"]').toBeVisible();
```

**❌ DON'T:**
```typescript
// Avoid fragile text-based or CSS class selectors
await page.locator('button:has-text("Start Round")').click();
await page.locator('.room-badge').toBeVisible();
```

### 2. Why `data-testid` is Better

- **Stable**: Won't break when UI text or styling changes
- **Explicit**: Clearly indicates elements intended for testing
- **Reliable**: Not affected by CSS class changes or text updates
- **Maintainable**: Easy to find and update test selectors

### 3. Adding `data-testid` to Components

When creating or updating UI components, always add `data-testid` attributes to elements that tests need to interact with:

```tsx
// Button example
<button 
  data-testid="create-room-button"
  onClick={handleCreateRoom}
>
  Create Room
</button>

// Input example
<input 
  data-testid="player-name-input"
  placeholder="Enter your name"
  value={playerName}
  onChange={handleNameChange}
/>

// Container example
<div 
  data-testid="current-player-hand-container"
  className="hand-cards-container"
>
  {cards.map(card => <Card key={card.id} card={card} />)}
</div>
```

### 4. Test Helper Functions

Use the provided test helper functions for common operations:

```typescript
// Room management
await helper.createRoom('Player1');
await helper.joinRoom(roomId, 'Player2');
await helper.startGame();

// Verification
await helper.verifyPlayerInGame('Player1');
await helper.verifyGamePhase('playing');
const cardCount = await helper.waitForHandCards('Player1');
```

### 5. API Testing

For backend functionality, use the API helper:

```typescript
// Create API helper instance
const apiHelper = new ApiTestHelper();

// Test room creation
const roomData = await apiHelper.createRoom('Test Room');
await apiHelper.verifyRoomExists(roomData.roomId, 'Test Room');

// Test player joining
await apiHelper.joinRoom(roomId, playerId, 'PlayerName', '#FF6B6B');
await apiHelper.verifyPlayerCount(roomId, 1);
```

## Test Categories

### UI Tests (`tests/e2e/game-flow.spec.ts`, `tests/e2e/simple-game-flow.spec.ts`)

- Room creation and joining
- Game initialization
- Hand card dealing
- Player presence
- Game state management

### API Tests (`tests/e2e/database-api.spec.ts`)

- Room CRUD operations
- Player management
- Database persistence
- Error handling
- Capacity limits

## Debugging Tests

### Screenshots
Tests automatically take screenshots at key moments:
- `tests/e2e/screenshots/` directory
- Useful for debugging test failures

### Debug Mode
```bash
npm run test:debug
```
- Opens browser in debug mode
- Step through tests manually
- Inspect elements and state

### Console Logs
Tests include detailed console output:
- Step-by-step progress
- Verification results
- Error details

## Common Issues

### 1. Flaky Tests
- **Cause**: Using fragile selectors (text, CSS classes)
- **Solution**: Use `data-testid` attributes

### 2. Timeout Errors
- **Cause**: Elements not appearing in expected time
- **Solution**: Increase timeout or check element visibility

### 3. Element Not Found
- **Cause**: Wrong selector or element not rendered
- **Solution**: Verify `data-testid` exists and element is visible

## Adding New Tests

1. **Identify testable elements** in your component
2. **Add `data-testid` attributes** to those elements
3. **Create test file** or add to existing test
4. **Use helper functions** for common operations
5. **Verify with screenshots** and console logs

## Example: Adding a New UI Test

```typescript
test('should handle card playing', async ({ page }) => {
  const helper = new GameTestHelper(page);
  
  // Setup
  await helper.createRoom('Player1');
  await helper.startGame();
  
  // Test card playing
  await page.locator('[data-testid="playable-card"]').first().click();
  
  // Verify
  await expect(page.locator('[data-testid="played-card"]')).toBeVisible();
});
```

## Example: Adding a New API Test

```typescript
test('should handle card playing via API', async () => {
  const apiHelper = new ApiTestHelper();
  
  // Setup
  const roomData = await apiHelper.createRoom('Test Room');
  await apiHelper.joinRoom(roomData.roomId, 'player1', 'Player1', '#FF6B6B');
  
  // Test API call
  const response = await apiHelper.apiCall('/play-card', 'POST', {
    roomId: roomData.roomId,
    playerId: 'player1',
    cardId: 'card123'
  });
  
  // Verify
  expect(response.status).toBe(200);
});
```

Remember: **Always use `data-testid` attributes for reliable, maintainable tests!** 🎯
