import { store }           from './store.js';
import { renderTemplate }  from './engine.js';
import { decorateImageTags, getRenderableValues, isImageField, normalizeExternalImageUrl } from './template-utils.js';
import { auth }            from './auth.js';
import { logger }          from './logger.js';
import { api }             from './api.js';

// ── DOM Elements ──────────────────────────────────────────────────────────────
const navLinks         = document.querySelectorAll('.nav-item');
const viewSections     = document.querySelectorAll('.app-view');
const templateSelect   = document.getElementById('template-select');
const dynamicForm      = document.getElementById('dynamic-form');
const iframe           = document.getElementById('live-preview-frame');
const previewContainer = document.querySelector('.preview-container');
const refreshPreviewBtn = document.getElementById('refresh-preview-btn');
const copyBtn          = document.getElementById('copy-html-btn');
const downloadBtn      = document.getElementById('download-html-btn');
const resetBtn         = document.getElementById('reset-btn');

// ── Stan aplikacji ────────────────────────────────────────────────────────────
let currentTemplate = null;
let currentValues   = {};

// ── Helpers ───────────────────────────────────────────────────────────────────
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function buildContactHtml(contact) {
    const parts = [];
    if (contact.name)     parts.push(`<strong>${escapeHtml(contact.name)}</strong>`);
    if (contact.position) parts.push(escapeHtml(contact.position));
    if (contact.email)    parts.push(`<a href="mailto:${escapeHtml(contact.email)}" style="color:inherit;">${escapeHtml(contact.email)}</a>`);
    if (contact.phone)    parts.push(escapeHtml(contact.phone));
    return parts.join('<br>');
}

// ── Auth / Login ──────────────────────────────────────────────────────────────
function setupLoginOverlay() {
    const overlay  = document.getElementById('login-overlay');
    const form     = document.getElementById('login-form');
    const errorEl  = document.getElementById('login-error');
    const submitBtn = form ? form.querySelector('button[type="submit"]') : null;

    if (!overlay || !form) return;
    overlay.style.display = 'flex';

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        if (errorEl)  { errorEl.textContent = ''; errorEl.style.display = 'none'; }
        if (submitBtn){ submitBtn.disabled = true; submitBtn.textContent = 'Logowanie…'; }

        try {
            await auth.login(username, password);
            logger.log('LOGIN', `Zalogowano jako: ${username}`);
            overlay.style.display = 'none';
            updateUserDisplay();
            await init();
        } catch (err) {
            logger.log('LOGIN_FAIL', `Nieudana próba: ${username}`);
            if (errorEl) {
                errorEl.textContent = err.message || 'Nieprawidłowa nazwa użytkownika lub hasło.';
                errorEl.style.display = 'block';
            }
        } finally {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Zaloguj się'; }
        }
    });
}

function updateUserDisplay() {
    const displayName = auth.getDisplayName();
    const el = document.getElementById('current-user-label');
    if (el) el.textContent = displayName;

    const avatar = document.getElementById('user-avatar-initials');
    if (avatar) avatar.textContent = (displayName || '?').charAt(0).toUpperCase();

    const roleEl = document.getElementById('current-user-role');
    if (roleEl) roleEl.textContent = auth.isAdmin() ? 'Administrator' : 'Użytkownik';

    const isAdmin = auth.isAdmin();
    const logsNav  = document.getElementById('nav-logs');
    const usersNav = document.getElementById('nav-users');
    if (logsNav)  logsNav.style.display  = isAdmin ? '' : 'none';
    if (usersNav) usersNav.style.display = isAdmin ? '' : 'none';
}

function setupLogout() {
    const btn = document.getElementById('logout-btn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        logger.log('LOGOUT', `Wylogowano: ${auth.getCurrentUser()}`);
        await auth.logout();
        location.reload();
    });
}

// ── Inicjalizacja (async) ─────────────────────────────────────────────────────
async function init() {
    // Pokaż loading w previewie
    showLoading(true);

    try {
        await store.init();
    } catch (e) {
        console.error('[WEC] Błąd inicjalizacji store:', e);
        showLoading(false);
        return;
    }

    populateTemplateSelector();
    setupEventListeners();
    renderPRContacts();

    if (store.templates.length > 0) {
        loadTemplate(store.templates[0].id);
    }
    showLoading(false);
}

function showLoading(on) {
    const container = document.getElementById('view-editor');
    if (!container) return;
    let spinner = document.getElementById('app-loading-spinner');
    if (on) {
        if (!spinner) {
            spinner = document.createElement('div');
            spinner.id = 'app-loading-spinner';
            spinner.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:var(--workspace-bg);z-index:50;';
            spinner.innerHTML = `<div style="text-align:center;color:var(--text-muted);">
                <div class="spinner"></div>
                <p style="margin-top:12px;font-size:0.9rem;">Ładowanie danych…</p>
            </div>`;
            container.style.position = 'relative';
            container.appendChild(spinner);
        }
    } else {
        if (spinner) spinner.remove();
    }
}

// ── Sidebar Navigation ────────────────────────────────────────────────────────
function switchView(viewId) {
    navLinks.forEach(l => l.classList.toggle('active', l.getAttribute('data-view') === viewId));
    viewSections.forEach(sec => sec.classList.remove('active'));
    const target = document.getElementById(`view-${viewId}`);
    if (target) target.classList.add('active');

    if (viewId === 'admin')  renderAdminTemplatesList();
    if (viewId === 'logs')   renderLogsPanel();
    if (viewId === 'users')  renderUsersList();
}

function setupEventListeners() {
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const viewId = link.getAttribute('data-view');
            if (viewId) switchView(viewId);
        });
    });

    templateSelect.addEventListener('change', (e) => {
        loadTemplate(e.target.value);
    });

    dynamicForm.addEventListener('input',  handleFormChange);
    dynamicForm.addEventListener('change', handleFormChange);

    if (refreshPreviewBtn) refreshPreviewBtn.addEventListener('click', updateLivePreview);

    // Preview desktop/mobile toggle
    document.querySelectorAll('.preview-toolbar .toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.preview-toolbar .toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const mode = btn.getAttribute('data-mode');
            if (previewContainer) {
                previewContainer.classList.toggle('mobile', mode === 'mobile');
                previewContainer.classList.toggle('desktop', mode === 'desktop');
            }
        });
    });

    copyBtn.addEventListener('click',     wrapAction(copyHTML));
    downloadBtn.addEventListener('click', downloadHTML);
    resetBtn.addEventListener('click',    resetCurrentDraft);
}

