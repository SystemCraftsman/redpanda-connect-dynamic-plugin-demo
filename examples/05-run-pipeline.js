'use strict';

/**
 * Step 5 — Run the Redpanda Connect pipeline with the yell plugin.
 *
 * This script resolves the paths to plugin.yaml and connect.yaml that
 * were generated in previous steps, then spawns:
 *
 *   rpk connect run --rpc-plugins=<plugin.yaml> <connect.yaml>
 *
 * Expected output (5 messages, each uppercase):
 *   HELLO FROM REDPANDA CONNECT
 *   HELLO FROM REDPANDA CONNECT
 *   ... (5 total)
 *
 * Prerequisites:
 *   Run steps 01-04 first to generate all required files.
 *
 * Run:
 *   node examples/05-run-pipeline.js
 */

const path = require('path');
const fs   = require('fs');
const { runPipeline, PLUGIN_DIR, RPK_BIN } = require('../src/index');

const PROJECT_NAME    = 'yell-plugin';
const projectDir      = path.join(PLUGIN_DIR, PROJECT_NAME);
const pluginYamlPath  = path.join(projectDir, 'plugin.yaml');
const connectYamlPath = path.join(projectDir, 'connect.yaml');

// Guard: verify required files exist before attempting to run
for (const filePath of [pluginYamlPath, connectYamlPath]) {
  if (!fs.existsSync(filePath)) {
    console.error(`Missing file: ${filePath}`);
    console.error('Run steps 01-04 first to generate all required files.');
    process.exit(1);
  }
}

console.log('=== Step 5: Run the dynamic plugin pipeline ===');
console.log(`rpk binary  : ${RPK_BIN}`);
console.log(`plugin.yaml : ${pluginYamlPath}`);
console.log(`connect.yaml: ${connectYamlPath}`);
console.log('');
console.log('Starting pipeline — press Ctrl+C to stop early.');
console.log('');

try {
  // runPipeline spawns: rpk connect run --rpc-plugins=<plugin.yaml> <connect.yaml>
  // The pipeline generates 5 messages (count: 5 in connect.yaml) then exits.
  const child = runPipeline(pluginYamlPath, connectYamlPath, projectDir);

  // Forward termination signals so the subprocess is cleaned up properly
  process.on('SIGINT',  () => child.kill('SIGINT'));
  process.on('SIGTERM', () => child.kill('SIGTERM'));
} catch (err) {
  console.error('Failed to start pipeline:', err.message);
  process.exit(1);
}