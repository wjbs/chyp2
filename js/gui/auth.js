import { signal, computed } from '@preact/signals';
export const currentUser = signal(null);
export const authToken = signal(localStorage.getItem('token'));
export const isAuthenticated = computed(() => currentUser.value !== null);
export function setAuth(token, user) {
    localStorage.setItem('token', token);
    authToken.value = token;
    currentUser.value = user;
}
export function clearAuth() {
    localStorage.removeItem('token');
    authToken.value = null;
    currentUser.value = null;
}