// ── Szablony & Edytor ─────────────────────────────────────────────────────────
function populateTemplateSelector() {
    templateSelect.innerHTML = '';
    store.templates.forEach(t => {
        const opt = document.createElement('option');
        opt.value       = t.id;
        opt.textContent = t.name;
        templateSelect.appendChild(opt);
    });
}

function loadTemplate(templateId) {
    currentTemplate = store.templates.find(t => t.id === templateId);
    if (!currentTemplate) return;

    const draft = store.getDraft(templateId);
    currentValues = draft || {};

    if (!draft) {
        currentTemplate.fields.forEach(f => {
            currentValues[f.id] = f.default !== undefined ? f.default : '';
        });
    }

    // Wyczyść pola autofill jeśli brak wybranego kontaktu
    const contactSelectFields = currentTemplate.fields.filter(f => f.type === 'contact-select');
    const anyContactSelected  = contactSelectFields.some(f => currentValues[f.id] && currentValues[f.id] !== '');
    if (!anyContactSelected) {
        currentTemplate.fields.forEach(f => {
            if (f.autofill && f.autofill !== '') currentValues[f.id] = '';
        });
    }

    buildDynamicForm();
    updateLivePreview();
}

function buildDynamicForm() {
    dynamicForm.innerHTML = '';

    const grouped = {};
    currentTemplate.fields.forEach(field => {
        const sec = field.section && field.section.trim() !== '' ? field.section : 'Ogólne';
        if (!grouped[sec]) grouped[sec] = [];
        grouped[sec].push(field);
    });

    const standardOrder = ['Nagłówek', 'Treść', 'Materiały prasowe', 'Opcje', 'Stopka', 'Ogólne'];
    const sections = Object.keys(grouped).sort((a, b) => {
        let ia = standardOrder.indexOf(a);
        let ib = standardOrder.indexOf(b);
        if (ia === -1) ia = 99;
        if (ib === -1) ib = 99;
        return ia - ib;
    });

    const chevronSvg = `<svg class="form-section-chevron" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

    sections.forEach(secName => {
        let secHasVisibleFields = false;
        const details = document.createElement('details');
        details.className = 'form-section';
        details.open = true;

        const summary = document.createElement('summary');
        summary.className = 'form-section-header';
        summary.innerHTML = `<span class="form-section-title">${secName}</span>${chevronSvg}`;
        details.appendChild(summary);

        const body = document.createElement('div');
        body.className = 'form-section-body';

        grouped[secName].forEach(field => {
            if (field.visibleIf && !currentValues[field.visibleIf]) return;

            const group = document.createElement('div');
            let inputHtml = '';
            const id  = `field_${field.id}`;
            const val = currentValues[field.id];

            const lockedAttr  = field.locked ? 'readonly style="background-color:rgba(0,0,0,0.04);cursor:not-allowed;"' : '';
            const disabledAttr = field.locked ? 'disabled' : '';

            if (field.type === 'text') {
                group.className = 'form-group';
                inputHtml = `<label for="${id}">${field.label}</label>
                             <input type="text" id="${id}" name="${field.id}" value="${escapeHtml(val || '')}" ${lockedAttr}>`;
            } else if (field.type === 'textarea') {
                group.className = 'form-group';
                inputHtml = `<label for="${id}">${field.label}</label>
                             <textarea id="${id}" name="${field.id}" ${lockedAttr}>${escapeHtml(val || '')}</textarea>`;
            } else if (field.type === 'image-url') {
                group.className = 'form-group';
                inputHtml = `<label for="${id}">${field.label}</label>
                             <input type="url" id="${id}" name="${field.id}" value="${escapeHtml(val || '')}" placeholder="https://..." style="border-left:3px solid var(--primary);" ${lockedAttr}>
                             <div class="field-hint">Wklej link do obrazu lub adres od <code>www.</code></div>`;
            } else if (field.type === 'boolean') {
                group.className = 'checkbox-group';
                const checked = val === true ? 'checked' : '';
                inputHtml = `<input type="checkbox" id="${id}" name="${field.id}" ${checked} ${disabledAttr}>
                             <label for="${id}">${field.label}</label>`;
            } else if (field.type === 'contact-select') {
                group.className = 'form-group';
                const options = store.contacts.map(c =>
                    `<option value="${c.id}" ${c.id === val ? 'selected' : ''}>${escapeHtml(c.name)} — ${escapeHtml(c.position || '')}</option>`
                ).join('');
                inputHtml = `<label for="${id}">${field.label}</label>
                             <select id="${id}" name="${field.id}" ${disabledAttr}>
                                 <option value="">-- Brak stopki --</option>
                                 ${options}
                             </select>`;
            }

            if (!inputHtml) return;
            secHasVisibleFields = true;
            group.innerHTML = inputHtml;
            body.appendChild(group);
        });

        if (secHasVisibleFields) {
            details.appendChild(body);
            dynamicForm.appendChild(details);
        }
    });
}

function handleFormChange(e) {
    const target   = e.target;
    if (!target.name) return;
    const fieldDef = currentTemplate.fields.find(f => f.id === target.name);

    if (target.type === 'checkbox') {
        currentValues[target.name] = target.checked;
        buildDynamicForm();
    } else {
        let nextValue = target.value;
        if (e.type === 'change' && isImageField(fieldDef, currentTemplate.html)) {
            nextValue = normalizeExternalImageUrl(nextValue);
            if (nextValue !== target.value) target.value = nextValue;
        }
        currentValues[target.name] = nextValue;
    }

    // Autofill z bazy PR
    if (fieldDef && fieldDef.type === 'contact-select') {
        if (target.value) {
            const contact = store.contacts.find(c => c.id === target.value);
            if (contact) {
                let autofillHappened = false;
                currentTemplate.fields.forEach(f => {
                    if (f.autofill && f.autofill !== '' && contact[f.autofill] !== undefined) {
                        currentValues[f.id] = contact[f.autofill];
                        autofillHappened = true;
                    }
                });
                if (autofillHappened) buildDynamicForm();
            }
        } else {
            currentTemplate.fields.forEach(f => {
                if (f.autofill && f.autofill !== '') currentValues[f.id] = '';
            });
            buildDynamicForm();
        }
    }

    store.saveDraft(currentTemplate.id, currentValues);
}

function getFinalHtml() {
    const renderableValues = getRenderableValues(currentTemplate, currentValues);

    // Kontakty → HTML (rawValues, bez HTML-escaping)
    const rawValues = {};
    (currentTemplate.fields || []).forEach(f => {
        if (f.type === 'contact-select') {
            const contactId = currentValues[f.id];
            const contact   = contactId ? store.contacts.find(c => c.id === contactId) : null;
            rawValues[f.id] = contact ? buildContactHtml(contact) : '';
        }
    });

    return decorateImageTags(renderTemplate(currentTemplate.html, renderableValues, rawValues));
}

function injectPreviewHelpers(html) {
    const inject = `<meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; img-src * data: blob:;">
<base target="_blank">`;
    if (/<head[^>]*>/i.test(html)) {
        return html.replace(/(<head[^>]*>)/i, `$1\n${inject}`);
    }
    return inject + html;
}

function updateLivePreview() {
    const finalHtml = injectPreviewHelpers(getFinalHtml());
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(finalHtml);
    doc.close();
}

function resetCurrentDraft() {
    if (confirm('Czy na pewno chcesz wyczyścić wszystkie wpisane dane w tym formularzu?')) {
        store.drafts[currentTemplate.id] = null;
        loadTemplate(currentTemplate.id);
    }
}

// ── Baza PR ───────────────────────────────────────────────────────────────────
function renderPRContacts() {
    const list = document.getElementById('contacts-list');
    list.innerHTML = '';

    if (store.contacts.length === 0) {
        list.innerHTML = '<p style="color:#666;font-size:0.9rem;padding:8px 0;">Nie znaleziono kontaktów PR. Dodaj nowy, aby go używać.</p>';
        return;
    }

    store.contacts.forEach(c => {
        const card = document.createElement('div');
        card.className = 'contact-card';
        card.innerHTML = `
            <div class="contact-info">
                <strong>${escapeHtml(c.name)}</strong>
                <span>${escapeHtml(c.position || '')} · ${escapeHtml(c.email)}</span>
            </div>
            <div class="contact-actions">
                <button data-id="${c.id}" class="edit-contact-btn btn btn-secondary btn-sm">Edytuj</button>
                <button data-id="${c.id}" class="delete-contact-btn btn btn-danger btn-sm">Usuń</button>
            </div>`;
        list.appendChild(card);
    });

    document.querySelectorAll('.edit-contact-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            const c  = store.contacts.find(x => x.id === id);
            if (!c) return;
            document.getElementById('contact-id').value       = c.id;
            document.getElementById('contact-name').value     = c.name     || '';
            document.getElementById('contact-position').value = c.position || '';
            document.getElementById('contact-email').value    = c.email    || '';
            document.getElementById('contact-phone').value    = c.phone    || '';
            document.querySelector('#contact-modal h2').textContent = 'Edytuj Kontakt';
            modal.classList.add('active');
        });
    });

    document.querySelectorAll('.delete-contact-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (!confirm('Czy na pewno usunąć ten kontakt?')) return;
            const id = e.target.getAttribute('data-id');
            const c  = store.contacts.find(x => x.id === id);
            btn.disabled = true;
            await store.deleteContact(id);
            logger.log('CONTACT_DELETE', `Usunięto kontakt: ${c ? c.name : id}`);
            renderPRContacts();
            buildDynamicForm();
            updateLivePreview();
        });
    });
}

// ── Modal kontakt ─────────────────────────────────────────────────────────────
const modal        = document.getElementById('contact-modal');
const addBtn       = document.getElementById('add-contact-btn');
const closeBtn     = document.querySelector('.close-btn');
const contactForm  = document.getElementById('contact-form');

addBtn.addEventListener('click', () => {
    contactForm.reset();
    document.getElementById('contact-id').value = '';
    document.querySelector('#contact-modal h2').textContent = 'Dodaj Kontakt';
    modal.classList.add('active');
});
closeBtn.addEventListener('click', () => modal.classList.remove('active'));
window.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });

contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId  = document.getElementById('contact-id').value;
    const contact = {
        name:     document.getElementById('contact-name').value,
        position: document.getElementById('contact-position').value,
        email:    document.getElementById('contact-email').value,
        phone:    document.getElementById('contact-phone').value,
    };

    const submitBtn = contactForm.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Zapisywanie…'; }

    try {
        if (editId) {
            await store.updateContact(editId, contact);
            logger.log('CONTACT_EDIT', `Edytowano kontakt: ${contact.name}`);
        } else {
            await store.addContact(contact);
            logger.log('CONTACT_ADD', `Dodano kontakt: ${contact.name}`);
        }
    } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Zapisz Kontakt'; }
    }

    renderPRContacts();
    buildDynamicForm();
    updateLivePreview();
    contactForm.reset();
    modal.classList.remove('active');
});

// ── Eksport HTML ──────────────────────────────────────────────────────────────
async function copyHTML(e) {
    const btn = e.target;
    try {
        await navigator.clipboard.writeText(getFinalHtml());
        logger.log('EXPORT_COPY', `Skopiowano HTML: ${currentTemplate.name}`);
        const orig = btn.textContent;
        btn.textContent = 'Skopiowano!';
        setTimeout(() => (btn.textContent = orig), 2000);
    } catch (err) {
        alert('Błąd kopiowania: ' + err);
    }
}

function downloadHTML() {
    const el       = document.createElement('a');
    const file     = new Blob([getFinalHtml()], { type: 'text/html' });
    const filename = `${currentTemplate.id}-${new Date().toISOString().split('T')[0]}.html`;
    el.href     = URL.createObjectURL(file);
    el.download = filename;
    document.body.appendChild(el);
    el.click();
    document.body.removeChild(el);
    logger.log('EXPORT_DOWNLOAD', `Pobrano HTML: ${currentTemplate.name} (${filename})`);
}

function wrapAction(fn) {
    return (e) => {
        const missing = [];
        currentTemplate.fields.forEach(f => {
            if (!f.visibleIf || currentValues[f.visibleIf]) {
                if (f.type !== 'boolean' && f.type !== 'contact-select' &&
                    (!currentValues[f.id] || String(currentValues[f.id]).trim() === '')) {
                    missing.push(f.label);
                }
            }
        });
        if (missing.length > 0) {
            if (!confirm(`Niektóre pola są puste:\n- ${missing.join('\n- ')}\n\nCzy chcesz kontynuować?`)) return;
        }
        fn(e);
    };
}

// ── Panel admina — Szablony ───────────────────────────────────────────────────
const adminTemplatesList = document.getElementById('templates-list');
const addTemplateBtn     = document.getElementById('add-template-btn');
const adminForm          = document.getElementById('template-admin-form');
const adminFieldsList    = document.getElementById('admin-fields-list');
const addFieldBtn        = document.getElementById('admin-add-field-btn');
const cancelTemplateBtn  = document.getElementById('cancel-template-btn');
const saveTemplateBtn    = document.getElementById('save-template-btn');

let editingTemplateId = null;

function _showAdminEditor(visible) {
    const empty  = document.getElementById('admin-editor-empty');
    const editor = document.getElementById('admin-editor-content');
    if (empty)  empty.style.display  = visible ? 'none' : 'flex';
    if (editor) editor.style.display = visible ? 'flex' : 'none';
}

window.renderAdminTemplatesList = function () {
    adminTemplatesList.innerHTML = '';
    if (store.templates.length === 0) {
        adminTemplatesList.innerHTML = '<p style="color:var(--text-500);font-size:0.85rem;padding:8px 0;">Brak wgranych szablonów.</p>';
        return;
    }
    store.templates.forEach(t => {
        const card = document.createElement('div');
        card.className = 'contact-card';
        card.innerHTML = `
            <div class="contact-info">
                <strong>${escapeHtml(t.name)}</strong>
                <span>ID: ${escapeHtml(t.id)}</span>
            </div>
            <div class="contact-actions">
                <button data-id="${t.id}" class="edit-tpl-btn btn btn-secondary btn-sm">Edytuj</button>
                <button data-id="${t.id}" class="delete-tpl-btn btn btn-danger btn-sm">Usuń</button>
            </div>`;
        adminTemplatesList.appendChild(card);
    });

    document.querySelectorAll('.edit-tpl-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            loadTemplateIntoAdmin(e.target.getAttribute('data-id'));
        });
    });

    document.querySelectorAll('.delete-tpl-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (!confirm('Czy na pewno usunąć ten szablon bezpowrotnie?')) return;
            const delId  = e.target.getAttribute('data-id');
            const delTpl = store.templates.find(t => t.id === delId);
            btn.disabled = true;
            await store.deleteTemplate(delId);
            logger.log('TEMPLATE_DELETE', `Usunięto szablon: ${delTpl ? delTpl.name : delId}`);
            renderAdminTemplatesList();
            populateTemplateSelector();
            if (currentTemplate && currentTemplate.id === delId) {
                if (store.templates.length) loadTemplate(store.templates[0].id);
            }
        });
    });
};

if (addTemplateBtn) {
    addTemplateBtn.addEventListener('click', () => {
        editingTemplateId = null;
        document.getElementById('admin-tpl-id').value   = '';
        document.getElementById('admin-tpl-name').value = '';
        document.getElementById('admin-tpl-html').value = '';
        adminFieldsList.innerHTML = '';
        _showAdminEditor(true);
    });
}

function loadTemplateIntoAdmin(id) {
    const tpl = store.templates.find(t => t.id === id);
    if (!tpl) return;
    editingTemplateId = tpl.id;
    document.getElementById('admin-tpl-id').value   = tpl.id;
    document.getElementById('admin-tpl-name').value = tpl.name;
    document.getElementById('admin-tpl-html').value = tpl.html;

    adminFieldsList.innerHTML = '';
    tpl.fields.forEach(field => adminFieldsList.appendChild(createAdminFieldRow(field)));
    _showAdminEditor(true);
}

if (addFieldBtn) {
    addFieldBtn.addEventListener('click', () => {
        adminFieldsList.appendChild(createAdminFieldRow({ id: '', label: '', type: 'text', default: '', visibleIf: '' }));
    });
}

function createAdminFieldRow(data) {
    const row = document.createElement('div');
    row.style.cssText = 'background:rgba(255,255,255,0.6);padding:16px;border:1px solid var(--border-color);border-radius:var(--radius-md);display:flex;flex-direction:column;gap:8px;position:relative;';
    row.className = 'admin-field-row';
    row.innerHTML = `
        <button type="button" class="remove-admin-field-btn" style="position:absolute;top:8px;right:8px;background:none;border:none;color:red;cursor:pointer;font-size:1.2rem;line-height:1;" title="Usuń pole">×</button>
        <div style="display:flex;gap:12px;">
            <div style="flex:1">
                <label style="font-size:0.75rem;">ID (Nazwa zmiennej)</label>
                <input type="text" class="field-setting-id" value="${escapeHtml(data.id || '')}" placeholder="np. tytul_1" required>
            </div>
            <div style="flex:1">
                <label style="font-size:0.75rem;">Etykieta pola</label>
                <input type="text" class="field-setting-label" value="${escapeHtml(data.label || '')}" placeholder="np. Główny Tytuł" required>
            </div>
            <div style="flex:1">
                <label style="font-size:0.75rem;">Typ pola</label>
                <select class="field-setting-type">
                    <option value="text"           ${data.type === 'text'            ? 'selected' : ''}>Krótki tekst</option>
                    <option value="textarea"       ${data.type === 'textarea'        ? 'selected' : ''}>Długi tekst (Textarea)</option>
                    <option value="image-url"      ${data.type === 'image-url'       ? 'selected' : ''}>Adres obrazu (URL)</option>
                    <option value="boolean"        ${data.type === 'boolean'         ? 'selected' : ''}>Przełącznik (Prawda/Fałsz)</option>
                    <option value="contact-select" ${data.type === 'contact-select'  ? 'selected' : ''}>Wybór Kontaktu PR</option>
                </select>
            </div>
        </div>
        <div style="display:flex;gap:12px;">
            <div style="flex:1">
                <label style="font-size:0.75rem;">Domyślna wartość</label>
                <input type="text" class="field-setting-default" value="${escapeHtml(String(data.default !== undefined ? data.default : ''))}">
            </div>
            <div style="flex:1">
                <label style="font-size:0.75rem;">Sekcja</label>
                <select class="field-setting-section">
                    <option value="Nagłówek"          ${(data.section || '') === 'Nagłówek'          ? 'selected' : ''}>Nagłówek</option>
                    <option value="Treść"             ${(data.section || '') === 'Treść'             ? 'selected' : ''}>Treść</option>
                    <option value="Materiały prasowe" ${(data.section || '') === 'Materiały prasowe' ? 'selected' : ''}>Materiały prasowe</option>
                    <option value="Stopka"            ${(data.section || '') === 'Stopka'            ? 'selected' : ''}>Stopka</option>
                    <option value="Opcje"             ${(data.section || '') === 'Opcje'             ? 'selected' : ''}>Opcje</option>
                    <option value="Ogólne"            ${(!data.section || data.section === 'Ogólne') ? 'selected' : ''}>Ogólne</option>
                </select>
            </div>
            <div style="flex:0.5;display:flex;align-items:flex-end;padding-bottom:4px;">
                <label style="font-size:0.75rem;cursor:pointer;">
                    <input type="checkbox" class="field-setting-locked" ${data.locked ? 'checked' : ''}> Tylko do odczytu
                </label>
            </div>
        </div>
        <div style="display:flex;gap:12px;margin-top:8px;">
            <div style="flex:1">
                <label style="font-size:0.75rem;">Wypełnianie z Bazy PR (Autofill)</label>
                <select class="field-setting-autofill">
                    <option value=""         ${!data.autofill                  ? 'selected' : ''}>-- Wpisz ręcznie --</option>
                    <option value="name"     ${data.autofill === 'name'        ? 'selected' : ''}>Imię i Nazwisko</option>
                    <option value="position" ${data.autofill === 'position'    ? 'selected' : ''}>Stanowisko</option>
                    <option value="email"    ${data.autofill === 'email'       ? 'selected' : ''}>E-mail</option>
                    <option value="phone"    ${data.autofill === 'phone'       ? 'selected' : ''}>Telefon</option>
                </select>
            </div>
            <div style="flex:2"></div>
        </div>`;
    row.querySelector('.remove-admin-field-btn').addEventListener('click', () => row.remove());
    return row;
}

// Upload & skan HTML
const adminHtmlUploadInput = document.getElementById('admin-html-upload');
const adminHtmlUploadBtn   = document.getElementById('admin-html-upload-btn');
const adminScanHtmlBtn     = document.getElementById('admin-scan-html-btn');

if (adminHtmlUploadBtn) {
    adminHtmlUploadBtn.addEventListener('click', () => adminHtmlUploadInput.click());
}
if (adminHtmlUploadInput) {
    adminHtmlUploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => { document.getElementById('admin-tpl-html').value = ev.target.result; };
        reader.readAsText(file);
    });
}

if (adminScanHtmlBtn) {
    adminScanHtmlBtn.addEventListener('click', () => {
        const html = document.getElementById('admin-tpl-html').value;
        if (!html.trim()) { alert('Proszę najpierw wgrać kod HTML.'); return; }

        let foundVars = new Set();
        let types     = {};
        let defaults  = {};

        const condRe = /<!--\[if:([a-zA-Z0-9_]+)\]-->/g;
        let m;
        while ((m = condRe.exec(html)) !== null) {
            foundVars.add(m[1]);
            types[m[1]]    = 'boolean';
            defaults[m[1]] = true;
        }
        const varRe = /\{\{([a-zA-Z0-9_]+)\}\}/g;
        while ((m = varRe.exec(html)) !== null) {
            foundVars.add(m[1]);
            if (!types[m[1]]) types[m[1]] = 'text';
        }

        if (foundVars.size === 0) {
            if (confirm('Nie znaleziono własnych tagów. Użyć Smart Transformera?')) {
                const result = smartHtmlTransformer(html);
                document.getElementById('admin-tpl-html').value = result.newHtml;
                result.fields.forEach(f => adminFieldsList.appendChild(createAdminFieldRow(f)));
                alert(`Transformacja gotowa! Utworzono ${result.fields.length} zmiennych.`);
            }
            return;
        }

        const existingVars = Array.from(document.querySelectorAll('.admin-field-row .field-setting-id')).map(i => i.value.trim());
        let addedCount = 0;
        foundVars.forEach(vName => {
            if (!existingVars.includes(vName)) {
                adminFieldsList.appendChild(createAdminFieldRow({
                    id:      vName,
                    label:   vName.charAt(0).toUpperCase() + vName.slice(1),
                    type:    types[vName] || 'text',
                    default: defaults[vName] !== undefined ? defaults[vName] : '',
                }));
                addedCount++;
            }
        });
        alert(`Skanowanie gotowe! ${foundVars.size} zmiennych (nowych: ${addedCount}).`);
    });
}

if (cancelTemplateBtn) {
    cancelTemplateBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (editingTemplateId) {
            loadTemplateIntoAdmin(editingTemplateId);
        } else {
            document.getElementById('admin-tpl-name').value = '';
            document.getElementById('admin-tpl-html').value = '';
            adminFieldsList.innerHTML = '';
            _showAdminEditor(false);
        }
    });
}

if (saveTemplateBtn) {
    saveTemplateBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!adminForm.checkValidity()) { adminForm.reportValidity(); return; }

        const tplName = document.getElementById('admin-tpl-name').value.trim();
        const tplId   = editingTemplateId || tplName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const tplHtml = document.getElementById('admin-tpl-html').value;

        const fields = [];
        adminFieldsList.querySelectorAll('.admin-field-row').forEach(row => {
            const id = row.querySelector('.field-setting-id').value.trim();
            if (!id) return;
            const type            = row.querySelector('.field-setting-type').value;
            const defaultValueRaw = row.querySelector('.field-setting-default').value;
            let defaultVal        = defaultValueRaw;
            if (type === 'boolean') defaultVal = (defaultValueRaw === 'true' || defaultValueRaw === '1');
            fields.push({
                id,
                label:     row.querySelector('.field-setting-label').value.trim(),
                type,
                default:   defaultVal,
                section:   row.querySelector('.field-setting-section')?.value.trim() || 'Ogólne',
                locked:    row.querySelector('.field-setting-locked')?.checked || false,
                autofill:  row.querySelector('.field-setting-autofill')?.value || '',
            });
        });

        const newTpl = { id: tplId, name: tplName, fields, html: tplHtml };

        saveTemplateBtn.disabled    = true;
        saveTemplateBtn.textContent = 'Zapisywanie…';
        try {
            await store.saveTemplate(newTpl);
            editingTemplateId = tplId;
            logger.log('TEMPLATE_SAVE', `Zapisano szablon: ${tplName} (ID: ${tplId})`);
            renderAdminTemplatesList();
            populateTemplateSelector();
            if (currentTemplate && currentTemplate.id === tplId) loadTemplate(tplId);
        } catch (err) {
            alert('Błąd zapisu szablonu: ' + err.message);
        } finally {
            saveTemplateBtn.disabled    = false;
            saveTemplateBtn.textContent = 'Zapisz Szablon';
        }
    });
}

// ── Smart HTML Transformer ────────────────────────────────────────────────────
function smartHtmlTransformer(html) {
    const parser  = new DOMParser();
    const doc     = parser.parseFromString(html, 'text/html');
    let generatedFields = [];
    let counters  = {};
    const isFullDoc = html.toLowerCase().includes('<html');
    let currentSection = 'Nagłówek';

    function updateSection(text) {
        const lower = text.toLowerCase().trim();
        if (currentSection === 'Nagłówek' && (lower.includes('dzień dobry') || lower.includes('cześć') || lower.includes('informacja prasowa') || lower.length > 50)) currentSection = 'Treść';
        else if (currentSection === 'Treść' && (lower.includes('materiały prasowe') || lower.includes('do pobrania') || lower.includes('packshot'))) currentSection = 'Materiały prasowe';
        else if (currentSection === 'Materiały prasowe' && (lower.includes('kontakt prasowy') || lower.includes('biuro prasowe'))) currentSection = 'Stopka';
    }

    function generateSemanticName(elementNode, defaultBase) {
        let base = defaultBase;
        let targetNode = elementNode;
        if (targetNode.nodeType === Node.TEXT_NODE) targetNode = targetNode.parentElement;
        if (targetNode && targetNode.className && typeof targetNode.className === 'string') {
            const firstClass = targetNode.className.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');
            if (firstClass) base = firstClass.toLowerCase();
        } else if (targetNode && targetNode.tagName) {
            base = targetNode.tagName.toLowerCase();
        }
        if (!counters[base]) counters[base] = 1;
        return `${base}_${counters[base]++}`;
    }

    function processNode(node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = node.tagName.toLowerCase();
            if (['style', 'script', 'title', 'meta'].includes(tagName)) return;
            if (tagName === 'a') {
                const href = node.getAttribute('href');
                if (href && href.trim() !== '' && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('{{')) {
                    const varName = generateSemanticName(node, 'link');
                    generatedFields.push({ id: varName, label: `Link: ${href.substring(0, 30)}…`, type: 'text', default: href, section: currentSection });
                    node.setAttribute('href', `{{${varName}}}`);
                }
            }
            if (tagName === 'img') {
                const src = node.getAttribute('src');
                if (src && src.trim() !== '' && !src.startsWith('{{') && !src.startsWith('data:')) {
                    const varName = generateSemanticName(node, 'img');
                    generatedFields.push({ id: varName, label: `Obraz: ${node.getAttribute('alt') || src.substring(0, 25)}…`, type: 'image-url', default: src, section: currentSection });
                    node.setAttribute('src', `{{${varName}}}`);
                }
            }
        }
        if (node.nodeType === Node.TEXT_NODE) {
            const parentTagName = node.parentElement ? node.parentElement.tagName.toLowerCase() : '';
            if (['style', 'script', 'title'].includes(parentTagName)) return;
            const text = node.nodeValue;
            if (text.trim().length >= 3 && /[a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(text) && !text.includes('{{')) {
                updateSection(text);
                const isLong  = text.trim().length > 40;
                const varName = generateSemanticName(node, isLong ? 'tresc' : 'etykieta');
                generatedFields.push({ id: varName, label: text.trim().substring(0, 40) + '…', type: isLong ? 'textarea' : 'text', default: text.trim().replace(/\s+/g, ' '), section: currentSection });
                node.nodeValue = `{{${varName}}}`;
            }
        } else {
            Array.from(node.childNodes).forEach(processNode);
        }
    }

    processNode(doc.body);

    generatedFields.forEach(f => {
        if (f.section !== 'Stopka') return;
        const val = (f.default || '').toLowerCase();
        if (!f.autofill) {
            if (/@/.test(val) && val.includes('.'))                       { f.autofill = 'email';    f.label = '📧 E-mail kontaktowy'; }
            else if (/^\+?[\d\s\-()]{7,}$/.test(val.trim()))             { f.autofill = 'phone';    f.label = '📞 Telefon kontaktowy'; }
            else if (/^[A-ZŁŚŻŹ][a-ząćęłńóśźż]+ [A-ZŁŚŻŹ][a-ząćęłńóśźż]+$/.test(val.trim())) { f.autofill = 'name'; f.label = '👤 Imię i Nazwisko'; }
            else if (/manager|director|specjalist|pr |press|rzecznik/i.test(val)) { f.autofill = 'position'; f.label = '🏢 Stanowisko'; }
        }
    });

    const contactSelectField = { id: 'wybor_kontaktu_pr', label: '👤 Wybierz Kontakt PR — wypełni pola stopki', type: 'contact-select', default: '', section: 'Stopka' };
    const firstStopkaIdx = generatedFields.findIndex(f => f.section === 'Stopka');
    if (firstStopkaIdx !== -1) generatedFields.splice(firstStopkaIdx, 0, contactSelectField);
    else generatedFields.push(contactSelectField);

    let prefix = '';
    if (isFullDoc) {
        const match = html.match(/^([\s\S]*?)<html/i);
        if (match) prefix = match[1];
    }
    const newHtml = isFullDoc ? prefix + doc.documentElement.outerHTML : doc.body.innerHTML;
    return { newHtml, fields: generatedFields };
}

// ── Panel logów ───────────────────────────────────────────────────────────────
async function renderLogsPanel() {
    const container = document.getElementById('logs-table-container');
    if (!container) return;

    container.innerHTML = '<p style="color:#888;padding:16px;">Ładowanie logów…</p>';
    let entries = [];
    try {
        entries = await logger.getAll();
    } catch (e) {
        container.innerHTML = `<p style="color:#e87070;padding:16px;">Błąd ładowania logów: ${escapeHtml(e.message)}</p>`;
        return;
    }

    entries = entries.slice().reverse(); // najnowsze pierwsze

    if (entries.length === 0) {
        container.innerHTML = '<p style="color:#888;padding:16px;">Brak zapisanych logów.</p>';
        return;
    }

    const rows = entries.map(e => {
        const ts = new Date(e.timestamp).toLocaleString('pl-PL');
        const actionClass = e.action.startsWith('LOGIN')    ? 'log-action-auth'
            : e.action.startsWith('LOGOUT')                 ? 'log-action-auth'
            : e.action.startsWith('EXPORT')                 ? 'log-action-export'
            : e.action.startsWith('TEMPLATE')               ? 'log-action-template'
            : e.action.startsWith('CONTACT')                ? 'log-action-contact'
            : '';
        return `<tr>
            <td style="white-space:nowrap;color:#888;font-size:0.8rem;">${ts}</td>
            <td style="font-weight:600;">${escapeHtml(e.user)}</td>
            <td><span class="log-action-badge ${actionClass}">${escapeHtml(e.action)}</span></td>
            <td style="color:#555;font-size:0.9rem;">${escapeHtml(e.details)}</td>
        </tr>`;
    }).join('');

    container.innerHTML = `
        <table class="logs-table">
            <thead>
                <tr><th>Czas</th><th>Użytkownik</th><th>Akcja</th><th>Szczegóły</th></tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>`;
}

// Przyciski logów
document.addEventListener('DOMContentLoaded', () => {
    const clearBtn = document.getElementById('clear-logs-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
            if (!confirm('Czy na pewno wyczyścić wszystkie logi?')) return;
            clearBtn.disabled = true;
            try {
                await logger.clear();
                renderLogsPanel();
            } finally {
                clearBtn.disabled = false;
            }
        });
    }

    const exportBtn = document.getElementById('export-logs-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            exportBtn.disabled = true;
            try {
                const blob = await logger.exportCsvBlob();
                const a = document.createElement('a');
                a.href     = URL.createObjectURL(blob);
                a.download = `wec-logi-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            } catch (e) {
                alert('Błąd eksportu: ' + e.message);
            } finally {
                exportBtn.disabled = false;
            }
        });
    }
});

