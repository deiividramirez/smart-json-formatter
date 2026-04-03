import * as assert from 'assert';
import * as cp from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PYTHON = process.platform === 'win32' ? 'python' : 'python3';
const SCRIPT = path.join(__dirname, '..', '..', 'python', 'smart_json.py');

interface RunResult {
    stdout: string;
    stderr: string;
    status: number | null;
}

function run(input: string, args: string[] = []): RunResult {
    const result = cp.spawnSync(PYTHON, [SCRIPT, ...args], {
        input,
        encoding: 'utf-8',
    });
    return {
        stdout: result.stdout ?? '',
        stderr: result.stderr ?? '',
        status: result.status,
    };
}

function parsed(input: string, args: string[] = []): unknown {
    const { stdout, status } = run(input, args);
    assert.strictEqual(status, 0);
    return JSON.parse(stdout);
}

// ---------------------------------------------------------------------------
// Suite: Basic formatting
// ---------------------------------------------------------------------------

suite('Basic formatting', () => {
    test('formats a simple object', () => {
        const out = parsed('{"b":1,"a":2}', ['--sort-keys']);
        assert.deepStrictEqual(out, { a: 2, b: 1 });
    });

    test('formats a simple array', () => {
        const out = parsed('[3,1,2]');
        assert.deepStrictEqual(out, [3, 1, 2]);
    });

    test('empty object produces {}', () => {
        const { stdout, status } = run('{}');
        assert.strictEqual(status, 0);
        assert.strictEqual(stdout.trim(), '{}');
    });

    test('empty array produces []', () => {
        const { stdout, status } = run('[]');
        assert.strictEqual(status, 0);
        assert.strictEqual(stdout.trim(), '[]');
    });

    test('empty input exits cleanly with no output', () => {
        const { stdout, status } = run('   ');
        assert.strictEqual(status, 0);
        assert.strictEqual(stdout, '');
    });

    test('invalid JSON exits with non-zero status', () => {
        const { status, stderr } = run('{bad json}');
        assert.notStrictEqual(status, 0);
        assert.ok(stderr.length > 0);
    });

    test('preserves unicode characters', () => {
        const out = parsed('{"emoji":"😀","accented":"café"}') as Record<string, string>;
        assert.strictEqual(out['emoji'], '😀');
        assert.strictEqual(out['accented'], 'café');
    });
});

// ---------------------------------------------------------------------------
// Suite: --sort-keys
// ---------------------------------------------------------------------------

