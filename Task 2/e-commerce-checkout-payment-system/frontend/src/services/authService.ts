import { authApi } from './api';

export const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    return response.data;
};