// ── Zarządzanie użytkownikami ─────────────────────────────────────────────────

const addUserBtn       = document.getElementById('add-user-btn');
const userForm         = document.getElementById('user-form');
const userRoleSelect   = document.getElementById('user-role');
const userPermsSection = document.getElementById('user-permissions-section');
const cancelUserBtn    = document.getElementById('cancel-user-btn');
const saveUserBtn      = document.getElementById('save-user-btn');

function _showUsersEditor(visible) {
    const empty  = document.getElementById('users-editor-empty');
    const editor = document.getElementById('users-editor-form');
    if (empty)  empty.style.display  = visible ? 'none'  : 'flex';
    if (editor) editor.style.display = visible ? 'flex'  : 'none';
}

function _toggleUserPerms() {
    if (!userRoleSelect || !userPermsSection) return;
    userPermsSection.style.display = userRoleSelect.value === 'admin' ? 'none' : '';
}

if (userRoleSelect) userRoleSelect.addEventListener('change', _toggleUserPerms);

function openUserEditor(user = null) {
    const isEdit = !!user;

    const title = document.getElementById('users-editor-title');
    if (title) title.textContent = isEdit ? 'Edytuj Użytkownika' : 'Nowy Użytkownik';

    document.getElementById('user-edit-username').value = isEdit ? user.username    : '';
    document.getElementById('user-username').value      = isEdit ? user.username    : '';
    document.getElementById('user-displayname').value   = isEdit ? user.displayName : '';
    document.getElementById('user-password').value      = '';
    document.getElementById('user-role').value          = isEdit ? user.role        : 'user';

    const usernameInput = document.getElementById('user-username');
    if (usernameInput) {
        usernameInput.readOnly = isEdit;
        usernameInput.style.opacity = isEdit ? '0.6' : '';
    }

    const pwHint = document.getElementById('user-password-hint');
    if (pwHint) pwHint.style.display = isEdit ? '' : 'none';

    const pwInput = document.getElementById('user-password');
    if (pwInput) pwInput.required = !isEdit;

    const perms = isEdit ? (user.permissions || {}) : {};
    const ptpl  = document.getElementById('perm-edit-templates');
    const pmgr  = document.getElementById('perm-manage-contacts');
    if (ptpl) ptpl.checked = perms.canEditTemplates  !== false;
    if (pmgr) pmgr.checked = perms.canManageContacts !== false;

    _toggleUserPerms();
    _showUsersEditor(true);
}

