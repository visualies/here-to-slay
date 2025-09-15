import type { GameAction, ActionResponse } from '../types/actions'

const API_BASE_URL = process.env.NEXT_PUBLIC_GAME_SERVER_API_URL || 'http://192.168.178.61:1234/api'

export async function executeAction(action: GameAction): Promise<ActionResponse> {
  try {
    console.log(`🎮 Executing action:`, action)
    
    const response = await fetch(`${API_BASE_URL}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(action),
    })

    const result: ActionResponse = await response.json()
    
    console.log(`🎮 Action result:`, result)
    
    if (!response.ok) {
      console.error(`❌ Action failed with status ${response.status}:`, result)
    }
    
    return result
  } catch (error) {
    console.error('❌ Error executing action:', error)
    return {
      status: 'failed',
      message: error instanceof Error ? error.message : 'Network error'
    }
  }
}