suite('--sort-keys flag', () => {
    test('sorts object keys alphabetically when flag is set', () => {
        const { stdout, status } = run('{"z":1,"a":2,"m":3}', ['--sort-keys', '--max-width', '10']);
        assert.strictEqual(status, 0);
        const lines = stdout.split('\n').filter(l => l.includes(':'));
        const keys = lines.map(l => l.trim().split(':')[0].replace(/"/g, ''));
        assert.deepStrictEqual(keys, ['a', 'm', 'z']);
    });

    test('preserves insertion order when flag is absent', () => {
        const { stdout, status } = run('{"z":1,"a":2,"m":3}', ['--max-width', '10']);
        assert.strictEqual(status, 0);
        const lines = stdout.split('\n').filter(l => l.includes(':'));
        const keys = lines.map(l => l.trim().split(':')[0].replace(/"/g, ''));
        assert.deepStrictEqual(keys, ['z', 'a', 'm']);
    });

    test('sorts nested object keys', () => {
        const input = '{"outer":{"z":1,"a":2}}';
        const { stdout, status } = run(input, ['--sort-keys', '--max-width', '10']);
        assert.strictEqual(status, 0);
        const parsed = JSON.parse(stdout) as { outer: Record<string, number> };
        assert.deepStrictEqual(Object.keys(parsed.outer), ['a', 'z']);
    });
});

// ---------------------------------------------------------------------------
// Suite: --max-width
// ---------------------------------------------------------------------------

suite('--max-width flag', () => {
    test('keeps object on one line when it fits', () => {
        const { stdout, status } = run('{"a":1}', ['--max-width', '120']);
        assert.strictEqual(status, 0);
        assert.strictEqual(stdout.trim().split('\n').length, 1);
    });

    test('expands object to multiple lines when too wide', () => {
        const { stdout, status } = run('{"longkey":"longvalue","another":"entry"}', ['--max-width', '10']);
        assert.strictEqual(status, 0);
        assert.ok(stdout.trim().split('\n').length > 1);
    });

    test('keeps array on one line when it fits', () => {
        const { stdout, status } = run('[1,2,3]', ['--max-width', '120']);
        assert.strictEqual(status, 0);
        assert.strictEqual(stdout.trim().split('\n').length, 1);
    });

    test('expands array to multiple lines when too wide', () => {
        const input = '["a very long string","another very long string","yet another"]';
        const { stdout, status } = run(input, ['--max-width', '10']);
        assert.strictEqual(status, 0);
        assert.ok(stdout.trim().split('\n').length > 1);
    });

    test('output is valid JSON regardless of width', () => {
        const input = '{"a":1,"b":[1,2,3],"c":{"d":4}}';
        for (const width of ['10', '40', '120']) {
            const { stdout, status } = run(input, ['--max-width', width]);
            assert.strictEqual(status, 0, `failed at max-width=${width}`);
            assert.doesNotThrow(() => JSON.parse(stdout), `invalid JSON at max-width=${width}`);
        }
    });
});

// ---------------------------------------------------------------------------
// Suite: --indent
// ---------------------------------------------------------------------------

suite('--indent flag', () => {
    test('uses 2-space indent by default', () => {
        const { stdout, status } = run('{"a":{"b":1}}', ['--max-width', '10']);
        assert.strictEqual(status, 0);
        const lines = stdout.split('\n');
        const indentedLine = lines.find(l => l.includes('"b"'));
        assert.ok(indentedLine?.startsWith('    '), `expected 4 spaces (2*2) got: "${indentedLine}"`);
    });

    test('uses 4-space indent when specified', () => {
        const { stdout, status } = run('{"a":{"b":1}}', ['--max-width', '10', '--indent', '4']);
        assert.strictEqual(status, 0);
        const lines = stdout.split('\n');
        const indentedLine = lines.find(l => l.includes('"b"'));
        assert.ok(indentedLine?.startsWith('        '), `expected 8 spaces (2*4) got: "${indentedLine}"`);
    });

    test('output is valid JSON for indent=1', () => {
        const input = '{"a":[1,2,3],"b":{"c":4}}';
        const { stdout, status } = run(input, ['--max-width', '10', '--indent', '1']);
        assert.strictEqual(status, 0);
        assert.doesNotThrow(() => JSON.parse(stdout));
    });
});

// ---------------------------------------------------------------------------
// Suite: --strip-comments
// ---------------------------------------------------------------------------

suite('--strip-comments flag', () => {
    test('strips // line comments when flag is set', () => {
        const input = '{\n  "a": 1 // inline comment\n}';
        const { status, stdout } = run(input, ['--strip-comments']);
        assert.strictEqual(status, 0);
        const obj = JSON.parse(stdout) as Record<string, number>;
        assert.strictEqual(obj['a'], 1);
    });

    test('strips /* */ block comments when flag is set', () => {
        const input = '{ /* block */ "a": 1 }';
        const { status, stdout } = run(input, ['--strip-comments']);
        assert.strictEqual(status, 0);
        const obj = JSON.parse(stdout) as Record<string, number>;
        assert.strictEqual(obj['a'], 1);
    });

    test('fails on // comment when flag is absent', () => {
        const input = '{\n  "a": 1 // comment\n}';
        const { status } = run(input);
        assert.notStrictEqual(status, 0);
    });

    test('preserves URLs inside strings even when stripping comments', () => {
        const input = '{"url":"http://example.com/path"}';
        const { status, stdout } = run(input, ['--strip-comments']);
        assert.strictEqual(status, 0);
        const obj = JSON.parse(stdout) as Record<string, string>;
        assert.strictEqual(obj['url'], 'http://example.com/path');
    });
});

// ---------------------------------------------------------------------------
// Suite: VS Code extension activation
// ---------------------------------------------------------------------------

suite('Extension activation', () => {
    test('extension activates for json language', async () => {
        const ext = vscode.extensions.getExtension('deiividramirez.smart-json-formatter');
        if (!ext) {
            // Running outside the installed extension context — skip gracefully
            return;
        }
        await ext.activate();
        assert.ok(ext.isActive);
    });
});
