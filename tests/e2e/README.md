# Test Structure

This directory contains end-to-end tests organized by feature and infrastructure concerns.

## 📁 Directory Structure

```
tests/e2e/
├── features/                    # Feature-specific tests
│   ├── room-creation.spec.ts   # Room creation functionality
│   ├── room-joining.spec.ts    # Room joining functionality
│   ├── card-drawing.spec.ts    # Card drawing functionality
│   └── game-state-persistence.spec.ts # State persistence
├── infrastructure/             # Infrastructure tests
│   ├── database-api.spec.ts    # Database API tests
│   ├── websocket-connection.spec.ts # WebSocket tests
│   └── simple-game-flow.spec.ts # Basic UI flow tests
├── utils/                      # Test utilities
│   ├── test-setup.ts          # Setup utilities for common scenarios
│   ├── test-helpers.ts        # Page object helpers
│   ├── api-helpers.ts         # API testing helpers
│   └── multiplayer-test-helpers.ts # Legacy multiplayer helpers
├── game-flow.spec.ts          # Core game flow tests
└── run-feature-tests.js       # Feature test runner
```

## 🚀 Running Tests

### Feature Tests
```bash
# Run specific feature tests
npm run test:room-creation
npm run test:room-joining
npm run test:card-drawing
npm run test:game-state

# Run all feature tests
npm run test:features all-features
```

### Infrastructure Tests
```bash
# Run specific infrastructure tests
npm run test:api
npm run test:websocket
npm run test:simple

# Run all infrastructure tests
npm run test:infrastructure
```

### Interactive Test Runner
```bash
# List available test categories
npm run test:features

# Run specific category
npm run test:features card-drawing
npm run test:features infrastructure
```

## 🎯 Test Philosophy

### Feature-Based Organization
- **Features** test specific game functionality (room creation, card drawing, etc.)
- **Infrastructure** tests verify underlying systems (API, WebSocket, basic UI)
- **Multiplayer scenarios** are tested within each feature as needed

### Player Count Testing
Instead of separate test files for each player count, features include multiple player scenarios:
- Single player tests for basic functionality
- 2-player tests for multiplayer interactions
- 3-4 player tests for complex scenarios

### Setup Utilities
Common test scenarios are handled by `TestSetup` utilities:
- `setupSinglePlayerGame()` - Single player with game started
- `setupMultiplayerGame()` - Multiple players with game started
- `setupRoomOnly()` - Multiple players in room but game not started

## 📊 Performance

- Tests run with 4 parallel workers (configured in `playwright.config.ts`)
- Feature tests focus on specific functionality without repetitive setup
- Shared setup utilities reduce test execution time
- Easy to run only the tests you need for debugging

## 🔧 Adding New Tests

1. **For new features**: Add to `features/` directory
2. **For infrastructure**: Add to `infrastructure/` directory
3. **Use setup utilities**: Leverage `TestSetup` for common scenarios
4. **Include multiplayer variants**: Add 2-4 player tests as needed
5. **Update package.json**: Add new test scripts if needed