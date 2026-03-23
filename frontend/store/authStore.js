'use client'
import { create } from 'zustand'

const useAuthStore = create((set) => ({
  user: null,
  token: null,
  initialized: false,

  init() {
    if (typeof window === 'undefined') return
    try {
      const token = localStorage.getItem('ff_token')
      const user  = JSON.parse(localStorage.getItem('ff_user') || 'null')
      set({ user, token, initialized: true })
    } catch {
      set({ initialized: true })
    }
  },

  setAuth(user, token) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ff_token', token)
      localStorage.setItem('ff_user', JSON.stringify(user))
    }
    set({ user, token, initialized: true })
  },

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ff_token')
      localStorage.removeItem('ff_user')
    }
    set({ user: null, token: null, initialized: true })
  },
}))

export default useAuthStore
