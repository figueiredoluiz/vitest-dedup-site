---
title: Troubleshooting
description: Exit code 2, empty runs, incomplete analyses, and memory limits.
---

## Exit code 2 with no findings

Code 2 is operational, not a quality verdict: bad configuration, unreadable path, an unusable
baseline or `--changed-since` revision — or no tests analyzed at all. An empty report is never
treated as a clean run.

**No tests were analyzed.** If test-shaped files were read but yielded no tests, the diagnostic
suggests checking `test.globals` (or `--globals`) and build-time transforms such as auto-imports. It
does not claim either cause was proved — check both.

**Files you expected are missing.** The analyzer applies its own default `exclude` list when none is
written: `node_modules`, `dist`, `build`, `coverage`, `.idea`, `.git`, `.cache`, `.output` and
`.temp`. Test files under `build/` or `coverage/` are not analyzed. Hidden (dot-prefixed)
directories are skipped, as are files matched by `.gitignore` or `.vitest-dedupignore`.

## The run was marked incomplete

The absence of a finding is no longer evidence of its absence, so the run says why it is incomplete.
If a partial analysis should not pass silently, gate it:

```sh
vitest-dedup . --fail-on-incomplete        # any cause
vitest-dedup . --fail-on-incomplete=reads  # only read failures
vitest-dedup . --fail-on-incomplete=limits # only source/work/memory limits
```

## Memory limits

File reading stops at a memory budget — 2048 MiB by default — and a process RSS backstop exists on
top of it. For very large repositories:

```sh
vitest-dedup . --max-memory 4096
```

The `--debug-memory` flag adds a run-level record of retained bytes to the `jsonl` stream.

## `--update-baseline` was refused

It is refused on an incomplete run, because the baseline would accept whatever the run could not
see. Resolve the incompleteness first. It also cannot be combined with `--changed-since`.

## Findings on another framework's files

Ambient `describe` and `it` cannot be told apart from Cypress, Mocha, or Jasmine without project
configuration, which is why `--globals` is opt-in rather than guessed. Check your Vitest config's
`globals` detection, or scope the run with `include`.

## Binary did not install on your platform

Binaries are published for macOS (arm64, x64), Linux (arm64, x64; glibc and musl), and Windows
(arm64, x64). Elsewhere, build from source:

```sh
cargo install --git https://github.com/figueiredoluiz/vitest-dedup
```

`VITEST_DEDUP_BINARY` points the launcher at a specific executable, such as that local build.
