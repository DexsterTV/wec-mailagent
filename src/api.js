/**
 * api.js — klient HTTP dla backendu WEC Mailing Agent
 * Wszystkie metody zwracają Promise.
 * Token JWT przechowywany jest w sessionStorage.
 */

function getToken() {
    return sessionStorage.getItem('wec_token');
}

async function request(method, endpoint, body) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const opts = { method, headers };
    if (body !== undefined) opts.body = JSON.stringify(body);

    const res = await fetch(endpoint, opts);

    // Jeśli odpowiedź nie jest JSON-em (np. CSV), oddaj response
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
        if (!res.ok) throw Object.assign(new Error(res.statusText), { status: res.status });
        return res; // caller handles blob/text
    }

    const data = await res.json();
    if (!res.ok) {
        throw Object.assign(new Error(data.error || res.statusText), { status: res.status });
    }
    return data;
}

export const api = {

    // ── AUTH ────────────────────────────────────────────────────────────────────

    async login(username, password) {
        const data = await request('POST', '/api/auth/login', { username, password });
        sessionStorage.setItem('wec_token',        data.token);
        sessionStorage.setItem('wec_user',         data.username);
        sessionStorage.setItem('wec_role',         data.role);
        sessionStorage.setItem('wec_display_name', data.displayName);
        sessionStorage.setItem('wec_permissions',  JSON.stringify(data.permissions || {}));
        return data;
    },

    async logout() {
        try { await request('POST', '/api/auth/logout'); } catch (_) { /* ignoruj */ }
        sessionStorage.removeItem('wec_token');
        sessionStorage.removeItem('wec_user');
        sessionStorage.removeItem('wec_role');
        sessionStorage.removeItem('wec_display_name');
        sessionStorage.removeItem('wec_permissions');
    },

    async me() {
        return request('GET', '/api/auth/me');
    },

    // ── SZABLONY ────────────────────────────────────────────────────────────────

    async getTemplates() {
        return request('GET', '/api/templates');
    },

    async saveTemplate(tpl) {
        return request('POST', '/api/templates', tpl);
    },

    async deleteTemplate(id) {
        return request('DELETE', `/api/templates/${id}`);
    },

    // ── KONTAKTY ────────────────────────────────────────────────────────────────

    async getContacts() {
        return request('GET', '/api/contacts');
    },

    async saveContact(contact) {
        return request('POST', '/api/contacts', contact);
    },

    async deleteContact(id) {
        return request('DELETE', `/api/contacts/${id}`);
    },

    // ── UŻYTKOWNICY ─────────────────────────────────────────────────────────────

    async getUsers() {
        return request('GET', '/api/users');
    },

    async saveUser(data) {
        return request('POST', '/api/users', data);
    },

    async deleteUser(username) {
        return request('DELETE', `/api/users/${encodeURIComponent(username)}`);
    },

    // ── LOGI ────────────────────────────────────────────────────────────────────

    async getLogs() {
        return request('GET', '/api/logs');
    },

    async addLog(entry) {
        // fire-and-forget — nie przerywamy UI błędami logowania
        return request('POST', '/api/logs', entry).catch(() => {});
    },

    async clearLogs() {
        return request('DELETE', '/api/logs');
    },

    async getLogsCsv() {
        const res = await request('GET', '/api/logs/csv');
        // res jest tutaj Response (nie JSON)
        return res.blob();
    },
};
