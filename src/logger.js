/**
 * logger.js — rejestrowanie aktywności użytkowników
 * Logi zapisywane są na serwerze (data/logs.json), dostępne dla wszystkich.
 */

import { api } from './api.js';

export const logger = {
    /**
     * Dodaje wpis do logu. Fire-and-forget — nie blokuje UI.
     */
    log(action, details = '') {
        const user = sessionStorage.getItem('wec_user') || 'system';
        const entry = {
            id:        `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            timestamp: new Date().toISOString(),
            user,
            action,
            details:   String(details),
        };
        api.addLog(entry); // nie await — nie blokujemy UI
    },

    /**
     * Pobiera wszystkie logi z serwera.
     * @returns {Promise<Array>}
     */
    async getAll() {
        return api.getLogs();
    },

    /**
     * Czyści logi na serwerze.
     */
    async clear() {
        return api.clearLogs();
    },

    /**
     * Pobiera logi jako Blob CSV.
     * @returns {Promise<Blob>}
     */
    async exportCsvBlob() {
        return api.getLogsCsv();
    },
};
