import { expect, APIRequestContext } from '@playwright/test'

// Test helper functions
export async function createRoom(request: APIRequestContext, roomData: Record<string, unknown> = {}) {
  const response = await request.post('/api/create-room', { data: roomData })
  expect(response.status()).toBe(200)
  return await response.json()
}

export async function joinRoom(request: APIRequestContext, roomId: string, playerData: Record<string, unknown>) {
  const response = await request.post('/api/join-room', {
    data: { roomId, ...playerData }
  })
  expect(response.status()).toBe(200)
  return await response.json()
}

export async function getRoomInfo(request: APIRequestContext, roomId: string) {
  const response = await request.get(`/api/room/${roomId}`)
  expect(response.status()).toBe(200)
  return await response.json()
}

export async function verifyYjsState(request: APIRequestContext, roomId: string) {
  // Verify room state via the /room endpoint
  const roomResponse = await request.get(`/api/room/${roomId}`)
  expect(roomResponse.status()).toBe(200)

  const roomData = await roomResponse.json()
  expect(roomData.id).toBe(roomId)
  expect(roomData).toHaveProperty('name')
}
