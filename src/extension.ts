import * as vscode from 'vscode';

export let outputChannel = vscode.window.createOutputChannel('42-c-format');

class DocumntFormattingEditProvider implements vscode.DocumentFormattingEditProvider {

  public provideDocumentFormattingEdits(document: vscode.TextDocument, options: vscode.FormattingOptions, token: vscode.CancellationToken): vscode.ProviderResult<vscode.TextEdit[]> {
    return this.formatDocument(document, options, token);
  }

  public provideDocumentRangeFormattingEdits(document: vscode.TextDocument, _: vscode.Range, options: vscode.FormattingOptions, token: vscode.CancellationToken): Promise<vscode.TextEdit[]> {
    return this.formatDocument(document, options, token);
  }

  private getEdits(document: vscode.TextDocument, formatedContent: string): Promise<vscode.TextEdit[]> {
    return new Promise((resolve, _) => {
      let currentEdit: vscode.TextEdit;

      let firstLine = document.lineAt(0);
      let lastLine = document.lineAt(document.lineCount - 1);
      currentEdit = vscode.TextEdit.replace(new vscode.Range(firstLine.range.start, lastLine.range.end), formatedContent);

      resolve([currentEdit]);
    });
  }

  private formatContent(content: string): string {
    let lines = content.split('\n');
    let formattedLines: string[] = [];
    let inFunction = false;
    let braceCount = 0;
    let functionLineCount = 0;
    let lastWasVarDecl = false;
    let inComment = false;
    let varDeclEndIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      let trimmedLine = line.trim();
      let originalIndent = line.substring(0, line.indexOf(trimmedLine[0]) || 0);

      // Handle multi-line comments
      if (trimmedLine.includes('/*')) inComment = true;
      if (trimmedLine.includes('*/')) inComment = false;

      // Split lines that have both code and opening brace
      if (trimmedLine.endsWith('{') && trimmedLine.length > 1 && !trimmedLine.endsWith('= {')) {
        const beforeBrace = trimmedLine.substring(0, trimmedLine.length - 1).trim();
        formattedLines.push(originalIndent + beforeBrace);
        trimmedLine = '{';
        line = originalIndent + '{';
      }

      // Track function boundaries
      if (trimmedLine === '{') {
        braceCount++;
        if (braceCount === 1 && !inComment) {
          inFunction = true;
          functionLineCount = 0;
          varDeclEndIndex = -1;
        }
      }

      // Apply formatting rules
      if (!line.trim()) {
        formattedLines.push('');
      } else {
        line = this.formatVariableDeclaration(line, originalIndent, inFunction);
        line = this.addSpacesAfterKeywords(line);
        line = this.trimTrailingSpaces(line);

        // Check line length (80 columns max)
        if (line.length > 80 && !inComment) {
          outputChannel.appendLine(`Warning: Line ${i + 1} exceeds 80 columns (${line.length} chars)`);
        }

        formattedLines.push(line);
      }

      // Check for forbidden control structures
      if (/\b(for|do|switch|case|goto)\b/.test(line) && !inComment) {
        outputChannel.appendLine(`Warning: Forbidden control structure at line ${i + 1}`);
      }

      // Track variable declarations
      if (inFunction && this.isVariableDeclaration(trimmedLine)) {
        varDeclEndIndex = formattedLines.length - 1;
      } else if (varDeclEndIndex >= 0 && trimmedLine !== '' && !this.isVariableDeclaration(trimmedLine)) {
        // Need to add empty line after variable declarations
        if (varDeclEndIndex < formattedLines.length - 1) {
          formattedLines.splice(varDeclEndIndex + 1, 0, '');
        }
        varDeclEndIndex = -1;
      }

      // Track function lines
      if (inFunction && trimmedLine !== '') {
        functionLineCount++;
        if (functionLineCount > 25) {
          outputChannel.appendLine(`Warning: Function exceeds 25 lines at line ${i + 1}`);
        }
      }

      if (trimmedLine === '}') {
        braceCount--;
        if (braceCount === 0) {
          inFunction = false;
          functionLineCount = 0;
        }
      }
    }