if (addUserBtn)    addUserBtn.addEventListener('click',  () => openUserEditor(null));
if (cancelUserBtn) cancelUserBtn.addEventListener('click', () => _showUsersEditor(false));

async function renderUsersList() {
    const list = document.getElementById('users-list');
    if (!list) return;
    list.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;">Ładowanie…</p>';

    let users = [];
    try {
        users = await api.getUsers();
    } catch (e) {
        list.innerHTML = `<p style="color:#e87070;font-size:0.9rem;">Błąd: ${escapeHtml(e.message)}</p>`;
        return;
    }

    list.innerHTML = '';
    const currentUser = auth.getCurrentUser();

    users.forEach(u => {
        const isSelf = u.username === currentUser;
        const roleBadge = u.role === 'admin'
            ? `<span style="background:rgba(79,70,229,0.12);color:var(--primary);padding:2px 8px;border-radius:99px;font-size:0.72rem;font-weight:600;">Admin</span>`
            : `<span style="background:rgba(0,0,0,0.07);color:var(--text-muted);padding:2px 8px;border-radius:99px;font-size:0.72rem;font-weight:600;">Użytkownik</span>`;

        const card = document.createElement('div');
        card.className = 'contact-card';
        card.innerHTML = `
            <div class="contact-info">
                <strong>${escapeHtml(u.displayName)}</strong>
                <span style="display:flex;align-items:center;gap:6px;margin-top:3px;">
                    <code style="font-size:0.78rem;">${escapeHtml(u.username)}</code>
                    ${roleBadge}
                    ${isSelf ? `<span style="font-size:0.72rem;color:var(--primary);">(Ty)</span>` : ''}
                </span>
            </div>
            <div class="contact-actions">
                <button data-username="${escapeHtml(u.username)}" class="edit-user-btn btn btn-secondary"
                    style="padding:4px 10px;font-size:0.8rem;">Edytuj</button>
                ${!isSelf ? `<button data-username="${escapeHtml(u.username)}" class="delete-user-btn btn"
                    style="padding:4px 10px;font-size:0.8rem;background:rgba(220,50,50,0.1);color:#e87070;">Usuń</button>` : ''}
            </div>`;
        list.appendChild(card);
    });

    list.querySelectorAll('.edit-user-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const u = users.find(x => x.username === btn.getAttribute('data-username'));
            if (u) openUserEditor(u);
        });
    });

    list.querySelectorAll('.delete-user-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const uname = btn.getAttribute('data-username');
            if (!confirm(`Czy na pewno usunąć użytkownika "${uname}"?`)) return;
            btn.disabled = true;
            try {
                await api.deleteUser(uname);
                logger.log('USER_DELETE', `Usunięto użytkownika: ${uname}`);
                _showUsersEditor(false);
                renderUsersList();
            } catch (e) {
                alert('Błąd: ' + e.message);
                btn.disabled = false;
            }
        });
    });
}

