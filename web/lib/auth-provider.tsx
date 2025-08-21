'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from './api'

interface User {
  id: string
  email: string
  name: string
  role: 'Vendor' | 'LicenseAdmin' | 'Employee'
  licenseId: string
  mfaEnabled: boolean
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string, mfaToken?: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      // Verify token and get user profile
      apiClient.getProfile()
        .then((userData) => {
          setUser(userData)
        })
        .catch(() => {
          localStorage.removeItem('auth_token')
        })
        .finally(() => {
          setIsLoading(false)
        })
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = async (email: string, password: string, mfaToken?: string) => {
    try {
      const response = await apiClient.login(email, password, mfaToken)
      localStorage.setItem('auth_token', response.access_token)
      setUser(response.user)
      
      // Redirect based on role
      if (response.user.role === 'Vendor') {
        router.push('/vendor/dashboard')
      } else {
        router.push('/tenant/dashboard')
      }
    } catch (error) {
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    setUser(null)
    router.push('/auth/login')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}