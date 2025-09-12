/**
 * Game state persistence utilities
 * Handles saving and loading game state from the server
 */

export async function saveGameState(roomId: string): Promise<void> {
  try {
    const response = await fetch('/api/game/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ roomId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save game state');
    }

    console.log(`💾 Game state saved for room ${roomId}`);
  } catch (error) {
    console.error('Error saving game state:', error);
    // Don't throw - game state saving should be non-blocking
  }
}