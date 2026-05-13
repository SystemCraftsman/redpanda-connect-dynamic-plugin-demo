'use strict';

/**
 * Step 1 — Scaffold a Python plugin project.
 *
 * This script creates a fresh uv-managed Python project and installs
 * the `redpanda_connect` SDK, which is the official Python library for
 * building Redpanda Connect dynamic plugins.
 *
 * Prerequisites:
 *   - uv installed: https://docs.astral.sh/uv/getting-started/installation/
 *
 * Run:
 *   node examples/01-scaffold-project.js
 */

const path = require('path');
const { scaffoldUvProject, PLUGIN_DIR } = require('../src/index');

// The project directory is a sub-folder of PLUGIN_DIR named after the plugin.
// Set PLUGIN_DIR env var to override the default (./plugins).
const PROJECT_NAME = 'yell-plugin';
const projectDir   = path.join(PLUGIN_DIR, PROJECT_NAME);

try {
  console.log('=== Step 1: Scaffold Python plugin project ===');
  console.log(`Project name : ${PROJECT_NAME}`);
  console.log(`Project path : ${projectDir}`);
  console.log('');

  // Creates projectDir, runs `uv init yell-plugin`, then `uv add redpanda_connect`
  // Confirmed commands from Redpanda Connect docs:
  //   uv init <name>          — initialise a new Python project
  //   uv add redpanda_connect — install the SDK
  scaffoldUvProject(projectDir, PROJECT_NAME);

  console.log('');
  console.log('Done! Next step: node examples/02-yell-processor.js');
} catch (err) {
  console.error('Scaffold failed:', err.message);
  process.exit(1);
}