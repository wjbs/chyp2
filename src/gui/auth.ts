import { signal, computed } from '@preact/signals';
import type { DUser } from 'dododir';

export const currentUser = signal<DUser | null>(null);
export const authToken = signal<string | null>(localStorage.getItem('token'));
export const isAuthenticated = computed(() => currentUser.value !== null);

export function setAuth(token: string, user: DUser) {
    localStorage.setItem('token', token);
    authToken.value = token;
    currentUser.value = user;
}

export function clearAuth() {
    localStorage.removeItem('token');
    authToken.value = null;
    currentUser.value = null;
}
