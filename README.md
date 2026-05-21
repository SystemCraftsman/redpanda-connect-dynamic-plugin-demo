# Redpanda Connect Dynamic Plugins

Working code examples for building [Redpanda Connect](https://docs.redpanda.com/redpanda-connect/home/) dynamic plugins using the Python SDK. The examples walk through writing a processor plugin from scratch, declaring its manifest, wiring it into a pipeline, and making it configurable.

## What This Project Does

The code demonstrates how to extend Redpanda Connect with custom Python logic at runtime using the RPC plugin mechanism. You write a Python function decorated with `@redpanda_connect.processor`, drop a `plugin.yaml` manifest alongside it, and run `rpk connect run --rpc-plugins=plugin.yaml` to load it without recompiling anything.

## Prerequisites

- [Redpanda Connect](https://docs.redpanda.com/redpanda-connect/home/) (`rpk` CLI, v4.56.0 or later)
- Python 3.12 or later
- [uv](https://docs.astral.sh/uv/) (Python package manager)

## Project Structure

```
.
├── plugins/
│   ├── yell-processor/              # Simple plugin (uppercases messages)
│   │   ├── yell_processor.py
│   │   └── plugin.yaml
│   └── yell-processor-configurable/ # Extended version with runtime config
│       ├── yell_processor.py
│       └── plugin.yaml
├── connect.yaml                     # Pipeline config for the simple plugin
├── connect-configurable.yaml        # Pipeline config for the configurable plugin
└── Dockerfile.reviewer              # Containerized review environment
```

## Quick Start

Initialize the plugin project and install the SDK:

```bash
cd plugins/yell-processor
uv init --no-readme
uv add redpanda_connect
```

Run the simple pipeline from the repo root:

```bash
rpk connect run --rpc-plugins=plugins/yell-processor/plugin.yaml connect.yaml
```

Expected output (5 lines):

```
HELLO FROM REDPANDA CONNECT
HELLO FROM REDPANDA CONNECT
HELLO FROM REDPANDA CONNECT
HELLO FROM REDPANDA CONNECT
HELLO FROM REDPANDA CONNECT
```

## Running the Configurable Plugin

Initialize and run the configurable version:

```bash
cd plugins/yell-processor-configurable
uv init --no-readme
uv add redpanda_connect
cd ../..
rpk connect run --rpc-plugins=plugins/yell-processor-configurable/plugin.yaml connect-configurable.yaml
```

Expected output (5 lines, prefix ">> " applied, repeated twice):

```
>> HELLO FROM REDPANDA CONNECT>> HELLO FROM REDPANDA CONNECT
>> HELLO FROM REDPANDA CONNECT>> HELLO FROM REDPANDA CONNECT
>> HELLO FROM REDPANDA CONNECT>> HELLO FROM REDPANDA CONNECT
>> HELLO FROM REDPANDA CONNECT>> HELLO FROM REDPANDA CONNECT
>> HELLO FROM REDPANDA CONNECT>> HELLO FROM REDPANDA CONNECT
```

## Review Environment

Build and run the Docker container with all prerequisites installed:

```bash
docker build -f Dockerfile.reviewer -t rpconnect-reviewer .
docker run -it --rm rpconnect-reviewer bash
```

Follow the tutorial steps inside the container to verify everything works from scratch.
