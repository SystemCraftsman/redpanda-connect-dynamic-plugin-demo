'use strict';

/**
 * Step 3 — Generate plugin.yaml and connect.yaml.
 *
 * plugin.yaml  — describes the dynamic plugin to Redpanda Connect.
 *                Documented fields: name, summary, command, type, fields.
 *
 * connect.yaml — defines the full data pipeline:
 *                input  (generate) → processor (yell) → output (stdout).
 *
 * The run command (confirmed in docs):
 *   rpk connect run --rpc-plugins=plugin.yaml connect.yaml
 *
 * Run:
 *   node examples/03-plugin-config.js
 */

const path = require('path');
const {
  buildPluginYaml,
  buildConnectYaml,
  writeFile,
  PLUGIN_DIR,
} = require('../src/index');

const PROJECT_NAME    = 'yell-plugin';
const projectDir      = path.join(PLUGIN_DIR, PROJECT_NAME);
const pluginYamlPath  = path.join(projectDir, 'plugin.yaml');
const connectYamlPath = path.join(projectDir, 'connect.yaml');

try {
  console.log('=== Step 3: Generate YAML configuration files ===');

  // ------------------------------------------------------------------
  // plugin.yaml
  // Documented fields (Redpanda Connect docs):
  //   name    — identifier used in connect.yaml processors list
  //   summary — human-readable description
  //   command — subprocess start command; `uv run` executes the script
  //             inside the project's virtual environment automatically
  //   type    — 'processor' | 'input' | 'output'
  //   fields  — [] means no user-configurable fields
  // ------------------------------------------------------------------
  const pluginYaml = buildPluginYaml({
    name:    'yell',
    summary: 'Converts every message payload to uppercase',
    command: ['uv', 'run', 'yell_processor.py'],
    type:    'processor',
    fields:  [],  // no configurable fields for the simple yell plugin
  });

  writeFile(pluginYamlPath, pluginYaml);
  console.log('--- plugin.yaml ---');
  console.log(pluginYaml);

  // ------------------------------------------------------------------
  // connect.yaml
  // input.generate produces synthetic messages at 1-second intervals.
  // The bloblang mapping `root = "hello from redpanda connect"` sets
  // the payload to a plain string.
  // count: 5 stops the pipeline after 5 messages (handy for demos).
  // ------------------------------------------------------------------
  const connectYaml = buildConnectYaml({
    pluginName:       'yell',
    generateInterval: '1s',
    generateMapping:  'root = "hello from redpanda connect"',
    count:            5,
  });

  writeFile(connectYamlPath, connectYaml);
  console.log('--- connect.yaml ---');
  console.log(connectYaml);

  console.log('Done! Next step: node examples/04-configurable-plugin.js');
  console.log(`  or run the pipeline now: node examples/05-run-pipeline.js`);
} catch (err) {
  console.error('Config generation failed:', err.message);
  process.exit(1);
}