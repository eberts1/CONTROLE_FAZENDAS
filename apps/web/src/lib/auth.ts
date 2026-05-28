'use client';

import { AuthResponse } from '@controle-fazendas/shared';
import { api, setAccessToken } from './api-client';

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
  setAccessToken(data.accessToken);
  if (typeof window !== 'undefined') {
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('farms', JSON.stringify(data.farms));
  }
  return data;
}

export async function logout() {
  try {
    await api.post('/auth/logout');
  } finally {
    setAccessToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('farms');
      localStorage.removeItem('activeFarmId');
    }
  }
}

export async function getMe() {
  const { data } = await api.get('/auth/me');
  if (typeof window !== 'undefined') {
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('farms', JSON.stringify(data.farms));
  }
  return data;
}

export function restoreSession() {
  if (typeof window === 'undefined') return;
  const refreshToken = localStorage.getItem('refreshToken');
  if (refreshToken) {
    // Token will be set on first API call via refresh if needed
  }
}
