# Playwright UI Navigation Notes

## Overview
This document contains notes on navigating the Here-to-Slay game UI using Playwright tools for testing and automation.

## Getting Started
1. Start the dev server: `npm run dev` (user must do this manually)
2. Navigate to the game URL (typically `http://localhost:3000`)
3. Use Playwright tools to interact with the UI

## Key UI Elements and Navigation

### Room Creation and Joining
- **Create Room**: Look for room creation form or button
- **Join Room**: Look for room joining form with room ID input
- **Player Setup**: Player name and color selection

### Game State Elements
- **Hand Cards**: Player's current hand of cards
- **Party Area**: Where played cards are placed
- **Action Queue**: Shows pending actions that require user input
- **Game Status**: Current game state and waiting messages

### Action Input Elements
- **Target Selection**: When actions require target selection
- **Choice Dialogs**: When actions present multiple options
- **Input Prompts**: Text inputs for specific values

## Testing Timeout Functionality

### What to Test
1. **Action Timeout**: Play a card that requires user input and let it timeout
2. **Callback Execution**: Verify that timeout callbacks are called with empty input
3. **Queue Cleanup**: Ensure timed-out actions are removed from the queue
4. **UI State**: Check that the UI properly reflects the timeout state

### Expected Behavior
- Actions that timeout should call their callback with empty input
- Timed-out actions should be removed from the action queue
- The game should continue processing other actions
- UI should show appropriate timeout messages

### Current UI State
- **Game Phase**: "playing" 
- **Action Queue**: Contains 9 actions (visible in console logs)
- **Player Turn**: Active with 3 action points
- **Cards Available**: 4 cards in hand (Buttons, Peanut, Napping Nibbles, Draw Card)
- **Dice Result**: 6 (3+3)

### Console Logs to Monitor
- Look for timeout-related messages like "⏱️ Action X timed out, calling callback with empty input"
- Check for "⏱️ Calling timeout callback for action X" messages
- Monitor action queue updates in the game state logs

## Data Attributes for Testing
The following data attributes are available for easier testing:

### Game State Elements
- `data-testid="room-id-badge"` - Room ID display
- `data-testid="room-id-value"` - Room ID value
- `data-testid="debug-menu-button"` - Debug menu toggle
- `data-testid="leave-room-button"` - Leave room button

### Status and Action Elements
- `data-testid="status-area"` - Status area container
- `data-testid="status-header"` - Status message header
- `data-testid="status-message"` - Status message container
- `data-testid="status-message-text"` - Status message text
- `data-testid="status-message-icon"` - Status message icon
- `data-testid="draw-card-action-bubble"` - Draw card action bubble
- `data-testid="capture-modifier-action-bubble"` - Capture modifier action bubble
- `data-testid="capture-challenge-action-bubble"` - Capture challenge action bubble

### Card Elements
- `data-testid="hand-card-{cardId}"` - Individual hand cards
- `data-card-type="{type}"` - Card type (Hero, System, etc.)
- `data-card-name="{name}"` - Card name

### Player Elements
- `data-testid="player-{playerId}"` - Player containers
- `data-testid="player-name-{playerId}"` - Player names

## Common Test Patterns
1. **Setup**: Create room, join players, start game
2. **Trigger**: Play a card that requires user input
3. **Wait**: Let the action timeout (or simulate timeout)
4. **Verify**: Check that callback was called and queue is cleaned up
5. **Cleanup**: Reset state for next test

## Notes
- Always check console logs for timeout callback execution
- Verify that the game state is consistent after timeouts
- Test with different types of actions that require user input
- Ensure the UI properly handles timeout states
