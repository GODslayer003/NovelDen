import { create } from 'zustand'
import axios from 'axios'
import toast from 'react-hot-toast'

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL

// Set axios defaults
const token = localStorage.getItem('novelden_token')
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
}

export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('novelden_user')) || null,
  token: token || null,
  loading: false,

  register: async (name, email, password) => {
    set({ loading: true })
    try {
      await axios.post(`${API_URL}/auth/register`, { name, email, password })
      // Registration successful, OTP sent. Do not log in yet.
      set({ loading: false })
      return true
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed'
      toast.error(msg)
      set({ loading: false })
      return false
    }
  },

  verifyOtp: async (email, otp) => {
    set({ loading: true })
    try {
      const res = await axios.post(`${API_URL}/auth/verify-otp`, { email, otp })
      const { token, user } = res.data
      localStorage.setItem('novelden_token', token)
      localStorage.setItem('novelden_user', JSON.stringify(user))
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      set({ user, token, loading: false })
      toast.success(`Welcome to the Den, ${user.name}!`)
      return true
    } catch (err) {
      const msg = err.response?.data?.error || 'Verification failed'
      toast.error(msg)
      set({ loading: false })
      return false
    }
  },

  resendOtp: async (email) => {
    set({ loading: true })
    try {
      await axios.post(`${API_URL}/auth/resend-otp`, { email })
      toast.success('A new OTP has been sent to your email')
      set({ loading: false })
      return true
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to resend OTP'
      toast.error(msg)
      set({ loading: false })
      return false
    }
  },

  login: async (email, password) => {
    set({ loading: true })
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password })
      const { token, user } = res.data
      // Ensure avatar is part of user data
      if (!user.avatar) user.avatar = ''
      localStorage.setItem('novelden_token', token)
      localStorage.setItem('novelden_user', JSON.stringify(user))
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      set({ user, token, loading: false })
      toast.success(`Logged in as ${user.name}`)
      return { success: true }
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed'
      const needsVerification = err.response?.data?.needsVerification || false
      toast.error(msg)
      set({ loading: false })
      return { success: false, needsVerification }
    }
  },

  logout: () => {
    localStorage.removeItem('novelden_token')
    localStorage.removeItem('novelden_user')
    delete axios.defaults.headers.common['Authorization']
    set({ user: null, token: null })
    toast.success('Logged out successfully')
  },

  checkSession: async () => {
    const token = localStorage.getItem('novelden_token')
    if (!token) return
    try {
      const res = await axios.get(`${API_URL}/auth/me`)
      const { user } = res.data
      if (!user.avatar) user.avatar = ''
      localStorage.setItem('novelden_user', JSON.stringify(user))
      set({ user, token })
    } catch (err) {
      // Token expired or invalid
      localStorage.removeItem('novelden_token')
      localStorage.removeItem('novelden_user')
      delete axios.defaults.headers.common['Authorization']
      set({ user: null, token: null })
    }
  },

  setUser: (user) => {
    localStorage.setItem('novelden_user', JSON.stringify(user))
    set({ user })
  }
}))
