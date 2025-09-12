# End-to-End Testing with Playwright

This directory contains Playwright end-to-end tests for the Here to Slay multiplayer card game.

## Setup

Playwright has been configured to automatically start the required servers:

- **Room Server**: `servers/room-server/server.ts` (Port 1234)
- **Dice Server**: `servers/dice-server/dice-server.ts` (Port 1235) 
- **Next.js Client**: `next dev` (Port 3000)

## Test Structure

### `tests/e2e/`
- `game-flow.spec.ts` - Full multiplayer game flow tests (room creation, joining, starting rounds, hand card verification)
- `simple-game-flow.spec.ts` - Basic single-player tests and UI verification
- `utils/test-helpers.ts` - Reusable test utilities and helper classes
- `screenshots/` - Test artifacts and failure screenshots

## Running Tests

### All E2E Tests
```bash
npm run test:e2e
```

### Interactive UI Mode
```bash
npm run test:e2e:ui
```

### Debug Mode
```bash
npm run test:e2e:debug
```

### Specific Test Files
```bash
npx playwright test tests/e2e/simple-game-flow.spec.ts
npx playwright test tests/e2e/game-flow.spec.ts
```

### Browser Specific
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Test Coverage

### ✅ Working Tests

1. **Room Creation & UI Verification**
   - Creates a room with player name
   - Verifies room ID generation and display
   - Checks for basic game UI elements
   - Tests Start Round button functionality

2. **Single Player Game Flow**
   - Room creation process
   - Game initialization
   - UI state verification

### 🔄 Future Test Enhancements

1. **Multiplayer Game Flow** (partial implementation)
   - Two-player room joining 
   - Synchronized game start
   - Hand card verification across players
   - Turn-based gameplay verification

2. **Game Mechanics Testing**
   - Card playing mechanics
   - Dice rolling integration
   - Game state synchronization
   - Win/lose conditions

## Key Test Features

### Automated Server Management
Tests automatically start all required servers before running and clean them up afterward.

### Cross-Browser Testing
Configured for Chromium, Firefox, and WebKit testing.

### Screenshot Artifacts
Test failures automatically capture screenshots for debugging.

### Custom Test Helpers
`GameTestHelper` class provides reusable methods:
- `createRoom(playerName)` - Creates and joins a room
- `joinRoom(roomId, playerName)` - Joins existing room
- `startGame()` - Starts a game round
- `waitForHandCards()` - Verifies hand cards are dealt
- `getRoomId()` - Extracts room ID from UI

## Current Test Results

✅ **Basic room creation and game start flow working**
- Successfully creates rooms
- Finds and clicks Start Round button
- Verifies game UI elements
- Handles single-player scenarios

## Configuration

Key configuration in `playwright.config.ts`:
- Automatic server startup
- Audio policy handling (prevents browser autoplay issues)
- Cross-browser compatibility
- Screenshot on failure
- HTML reporting

## Debugging

1. **UI Mode**: Run `npm run test:e2e:ui` for interactive debugging
2. **Screenshots**: Check `test-results/` for failure screenshots
3. **HTML Reports**: View detailed results with `npx playwright show-report`
4. **Headed Mode**: Add `--headed` flag to see browser during tests

## Notes

- Tests handle the game's audio autoplay policy
- Server startup may take a few seconds on first run
- Some tests require multiple players - currently testing single-player flows
- Room codes are dynamically generated and verified during tests