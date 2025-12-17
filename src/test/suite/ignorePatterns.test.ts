import * as assert from 'assert';
import {
  applyLinePatterns,
  applyCodePatterns,
  applyIgnorePatterns,
  validatePatterns
} from '../../services/ignorePatterns';

suite('Ignore Patterns Service', () => {
  suite('applyLinePatterns', () => {
    test('Should remove lines matching single pattern', () => {
      const content = `line 1
// comment line
line 3
// another comment
line 5`;
      const patterns = ['^\\s*//.*$'];
      const result = applyLinePatterns(content, patterns);

      assert.strictEqual(result, `line 1
line 3
line 5`);
    });

    test('Should remove lines matching multiple patterns', () => {
      const content = `line 1
// comment
console.log('debug');
line 4
/* comment */
line 6`;
      const patterns = ['^\\s*//.*$', '^\\s*console\\.log'];
      const result = applyLinePatterns(content, patterns);

      assert.strictEqual(result, `line 1
line 4
/* comment */
line 6`);
    });

    test('Should handle empty patterns array', () => {
      const content = `line 1
line 2`;
      const patterns: string[] = [];
      const result = applyLinePatterns(content, patterns);

      assert.strictEqual(result, content);
    });

    test('Should handle CRLF line endings', () => {
      const content = `line 1\r\n// comment\r\nline 3`;
      const patterns = ['^\\s*//.*$'];
      const result = applyLinePatterns(content, patterns);

      assert.strictEqual(result, `line 1\nline 3`);
    });

    test('Should handle whitespace in patterns', () => {
      const content = `line 1
  // indented comment
line 3`;
      const patterns = ['^\\s*//.*$'];
      const result = applyLinePatterns(content, patterns);

      assert.strictEqual(result, `line 1
line 3`);
    });

    test('Should ignore invalid regex patterns', () => {
      const content = `line 1
// comment
line 3`;
      const patterns = ['[invalid(regex'];
      const result = applyLinePatterns(content, patterns);

      // Should return original content when no valid patterns
      assert.strictEqual(result, content);
    });
  });

  suite('applyCodePatterns', () => {
    test('Should remove code snippets matching pattern', () => {
      const content = `const x = 1; // inline comment
const y = 2; // another comment`;
      const patterns = ['\\s*//.*$'];
      const result = applyCodePatterns(content, patterns);

      assert.strictEqual(result, `const x = 1;
const y = 2;`);
    });

    test('Should remove multiple occurrences globally', () => {
      const content = `DEBUG: line 1 DEBUG: info DEBUG: end`;
      const patterns = ['DEBUG:\\s*'];
      const result = applyCodePatterns(content, patterns);

      assert.strictEqual(result, `line 1 info end`);
    });

    test('Should apply multiple patterns sequentially', () => {
      const content = `const x = 1; // comment /* also */`;
      const patterns = ['\\s*//.*?/\\*', '\\*/'];
      const result = applyCodePatterns(content, patterns);

      assert.strictEqual(result, `const x = 1; also `);
    });

    test('Should handle empty patterns array', () => {
      const content = `const x = 1;`;
      const patterns: string[] = [];
      const result = applyCodePatterns(content, patterns);

      assert.strictEqual(result, content);
    });

    test('Should handle multiline patterns', () => {
      const content = `line 1
line 2
line 3`;
      const patterns = ['line 2\\n'];
      const result = applyCodePatterns(content, patterns);

      assert.strictEqual(result, `line 1
line 3`);
    });
  });

  suite('applyIgnorePatterns', () => {
    test('Should apply both line and code patterns', () => {
      const content = `const x = 1; // comment
// full line comment
const y = 2; /* inline */`;

      const config = {
        ignoreCodePatterns: ['/\\*.*?\\*/'],
        ignoreLinePatterns: ['^\\s*//.*$']
      };

      const result = applyIgnorePatterns(content, config);

      // Code patterns applied first, then line patterns
      assert.strictEqual(result, `const x = 1; // comment
const y = 2; `);
    });

    test('Should handle empty config', () => {
      const content = `const x = 1;
// comment`;
      const config = {};
      const result = applyIgnorePatterns(content, config);

      assert.strictEqual(result, content);
    });

    test('Should apply only line patterns when code patterns absent', () => {
      const content = `line 1
// comment
line 3`;
      const config = {
        ignoreLinePatterns: ['^\\s*//.*$']
      };
      const result = applyIgnorePatterns(content, config);

      assert.strictEqual(result, `line 1
line 3`);
    });

    test('Should apply only code patterns when line patterns absent', () => {
      const content = `const x = 1; // comment`;
      const config = {
        ignoreCodePatterns: ['\\s*//.*$']
      };
      const result = applyIgnorePatterns(content, config);

      assert.strictEqual(result, `const x = 1;`);
    });
  });

  suite('validatePatterns', () => {
    test('Should validate correct patterns', () => {
      const patterns = ['^\\s*//.*$', '\\s*console\\.log'];
      const result = validatePatterns(patterns);

      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
    });

    test('Should detect invalid regex patterns', () => {
      const patterns = ['[invalid(regex', '^valid$'];
      const result = validatePatterns(patterns);

      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.errors.length, 1);
      assert.ok(result.errors[0].includes('[invalid(regex'));
    });

    test('Should handle empty patterns array', () => {
      const patterns: string[] = [];
      const result = validatePatterns(patterns);

      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
    });

    test('Should detect multiple invalid patterns', () => {
      const patterns = ['[invalid', '(also-bad', '^valid$'];
      const result = validatePatterns(patterns);

      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.errors.length, 2);
    });
  });

  suite('Real-world use cases', () => {
    test('Should ignore JavaScript single-line comments', () => {
      const content = `function test() {
  // This is a comment
  const x = 1;
  return x; // inline comment
}`;
      const patterns = ['^\\s*//.*$'];
      const result = applyLinePatterns(content, patterns);

      assert.strictEqual(result, `function test() {
  const x = 1;
  return x; // inline comment
}`);
    });

    test('Should ignore console.log statements', () => {
      const content = `function debug() {
  console.log('debug info');
  const x = 1;
  console.log('x:', x);
  return x;
}`;
      const patterns = ['^\\s*console\\.log\\(.*\\);?\\s*$'];
      const result = applyLinePatterns(content, patterns);

      assert.strictEqual(result, `function debug() {
  const x = 1;
  return x;
}`);
    });

    test('Should ignore Python docstrings', () => {
      const content = `def test():
    """This is a docstring"""
    x = 1
    return x`;
      const patterns = ['^\\s*""".*"""\\s*$'];
      const result = applyLinePatterns(content, patterns);

      assert.strictEqual(result, `def test():
    x = 1
    return x`);
    });

    test('Should ignore trailing whitespace', () => {
      const content = `line 1   \nline 2\t\nline 3`;
      const patterns = ['\\s+$'];
      const result = applyCodePatterns(content, patterns);

      assert.strictEqual(result, `line 1\nline 2\nline 3`);
    });

    test('Should ignore debug statements across multiple languages', () => {
      const content = `const x = 1;
console.log('js');
const y = 2;
print('python')
const z = 3;
System.out.println('java');`;

      const patterns = [
        '^\\s*console\\.log\\(.*\\);?\\s*$',
        '^\\s*print\\(.*\\)\\s*$',
        '^\\s*System\\.out\\.println\\(.*\\);?\\s*$'
      ];

      const result = applyLinePatterns(content, patterns);

      assert.strictEqual(result, `const x = 1;
const y = 2;
const z = 3;`);
    });
  });
});
