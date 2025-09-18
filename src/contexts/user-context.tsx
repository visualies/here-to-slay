'use client'

import React, { createContext, useState, ReactNode } from 'react'
import { useEffect } from 'react'
import { gameServerAPI } from '../lib/game-server-api'

interface User {
  playerId: string
  playerName: string
  playerColor: string
  recentRooms: RecentRoom[]
}

interface RecentRoom {
  roomId: string
  roomName: string
  lastJoined: string
  playerCount: number
}

interface UserContextType {
  user: User | null
  loading: boolean
  error: string | null
  updateUser: (user: User) => void
}

export const UserContext = createContext<UserContextType | undefined>(undefined)

interface UserProviderProps {
  children: ReactNode
  initialUser?: User | null
}

export function UserProvider({ children, initialUser }: UserProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateUser = (newUser: User) => {
    setUser(newUser)
  }

  // Bootstrap user from room-server cookie (@me) on client mount
  useEffect(() => {
    let cancelled = false
    async function bootstrapUser() {
      try {
        setLoading(true)
        setError(null)
        const res = await gameServerAPI.getCurrentPlayer()
        console.log('🔍 User bootstrap result:', res)
        if (!cancelled && res.success && res.data) {
          console.log('✅ Setting user with player ID:', res.data.playerId)
          setUser({
            playerId: res.data.playerId,
            playerName: res.data.playerName,
            playerColor: res.data.playerColor,
            recentRooms: []
          })
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load user')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    // Only fetch on client if we don't already have a user
    if (!user) {
      bootstrapUser()
    }
    return () => { cancelled = true }
  }, [])

  return (
    <UserContext.Provider value={{ user, loading, error, updateUser }}>
      {children}
    </UserContext.Provider>
  )
}

