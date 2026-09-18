import { create } from 'zustand';

interface User {
    _id: string;
    email: string;
    name: string;
    role: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    loginState: (user: User, token: string) => void;
    logout: () => void;
}

// Very basic implementation. Real apps should sync to localStorage.
export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    token: null,
    isAuthenticated: false,
    loginState: (user, token) => set({ user, token, isAuthenticated: true }),
    logout: () => set({ user: null, token: null, isAuthenticated: false }),
}));
