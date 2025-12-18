import { Position, Range, Uri, window, type TextEditorDecorationType } from 'vscode';

let hiddenDecoration: TextEditorDecorationType | undefined;

function getDecoration() {
  if (!hiddenDecoration) {
    hiddenDecoration = window.createTextEditorDecorationType({
      isWholeLine: true,
      opacity: '0',
      color: 'transparent',
      backgroundColor: 'transparent',
      letterSpacing: '-1em',
    });
  }
  return hiddenDecoration;
}

function compileLinePatterns(patterns: string[]): RegExp[] {
  const compiled: RegExp[] = [];
  for (const pattern of patterns) {
    try {
      compiled.push(new RegExp(pattern, 'm'));
    } catch (error) {
      console.warn(`Invalid regex pattern ignored for decoration: ${pattern}`, error);
    }
  }
  return compiled;
}

/**
 * Visually hides lines that match line patterns via decorations, keeping the document editable.
 */
export function applyLineIgnoreDecorations(targetPaths: string[], linePatterns?: string[]) {
  if (!linePatterns || linePatterns.length === 0) {
    return;
  }

  const regexes = compileLinePatterns(linePatterns);
  if (regexes.length === 0) {
    return;
  }

  const targets = new Set(targetPaths.map((p) => Uri.file(p).toString().toLowerCase()));
  const decoration = getDecoration();
  const editors = window.visibleTextEditors.filter((ed) =>
    targets.has(ed.document.uri.toString().toLowerCase())
  );

  editors.forEach((editor) => {
    const ranges: Range[] = [];
    for (let i = 0; i < editor.document.lineCount; i++) {
      const lineText = editor.document.lineAt(i).text;
      if (regexes.some((r) => r.test(lineText))) {
        ranges.push(new Range(new Position(i, 0), new Position(i, lineText.length)));
      }
    }
    editor.setDecorations(decoration, ranges);
  });
}
