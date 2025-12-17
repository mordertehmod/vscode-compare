/**
 * Custom file comparison handler that applies ignore patterns before comparing files.
 * Extends dir-compare's file comparison capabilities with pattern-based filtering.
 */

import { fileCompareHandlers } from 'dir-compare';
import { readFileSync, type Stats } from 'fs';
import { applyIgnorePatterns, type IgnorePatternsConfig } from './ignorePatterns';

/**
 * Creates a custom file comparison function that applies ignore patterns.
 * @param config - Configuration containing ignore patterns
 * @returns Custom comparison function compatible with dir-compare
 */
export function createCustomFileCompare(config: IgnorePatternsConfig) {
  return async function customCompareFileAsync(
    path1: string,
    stat1: Stats,
    path2: string,
    stat2: Stats,
    options: any
  ): Promise<boolean> {
    // Check if we have any patterns to apply
    const hasPatterns =
      (config.ignoreLinePatterns && config.ignoreLinePatterns.length > 0) ||
      (config.ignoreCodePatterns && config.ignoreCodePatterns.length > 0);

    // If no patterns, use the default line-based comparison
    if (!hasPatterns) {
      return fileCompareHandlers.lineBasedFileCompare.compareAsync(
        path1,
        stat1,
        path2,
        stat2,
        options
      );
    }

    try {
      // Read both files
      const content1 = readFileSync(path1, 'utf8');
      const content2 = readFileSync(path2, 'utf8');

      console.log('=== CUSTOM FILE COMPARE DEBUG ===');
      console.log('Comparing files:', path1, 'vs', path2);
      console.log('Config:', JSON.stringify(config, null, 2));
      console.log('Original content1 length:', content1.length);
      console.log('Original content2 length:', content2.length);

      // Apply ignore patterns to both files
      const processed1 = applyIgnorePatterns(content1, config);
      const processed2 = applyIgnorePatterns(content2, config);

      console.log('Processed content1 length:', processed1.length);
      console.log('Processed content2 length:', processed2.length);
      console.log('Content1 first 200 chars:', processed1.substring(0, 200));
      console.log('Content2 first 200 chars:', processed2.substring(0, 200));

      // Compare the processed contents
      // We need to consider the same options that the original comparison uses
      let finalContent1 = processed1;
      let finalContent2 = processed2;

      // Apply line ending normalization if needed
      if (options.ignoreLineEnding) {
        finalContent1 = normalizeLineEndings(finalContent1);
        finalContent2 = normalizeLineEndings(finalContent2);
      }

      // Apply whitespace handling if needed
      if (options.ignoreAllWhiteSpaces) {
        finalContent1 = removeAllWhitespace(finalContent1);
        finalContent2 = removeAllWhitespace(finalContent2);
      } else if (options.ignoreWhiteSpaces) {
        finalContent1 = trimLineWhitespace(finalContent1);
        finalContent2 = trimLineWhitespace(finalContent2);
      }

      // Apply empty lines handling if needed
      if (options.ignoreEmptyLines) {
        finalContent1 = removeEmptyLines(finalContent1);
        finalContent2 = removeEmptyLines(finalContent2);
      }

      // Return true if contents are equal (no difference)
      return finalContent1 === finalContent2;
    } catch (error) {
      // If there's an error reading files, fall back to default comparison
      console.warn('Error in custom file compare, falling back to default:', error);
      return fileCompareHandlers.lineBasedFileCompare.compareAsync(
        path1,
        stat1,
        path2,
        stat2,
        options
      );
    }
  };
}

/**
 * Normalizes line endings to \n
 */
function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Removes all whitespace from content
 */
function removeAllWhitespace(content: string): string {
  return content.replace(/\s+/g, '');
}

/**
 * Trims whitespace from the beginning and end of each line
 */
function trimLineWhitespace(content: string): string {
  return content
    .split(/\r?\n/)
    .map(line => line.trim())
    .join('\n');
}

/**
 * Removes empty lines from content
 */
function removeEmptyLines(content: string): string {
  return content
    .split(/\r?\n/)
    .filter(line => line.trim().length > 0)
    .join('\n');
}
