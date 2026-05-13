'use strict';

/**
 * src/index.js
 *
 * Helper library for scaffolding, configuring, and running
 * Redpanda Connect dynamic (RPC) plugins.
 *
 * Dynamic plugins (introduced in Redpanda Connect v4.56.0 Beta) are external
 * executables that communicate with the core engine over gRPC on Unix sockets.
 * This module handles the Node.js side: generating YAML configs, writing files,
 * and spawning `rpk connect run --rpc-plugins=...`.
 *
 * Prereqs:
 *   - rpk installed (https://docs.redpanda.com/current/get-started/rpk-install/)
 *   - uv installed  (https://docs.astral.sh/uv/getting-started/installation/)
 *   - Python 3.10+
 *
 * Env vars (both optional — sensible defaults provided):
 *   RPK_BIN    Path to the rpk binary. Defaults to 'rpk'.
 *   PLUGIN_DIR Root directory for generated plugin projects. Defaults to ./plugins.
 */

const { execSync, spawn } = require('child_process');
const fs   = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

/** Path to the rpk binary. Install: brew install redpanda-data/tap/redpanda */
const RPK_BIN = process.env.RPK_BIN || 'rpk';

/** Root directory where generated plugin projects are placed. */
const PLUGIN_DIR = process.env.PLUGIN_DIR || path.join(process.cwd(), 'plugins');

// ---------------------------------------------------------------------------
// Config generators
// ---------------------------------------------------------------------------

/**
 * Build the content string for a plugin.yaml file.
 *
 * Documented plugin.yaml fields (confirmed in Redpanda Connect docs):
 *   name    — unique identifier referenced in connect.yaml
 *   summary — human-readable description
 *   command — array of strings; the subprocess start command
 *   type    — 'processor' | 'input' | 'output'
 *   fields  — list of configurable field definitions
 *
 * ASSUMPTION: individual field object keys (name, type, default) follow the
 * structure implied by the docs but are not exhaustively specified.
 *
 * @param {object}   opts
 * @param {string}   opts.name      Plugin identifier (no spaces).
 * @param {string}   opts.summary   One-line description.
 * @param {string[]} opts.command   Subprocess command array, e.g. ['uv','run','plugin.py'].
 * @param {string}   [opts.type]    Plugin role. Defaults to 'processor'.
 * @param {Array}    [opts.fields]  Configurable fields: [{name, type, default?}].
 * @returns {string} YAML content ready to write to disk.
 */
function buildPluginYaml({ name, summary, command, type = 'processor', fields = [] }) {
  if (!name || !summary || !command || !command.length) {
    throw new Error('buildPluginYaml: name, summary, and command are required');
  }

  // Serialise the command array as inline YAML sequence
  const commandYaml = `[${command.map(c => JSON.stringify(c)).join(', ')}]`;

  // Build the fields block
  let fieldsYaml;
  if (fields.length === 0) {
    fieldsYaml = 'fields: []';
  } else {
    // ASSUMPTION: field item keys are name / type / default
    const items = fields.map((f) => {
      const defaultLine = f.default !== undefined
        ? `\n    default: ${JSON.stringify(f.default)}`
        : '';
      return `  - name: ${f.name}\n    type: ${f.type}${defaultLine}`;
    });
    fieldsYaml = 'fields:\n' + items.join('\n');
  }

  return [
    `name: ${name}`,
    `summary: ${summary}`,
    `command: ${commandYaml}`,
    `type: ${type}`,
    fieldsYaml,
  ].join('\n') + '\n';
}

/**
 * Build the content string for a connect.yaml pipeline file.
 *
 * Documented connect.yaml structure (confirmed in Redpanda Connect docs):
 *   input.generate.interval  — message generation cadence, e.g. '1s'
 *   input.generate.count     — optional total message count; omit for infinite
 *   input.generate.mapping   — Bloblang expression for the message payload
 *   pipeline.processors      — ordered list of processor references
 *   output.stdout.codec      — output encoding; 'lines' emits one message per line
 *
 * @param {object} opts
 * @param {string} opts.pluginName        Name matching the plugin.yaml `name` field.
 * @param {string} [opts.generateInterval] Cadence string. Defaults to '1s'.
 * @param {string} opts.generateMapping   Bloblang mapping expression.
 * @param {number} [opts.count]           If set, stop after this many messages.
 * @returns {string} YAML content ready to write to disk.
 */