if (saveUserBtn) {
    saveUserBtn.addEventListener('click', async () => {
        if (!userForm || !userForm.checkValidity()) { userForm?.reportValidity(); return; }

        const editUsername = document.getElementById('user-edit-username').value;
        const isEdit = !!editUsername;

        const payload = {
            username:    isEdit ? editUsername : document.getElementById('user-username').value.trim(),
            displayName: document.getElementById('user-displayname').value.trim(),
            password:    document.getElementById('user-password').value || undefined,
            role:        document.getElementById('user-role').value,
            permissions: {
                canEditTemplates:  document.getElementById('perm-edit-templates')?.checked ?? true,
                canManageContacts: document.getElementById('perm-manage-contacts')?.checked ?? true,
            },
        };
        if (payload.role === 'admin') payload.permissions = {};

        saveUserBtn.disabled    = true;
        saveUserBtn.textContent = 'Zapisywanie…';
        try {
            await api.saveUser(payload);
            logger.log(isEdit ? 'USER_EDIT' : 'USER_ADD',
                `${isEdit ? 'Zaktualizowano' : 'Dodano'} użytkownika: ${payload.username} (${payload.role})`);
            _showUsersEditor(false);
            renderUsersList();
        } catch (err) {
            alert('Błąd zapisu: ' + err.message);
        } finally {
            saveUserBtn.disabled    = false;
            saveUserBtn.textContent = 'Zapisz';
        }
    });
}

