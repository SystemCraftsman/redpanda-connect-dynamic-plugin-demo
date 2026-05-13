# REVIEWER.md

## Dev Container Setup

```bash
docker build -f Dockerfile.reviewer -t reviewer .
docker run -it reviewer bash
```

Follow the tutorial steps as written inside the container.

## Quality Checklist

- [ ] All external links resolve (no 404s) — check `https://docs.redpanda.com/redpanda-connect/home/` and all other linked URLs
- [ ] No banned phrases from style guide (leverage, streamline, robust, utilize, harness, tapestry, landscape, paradigm, synergy, "it's important to note," "in order to," "serves as," "at its core," "this is where X comes in," etc.)
- [ ] No em dashes anywhere in the article prose
- [ ] No semicolons joining two independent clauses
- [ ] No negative parallelism constructions ("it's not X, it's Y" / "not X, not Y" / "rather than X, Y")
- [ ] No colon-fragment rhetorical setups ("The result:", "The hard boundary:")
- [ ] No signposting introductions before code blocks or diagrams
- [ ] No fractal summaries or section-end restatements
- [ ] No back-to-back single-sentence paragraphs used for rhetorical effect
- [ ] No bold-first bullet points
- [ ] No unicode arrows
- [ ] Article stays within the approved content plan scope
- [ ] All file references in the article match files in the repo (`src/index.js`, `examples/01-scaffold-project.js`, `examples/02-yell-processor.js`, `examples/03-plugin-config.js`, `examples/04-configurable-plugin.js`, `examples/05-run-pipeline.js`, `tests/smoke.test.js`, `Dockerfile.reviewer`)
- [ ] Inline code snippets in the article use the KB-confirmed API surface (class-based `Processor`, `record.value()`, `record.builder().with_value().build()`, `--plugins-dir` flag, `pip install redpanda-connect-sdk-python`)
- [ ] No invented company or product names
- [ ] All diagrams use Mermaid format (no ASCII art)
- [ ] `https://github.com/draftdev/test--using-redpandas-dynamic-plugins` placeholder has been substituted with the real repository URL before publication
- [ ] `[MERMAID_IMAGE]` placeholder has been substituted before publication
- [ ] Mermaid diagram renders correctly in the target CMS
- [ ] `rpk connect run --plugins-dir ./plugins connect.yaml` executes without error inside the dev container
- [ ] `node tests/smoke.test.js` exits with code 0 inside the dev container
- [ ] Python SDK import paths (`from redpanda.connect.sdk.python import Record`, `from redpanda.connect.sdk.python.processor import Processor`) resolve correctly after `pip install redpanda-connect-sdk-python`