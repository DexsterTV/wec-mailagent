/**
 * auth.js — zarządzanie sesją użytkownika
 * Token przechowywany w sessionStorage (wygasa po zamknięciu karty).
 */

import { api } from './api.js';

export const auth = {
    isAuthenticated() {
        return !!sessionStorage.getItem('wec_token');
    },

    getToken() {
        return sessionStorage.getItem('wec_token');
    },

    getCurrentUser() {
        return sessionStorage.getItem('wec_user') || null;
    },

    getDisplayName() {
        return sessionStorage.getItem('wec_display_name') || this.getCurrentUser() || '';
    },

    isAdmin() {
        return sessionStorage.getItem('wec_role') === 'admin';
    },

    /**
     * Sprawdza, czy użytkownik ma daną permisję.
     * Admin zawsze zwraca true. Brak klucza = true (domyślna otwartość).
     */
    hasPermission(key) {
        if (this.isAdmin()) return true;
        try {
            const perms = JSON.parse(sessionStorage.getItem('wec_permissions') || '{}');
            return perms[key] !== false;
        } catch {
            return true;
        }
    },

    /**
     * Próba logowania. Zwraca Promise z danymi użytkownika.
     * Rzuca błąd przy nieprawidłowych danych.
     */
    async login(username, password) {
        return api.login(username, password);
    },

    /**
     * Wylogowanie — usuwa token z sessionStorage i powiadamia serwer.
     */
    async logout() {
        return api.logout();
    },

    /**
     * Weryfikuje token po odświeżeniu strony. Rzuca błąd jeśli token wygasł.
     */
    async verify() {
        return api.me();
    },
};
