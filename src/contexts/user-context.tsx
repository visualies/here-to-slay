'use client'

import React, { createContext, useState, ReactNode } from 'react'

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

  return (
    <UserContext.Provider value={{ user, loading, error, updateUser }}>
      {children}
    </UserContext.Provider>
  )
}

