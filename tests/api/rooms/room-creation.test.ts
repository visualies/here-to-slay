import { test, expect } from '@playwright/test'
import { createRoom, getRoomInfo, verifyYjsState } from './test-utils'

test.describe('Room Creation', () => {
  test('should create room with default values', async ({ request }) => {
    const room = await createRoom(request)

    expect(room).toMatchObject({
      roomId: expect.stringMatching(/^[A-Z0-9]{6}$/),
      name: 'Here to Slay Game'
    })

    // Verify database state
    const roomInfo = await getRoomInfo(request, room.roomId)
    expect(roomInfo).toMatchObject({
      id: room.roomId,
      name: 'Here to Slay Game',
      maxPlayers: 4
    })
  })

  test('should create room with custom values', async ({ request }) => {
    const roomData = {
      name: 'Custom Game Room',
      maxPlayers: 6
    }

    const room = await createRoom(request, roomData)

    expect(room).toMatchObject({
      roomId: expect.stringMatching(/^[A-Z0-9]{6}$/),
      name: 'Custom Game Room'
    })
  })

  test('should generate unique room IDs', async ({ request }) => {
    const promises = Array.from({ length: 5 }, () =>
      request.post('/api/create-room', { data: {} })
    )

    const responses = await Promise.all(promises)
    const bodies = await Promise.all(responses.map(res => res.json()))
    const roomIds = bodies.map(body => body.roomId)
    const uniqueIds = new Set(roomIds)

    expect(uniqueIds.size).toBe(5)
  })

  test('should create room with Yjs state verification', async ({ request }) => {
    const room = await createRoom(request)
    await verifyYjsState(request, room.roomId)
  })
})