// ── Przełącznik motywu (ciemny / jasny) ───────────────────────────────────────

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('wec_theme', theme);
    const sunIcon  = document.getElementById('theme-icon-sun');
    const moonIcon = document.getElementById('theme-icon-moon');
    if (sunIcon)  sunIcon.style.display  = theme === 'dark' ? '' : 'none';
    if (moonIcon) moonIcon.style.display = theme === 'dark' ? 'none' : '';
}

function setupThemeToggle() {
    const saved = localStorage.getItem('wec_theme');
    applyTheme(saved === 'dark' ? 'dark' : 'light');

    const btn = document.getElementById('theme-toggle-btn');
    if (btn) {
        btn.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            applyTheme(current === 'dark' ? 'light' : 'dark');
        });
    }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
setupThemeToggle();
setupLogout();

(async () => {
    if (auth.isAuthenticated()) {
        // Weryfikuj token (może wygasnąć po restarcie serwera)
        try {
            await auth.verify();
            updateUserDisplay();
            // Overlay nie jest widoczny, jeśli auth OK
            const overlay = document.getElementById('login-overlay');
            if (overlay) overlay.style.display = 'none';
            await init();
        } catch (_) {
            // Token nieważny — wyczyść i pokaż logowanie
            await auth.logout();
            setupLoginOverlay();
        }
    } else {
        setupLoginOverlay();
    }
})();
