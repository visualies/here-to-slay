import { expect } from '@playwright/test';

export class ApiTestHelper {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:1234/api') {
    this.baseUrl = baseUrl;
  }

  // Generic API call method
  async apiCall(endpoint: string, method: 'GET' | 'POST' = 'GET', body?: any) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    
    const data = await response.json();
    return { status: response.status, data };
  }

  // Room management methods
  async createRoom(name: string = 'Test Room', maxPlayers: number = 4) {
    const { status, data } = await this.apiCall('/create-room', 'POST', { name, maxPlayers });
    
    expect(status).toBe(200);
    expect(data).toHaveProperty('roomId');
    expect(data).toHaveProperty('name', name);
    expect(data.roomId).toMatch(/^[A-Z0-9]{4,8}$/);
    
    return data;
  }

  async joinRoom(roomId: string, playerId: string, playerName: string, playerColor: string) {
    const { status, data } = await this.apiCall('/join-room', 'POST', {
      roomId,
      playerId,
      playerName,
      playerColor
    });
    
    expect(status).toBe(200);
    expect(data).toHaveProperty('success', true);
    
    return data;
  }

  async getRoomInfo(roomId: string) {
    const { status, data } = await this.apiCall(`/room-info?id=${roomId}`);
    
    expect(status).toBe(200);
    expect(data).toHaveProperty('id', roomId);
    
    return data;
  }

  async getActiveRooms() {
    const { status, data } = await this.apiCall('/active-rooms');
    
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    
    return data;
  }

  // Error handling methods
  async expectRoomNotFound(roomId: string) {
    const { status, data } = await this.apiCall(`/room-info?id=${roomId}`);
    
    expect(status).toBe(404);
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('Room not found');
  }

  async expectJoinToFail(roomId: string, playerId: string, playerName: string, playerColor: string) {
    const { status, data } = await this.apiCall('/join-room', 'POST', {
      roomId,
      playerId,
      playerName,
      playerColor
    });
    
    expect(status).toBe(400);
    expect(data).toHaveProperty('error');
    
    return data;
  }

  // Utility methods
  generatePlayerId(prefix: string = 'player'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  generatePlayerColor(): string {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // Database verification methods
  async verifyRoomExists(roomId: string, expectedName?: string) {
    const roomInfo = await this.getRoomInfo(roomId);
    
    expect(roomInfo.id).toBe(roomId);
    if (expectedName) {
      expect(roomInfo.name).toBe(expectedName);
    }
    
    return roomInfo;
  }

  async verifyPlayerCount(roomId: string, expectedCount: number) {
    const roomInfo = await this.getRoomInfo(roomId);
    expect(roomInfo.player_count).toBe(expectedCount);
    return roomInfo;
  }

  async verifyRoomInActiveList(roomId: string) {
    const activeRooms = await this.getActiveRooms();
    const roomIds = activeRooms.map((room: any) => room.id);
    expect(roomIds).toContain(roomId);
    return activeRooms;
  }

  // Cleanup methods
  async cleanupTestRooms(roomIds: string[]) {
    // Note: This would require a cleanup endpoint in your API
    // For now, we'll just log the rooms that were created
    console.log(`🧹 Test cleanup: ${roomIds.length} rooms created during test`);
  }
}
