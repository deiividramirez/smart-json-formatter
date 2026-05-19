const fs = require('fs');
const path = require('path');

// Try requiring the compiled out/formatter.js
let formatter;
try {
    formatter = require('../out/formatter');
} catch (e) {
    try {
        formatter = require('./out/formatter');
    } catch (err) {
        console.error("Error: Could not load out/formatter.js. Please run npm run compile-tests first.");
        process.exit(1);
    }
}

const args = process.argv.slice(2);
let maxWidth = 120;
let indent = 2;
let sortKeys = false;
let stripComments = false;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--max-width') {
        maxWidth = parseInt(args[++i], 10);
    } else if (args[i] === '--indent') {
        indent = parseInt(args[++i], 10);
    } else if (args[i] === '--sort-keys') {
        sortKeys = true;
    } else if (args[i] === '--strip-comments') {
        stripComments = true;
    }
}

// Read stdin
const chunks = [];
process.stdin.on('data', chunk => chunks.push(chunk));
process.stdin.on('end', () => {
    const input = Buffer.concat(chunks).toString('utf-8');
    try {
        const output = formatter.formatText(input, { indent, maxWidth, sortKeys, stripComments });
        process.stdout.write(output);
        process.exit(0);
    } catch (err) {
        process.stderr.write(err.message || 'Error');
        process.exit(1);
    }
});
