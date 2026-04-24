function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function isImageField(field, htmlTemplate = '') {
    if (!field || !field.id) return false;
    if (field.type === 'image-url') return true;
    if (!htmlTemplate) return false;

    const placeholder = `\\{\\{\\s*${escapeRegExp(field.id)}\\s*\\}\\}`;
    const imageSrcPattern = new RegExp(`<img\\b[^>]*\\bsrc\\s*=\\s*["'][^"']*${placeholder}[^"']*["']`, 'i');
    const imageUrlPattern = new RegExp(`url\\(\\s*["']?[^)]*${placeholder}[^)]*["']?\\s*\\)`, 'i');

    return imageSrcPattern.test(htmlTemplate) || imageUrlPattern.test(htmlTemplate);
}

export function normalizeExternalImageUrl(value) {
    if (typeof value !== 'string') return value;

    const trimmed = value.trim();
    if (!trimmed) return '';

    if (/^(data:|blob:|cid:|file:|https?:)/i.test(trimmed)) {
        return trimmed;
    }

    let candidate = trimmed;

    if (trimmed.startsWith('//')) {
        candidate = `https:${trimmed}`;
    } else if (/^www\./i.test(trimmed) || /^[a-z0-9.-]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(trimmed)) {
        candidate = `https://${trimmed}`;
    }

    try {
        return new URL(candidate).toString();
    } catch {
        return candidate;
    }
}

export function getRenderableValues(template, values = {}) {
    const nextValues = { ...values };

    (template?.fields || []).forEach(field => {
        if (isImageField(field, template?.html)) {
            nextValues[field.id] = normalizeExternalImageUrl(nextValues[field.id]);
        }
    });

    return nextValues;
}

export function decorateImageTags(html = '') {
    if (!html) return html;
    return html.replace(/<img\b(?![^>]*\breferrerpolicy=)/gi, '<img referrerpolicy="no-referrer"');
}

export function normalizeTemplateSchema(template) {
    if (!template || !Array.isArray(template.fields)) return template;

    let didChange = false;
    const nextFields = template.fields.map(field => {
        if (isImageField(field, template.html) && field.type !== 'image-url') {
            didChange = true;
            return { ...field, type: 'image-url' };
        }
        return field;
    });

    if (!didChange) return template;
    return { ...template, fields: nextFields };
}
