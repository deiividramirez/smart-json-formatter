// Smart JSON Formatter — Browser Interactive Script

// --- Templates ---
const TEMPLATES = {
    coordinates: `{
  "name": "3D Path Segment",
  "width": 1.5,
  "color": "blue",
  "visible": true,
  "points": [
    [0.0, 0.0, 0.0],
    [10.0, 15.5, 3.2],
    [-5.2, 8.4, 1.2],
    [22.1, -4.0, 0.0]
  ],
  "bounding_box": {
    "min": [-10.0, -10.0, -5.0],
    "max": [30.0, 30.0, 10.0]
  }
}`,
    config: `{
  // Basic settings for the text editor
  "editor.fontSize": 14,
  "editor.tabSize": 2,
  "editor.wordWrap": "on",
  
  /* Formatter specific settings */
  "smartJsonFormatter.indent": 2,
  "smartJsonFormatter.maxWidth": 120, // Threshold for line wrapping
  
  // Active features list
  "features": ["autoSave", "formatOnSave", "minimap"]
}`,
    complex: `{
  "status": "success",
  "timestamp": 1716123456,
  "results_count": 2,
  "data": {
    "query": "fetch_users",
    "users": [
      { "id": 101, "username": "alice", "roles": ["admin", "editor"], "active": true },
      { "id": 102, "username": "bob", "roles": ["viewer"], "active": false }
    ],
    "meta": {
      "api_version": "v2.1",
      "server_location": "us-east-1"
    }
  }
}`
};

// --- Formatter Implementation ---

