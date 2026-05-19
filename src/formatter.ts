export interface FormatOptions {
    indent?: number;
    maxWidth?: number;
    sortKeys?: boolean;
    stripComments?: boolean;
}

// Strip // and /* */ comments
export function stripComments(text: string): string {
    const pattern = /("[^"\\]*(?:\\.[^"\\]*)*")|('[^'\\]*(?:\\.[^\'\\]*)*')|(\/\*[^*]*\*+(?:[^\/*][^*]*\*+)*\/)|(\/\/.*)/g;
    return text.replace(pattern, (match, g1, g2) => {
        if (g1) { return g1; }
        if (g2) { return g2; }
        return "";
    });
}

// Locate line and column of SyntaxError in JSON
export function getErrorPosition(text: string, error: Error): { line: number; column: number } | null {
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

// Helper to format values compactly (single line) with a budget limit
function formatCompact(obj: any, budget: number, sortKeys: boolean): string | null {
    if (obj === null || typeof obj !== 'object') {
        const res = JSON.stringify(obj);
        return res.length <= budget ? res : null;
    }

    if (Array.isArray(obj)) {
        if (obj.length === 0) {
            return budget >= 2 ? "[]" : null;
        }
        let remaining = budget - 2; // For '[' and ']'
        const parts: string[] = [];
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
        const parts: string[] = [];
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

// Formats values recursively, expanding them if they exceed maxWidth
function formatExpanded(
    obj: any,
    level: number,
    indentStep: number,
    maxWidth: number,
    sortKeys: boolean
): string {
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
        const parts: string[] = [];
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
        const parts: string[] = [];
        for (const key of keys) {
            const keyPart = JSON.stringify(key);
            const formattedVal = formatExpanded(obj[key], level + 1, indentStep, maxWidth, sortKeys);
            parts.push(`${nextIndent}${keyPart}: ${formattedVal}`);
        }
        return `{\n${parts.join(",\n")}\n${currentIndent}}`;
    }
}

// Main format function
export function formatText(text: string, options: FormatOptions = {}): string {
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
