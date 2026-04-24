/**
 * renderTemplate(htmlTemplate, values, rawValues)
 *
 * - values:    plain field values (strings get HTML-escaped)
 * - rawValues: pre-rendered HTML fragments (contact cards etc.) — inserted as-is, no escaping
 */
export function renderTemplate(htmlTemplate, values, rawValues = {}) {
    let result = htmlTemplate;

    // 1. Boolean conditionals <!--[if:fieldName]--> ... <!--[/if:fieldName]-->
    const conditionalRegex = /<!--\[if:([a-zA-Z0-9_]+)\]-->([\s\S]*?)<!--\[\/if:\1\]-->/g;
    result = result.replace(conditionalRegex, (_match, fieldName, content) => {
        const isVisible = values[fieldName] === true || values[fieldName] === 'true';
        return isVisible ? content : '';
    });

    // 2. Non-empty conditionals <!--[ifnotempty:fieldName]--> ... <!--[/ifnotempty:fieldName]-->
    //    Prefers rawValues (rendered HTML) over values for fields like contact-select.
    const nonemptyRegex = /<!--\[ifnotempty:([a-zA-Z0-9_]+)\]-->([\s\S]*?)<!--\[\/ifnotempty:\1\]-->/g;
    result = result.replace(nonemptyRegex, (_match, fieldName, content) => {
        const checkVal = (fieldName in rawValues) ? rawValues[fieldName] : values[fieldName];
        const isEmpty = checkVal === undefined || checkVal === null || String(checkVal).trim() === '';
        return isEmpty ? '' : content;
    });

    // 3. Auto-remove HTML elements whose ENTIRE content is a single empty placeholder.
    //    Handles: <tag ...>   {{field}}   </tag>  →  removed when field is empty.
    //    Does NOT remove rawValues fields (contacts etc.) even if empty — let the template decide.
    const singlePlaceholderEl = /<([a-zA-Z][a-zA-Z0-9]*)(\s[^>]*)?\s*>\s*\{\{([a-zA-Z0-9_]+)\}\}\s*<\/\1\s*>/g;
    result = result.replace(singlePlaceholderEl, (_match, _tag, _attrs, fieldName) => {
        if (fieldName in rawValues) return _match; // raw values handled later
        const val = values[fieldName];
        const isEmpty = val === undefined || val === null || String(val).trim() === '';
        return isEmpty ? '' : _match;
    });

    // 4. Replace all {{fieldName}} placeholders
    const placeholderRegex = /\{\{([a-zA-Z0-9_]+)\}\}/g;
    result = result.replace(placeholderRegex, (match, fieldName) => {
        // rawValues are inserted as-is (HTML allowed)
        if (fieldName in rawValues) {
            const raw = rawValues[fieldName];
            return raw === undefined || raw === null ? '' : String(raw);
        }

        let val = values[fieldName];
        if (val === undefined || val === null) val = '';
        if (typeof val === 'string') {
            val = val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            val = val.replace(/\n/g, '<br>');
        }
        return val;
    });

    // 5. Smart empty-block removal: remove elements with no visible content after substitution.
    //    Uses DOMParser (browser-only). Runs bottom-up until stable.
    if (typeof DOMParser !== 'undefined') {
        result = _removeEmptyBlocks(result);
    }

    return result;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function _hasVisibleContent(el) {
    for (const node of el.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
            if (node.nodeValue.trim() !== '') return true;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            // Self-contained elements always count as visible content
            if (['IMG', 'INPUT', 'VIDEO', 'AUDIO', 'CANVAS', 'OBJECT', 'EMBED'].includes(node.tagName)) return true;
            if (node.tagName === 'HR') return true; // visual separator
            if (_hasVisibleContent(node)) return true;
        }
    }
    return false;
}

/**
 * Parse the HTML, find and remove all block/inline elements that have no visible
 * content (recursively, bottom-up). Table-structure elements are excluded to avoid
 * breaking email table layouts.
 */
function _removeEmptyBlocks(html) {
    const isFullDoc = /<html[\s>]/i.test(html);
    const doc = new DOMParser().parseFromString(
        isFullDoc ? html : `<!DOCTYPE html><html><body>${html}</body></html>`,
        'text/html'
    );

    // Elements safe to remove when empty. Table structure (tr/td/th/table/thead/tbody)
    // intentionally excluded — removing them would break layout columns.
    const REMOVABLE = 'div,p,h1,h2,h3,h4,h5,h6,section,article,header,footer,li,blockquote,span,a,strong,em,b,i';

    let changed = true;
    while (changed) {
        changed = false;
        const elements = doc.body.querySelectorAll(REMOVABLE);
        // Reverse = bottom-up: children processed before their parents
        for (let i = elements.length - 1; i >= 0; i--) {
            const el = elements[i];
            if (!el.isConnected) continue;
            if (!_hasVisibleContent(el)) {
                el.remove();
                changed = true;
            }
        }
    }

    return isFullDoc ? doc.documentElement.outerHTML : doc.body.innerHTML;
}