function buildConnectYaml({
  pluginName,
  generateInterval = '1s',
  generateMapping,
  count,
}) {
  if (!pluginName || !generateMapping) {
    throw new Error('buildConnectYaml: pluginName and generateMapping are required');
  }

  const countLine = typeof count === 'number' ? `    count: ${count}\n` : '';

  return (
    `input:\n` +
    `  generate:\n` +
    `    interval: ${generateInterval}\n` +
    countLine +
    `    mapping: |\n` +
    `      ${generateMapping}\n` +
    `pipeline:\n` +
    `  processors:\n` +
    `    - ${pluginName}: {}\n` +
    `output:\n` +
    `  stdout:\n` +
    `    codec: lines\n`
  );
}

// ---------------------------------------------------------------------------
// File utilities
// ---------------------------------------------------------------------------

/**
 * Write content to filePath, creating any missing parent directories.
 *
 * @param {string} filePath  Absolute or relative file path.
 * @param {string} content   UTF-8 string content.
 */
function writeFile(filePath, content) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[write] ${filePath}`);
  } catch (err) {
    throw new Error(`writeFile failed for ${filePath}: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Project scaffolding
// ---------------------------------------------------------------------------

/**
 * Scaffold a new Python plugin project using uv.
 *
 * uv is Redpanda's recommended Python package manager for dynamic plugins.
 * Confirmed commands:
 *   uv init <name>          — creates pyproject.toml + hello.py stub
 *   uv add redpanda_connect — adds the official SDK as a dependency
 *
 * @param {string} projectDir  Absolute path for the new project directory.
 * @param {string} projectName Project name used by uv (no spaces).
 */
function scaffoldUvProject(projectDir, projectName) {
  try {
    // uv init creates the directory; run it from the parent
    const parentDir = path.dirname(projectDir);
    fs.mkdirSync(parentDir, { recursive: true });

    console.log(`[scaffold] Running: uv init ${projectName} in ${parentDir}`);
    execSync(`uv init ${projectName}`, { cwd: parentDir, stdio: 'inherit' });

    // Install the redpanda_connect Python SDK
    console.log('[scaffold] Running: uv add redpanda_connect');
    execSync('uv add redpanda_connect', { cwd: projectDir, stdio: 'inherit' });

    console.log(`[scaffold] Project ready at: ${projectDir}`);
  } catch (err) {
    throw new Error(`scaffoldUvProject failed: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Pipeline runner
// ---------------------------------------------------------------------------

/**
 * Spawn a Redpanda Connect pipeline with a dynamic RPC plugin.
 *
 * Documented run command:
 *   rpk connect run --rpc-plugins=<plugin.yaml> <connect.yaml>
 *
 * @param {string}  pluginYamlPath  Path to the plugin.yaml descriptor.
 * @param {string}  connectYamlPath Path to the connect.yaml pipeline config.
 * @param {string}  [cwd]           Working directory for the subprocess.
 * @returns {import('child_process').ChildProcess}
 */
function runPipeline(pluginYamlPath, connectYamlPath, cwd = process.cwd()) {
  const absPlugin  = path.resolve(pluginYamlPath);
  const absPipeline = path.resolve(connectYamlPath);

  const args = [
    'connect',
    'run',
    `--rpc-plugins=${absPlugin}`,
    absPipeline,
  ];

  console.log(`[run] ${RPK_BIN} ${args.join(' ')}`);

  const child = spawn(RPK_BIN, args, {
    cwd,
    // Inherit stdio so plugin stdout/stderr surfaces in the terminal
    stdio: 'inherit',
  });

  child.on('error', (err) => {
    console.error(`[run] Failed to start '${RPK_BIN}': ${err.message}`);
    console.error('[run] Install rpk: https://docs.redpanda.com/current/get-started/rpk-install/');
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      console.log(`[run] Process terminated by signal: ${signal}`);
    } else if (code !== 0 && code !== null) {
      console.error(`[run] rpk connect exited with code ${code}`);
    }
  });

  return child;
}

// ---------------------------------------------------------------------------
// Module exports
// ---------------------------------------------------------------------------

module.exports = {
  RPK_BIN,
  PLUGIN_DIR,
  buildPluginYaml,
  buildConnectYaml,
  writeFile,
  scaffoldUvProject,
  runPipeline,
};
