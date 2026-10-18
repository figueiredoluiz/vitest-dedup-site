---
title: CI Integration
description: Thresholds, baselines, changed-file scoping, and the official GitHub Action.
---

## The exit contract

[Exit codes](/docs/cli-reference/#exit-codes) are distinct so CI can tell a broken analyzer from
duplicated tests:

- **0** — the error-severity duplication rate is within `threshold`.
- **1** — quality gate failed.
- **2** — operational error, including a run that analyzed no tests.

Fail the job on any non-zero code, and read code 2 as "fix the pipeline", not "fix the tests".

## GitHub Action

Pin the version you are using — the [changelog](/changelog/) lists every release:

```yaml
- uses: figueiredoluiz/vitest-dedup@vX.Y.Z
  with:
    path: .
    version: X.Y.Z
    threshold: '5'
```

The action downloads the release binary for the runner's platform and verifies its SHA-256 and, with
`gh`, its build provenance attestation before running it. Inputs, outputs, and the verification
details are documented in the repository's `docs/github-action.md`.

## Adopting the gate gradually

A codebase with existing duplication cannot turn the gate on at once, and a threshold high enough to
pass gates nothing. Record what is there, then gate on what is added:

```sh
vitest-dedup . --baseline dedup-baseline.json --update-baseline   # record today's findings
vitest-dedup . --baseline dedup-baseline.json                     # gate only on what is new
```

Baselined findings are still reported, marked `baselined`, and excluded from the gate.
`--update-baseline` is refused on an incomplete run, because the baseline would accept whatever the
run could not see.

## Pull-request scoping

Two options narrow a run to what a change touches:

- `--changed-since <rev>` reports only findings with a participant in a file changed since that
  revision.
- `--baseline-from-ref <rev>` computes the baseline from the base revision's own findings, read
  through git objects and never checked out — a pull request fails only for what the branch adds.

Both say so in their output, because a run that examined a subset is not a verdict on the whole
repository.

## Incomplete runs in CI

Some tests cannot be compared — an unreadable config, a dynamic title, a table the analyzer cannot
resolve statically. `--fail-on-incomplete` turns that into a gate failure so a partial analysis can
never pass silently; `=reads` or `=limits` narrows which causes count.

## SARIF for code scanning

```sh
vitest-dedup . --reporters sarif --output reports/vd
```

Upload the result with `github/codeql-action/upload-sarif` to surface findings on the pull request
that introduced them.
