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