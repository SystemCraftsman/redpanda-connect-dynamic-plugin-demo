'use strict';

/**
 * tests/smoke.test.js
 *
 * Smoke tests for the Redpanda Connect dynamic plugins tutorial helper.
 *
 * Tests exercise:
 *   1. buildPluginYaml  — correct YAML structure and required fields
 *   2. buildConnectYaml — correct YAML structure and required fields
 *   3. writeFile        — files are written and readable
 *   4. RPK_BIN check    — rpk binary resolves (soft, non-fatal if absent)
 *
 * Run with Node's built-in test runner (Node 18+):
 *   node --test tests/smoke.test.js
 *
 * Or with npm test (configure package.json → "test": "node --test tests/smoke.test.js")
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('node:fs');
const os     = require('node:os');
const path   = require('node:path');
const { execFileSync } = require('node:child_process');

const {
  buildPluginYaml,
  buildConnectYaml,
  writeFile,
  RPK_BIN,
} = require('../src/index');

// ---------------------------------------------------------------------------
// buildPluginYaml
// ---------------------------------------------------------------------------

describe('buildPluginYaml', () => {
  test('includes all documented top-level fields', () => {
    const yaml = buildPluginYaml({
      name:    'yell',
      summary: 'Converts payload to uppercase',
      command: ['uv', 'run', 'yell_processor.py'],
      type:    'processor',
      fields:  [],
    });

    // Each documented field must appear on its own line
    assert.match(yaml, /^name: yell/m,           'name field missing');
    assert.match(yaml, /^summary: /m,             'summary field missing');
    assert.match(yaml, /^command: \[/m,           'command field missing');
    assert.match(yaml, /^type: processor/m,       'type field missing');
    assert.match(yaml, /^fields: \[\]/m,          'fields field missing');
  });

  test('serialises command array correctly', () => {
    const yaml = buildPluginYaml({
      name:    'test-plugin',
      summary: 'Test',
      command: ['uv', 'run', 'plugin.py'],
    });
    // All three command tokens must appear in the YAML
    assert.ok(yaml.includes('"uv"'),          'uv missing from command');
    assert.ok(yaml.includes('"run"'),         'run missing from command');
    assert.ok(yaml.includes('"plugin.py"'),   'script missing from command');
  });

  test('renders fields array when fields are provided', () => {
    const yaml = buildPluginYaml({
      name:    'prefix-plugin',
      summary: 'Adds prefix',
      command: ['uv', 'run', 'prefix.py'],
      fields:  [{ name: 'prefix', type: 'string', default: 'INFO: ' }],
    });
    assert.match(yaml, /fields:/m,             'fields block missing');
    assert.match(yaml, /name: prefix/m,        'field name missing');
    assert.match(yaml, /type: string/m,        'field type missing');
    assert.match(yaml, /default: "INFO: "/m,   'field default missing');
  });

  test('defaults type to processor', () => {
    const yaml = buildPluginYaml({
      name:    'my-plugin',
      summary: 'Test',
      command: ['python', 'plugin.py'],
    });
    assert.match(yaml, /^type: processor/m);
  });

  test('throws when required fields are missing', () => {
    assert.throws(
      () => buildPluginYaml({ summary: 'No name', command: ['uv', 'run', 'x.py'] }),
      /name.*required|required.*name/i,
    );
  });
});

// ---------------------------------------------------------------------------
// buildConnectYaml
// ---------------------------------------------------------------------------

describe('buildConnectYaml', () => {
  test('includes all documented top-level sections', () => {
    const yaml = buildConnectYaml({
      pluginName:      'yell',
      generateMapping: 'root = "hello"',
      count:           5,
    });

    assert.match(yaml, /^input:/m,                 'input section missing');
    assert.match(yaml, /generate:/m,               'generate input missing');
    assert.match(yaml, /interval:/m,               'interval missing');
    assert.match(yaml, /mapping:/m,                'mapping missing');
    assert.match(yaml, /^pipeline:/m,              'pipeline section missing');
    assert.match(yaml, /processors:/m,             'processors missing');
    assert.match(yaml, /- yell: {}/m,              'processor reference missing');
    assert.match(yaml, /^output:/m,                'output section missing');
    assert.match(yaml, /stdout:/m,                 'stdout output missing');
    assert.match(yaml, /codec: lines/m,            'codec missing');
  });

  test('includes count when provided', () => {
    const yaml = buildConnectYaml({
      pluginName:      'yell',
      generateMapping: 'root = "x"',
      count:           3,
    });
    assert.match(yaml, /count: 3/m);
  });

  test('omits count line when count is not set', () => {
    const yaml = buildConnectYaml({
      pluginName:      'yell',
      generateMapping: 'root = "x"',
    });
    assert.doesNotMatch(yaml, /count:/m);
  });

  test('defaults interval to 1s', () => {
    const yaml = buildConnectYaml({
      pluginName:      'yell',
      generateMapping: 'root = "x"',
    });
    assert.match(yaml, /interval: 1s/m);
  });

  test('throws when required fields are missing', () => {
    assert.throws(
      () => buildConnectYaml({ pluginName: 'yell' }),  // no generateMapping
      /generateMapping.*required|required.*generateMapping/i,
    );
  });
});

// ---------------------------------------------------------------------------
// writeFile
// ---------------------------------------------------------------------------

describe('writeFile', () => {
  test('creates file and parent directories', () => {
    const tmpDir  = fs.mkdtempSync(path.join(os.tmpdir(), 'rpconnect-test-'));
    const outPath = path.join(tmpDir, 'nested', 'dir', 'output.yaml');
    const content = 'name: test\n';

    writeFile(outPath, content);

    assert.ok(fs.existsSync(outPath), 'file was not created');
    assert.equal(fs.readFileSync(outPath, 'utf8'), content, 'file content mismatch');

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('overwrites an existing file', () => {
    const tmpDir  = fs.mkdtempSync(path.join(os.tmpdir(), 'rpconnect-test-'));
    const outPath = path.join(tmpDir, 'file.yaml');

    writeFile(outPath, 'original\n');
    writeFile(outPath, 'updated\n');

    assert.equal(fs.readFileSync(outPath, 'utf8'), 'updated\n');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

// ---------------------------------------------------------------------------
// RPK_BIN availability (soft check — tutorial prereq, not a library error)
// ---------------------------------------------------------------------------

describe('rpk binary', () => {
  test('RPK_BIN env var resolves (soft check)', () => {
    // RPK_BIN defaults to 'rpk'; if the binary is absent the pipeline examples
    // will fail but the helper library itself is not broken.
    assert.equal(typeof RPK_BIN, 'string', 'RPK_BIN must be a string');
    assert.ok(RPK_BIN.length > 0,          'RPK_BIN must not be empty');

    let rpkAvailable = false;
    try {
      execFileSync(RPK_BIN, ['--version'], { timeout: 5000 });
      rpkAvailable = true;
    } catch (_) {
      // rpk not installed — acceptable in CI without Redpanda tooling
    }

    if (!rpkAvailable) {
      console.warn(
        '[smoke] WARNING: rpk not found at RPK_BIN=%s. ' +
        'Install rpk to run full pipeline examples: ' +
        'https://docs.redpanda.com/current/get-started/rpk-install/',
        RPK_BIN,
      );
    } else {
      console.log(`[smoke] rpk binary found at: ${RPK_BIN}`);
    }
    // This test always passes; the warning above guides the reader
    assert.ok(true);
  });
});
