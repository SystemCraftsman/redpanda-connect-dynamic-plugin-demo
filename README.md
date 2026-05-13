# Redpanda Connect Dynamic Plugins — Tutorial Examples

This repository contains working code examples for building [Redpanda Connect](https://docs.redpanda.com/redpanda-connect/home/) dynamic plugins using the Python SDK. The examples walk through writing a processor plugin from scratch, declaring its manifest, wiring it into a pipeline, and making it configurable.

## What This Project Does

The code demonstrates how to extend Redpanda Connect with custom Python logic at runtime using the `--plugins-dir` mechanism. You write a Python class, drop a `plugin.yaml` manifest alongside it, and run `rpk connect run --plugins-dir` to load it without recompiling anything.

## Prerequisites

- [Redpanda Connect](https://docs.redpanda.com/redpanda-connect/home/) (`rpk` CLI)
- Python 3.8 or later
- Node.js 18 or later (for running the example scripts and smoke tests)

## Installation

```bash
git clone https://github.com/draftdev/test--using-redpandas-dynamic-plugins
cd redpanda-dynamic-plugins
pip install redpanda-connect-sdk-python
npm install
```

## Project Structure

```
.
├── src/
│   └── index.js                  # Main entry point for the example runner
├── examples/
│   ├── 01-scaffold-project.js    # Scaffolds the plugin directory layout
│   ├── 02-yell-processor.js      # Builds the YellProcessor plugin files
│   ├── 03-plugin-config.js       # Generates plugin.yaml and connect.yaml
│   ├── 04-configurable-plugin.js # Extends the processor with runtime config
│   └── 05-run-pipeline.js        # Invokes rpk connect run and captures output
├── tests/
│   └── smoke.test.js             # End-to-end validation of the full pipeline
├── plugins/                      # Created by example scripts (not committed)
├── connect.yaml                  # Generated pipeline configuration
└── Dockerfile.reviewer           # Containerized review environment
```

## Running the Examples

Each example script in `examples/` is self-contained and builds on the previous one. Run them in order:

```bash
node examples/01-scaffold-project.js
node examples/02-yell-processor.js
node examples/03-plugin-config.js
node examples/04-configurable-plugin.js
node examples/05-run-pipeline.js
```

After running `03-plugin-config.js`, a `plugins/` directory and a `connect.yaml` file will be present. You can run the pipeline directly at any point with:

```bash
rpk connect run --plugins-dir ./plugins connect.yaml
```

## Running the Smoke Tests

```bash
node tests/smoke.test.js
```

The smoke test verifies that the plugin directory structure is correct, that `plugin.yaml` contains the required fields, and that `rpk connect run` exits cleanly with the expected output.

## Environment Variables

No `.env` file is required for the base examples. If you extend the configurable plugin example to call external services, create a `.env` file in the project root and load it in your Python plugin's `__init__` method using `python-dotenv` or `os.environ`.