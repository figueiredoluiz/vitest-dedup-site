---
title: CLI Reference
description: Command forms, flags, and exit codes. --help in the analyzer itself is the complete list.
---

`--help` lists every flag; this page covers the ones you will actually reach for.

## Command forms

```sh
vitest-dedup .                                              # analyze, default gate
vitest-dedup check .                                        # explicit form of the same
vitest-dedup . --threshold 5                                # allow a 5% error-severity rate
vitest-dedup . --rule duplicate-test=warning                # change a rule's severity
vitest-dedup . --reporters json,html --output reports/dedup # write report files
vitest-dedup . --reporters jsonl | jq -c 'select(.type == "finding")'
vitest-dedup . --baseline dedup-baseline.json               # gate only on findings the baseline lacks
vitest-dedup . --changed-since origin/main                  # only findings touching changed files
vitest-dedup . --max-memory 4096                            # raise the 2048 MiB memory budget
```

## Flags

### Analysis scope

| Flag | Effect |
| --- | --- |
| `--config <file>` | Name a configuration file instead of discovering `.vitest-dedup.json` upward. |
| `--globals` | Treat `describe`/`it` as Vitest globals when config detection cannot decide. Opt-in because guessing would invent findings in Cypress, Mocha, or Jasmine files. |
| `--changed-since <rev>` | Report only findings with a participant in a file changed since that revision. |

### Quality gate

| Flag | Effect |
| --- | --- |
| `--threshold <pct>` | Allowed error-severity duplication rate, 0–100. Default 0. |
| `--rule <id>=<severity>` | Set one rule to `off`, `warning`, or `error`. |
| `--baseline <file>` | Gate only on findings the baseline lacks; baselined findings stay visible, marked `baselined`. |
| `--update-baseline` | Record today's findings into the baseline. Refused on an incomplete run; not combinable with `--changed-since`. |
| `--fail-on-new <N>` | Fail the gate when more than N findings are absent from the baseline. |
| `--baseline-from-ref <rev>` | Compute the baseline from the base revision's own findings, read through git objects and never checked out. |
| `--fail-on-incomplete` | Turn an incomplete run into a gate failure. Narrow with `=reads` or `=limits`. |

### Reporting

| Flag | Effect |
| --- | --- |
| `--reporters <list>` | Comma-separated: `terminal`, `jsonl`, `json`, `html`, `sarif`. `terminal` and `jsonl` both own stdout and cannot be combined. |
| `--output <stem>` | Filename stem for file reporters: `--output reports/dedup` writes `reports/dedup.json`. Defaults to `reports/vitest-dedup`. |
| `--emit-test-fingerprints` | Add per-test comparison keys to the `jsonl` stream. |
| `--debug-memory` | Add a run-level record of retained bytes to `jsonl`. |
| `--no-metrics` | Omit detection timing for byte-stable terminal output. |

### Resource limits

| Flag | Effect |
| --- | --- |
| `--max-memory <MiB>` | Stop reading files at a memory budget; default 2048. |

## Exit codes

Exit codes are distinct so CI can tell a broken analyzer from duplicated tests:

| Code | Meaning |
| ---: | --- |
| 0 | The error-severity duplication rate is within `threshold` — with the default of 0, no error-severity findings at all. |
| 1 | Quality gate failed: the threshold was exceeded, or more findings than `--fail-on-new` allows are absent from the baseline. |
| 2 | Operational error: bad configuration, unreadable path, no tests analyzed without a quality-gate failure, unusable baseline or `--changed-since` revision, or `--fail-on-incomplete` on another degraded run. |
