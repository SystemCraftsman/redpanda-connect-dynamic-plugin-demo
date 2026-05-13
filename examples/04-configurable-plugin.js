'use strict';

/**
 * Step 4 — Plugin with configurable fields.
 *
 * This example creates a "prefix" processor that prepends a user-defined
 * string to every message. The prefix is declared in plugin.yaml `fields`
 * and passed to the plugin subprocess by Redpanda Connect.
 *
 * ASSUMPTION: inside the Python plugin, configurable field values are
 * accessed via the `msg.config` dict (exact API not shown in docs;
 * readers should consult the redpanda_connect SDK source/docs for the
 * current accessor pattern).
 *
 * Run:
 *   node examples/04-configurable-plugin.js
 */

const path = require('path');
const {
  buildPluginYaml,
  buildConnectYaml,
  writeFile,
  PLUGIN_DIR,
} = require('../src/index');

const PROJECT_NAME    = 'prefix-plugin';
const projectDir      = path.join(PLUGIN_DIR, PROJECT_NAME);
const pluginScript    = path.join(projectDir, 'prefix_processor.py');
const pluginYamlPath  = path.join(projectDir, 'plugin.yaml');
const connectYamlPath = path.join(projectDir, 'connect.yaml');

// ---------------------------------------------------------------------------
// Python plugin with a configurable `prefix` field.
//
// ASSUMPTION: field values are available via the `msg.config` dictionary.
// The exact accessor (msg.config, a closure argument, or another pattern)
// is not fully specified in the current Redpanda Connect docs.
// Verify against the redpanda_connect Python SDK documentation.
// ---------------------------------------------------------------------------
const PREFIX_PROCESSOR_PY = `"""
prefix_processor.py

A Redpanda Connect dynamic processor that prepends a configurable
prefix string to every message payload.

The `prefix` field is declared in plugin.yaml and injected at runtime
by the Redpanda Connect engine.
"""
import asyncio
import logging

import redpanda_connect


@redpanda_connect.processor
def add_prefix(msg: redpanda_connect.Message) -> redpanda_connect.Message:
    """
    Prepend a configurable prefix to the message payload.

    ASSUMPTION: configurable plugin fields are accessed via msg.config.
    Verify the exact accessor with the redpanda_connect Python SDK docs.
    """
    # ASSUMPTION: msg.config is a dict of field name -> value
    prefix = msg.config.get("prefix", "INFO: ") if hasattr(msg, "config") else "INFO: "
    try:
        original = msg.payload.decode("utf-8")
        msg.payload = f"{prefix}{original}".encode("utf-8")
    except (UnicodeDecodeError, AttributeError) as exc:
        logging.warning("add_prefix: payload encoding issue: %s", exc)
    return msg


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(redpanda_connect.processor_main(add_prefix))
`;

try {
  console.log('=== Step 4: Configurable plugin (prefix processor) ===');

  // Write the Python script
  writeFile(pluginScript, PREFIX_PROCESSOR_PY.trimStart());

  // ------------------------------------------------------------------
  // plugin.yaml with a configurable field.
  // ASSUMPTION: field definition uses keys: name, type, default.
  // The `type` value 'string' is inferred from the docs description;
  // consult the full Redpanda Connect dynamic plugin spec for all types.
  // ------------------------------------------------------------------
  const pluginYaml = buildPluginYaml({
    name:    'prefix_processor',
    summary: 'Prepends a configurable prefix string to every message payload',
    command: ['uv', 'run', 'prefix_processor.py'],
    type:    'processor',
    fields: [
      {
        name:    'prefix',
        type:    'string',    // ASSUMPTION: field type identifier
        default: 'INFO: ',
      },
    ],
  });

  writeFile(pluginYamlPath, pluginYaml);
  console.log('--- plugin.yaml ---');
  console.log(pluginYaml);

  // ------------------------------------------------------------------
  // connect.yaml wiring the prefix_processor into a pipeline.
  // The processor name must match the `name` in plugin.yaml exactly.
  // ------------------------------------------------------------------
  const connectYaml = buildConnectYaml({
    pluginName:       'prefix_processor',
    generateInterval: '1s',
    generateMapping:  'root = "event received at " + now()',
    count:            5,
  });

  writeFile(connectYamlPath, connectYaml);
  console.log('--- connect.yaml ---');
  console.log(connectYaml);

  console.log('Prefix plugin files written.');
  console.log('To run: cd to the plugin dir and execute:');
  console.log(`  cd ${projectDir}`);
  console.log('  uv init prefix-plugin  (if not already done)');
  console.log('  uv add redpanda_connect');
  console.log('  rpk connect run --rpc-plugins=plugin.yaml connect.yaml');
} catch (err) {
  console.error('Failed to create configurable plugin:', err.message);
  process.exit(1);
}