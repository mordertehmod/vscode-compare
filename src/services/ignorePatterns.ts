/**
 * Service for handling custom ignore patterns during file comparison.
 * Allows users to specify regex patterns to ignore specific lines or code blocks.
 */

export interface IgnorePatternsConfig {
  ignoreLinePatterns?: string[];
  ignoreCodePatterns?: string[];
}

/**
 * Processes file content by removing lines that match ignore patterns.
 * @param content - The file content to process
 * @param patterns - Array of regex pattern strings to match against lines
 * @returns Processed content with matching lines removed
 */
export function applyLinePatterns(content: string, patterns: string[]): string {
  if (!patterns || patterns.length === 0) {
    return content;
  }

  // Use non-multiline mode for line patterns to prevent . from matching newlines
  const regexPatterns = compilePatterns(patterns, false);
  if (regexPatterns.length === 0) {
    return content;
  }

  const lines = content.split(/\r?\n/);
  const filteredLines = lines.filter(line => {
    return !regexPatterns.some(pattern => pattern.test(line));
  });

  return filteredLines.join('\n');
}

/**
 * Processes file content by removing code snippets that match patterns within lines.
 * Note: This function processes the entire file content, not line by line,
 * so it can handle multi-line patterns like /* ... *\/ comments.
 * @param content - The file content to process
 * @param patterns - Array of regex pattern strings to match and remove
 * @returns Processed content with matching code snippets removed
 */
export function applyCodePatterns(content: string, patterns: string[]): string {
  if (!patterns || patterns.length === 0) {
    return content;
  }

  // Use multiline mode for code patterns to allow . to match newlines (for multi-line comments)
  const regexPatterns = compilePatterns(patterns, true);
  if (regexPatterns.length === 0) {
    return content;
  }

  let processedContent = content;
  regexPatterns.forEach(pattern => {
    processedContent = processedContent.replace(pattern, '');
  });

  return processedContent;
}

/**
 * Applies all ignore patterns to file content.
 * @param content - The file content to process
 * @param config - Configuration containing ignore patterns
 * @returns Processed content with all patterns applied
 */
export function applyIgnorePatterns(content: string, config: IgnorePatternsConfig): string {
  let processedContent = content;

  console.log('applyIgnorePatterns - Input length:', content.length);
  console.log('applyIgnorePatterns - Config:', JSON.stringify(config, null, 2));

  // First apply code patterns (remove specific snippets within lines)
  if (config.ignoreCodePatterns) {
    console.log('Applying code patterns:', config.ignoreCodePatterns);
    const beforeLength = processedContent.length;
    processedContent = applyCodePatterns(processedContent, config.ignoreCodePatterns);
    console.log(`Code patterns applied: ${beforeLength} -> ${processedContent.length} chars`);
  }

  // Then apply line patterns (remove entire matching lines)
  if (config.ignoreLinePatterns) {
    console.log('Applying line patterns:', config.ignoreLinePatterns);
    const beforeLength = processedContent.length;
    processedContent = applyLinePatterns(processedContent, config.ignoreLinePatterns);
    console.log(`Line patterns applied: ${beforeLength} -> ${processedContent.length} chars`);
  }

  console.log('applyIgnorePatterns - Output length:', processedContent.length);
  return processedContent;
}

/**
 * Compiles string patterns into RegExp objects, filtering out invalid patterns.
 * @param patterns - Array of regex pattern strings
 * @returns Array of compiled RegExp objects
 */
function compilePatterns(patterns: string[], useMultiline: boolean = false): RegExp[] {
  const compiled: RegExp[] = [];

  for (const pattern of patterns) {
    try {
      // For multi-line patterns (code patterns), use 'gms' flags
      // For line patterns, use only 'gm' to prevent . from matching newlines
      const flags = useMultiline ? 'gms' : 'gm';
      const regex = new RegExp(pattern, flags);
      compiled.push(regex);
    } catch (error) {
      console.warn(`Invalid regex pattern ignored: ${pattern}`, error);
    }
  }

  return compiled;
}

/**
 * Validates that all patterns are valid regex patterns.
 * @param patterns - Array of pattern strings to validate
 * @returns Object with validation result and any error messages
 */
export function validatePatterns(patterns: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const pattern of patterns) {
    try {
      new RegExp(pattern);
    } catch (error) {
      errors.push(`Invalid regex pattern: ${pattern} - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
