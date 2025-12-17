import { promises as fs } from 'fs';
import { Uri, workspace } from 'vscode';
import type { CompareOptions } from '../types';
import { applyIgnorePatterns, type IgnorePatternsConfig } from './ignorePatterns';

const FILTER_SCHEME = 'compare-folders-filtered';
const contentStore = new Map<string, string>();
let providerRegistered = false;

function ensureProviderRegistered() {
  if (providerRegistered) {
    return;
  }

  workspace.registerTextDocumentContentProvider(FILTER_SCHEME, {
    provideTextDocumentContent: (uri) => contentStore.get(uri.toString()) ?? '',
  });

  providerRegistered = true;
}

function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function removeAllWhitespace(content: string): string {
  return content.replace(/\s+/g, '');
}

function trimLineWhitespace(content: string): string {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .join('\n');
}

function removeEmptyLines(content: string): string {
  return content
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .join('\n');
}

function applyCompareOptions(content: string, options: CompareOptions): string {
  let processed = content;

  if (options.ignoreLineEnding) {
    processed = normalizeLineEndings(processed);
  }

  if (options.ignoreAllWhiteSpaces) {
    processed = removeAllWhitespace(processed);
  } else if (options.ignoreWhiteSpaces) {
    processed = trimLineWhitespace(processed);
  }

  if (options.ignoreEmptyLines) {
    processed = removeEmptyLines(processed);
  }

  return processed;
}

function buildFilteredUri(filePath: string): Uri {
  return Uri.file(filePath).with({ scheme: FILTER_SCHEME });
}

export async function getFilteredDiffUris(
  file1: string,
  file2: string,
  options: CompareOptions,
  patternConfig: IgnorePatternsConfig
): Promise<{ left: Uri; right: Uri }> {
  ensureProviderRegistered();

  const [content1, content2] = await Promise.all([
    fs.readFile(file1, 'utf8'),
    fs.readFile(file2, 'utf8'),
  ]);

  const filtered1 = applyCompareOptions(applyIgnorePatterns(content1, patternConfig), options);
  const filtered2 = applyCompareOptions(applyIgnorePatterns(content2, patternConfig), options);

  const leftUri = buildFilteredUri(file1);
  const rightUri = buildFilteredUri(file2);

  contentStore.set(leftUri.toString(), filtered1);
  contentStore.set(rightUri.toString(), filtered2);

  return { left: leftUri, right: rightUri };
}
