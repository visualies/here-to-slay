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
      let errorMessage = 'Failed to save game state';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch (parseError) {
        // If response isn't valid JSON, use the status text
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    // Parse success response
    try {
      const result = await response.json();
      console.log(`💾 Game state saved for room ${roomId}`, result);
    } catch (parseError) {
      // Even if we can't parse the success response, the save likely worked
      console.log(`💾 Game state saved for room ${roomId} (response not parseable as JSON)`);
    }
  } catch (error) {
    console.error('Error saving game state:', error);
    // Don't throw - game state saving should be non-blocking
  }
}