import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { get, post, setUnauthorizedHandler, token } from './api'

export type Admin = {
  id: number
  email: string
  name: string
  role: string
  totp_enabled: boolean
  permissions: string[]
}

type AuthState = {
  admin: Admin | null
  loading: boolean
  login: (email: string, password: string, code?: string) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
  can: (perm: string) => boolean
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [loading, setLoading] = useState(true)

  const logout = useCallback(() => {
    token.clear()
    setAdmin(null)
  }, [])

  const refresh = useCallback(async () => {
    if (!token.get()) {
      setLoading(false)
      return
    }
    try {
      setAdmin(await get<Admin>('/me'))
    } catch {
      token.clear()
      setAdmin(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(logout)
    refresh()
  }, [logout, refresh])

  const login = useCallback(async (email: string, password: string, code?: string) => {
    const res = await post<{ token: string; admin: Admin }>('/auth/login', { email, password, code })
    token.set(res.token)
    setAdmin(res.admin)
  }, [])

  const value = useMemo<AuthState>(
    () => ({ admin, loading, login, logout, refresh, can: (p) => !!admin?.permissions.includes(p) }),
    [admin, loading, login, logout, refresh],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth outside AuthProvider')
  return v
}