function stripComments(text) {
    const pattern = /("[^"\\]*(?:\\.[^"\\]*)*")|('[^'\\]*(?:\\.[^\'\\]*)*')|(\/\*[^*]*\*+(?:[^\/*][^*]*\*+)*\/)|(\/\/.*)/g;
    return text.replace(pattern, (match, g1, g2) => {
        if (g1) { return g1; }
        if (g2) { return g2; }
        return "";
    });
}

function getErrorPosition(text, error) {
    const posMatch = error.message.match(/at position (\d+)/);
    if (posMatch) {
        const pos = parseInt(posMatch[1], 10);
        let line = 1;
        let column = 1;
        for (let i = 0; i < Math.min(pos, text.length); i++) {
            if (text[i] === '\n') {
                line++;
                column = 1;
            } else {
                column++;
            }
        }
        return { line, column };
    }

    const lineColMatch = error.message.match(/at line (\d+) column (\d+)/);
    if (lineColMatch) {
        return {
            line: parseInt(lineColMatch[1], 10),
            column: parseInt(lineColMatch[2], 10)
        };
    }

    return null;
}

function formatCompact(obj, budget, sortKeys) {
    if (obj === null || typeof obj !== 'object') {
        const res = JSON.stringify(obj);
        return res.length <= budget ? res : null;
    }

    if (Array.isArray(obj)) {
        if (obj.length === 0) {
            return budget >= 2 ? "[]" : null;
        }
        let remaining = budget - 2; // For '[' and ']'
        const parts = [];
        for (let i = 0; i < obj.length; i++) {
            if (i > 0) { remaining -= 2; } // For ', '
            if (remaining < 0) { return null; }
            const part = formatCompact(obj[i], remaining, sortKeys);
            if (part === null) { return null; }
            parts.push(part);
            remaining -= part.length;
        }
        return `[${parts.join(", ")}]`;
    } else {
        const keys = Object.keys(obj);
        if (keys.length === 0) {
            return budget >= 2 ? "{}" : null;
        }
        if (sortKeys) {
            keys.sort();
        }
        let remaining = budget - 4; // For '{ ' and ' }'
        const parts = [];
        for (let i = 0; i < keys.length; i++) {
            if (i > 0) { remaining -= 2; } // For ', '
            if (remaining < 0) { return null; }
            const key = keys[i];
            const keyPart = JSON.stringify(key);
            remaining -= keyPart.length + 2; // For '"key": '
            if (remaining < 0) { return null; }
            const valPart = formatCompact(obj[key], remaining, sortKeys);
            if (valPart === null) { return null; }
            parts.push(`${keyPart}: ${valPart}`);
            remaining -= valPart.length;
        }
        return `{ ${parts.join(", ")} }`;
    }
}

function formatExpanded(obj, level, indentStep, maxWidth, sortKeys) {
    if (obj === null || typeof obj !== 'object') {
        return JSON.stringify(obj);
    }

    const currentIndent = " ".repeat(level * indentStep);
    const nextIndent = " ".repeat((level + 1) * indentStep);

    // Try formatting compactly first
    const budget = maxWidth - currentIndent.length;
    if (budget > 0) {
        const compact = formatCompact(obj, budget, sortKeys);
        if (compact !== null) {
            return compact;
        }
    }

    // Expand if it doesn't fit
    if (Array.isArray(obj)) {
        if (obj.length === 0) { return "[]"; }
        const parts = [];
        for (const item of obj) {
            const formattedItem = formatExpanded(item, level + 1, indentStep, maxWidth, sortKeys);
            parts.push(`${nextIndent}${formattedItem}`);
        }
        return `[\n${parts.join(",\n")}\n${currentIndent}]`;
    } else {
        const keys = Object.keys(obj);
        if (keys.length === 0) { return "{}"; }
        if (sortKeys) {
            keys.sort();
        }
        const parts = [];
        for (const key of keys) {
            const keyPart = JSON.stringify(key);
            const formattedVal = formatExpanded(obj[key], level + 1, indentStep, maxWidth, sortKeys);
            parts.push(`${nextIndent}${keyPart}: ${formattedVal}`);
        }
        return `{\n${parts.join(",\n")}\n${currentIndent}}`;
    }
}

function formatText(text, options = {}) {
    const indent = options.indent ?? 2;
    const maxWidth = options.maxWidth ?? 120;
    const sortKeys = options.sortKeys !== false;
    const shouldStripComments = options.stripComments ?? true;

    if (!text.trim()) {
        return "";
    }

    let textToParse = text;
    if (shouldStripComments) {
        textToParse = stripComments(text);
    }

    const parsed = JSON.parse(textToParse);
    return formatExpanded(parsed, 0, indent, maxWidth, sortKeys);
}

// --- DOM & Application Logic ---

document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const jsonInput = document.getElementById('json-input');
    const jsonOutput = document.getElementById('json-output');
    const maxWidthSlider = document.getElementById('max-width-slider');
    const widthVal = document.getElementById('width-val');
    const indentSelect = document.getElementById('indent-select');
    const sortKeysCheckbox = document.getElementById('sort-keys-checkbox');
    const stripCommentsCheckbox = document.getElementById('strip-comments-checkbox');
    const btnCopy = document.getElementById('btn-copy');
    const errorBadge = document.getElementById('error-badge');
    const diagnosticsBar = document.getElementById('diagnostics-bar');
    const templateButtons = document.querySelectorAll('.btn-template');

    // Run formatting
    function updateFormat() {
        const text = jsonInput.value;
        const maxWidth = parseInt(maxWidthSlider.value, 10);
        const indent = parseInt(indentSelect.value, 10);
        const sortKeys = sortKeysCheckbox.checked;
        const stripComments = stripCommentsCheckbox.checked;

        widthVal.textContent = maxWidth;

        if (!text.trim()) {
            jsonOutput.textContent = '';
            diagnosticsBar.textContent = 'Ready';
            diagnosticsBar.className = 'diagnostics-bar';
            errorBadge.style.display = 'none';
            return;
        }

        const startTime = performance.now();

        try {
            const formatted = formatText(text, {
                indent,
                maxWidth,
                sortKeys,
                stripComments
            });

            const elapsed = (performance.now() - startTime).toFixed(2);
            jsonOutput.textContent = formatted;
            errorBadge.style.display = 'none';
            diagnosticsBar.textContent = `Success • Formatted in ${elapsed}ms • Length: ${formatted.length} chars`;
            diagnosticsBar.className = 'diagnostics-bar success-state';
        } catch (err) {
            errorBadge.style.display = 'inline-block';
            
            const pos = getErrorPosition(text, err);
            let errMsg = err.message;
            if (pos) {
                errMsg = `${err.message} (Line ${pos.line}, Column ${pos.column})`;
            }
            
            diagnosticsBar.textContent = `Format Failed: ${errMsg}`;
            diagnosticsBar.className = 'diagnostics-bar error-state';
        }
    }

    // Event Listeners
    jsonInput.addEventListener('input', updateFormat);
    maxWidthSlider.addEventListener('input', updateFormat);
    indentSelect.addEventListener('change', updateFormat);
    sortKeysCheckbox.addEventListener('change', updateFormat);
    stripCommentsCheckbox.addEventListener('change', updateFormat);

    // Template Selector
    templateButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const templateKey = btn.getAttribute('data-template');
            if (TEMPLATES[templateKey]) {
                jsonInput.value = TEMPLATES[templateKey];
                updateFormat();
            }
        });
    });

    // Copy to Clipboard
    btnCopy.addEventListener('click', () => {
        const outputText = jsonOutput.textContent;
        if (!outputText) return;

        navigator.clipboard.writeText(outputText).then(() => {
            const originalText = btnCopy.textContent;
            btnCopy.textContent = 'Copied!';
            btnCopy.style.background = 'var(--success)';
            btnCopy.style.borderColor = 'var(--success)';
            
            setTimeout(() => {
                btnCopy.textContent = originalText;
                btnCopy.style.background = '';
                btnCopy.style.borderColor = '';
            }, 1500);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    });

    // Load initial template
    jsonInput.value = TEMPLATES.coordinates;
    updateFormat();
});
