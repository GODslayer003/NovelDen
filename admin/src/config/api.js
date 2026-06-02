const DEFAULT_STATIC_URL = import.meta.env.DEV
  ? 'http://localhost:5000'
  : 'https://novelden-1.onrender.com'

const trimTrailingSlash = (value) => value.replace(/\/+$/, '')

export const STATIC_URL = trimTrailingSlash(
  import.meta.env.VITE_STATIC_URL || DEFAULT_STATIC_URL
)

export const API_URL = trimTrailingSlash(
  import.meta.env.VITE_API_URL || `${STATIC_URL}/api`
)