    return formattedLines.join('\n');
  }

  private applyIndentation(line: string, braceCount: number): string {
    const trimmed = line.trim();
    if (trimmed === '') return '';

    // Adjust brace count for proper indentation
    let indentLevel = braceCount;
    if (trimmed.startsWith('}')) indentLevel--;

    // Use 4 spaces per indent level (42 norm uses tabs displayed as 4 spaces)
    const indent = '\t'.repeat(Math.max(0, indentLevel));
    return indent + trimmed;
  }

  private formatVariableDeclaration(line: string, originalIndent: string, inFunction: boolean): string {
    if (!inFunction) return line;

    const trimmedLine = line.trim();
    const varDeclPattern = /^((?:const\s+|static\s+|extern\s+|volatile\s+|unsigned\s+|signed\s+)*(?:char|int|short|long|float|double|void|struct\s+\w+|enum\s+\w+|union\s+\w+)(?:\s*\*+)?)\s+(\w+(?:\[\])?(?:\s*=.*)?);$/;
    
    const match = trimmedLine.match(varDeclPattern);
    if (match) {
      const [, typeDecl, varNameAndInit] = match;
      return originalIndent + '\t' + typeDecl + '\t' + varNameAndInit + ';';
    }

    return line;
  }

  private addSpacesAfterKeywords(line: string): string {
    // Add space after keywords: if, while, return
    let formatted = line
      .replace(/\bif\(/g, 'if (')
      .replace(/\bwhile\(/g, 'while (')
      .replace(/\breturn\s*\(/g, 'return (');
    
    // Add space after return if not followed by space, semicolon, or parenthesis
    formatted = formatted.replace(/\breturn([^;\s\(])/g, 'return $1');
    
    // Format return statements to use parentheses for non-simple values
    formatted = formatted.replace(/\breturn\s+([^;\s\(][^;]*);/g, (match, value) => {
      // Don't add parentheses for simple values like numbers or single variables
      if (/^[0-9]+$/.test(value) || /^[a-zA-Z_]\w*$/.test(value)) {
        return `return ${value};`;
      }
      return `return (${value});`;
    });
    
    return formatted;
  }

  private formatBraces(line: string): string {
    const trimmed = line.trim();
    
    // Check if line ends with { but has other content
    if (trimmed.endsWith('{') && trimmed.length > 1 && !trimmed.endsWith('= {')) {
      // This will be handled by returning the line as-is and letting the main formatter split it
      return line;
    }

    return line;
  }

  private trimTrailingSpaces(line: string): string {
    return line.replace(/\s+$/, '');
  }

  private isVariableDeclaration(line: string): boolean {
    const varDeclPattern = /^(const\s+|static\s+|extern\s+|volatile\s+|unsigned\s+|signed\s+)*(char|int|short|long|float|double|void|struct\s+\w+|enum\s+\w+|union\s+\w+)(\s*\*+)?\s+\w+(\[\])?(\s*=.*)?;$/;
    return varDeclPattern.test(line);
  }

  private checkNormCompliance(content: string): void {
    const lines = content.split('\n');
    let functionCount = 0;
    let globalVarCount = 0;
    let inFunction = false;
    let braceCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Count functions
      if (/^[a-zA-Z_]\w*\s+[a-zA-Z_]\w*\s*\([^)]*\)\s*$/.test(trimmed) && 
          i + 1 < lines.length && lines[i + 1].trim() === '{') {
        functionCount++;
      }

      // Check for global variables (outside functions)
      if (braceCount === 0 && this.isVariableDeclaration(trimmed) && !trimmed.startsWith('static')) {
        globalVarCount++;
      }

      if (trimmed.includes('{')) braceCount++;
      if (trimmed.includes('}')) braceCount--;
    }

    // Report violations
    if (functionCount > 5) {
      outputChannel.appendLine(`Warning: File contains ${functionCount} functions (max 5 allowed)`);
    }

    if (globalVarCount > 0) {
      outputChannel.appendLine(`Warning: File contains ${globalVarCount} global variables (forbidden by norm)`);
    }
  }

  private formatDocument(document: vscode.TextDocument, _: vscode.FormattingOptions, _token: vscode.CancellationToken): Promise<vscode.TextEdit[]> {
    return new Promise((resolve, _reject) => {
      let textContent = document.getText();
      
      // Clear output channel
      outputChannel.clear();
      
      // Check norm compliance
      this.checkNormCompliance(textContent);
      
      // Apply formatting
      const formattedContent = this.formatContent(textContent);
      
      return resolve(this.getEdits(document, formattedContent));
    });
  }
}

export function activate(context: vscode.ExtensionContext) {
  let formatter = new DocumntFormattingEditProvider();

  context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider({ language: 'c', scheme: 'file' }, formatter));
  context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider({ language: 'cpp', scheme: 'file' }, formatter));

  context.subscriptions.push(vscode.languages.registerDocumentRangeFormattingEditProvider({ language: 'c', scheme: 'file' }, formatter));
  context.subscriptions.push(vscode.languages.registerDocumentRangeFormattingEditProvider({ language: 'cpp', scheme: 'file' }, formatter));
}

export function deactivate() { }