import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createCustomFileCompare } from '../../services/customFileCompare';

suite('Custom File Compare', () => {
  let tempDir: string;
  let file1Path: string;
  let file2Path: string;

  setup(() => {
    // Create temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vscode-compare-test-'));
    file1Path = path.join(tempDir, 'file1.txt');
    file2Path = path.join(tempDir, 'file2.txt');
  });

  teardown(() => {
    // Clean up temporary files
    try {
      if (fs.existsSync(file1Path)) fs.unlinkSync(file1Path);
      if (fs.existsSync(file2Path)) fs.unlinkSync(file2Path);
      if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test('Should detect files as equal when content is identical', async () => {
    const content = `line 1
line 2
line 3`;

    fs.writeFileSync(file1Path, content);
    fs.writeFileSync(file2Path, content);

    const compareFunc = createCustomFileCompare({});
    const stat1 = fs.statSync(file1Path);
    const stat2 = fs.statSync(file2Path);

    const result = await compareFunc(file1Path, stat1, file2Path, stat2, {});

    assert.strictEqual(result, true, 'Files should be equal');
  });

  test('Should detect files as different when content differs', async () => {
    fs.writeFileSync(file1Path, 'line 1\nline 2');
    fs.writeFileSync(file2Path, 'line 1\nline 3');

    const compareFunc = createCustomFileCompare({});
    const stat1 = fs.statSync(file1Path);
    const stat2 = fs.statSync(file2Path);

    const result = await compareFunc(file1Path, stat1, file2Path, stat2, {});

    assert.strictEqual(result, false, 'Files should be different');
  });

  test('Should ignore lines matching ignoreLinePatterns', async () => {
    const content1 = `line 1
// comment in file 1
line 3`;

    const content2 = `line 1
// comment in file 2
line 3`;

    fs.writeFileSync(file1Path, content1);
    fs.writeFileSync(file2Path, content2);

    const compareFunc = createCustomFileCompare({
      ignoreLinePatterns: ['^\\s*//.*$']
    });
    const stat1 = fs.statSync(file1Path);
    const stat2 = fs.statSync(file2Path);

    const result = await compareFunc(file1Path, stat1, file2Path, stat2, {});

    assert.strictEqual(result, true, 'Files should be equal after ignoring comments');
  });

  test('Should ignore code matching ignoreCodePatterns', async () => {
    const content1 = `const x = 1; // comment A`;
    const content2 = `const x = 1; // comment B`;

    fs.writeFileSync(file1Path, content1);
    fs.writeFileSync(file2Path, content2);

    const compareFunc = createCustomFileCompare({
      ignoreCodePatterns: ['\\s*//.*$']
    });
    const stat1 = fs.statSync(file1Path);
    const stat2 = fs.statSync(file2Path);

    const result = await compareFunc(file1Path, stat1, file2Path, stat2, {});

    assert.strictEqual(result, true, 'Files should be equal after ignoring inline comments');
  });

  test('Should apply both line and code patterns', async () => {
    const content1 = `const x = 1; /* A */
// full comment A
const y = 2;`;

    const content2 = `const x = 1; /* B */
// full comment B
const y = 2;`;

    fs.writeFileSync(file1Path, content1);
    fs.writeFileSync(file2Path, content2);

    const compareFunc = createCustomFileCompare({
      ignoreLinePatterns: ['^\\s*//.*$'],
      ignoreCodePatterns: ['/\\*.*?\\*/']
    });
    const stat1 = fs.statSync(file1Path);
    const stat2 = fs.statSync(file2Path);

    const result = await compareFunc(file1Path, stat1, file2Path, stat2, {});

    assert.strictEqual(result, true, 'Files should be equal after ignoring all comments');
  });

  test('Should respect ignoreLineEnding option', async () => {
    fs.writeFileSync(file1Path, 'line 1\nline 2\nline 3');
    fs.writeFileSync(file2Path, 'line 1\r\nline 2\r\nline 3');

    const compareFunc = createCustomFileCompare({});
    const stat1 = fs.statSync(file1Path);
    const stat2 = fs.statSync(file2Path);

    const result = await compareFunc(file1Path, stat1, file2Path, stat2, {
      ignoreLineEnding: true
    });

    assert.strictEqual(result, true, 'Files should be equal when ignoring line endings');
  });

  test('Should respect ignoreWhiteSpaces option', async () => {
    fs.writeFileSync(file1Path, '  line 1  \n  line 2  ');
    fs.writeFileSync(file2Path, 'line 1\nline 2');

    const compareFunc = createCustomFileCompare({});
    const stat1 = fs.statSync(file1Path);
    const stat2 = fs.statSync(file2Path);

    const result = await compareFunc(file1Path, stat1, file2Path, stat2, {
      ignoreWhiteSpaces: true
    });

    assert.strictEqual(result, true, 'Files should be equal when ignoring whitespace');
  });

  test('Should respect ignoreAllWhiteSpaces option', async () => {
    fs.writeFileSync(file1Path, 'line 1\nline  2');
    fs.writeFileSync(file2Path, 'line1\nline2');

    const compareFunc = createCustomFileCompare({});
    const stat1 = fs.statSync(file1Path);
    const stat2 = fs.statSync(file2Path);

    const result = await compareFunc(file1Path, stat1, file2Path, stat2, {
      ignoreAllWhiteSpaces: true
    });

    assert.strictEqual(result, true, 'Files should be equal when ignoring all whitespace');
  });

  test('Should respect ignoreEmptyLines option', async () => {
    fs.writeFileSync(file1Path, 'line 1\n\n\nline 2');
    fs.writeFileSync(file2Path, 'line 1\nline 2');

    const compareFunc = createCustomFileCompare({});
    const stat1 = fs.statSync(file1Path);
    const stat2 = fs.statSync(file2Path);

    const result = await compareFunc(file1Path, stat1, file2Path, stat2, {
      ignoreEmptyLines: true
    });

    assert.strictEqual(result, true, 'Files should be equal when ignoring empty lines');
  });

  test('Should combine ignore patterns with other options', async () => {
    const content1 = `  const x = 1;  // comment A

  const y = 2;  // comment B  `;

    const content2 = `const x = 1; // comment C
const y = 2; // comment D`;

    fs.writeFileSync(file1Path, content1);
    fs.writeFileSync(file2Path, content2);

    const compareFunc = createCustomFileCompare({
      ignoreCodePatterns: ['\\s*//.*$']
    });
    const stat1 = fs.statSync(file1Path);
    const stat2 = fs.statSync(file2Path);

    const result = await compareFunc(file1Path, stat1, file2Path, stat2, {
      ignoreWhiteSpaces: true,
      ignoreEmptyLines: true
    });

    assert.strictEqual(
      result,
      true,
      'Files should be equal when combining patterns with whitespace/empty line options'
    );
  });

  test('Should handle console.log removal in JavaScript files', async () => {
    const content1 = `function test() {
  console.log('debug 1');
  const x = 1;
  console.log('x:', x);
  return x;
}`;

    const content2 = `function test() {
  console.log('different debug');
  const x = 1;
  console.log('y:', x);
  return x;
}`;

    fs.writeFileSync(file1Path, content1);
    fs.writeFileSync(file2Path, content2);

    const compareFunc = createCustomFileCompare({
      ignoreLinePatterns: ['^\\s*console\\.log\\(.*\\);?\\s*$']
    });
    const stat1 = fs.statSync(file1Path);
    const stat2 = fs.statSync(file2Path);

    const result = await compareFunc(file1Path, stat1, file2Path, stat2, {});

    assert.strictEqual(result, true, 'Files should be equal after ignoring console.log');
  });
});
