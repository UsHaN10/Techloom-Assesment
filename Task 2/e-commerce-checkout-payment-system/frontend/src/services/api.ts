import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// @ts-ignore
const API_URL = (import.meta as any).env.VITE_API_URL || ((import.meta as any).env.PROD ? '/api' : 'http://localhost:3000/api');

export const api = axios.create({
    baseURL: API_URL
});

api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => Promise.reject(error));

// Auth wrappers
export const authApi = {
    login: (data: any) => api.post('/auth/login', data),
};

// Users wrappers
export const userApi = {
    getUsers: () => api.get('/users'),
    createUser: (data: any) => api.post('/users', data),
    updateUser: (id: string, data: any) => api.put(`/users/${id}`, data),
    deleteUser: (id: string) => api.delete(`/users/${id}`),
};
