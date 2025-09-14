/**
 * @file Game Server API
 * @description This file contains the GameServerAPI class, which is responsible for making API calls to the game server.
 * It is used by the game logic to perform actions such as starting a game, drawing a card, playing a hero, etc.
 * This file is used by the server-side game logic, not the client-side UI.
 * It is a singleton class, so there is only one instance of it in the application.
 */

interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

class GameServerAPI {
  private baseURL: string;

  constructor() {
    // In a test environment, the server runs on port 8234
    const port = process.env.NODE_ENV === 'test' ? 8234 : 1234;
    const host = process.env.NODE_ENV === 'test' ? 'localhost' : '192.168.178.61';
    this.baseURL = `http://${host}:${port}`;
  }

  private async request<T>(endpoint: string, method: string, data?: unknown): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for user authentication
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json() as ApiResponse<T>;
    } catch (error) {
      console.error(`Game server API error (${endpoint}):`, error);
      throw error;
    }
  }

  // Game lifecycle
  async startGame(roomId: string): Promise<ApiResponse> {
    return this.request(`/api/game/start`, 'POST', { roomId });
  }

  // Player management
  async updatePlayerPresence(roomId:string, playerId: string, playerName: string, playerColor: string): Promise<ApiResponse> {
    return this.request(`/api/game/update-player-presence`, 'POST', { roomId, playerId, playerName, playerColor });
  }

  async addPlayerToGame(roomId: string, playerId: string): Promise<ApiResponse> {
    return this.request(`/api/game/add-player-to-game`, 'POST', { roomId, playerId });
  }

  // Game actions
  async drawCard(roomId: string, playerId: string): Promise<ApiResponse> {
    return this.request(`/api/game/draw-card`, 'POST', { roomId, playerId });
  }

  async playHeroToParty(roomId: string, playerId: string, cardId: string): Promise<ApiResponse> {
    return this.request(`/api/game/play-hero-to-party`, 'POST', { roomId, playerId, cardId });
  }

  async attackMonster(roomId: string, playerId: string, monsterId: string, diceResult: number): Promise<ApiResponse> {
    return this.request(`/api/game/attack-monster`, 'POST', { roomId, playerId, monsterId, diceResult });
  }

  async discardHandAndRedraw(roomId: string, playerId: string): Promise<ApiResponse> {
    return this.request(`/api/game/discard-hand-redraw`, 'POST', { roomId, playerId });
  }

  // Utility
  async saveGameState(roomId: string): Promise<ApiResponse> {
    return this.request('/api/game/save', 'POST', { roomId });
  }

  // User management
  async getCurrentPlayer(): Promise<ApiResponse<{
    playerId: string;
    playerName: string;
    playerColor: string;
    lastSeen: string;
    createdAt: string;
  }>> {
    return this.request('/api/users/@me', 'GET');
  }

  async updateCurrentPlayer(playerName: string, playerColor?: string): Promise<ApiResponse<{
    playerId: string;
    playerName: string;
    playerColor: string;
    lastSeen: string;
    createdAt: string;
  }>> {
    return this.request('/api/users/@me', 'PUT', { playerName, playerColor });
  }

  async getRecentRooms(): Promise<ApiResponse<{
    playerId: string;
    recentRooms: Array<{
      room_id: string;
      joined_at: string;
      last_active: string;
      room_created_at: string;
    }>;
  }>> {
    return this.request('/api/users/@me/rooms', 'GET');
  }
}

export const gameServerAPI = new GameServerAPI();