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

## Testing Room Action Server Actions

The room action server contains various game actions that can be tested. Each action follows a consistent pattern and should be thoroughly tested.

### Available Actions

The following actions are available in the room action server:

- **`drawCard`** - Move cards between locations (hand, deck, etc.)
- **`captureDice`** - Capture dice from other players
- **`captureModifier`** - Capture modifiers from other players  
- **`captureChallenge`** - Capture challenge cards
- **`discardCard`** - Discard cards from hand
- **`deductPoint`** - Deduct action points from current player
- **`stealCard`** - Steal cards from other players
- **`destroyCard`** - Destroy cards in play
- **`sacrificeCard`** - Sacrifice own cards
- **`placeCard`** - Place cards in play areas
- **`playCard`** - Play cards (general action)
- **`endTurn`** - End current player's turn
- **`endMove`** - End current move/action
- **`pickCard`** - Pick/select cards

### Standard Action Test Structure

Every action test should follow this consistent structure:

```typescript
import { test, expect } from '@playwright/test'

test.describe('API: [ActionName] Action', () => {
  let roomId: string
  let playerId: string
  let testCardId: string

  test.beforeEach(async ({ request }) => {
    // 1. Create room
    const createResponse = await request.post('/api/create-room', {
      data: { name: '[ActionName] Test Room', maxPlayers: 4 }
    })
    const createBody = await createResponse.json()
    roomId = createBody.roomId

    // 2. Add player
    playerId = 'test-player-1'
    const joinResponse = await request.post('/api/join-room', {
      data: {
        roomId,
        playerId,
        playerName: 'Test Player',
        playerColor: 'red'
      }
    })
    expect(joinResponse.status()).toBe(200)

    // 3. Start game
    const startResponse = await request.post('/api/game/start', {
      data: { roomId }
    })
    expect(startResponse.status()).toBe(200)
  })

  test.afterEach(async ({ request }) => {
    // Clean up test card
    if (testCardId) {
      await request.delete(`/api/cards/test-card/${testCardId}`)
    }
  })

  // Test cases go here...
})
```

### Action Test Categories

For each action, you should test these categories:

#### 1. **Basic Functionality Tests**
- Test the action with default parameters
- Test the action with different parameter values

#### 2. **Parameter Validation Tests**
- Test with valid parameter combinations
- Test with invalid parameter combinations
- Test with missing required parameters
- Test with edge case values (0, negative numbers, etc.)

#### 3. **Game State Tests**
- Test action effects on game state
- Test action effects on player state
- Test action effects on other players
- Test action effects on turn progression

#### 4. **Error Scenario Tests**
- Test when action is not allowed (wrong turn, insufficient resources, etc.)
- Test when parameters are invalid
- Test when game state doesn't support the action
- Test when required conditions aren't met

#### 5. **Edge Case Tests**
- Test with minimum/maximum values
- Test with empty collections
- Test with single vs multiple players
- Test circular operations (e.g., hand to hand)

### Parameter Testing Patterns

#### Testing Location Parameters
```typescript
// Test all valid source locations
const validSources = ['support-deck', 'own-hand', 'other-hands']
const validDestinations = ['own-hand', 'support-deck']

for (const source of validSources) {
  for (const destination of validDestinations) {
    test(`should work with ${source} → ${destination}`, async ({ request }) => {
      // Test implementation
    })
  }
}

// Test invalid locations
const invalidLocations = ['cache', 'discard-pile', 'invalid-location']
for (const location of invalidLocations) {
  test(`should fail with invalid location: ${location}`, async ({ request }) => {
    // Test implementation
  })
}
```

#### Testing Amount Parameters
```typescript
// Test different amount values
const amounts = ['0', '1', '2', '5', 'all']
for (const amount of amounts) {
  test(`should work with amount: ${amount}`, async ({ request }) => {
    // Test implementation
  })
}

// Test edge cases
test('should fail with negative amount', async ({ request }) => {
  // Test implementation
})

test('should fail with amount exceeding available resources', async ({ request }) => {
  // Test implementation
})
```

### Common Test Patterns

#### 1. **State Verification Pattern**
```typescript
test('should modify game state correctly', async ({ request }) => {
  // 1. Get initial state
  const initialRoomResponse = await request.get(`/api/room/${roomId}`)
  const initialRoomData = await initialRoomResponse.json()
  const initialPlayer = initialRoomData.players[playerId]
  
  // 2. Perform action
  const actionResponse = await request.post('/api/game/play-card', {
    data: { roomId, playerId, cardId: testCardId }
  })
  expect(actionResponse.status()).toBe(200)
  
  // 3. Verify final state
  const finalRoomResponse = await request.get(`/api/room/${roomId}`)
  const finalRoomData = await finalRoomResponse.json()
  const finalPlayer = finalRoomData.players[playerId]
  
  // Assert expected changes
  expect(finalPlayer.hand.length).toBe(initialPlayer.hand.length + 1)
})
```

#### 2. **Multi-Player Test Pattern**
```typescript
test('should work with multiple players', async ({ request }) => {
  // Add second player
  const player2Id = 'test-player-2'
  await request.post('/api/join-room', {
    data: {
      roomId,
      playerId: player2Id,
      playerName: 'Player 2',
      playerColor: 'blue'
    }
  })
  
  // Add player to game
  await request.post('/api/game/add-player-to-game', {
    data: { roomId, playerId: player2Id }
  })
  
  // Test action affects both players
  // ... test implementation
})
```

#### 3. **Error Handling Pattern**
```typescript
test('should fail with appropriate error message', async ({ request }) => {
  const response = await request.post('/api/game/play-card', {
    data: { roomId, playerId, cardId: testCardId }
  })
  
  expect(response.status()).toBe(400)
  const responseBody = await response.json()
  expect(responseBody.success).toBe(false)
  expect(responseBody.message).toContain('Expected error message')
})
```

### Test File Organization

Create separate test files for each action:
```
tests/api/actions/
├── draw-card-action.test.ts
├── deduct-point-action.test.ts
├── capture-dice-action.test.ts
├── capture-modifier-action.test.ts
├── capture-challenge-action.test.ts
├── discard-card-action.test.ts
├── steal-card-action.test.ts
├── destroy-card-action.test.ts
├── sacrifice-card-action.test.ts
├── place-card-action.test.ts
├── play-card-action.test.ts
├── end-turn-action.test.ts
├── end-move-action.test.ts
└── pick-card-action.test.ts
```

### Running Action Tests

```bash
# Run all action tests
npm run test:api -- --grep "Action"

# Run specific action test
npm run test:api -- --grep "drawCard"

# Run with verbose output
npm run test:api -- --grep "Action" --reporter=line

# Run all API tests (includes action tests)
npm run test:api

# Run tests with HTML report
npm run test:report
```

Remember: **Always use `data-testid` attributes for reliable, maintainable tests!** 🎯
