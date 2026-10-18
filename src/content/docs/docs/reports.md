---
title: Reports
description: Choosing between terminal, jsonl, json, html, and sarif, and how report files are written.
---

Choose a reporter by how the result will be consumed.

| Reporter   | Destination | Best for                                                                            |
| ---------- | ----------- | ----------------------------------------------------------------------------------- |
| `terminal` | stdout      | Interactive use and readable CI logs.                                               |
| `jsonl`    | stdout      | Streaming shell pipelines and AI agent workflows.                                   |
| `json`     | File        | Structured integrations and complete run metadata.                                  |
| `html`     | File        | Searchable human review with light and dark themes and per-finding source snippets. |
| `sarif`    | File        | GitHub code scanning and other SARIF 2.1.0 consumers.                               |

```sh
vitest-dedup .                                             # terminal
vitest-dedup . --reporters json,html --output reports/vd   # files only
vitest-dedup . --reporters sarif --output reports/vd       # for upload-sarif
vitest-dedup . --reporters jsonl | jq -c 'select(.type == "finding")'
```

`terminal` and `jsonl` both own stdout and cannot be selected together. `jsonl` combines freely with
the file reporters, which never touch stdout.

## Writing files

`--output` is a filename stem, not a directory: `--output reports/vd` writes `reports/vd.json`.
Without `--output`, file reporters use the stem `reports/vitest-dedup`. Parent directories are
created as needed.

- Each report is buffered into a temporary file in its output directory, then atomically replaces
  the destination after successful serialization and flush.
- A final-component symlink is replaced without writing to its target.
- If writing fails, the previous report remains intact and the run fails.
- Several selected reports are replaced independently.

After every selected file report has been written successfully, file-only runs print
`Reports written to:` followed by indented, sanitized paths.

## Diagnostics

Diagnostics stay on stderr: early operational errors, globals detection, incomplete coverage,
baseline and changed-file qualifications, and the opt-in cell census. Lists are bounded with explicit
omission counts — at most 20 immediate read failures, 20 deferred diagnostic messages, 10 wholly
excluded files, and 10 files containing only statically empty tables. Counts describe all affected
messages and files; display limits do not change analyzed scope, findings, or exit policy.

## Safety and determinism

Report content is data: every reporter sanitizes it. The same admitted input produces byte-identical
output, with two exceptions — terminal output includes the detection time unless `--no-metrics` is
set, and the `--debug-memory` record carries process-dependent figures such as peak RSS.
