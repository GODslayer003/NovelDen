import axios from 'axios';

const DEFAULT_STATIC_URL = import.meta.env.DEV
  ? 'http://localhost:5000'
  : 'https://novelden-1.onrender.com';

const trimTrailingSlash = (value) => value.replace(/\/+$/, '');

export const STATIC_URL = trimTrailingSlash(
  import.meta.env.VITE_STATIC_URL || DEFAULT_STATIC_URL
);

export const API_URL = trimTrailingSlash(
  import.meta.env.VITE_API_URL || `${STATIC_URL}/api`
);

export const api = axios.create({
  baseURL: API_URL,
});

export const getBooks = () => api.get('/books');
export const getBook = (id) => api.get(`/books/${id}`);
export const getWriters = () => api.get('/writers');
export const getWriter = (id) => api.get(`/writers/${id}`);
export const getNews = () => api.get('/news');
