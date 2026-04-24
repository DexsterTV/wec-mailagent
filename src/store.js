/**
 * store.js — stan aplikacji + synchronizacja z backendem
 * Szablony i kontakty są współdzielone (serwer).
 * Szkice (drafts) zostają lokalnie w localStorage (per-przeglądarka).
 */

import { templates as defaultTemplates } from './templates.js';
import { normalizeTemplateSchema }       from './template-utils.js';
import { api }                           from './api.js';

export const store = {
    templates: [],
    contacts:  [],
    drafts:    JSON.parse(localStorage.getItem('wec_drafts') || '{}'),

    /**
     * Inicjalizacja — ładuje dane z serwera.
     * Jeśli templates.json nie istnieje na serwerze, sieje domyślnymi szablonami.
     */
    async init() {
        // --- SZABLONY ---
        let serverTemplates = null;
        try {
            serverTemplates = await api.getTemplates();
        } catch (e) {
            console.error('[store] Błąd ładowania szablonów:', e.message);
        }

        if (!serverTemplates) {
            // Pierwsze uruchomienie — zapisz domyślne na serwer
            this.templates = defaultTemplates.map(t => ({ ...t }));
            for (const t of this.templates) {
                await api.saveTemplate(t).catch(e => console.error('[store] Błąd zapisu szablonu:', e.message));
            }
        } else {
            // Scalanie: serwer + nowe domyślne których jeszcze nie ma
            // Jeśli domyślny szablon ma wyższe _v niż zapisany — nadpisz (aktualizacja)
            const storedMap = new Map(serverTemplates.map(t => [t.id, t]));

            for (const def of defaultTemplates) {
                const stored = storedMap.get(def.id);
                if (!stored) {
                    // Nowy domyślny szablon — dodaj
                    storedMap.set(def.id, { ...def });
                    await api.saveTemplate(def).catch(e => console.error('[store] Błąd zapisu szablonu:', e.message));
                } else if ((stored._v || 0) < (def._v || 0)) {
                    // Domyślny szablon zaktualizowany — nadpisz wersję na serwerze
                    storedMap.set(def.id, { ...def });
                    await api.saveTemplate(def).catch(e => console.error('[store] Błąd zapisu szablonu:', e.message));
                }
            }

            this.templates = [...storedMap.values()];
        }

        this.templates = this.templates.map(normalizeTemplateSchema);

        // --- KONTAKTY ---
        try {
            this.contacts = await api.getContacts();
        } catch (e) {
            console.error('[store] Błąd ładowania kontaktów:', e.message);
            this.contacts = [];
        }
    },

    // ── SZABLONY ──────────────────────────────────────────────────────────────

    async saveTemplate(templateData) {
        const idx = this.templates.findIndex(t => t.id === templateData.id);
        if (idx >= 0) this.templates[idx] = templateData;
        else          this.templates.push(templateData);
        await api.saveTemplate(templateData);
    },

    async deleteTemplate(id) {
        this.templates = this.templates.filter(t => t.id !== id);
        await api.deleteTemplate(id);
    },

    // ── KONTAKTY ──────────────────────────────────────────────────────────────

    async addContact(contact) {
        const saved = await api.saveContact(contact);
        // Serwer nadaje ID jeśli brak
        if (saved && saved.id) contact.id = saved.id;
        this.contacts.push(contact);
        return contact;
    },

    async updateContact(id, data) {
        const idx = this.contacts.findIndex(c => c.id === id);
        if (idx === -1) return null;
        const updated = { ...this.contacts[idx], ...data, id };
        this.contacts[idx] = updated;
        await api.saveContact(updated);
        return updated;
    },

    async deleteContact(id) {
        this.contacts = this.contacts.filter(c => c.id !== id);
        await api.deleteContact(id);
    },

    // ── SZKICE (localStorage — per-użytkownik) ────────────────────────────────

    saveDraft(templateId, values) {
        this.drafts[templateId] = values;
        try { localStorage.setItem('wec_drafts', JSON.stringify(this.drafts)); } catch (_) {}
    },

    getDraft(templateId) {
        return this.drafts[templateId] || null;
    },
};
