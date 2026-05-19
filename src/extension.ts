import * as vscode from 'vscode';
import { formatText, getErrorPosition } from './formatter';

export function activate(context: vscode.ExtensionContext) {
    const languages = ['json', 'jsonc'];

    for (const lang of languages) {
        // Register entire document formatting provider
        context.subscriptions.push(
            vscode.languages.registerDocumentFormattingEditProvider(lang, {
                provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
                    const text = document.getText();
                    const cfg = vscode.workspace.getConfiguration('smartJsonFormatter');
                    
                    try {
                        const formatted = formatText(text, {
                            indent: cfg.get<number>('indent', 2),
                            maxWidth: cfg.get<number>('maxWidth', 120),
                            sortKeys: cfg.get<boolean>('sortKeysAlphabetically', true),
                            stripComments: cfg.get<boolean>('stripComments', true)
                        });
                        
                        const firstLine = document.lineAt(0);
                        const lastLine = document.lineAt(document.lineCount - 1);
                        const fullRange = new vscode.Range(firstLine.range.start, lastLine.range.end);
                        
                        return [vscode.TextEdit.replace(fullRange, formatted)];
                    } catch (err: any) {
                        showFormattingError(text, err);
                        return [];
                    }
                }
            })
        );

        // Register selection range formatting provider
        context.subscriptions.push(
            vscode.languages.registerDocumentRangeFormattingEditProvider(lang, {
                provideDocumentRangeFormattingEdits(
                    document: vscode.TextDocument,
                    range: vscode.Range,
                    options: vscode.FormattingOptions
                ): vscode.TextEdit[] {
                    const text = document.getText(range);
                    const cfg = vscode.workspace.getConfiguration('smartJsonFormatter');
                    
                    try {
                        const formatted = formatText(text, {
                            indent: cfg.get<number>('indent', options.tabSize),
                            maxWidth: cfg.get<number>('maxWidth', 120),
                            sortKeys: cfg.get<boolean>('sortKeysAlphabetically', true),
                            stripComments: cfg.get<boolean>('stripComments', true)
                        });

                        // Align the formatting with the start line's leading whitespace
                        const startLine = document.lineAt(range.start.line);
                        const leadingWhitespace = startLine.text.substring(0, startLine.firstNonWhitespaceCharacterIndex);

                        const lines = formatted.split('\n');
                        const indentedLines = lines.map((line, idx) => {
                            if (idx === 0) {
                                return line;
                            }
                            return leadingWhitespace + line;
                        });

                        return [vscode.TextEdit.replace(range, indentedLines.join('\n'))];
                    } catch (err: any) {
                        showFormattingError(text, err);
                        return [];
                    }
                }
            })
        );
    }
}

export function deactivate() {}

// Show detailed syntax error Toast with line & column info
function showFormattingError(text: string, error: Error) {
    const pos = getErrorPosition(text, error);
    if (pos) {
        vscode.window.showErrorMessage(`JSON Format Failed: ${error.message} (Line ${pos.line}, Column ${pos.column})`);
    } else {
        vscode.window.showErrorMessage(`JSON Format Failed: ${error.message}`);
    }
}