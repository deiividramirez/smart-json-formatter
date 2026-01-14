import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {

    // Register the formatter
    vscode.languages.registerDocumentFormattingEditProvider('json', {
        provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
            return format(document, context);
        }
    });

    // Also support JSONC (JSON with comments) if your python script handles it, 
    // otherwise remove this block.
    vscode.languages.registerDocumentFormattingEditProvider('jsonc', {
        provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
            return format(document, context);
        }
    });
}

function format(document: vscode.TextDocument, context: vscode.ExtensionContext): vscode.TextEdit[] {
    const text = document.getText();
    
    // Path to your bundled python script
    const scriptPath = context.asAbsolutePath(path.join('python', 'smart_json.py'));

	// CHANGE 'python3' TO 'python' IF ON WINDOWS
	const command = process.platform === 'win32' ? 'python' : 'python3';

    try {
        // Spawn python process
        // Ensure 'python3' is in your PATH, or make this configurable via settings
        const process = cp.spawnSync(command, [scriptPath], {
            input: text,
            encoding: 'utf-8'
        });

        if (process.error) {
            vscode.window.showErrorMessage(`Formatter error: ${process.error.message}`);
            return [];
        }

        if (process.stderr) {
            console.error(process.stderr);
            // Don't return empty if there's a minor warning, but strictly speaking 
            // valid JSON shouldn't warn.
            if (process.status !== 0) {
                 vscode.window.showErrorMessage("JSON Format Failed: Invalid JSON or Script Error");
                 return [];
            }
        }

        const formattedText = process.stdout;
        
        // Calculate the range of the whole document to replace it
        const firstLine = document.lineAt(0);
        const lastLine = document.lineAt(document.lineCount - 1);
        const fullRange = new vscode.Range(firstLine.range.start, lastLine.range.end);

        return [vscode.TextEdit.replace(fullRange, formattedText)];

    } catch (err) {
        console.error(err);
        return [];
    }
}

export function deactivate() {}