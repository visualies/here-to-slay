/**
 * API client for communicating with the game server
 * All game mutations should go through these endpoints instead of direct Yjs manipulation
 */

const GAME_SERVER_URL = 'http://192.168.178.61:1234/api/game';

interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

interface GameActionRequest {
  playerId: string;
  roomId: string;
  cardId?: string;
  monsterId?: string;
  diceResult?: number;
}

class GameServerAPI {
  private async request<T>(endpoint: string, data?: unknown): Promise<T> {
    const url = `${GAME_SERVER_URL}${endpoint}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Game server API error (${endpoint}):`, error);
      throw error;
    }
  }

  // Game lifecycle
  async startGame(roomId: string): Promise<ApiResponse> {
    return this.request('/start', { roomId });
  }

  // Player management
  async updatePlayerPresence(roomId: string, playerId: string, playerName: string, playerColor: string): Promise<ApiResponse> {
    return this.request('/update-player-presence', { roomId, playerId, playerName, playerColor });
  }

  async addPlayerToGame(roomId: string, playerId: string): Promise<ApiResponse> {
    return this.request('/add-player-to-game', { roomId, playerId });
  }

  // Game actions
  async drawCard(roomId: string, playerId: string): Promise<ApiResponse> {
    return this.request('/draw-card', { roomId, playerId });
  }

  async playHeroToParty(roomId: string, playerId: string, cardId: string): Promise<ApiResponse> {
    return this.request('/play-hero-to-party', { roomId, playerId, cardId });
  }

  async attackMonster(roomId: string, playerId: string, monsterId: string, diceResult: number): Promise<ApiResponse> {
    return this.request('/attack-monster', { roomId, playerId, monsterId, diceResult });
  }

  async discardHandAndRedraw(roomId: string, playerId: string): Promise<ApiResponse> {
    return this.request('/discard-hand-redraw', { roomId, playerId });
  }

  // Utility
  async saveGameState(roomId: string): Promise<ApiResponse> {
    return this.request('/save', { roomId });
  }
}

export const gameServerAPI = new GameServerAPI();
export type { ApiResponse, GameActionRequest };