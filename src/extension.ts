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
      // currentEdit = new vscode.TextEdit(new vscode.Range(firstLine.range.start, lastLine.range.end), formatedContent);
      currentEdit = vscode.TextEdit.replace(new vscode.Range(firstLine.range.start, lastLine.range.end), formatedContent);

      resolve([currentEdit]);
    });
  }

  private formatVariableDeclarations(content: string): string {
    const lines = content.split('\n');
    const formattedLines: string[] = [];
    let inFunction = false;
    let lastWasVarDecl = false;
    let braceCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Track if we're inside a function
      if (trimmedLine.includes('{')) {
        braceCount++;
        inFunction = braceCount > 0;
      }
      if (trimmedLine.includes('}')) {
        braceCount--;
        inFunction = braceCount > 0;
      }
      
      // Match variable declarations
      const varDeclPattern = /^((?:const\s+|static\s+|extern\s+|volatile\s+|unsigned\s+|signed\s+)*(?:char|int|short|long|float|double|void|struct\s+\w+|enum\s+\w+|union\s+\w+)(?:\s*\*+)?)\s+(\w+(?:\[\])?(?:\s*=.*)?);$/;
      const match = trimmedLine.match(varDeclPattern);
      
      if (match && inFunction) {
        const leadingWhitespace = line.substring(0, line.indexOf(trimmedLine[0]) || 0);
        const [, typeDecl, varNameAndInit] = match;
        
        // Format with tab between type and variable
        const formattedLine = leadingWhitespace + typeDecl + '\t' + varNameAndInit + ';';
        formattedLines.push(formattedLine);
        
        // Check if next line is not a variable declaration or empty
        if (i < lines.length - 1) {
          const nextLine = lines[i + 1].trim();
          const nextIsVarDecl = varDeclPattern.test(nextLine);
          const nextIsEmpty = nextLine === '';
          
          // Add newline after variable declarations if the next line is not a var decl or empty
          if (!nextIsVarDecl && !nextIsEmpty) {
            formattedLines.push('');
          }
        }
        
        lastWasVarDecl = true;
      } else {
        // Handle brace formatting - ensure braces are on their own lines
        if (trimmedLine === '{' || trimmedLine === '}') {
          formattedLines.push(line);
        } else if (trimmedLine.endsWith('{') && trimmedLine.length > 1) {
          // Split brace to its own line
          const beforeBrace = line.substring(0, line.lastIndexOf('{'));
          formattedLines.push(beforeBrace);
          const braceIndent = line.substring(0, line.indexOf(trimmedLine[0]) || 0);
          formattedLines.push(braceIndent + '{');
        } else {
          formattedLines.push(line);
        }
        lastWasVarDecl = false;
      }
    }
    
    return formattedLines.join('\n');
  }

  private handleForbiddenStructures(content: string): string {
    const lines = content.split('\n');
    const formattedLines: string[] = [];
    
    for (const line of lines) {
      // Check for forbidden control structures (for, do...while, switch, case, goto)
      if (/\b(for|do|switch|case|goto)\b/.test(line)) {
        // Add comment warning about forbidden structure
        formattedLines.push(line + ' // WARNING: Forbidden control structure by 42 norm');
      } else {
        formattedLines.push(line);
      }
    }
    
    return formattedLines.join('\n');
  }

  private formatDocument(document: vscode.TextDocument, _: vscode.FormattingOptions, _token: vscode.CancellationToken): Promise<vscode.TextEdit[]> {
    return new Promise((resolve, _reject) => {
      let textContent = document.getText();
      
      // Apply all formatting rules
      let formattedContent = this.formatVariableDeclarations(textContent);
      formattedContent = this.handleForbiddenStructures(formattedContent);
      
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
