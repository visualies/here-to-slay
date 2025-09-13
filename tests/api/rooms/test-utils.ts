import { test, expect, APIRequestContext } from '@playwright/test'

// Test helper functions
export async function createRoom(request: APIRequestContext, roomData: any = {}) {
  const response = await request.post('/api/create-room', { data: roomData })
  expect(response.status()).toBe(200)
  return await response.json()
}

export async function joinRoom(request: APIRequestContext, roomId: string, playerData: any) {
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
  // Verify Yjs document state (document should exist automatically after room creation)
  const debugResponse = await request.get('/api/game/debug')
  expect(debugResponse.status()).toBe(200)

  const debugData = await debugResponse.json()
  expect(debugData.roomIds).toContain(roomId)

  const roomDoc = debugData.docs.find((doc: any) => doc.id === roomId)
  expect(roomDoc).toBeDefined()
  expect(roomDoc.stateSize).toBeGreaterThanOrEqual(0)
}
