# Testing Structure

This project uses **Playwright** for testing with a organized structure separating UI and API tests by feature.

## Structure

```
tests/
├── api/           # API endpoint tests
│   └── rooms/     # Room-related API tests
└── ui/            # UI component and integration tests
    └── components/# Component tests
```

## Test Categories

### API Tests
- Located in `tests/api/`
- Test server endpoints directly
- Use Playwright's request API for HTTP calls
- Server runs on `http://192.168.178.61:1234`

### UI Tests
- Located in `tests/ui/`
- Test browser interactions and components
- Use Playwright's browser automation
- Client runs on `http://localhost:3000`

## Running Tests

```bash
# Run all tests
npm test

# Run only API tests
npm run test:api

# Run only UI tests
npm run test:ui

# Run tests with browser UI visible
npm run test:headed

# Debug tests step by step
npm run test:debug
```

## Current Tests

### API - Rooms (`tests/api/rooms/rooms.test.ts`)
- Room creation with default and custom parameters
- Player joining rooms
- Room capacity limits
- Room information retrieval
- Active rooms listing
- Full integration workflow

Tests cover the complete room management API including error cases and edge conditions.

## Testing Principles

### State Mutation Verification
**CRITICAL**: All tests that mutate game state must verify that BOTH data stores are properly updated:

1. **Database** - SQLite persistence layer
2. **Yjs Document** - Real-time collaborative state

#### Why Both Matter:
- **Database**: Persists room/player data across server restarts
- **Yjs Document**: Enables real-time multiplayer synchronization

#### Testing Pattern:
For any API that mutates state:
```typescript
// 1. Perform the action
const response = await request.post('/api/some-action', { data })

// 2. Verify HTTP response
expect(response.status()).toBe(200)

// 3. Verify database state (via API)
const roomInfo = await request.get(`/api/room-info?id=${roomId}`)
expect(roomInfo).toMatchObject(expectedData)

// 4. Verify Yjs document state
const debugResponse = await request.get('/api/game/debug')
const debugData = await debugResponse.json()
expect(debugData.roomIds).toContain(roomId)
```

#### Required for:
- ✅ Room creation
- ✅ Player joining/leaving
- ✅ Game state changes (turns, cards, dice)
- ✅ Action chains
- ✅ Player presence updates

This ensures complete data integrity across both persistence and real-time layers.