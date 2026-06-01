import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL;
export const STATIC_URL = import.meta.env.VITE_STATIC_URL;

export const api = axios.create({
  baseURL: API_URL,
});

export const getBooks = () => api.get('/books');
export const getBook = (id) => api.get(`/books/${id}`);
export const getWriters = () => api.get('/writers');
export const getWriter = (id) => api.get(`/writers/${id}`);
export const getNews = () => api.get('/news');
