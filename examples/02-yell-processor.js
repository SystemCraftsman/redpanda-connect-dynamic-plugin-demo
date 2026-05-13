'use strict';

/**
 * Step 2 — Write the Python plugin script.
 *
 * The `yell` processor receives every message from the Redpanda Connect
 * pipeline and converts its payload to uppercase. It demonstrates the
 * minimal structure of a Python dynamic plugin:
 *
 *   @redpanda_connect.processor          — marks the function as a processor
 *   msg.payload                          — raw bytes of the message payload
 *   redpanda_connect.processor_main()    — blocking event loop entry point
 *
 * The Python code is written to disk so `uv run yell_processor.py` can
 * execute it as the plugin subprocess.
 *
 * Run:
 *   node examples/02-yell-processor.js
 */

const path = require('path');
const { writeFile, PLUGIN_DIR } = require('../src/index');

const PROJECT_NAME  = 'yell-plugin';
const projectDir    = path.join(PLUGIN_DIR, PROJECT_NAME);
const pluginScript  = path.join(projectDir, 'yell_processor.py');

// ---------------------------------------------------------------------------
// Python plugin source — confirmed API surface from Redpanda Connect docs:
//
//   import redpanda_connect
//   @redpanda_connect.processor         — decorator that registers the handler
//   def fn(msg: redpanda_connect.Message) -> redpanda_connect.Message
//   msg.payload                         — bytes; read/write the message body
//   asyncio.run(redpanda_connect.processor_main(fn)) — start the gRPC server
// ---------------------------------------------------------------------------
const YELL_PROCESSOR_PY = `"""
yell_processor.py

A minimal Redpanda Connect dynamic processor plugin.
Every message payload is converted to uppercase ("yelled").

The redpanda_connect library handles the gRPC communication with the
main Redpanda Connect engine over a Unix socket.
"""
import asyncio
import logging

import redpanda_connect  # installed via: uv add redpanda_connect


@redpanda_connect.processor
def yell(msg: redpanda_connect.Message) -> redpanda_connect.Message:
    """
    Transform the message payload to uppercase.

    msg.payload is bytes; decode to str, uppercase, then re-encode.
    """
    try:
        text = msg.payload.decode("utf-8")
        msg.payload = text.upper().encode("utf-8")
    except (UnicodeDecodeError, AttributeError) as exc:
        # Non-UTF-8 payloads are passed through unchanged; log the issue.
        logging.warning("yell: could not decode payload as UTF-8: %s", exc)
    return msg


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    # processor_main() starts the gRPC listener and blocks until shutdown.
    asyncio.run(redpanda_connect.processor_main(yell))
`;

try {
  console.log('=== Step 2: Write yell_processor.py ===');
  writeFile(pluginScript, YELL_PROCESSOR_PY.trimStart());
  console.log('');
  console.log(`Written to: ${pluginScript}`);
  console.log('Done! Next step: node examples/03-plugin-config.js');
} catch (err) {
  console.error('Failed to write plugin script:', err.message);
  process.exit(1);
}