import { useGameState } from './use-game-state';

export type PlayerPosition = 'top' | 'right' | 'bottom' | 'left';

export function usePlayerPosition(): {
  getPlayerPosition: (playerId: string) => PlayerPosition | null;
  getCurrentPlayerPosition: () => PlayerPosition;
  getOtherPlayerPositions: () => Array<{ playerId: string; position: PlayerPosition }>;
} {
  const { players, currentPlayer } = useGameState();
  
  const getPlayerPosition = (playerId: string): PlayerPosition | null => {
    if (!currentPlayer || players.length === 0) return null;
    
    // Current player is always at bottom
    if (playerId === currentPlayer.id) {
      return 'bottom';
    }
    
    // For other players, assign positions based on number of players
    const otherPlayers = players.filter(p => p.id !== currentPlayer.id);
    const playerIndex = otherPlayers.findIndex(p => p.id === playerId);
    
    if (playerIndex === -1) return null;
    
    // Position assignment based on number of players
    if (players.length === 2) {
      // 2 players: current player at bottom, other player at top
      return 'top';
    } else if (players.length === 3) {
      // 3 players: current player at bottom, others at top and right
      return playerIndex === 0 ? 'top' : 'right';
    } else if (players.length === 4) {
      // 4 players: current player at bottom, others at top, right, left
      const positions: PlayerPosition[] = ['top', 'right', 'left'];
      return positions[playerIndex] || null;
    }
    
    // Fallback for more than 4 players (shouldn't happen in this game)
    const positions: PlayerPosition[] = ['top', 'right', 'left'];
    return positions[playerIndex % 3] || null;
  };
  
  const getCurrentPlayerPosition = (): PlayerPosition => {
    return 'bottom';
  };
  
  const getOtherPlayerPositions = (): Array<{ playerId: string; position: PlayerPosition }> => {
    if (!currentPlayer) return [];
    
    const otherPlayers = players.filter(p => p.id !== currentPlayer.id);
    return otherPlayers.map(player => ({
      playerId: player.id,
      position: getPlayerPosition(player.id) || 'top'
    }));
  };
  
  return {
    getPlayerPosition,
    getCurrentPlayerPosition,
    getOtherPlayerPositions
  };
}
