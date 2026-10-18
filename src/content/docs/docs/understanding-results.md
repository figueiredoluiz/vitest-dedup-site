---
title: Understanding Results
description: Reading findings, verdicts, fingerprints, and the states a finding can carry.
---

## Anatomy of a finding

In the terminal report, each finding shows:

- its **severity** and **message**,
- a `-->` **primary location** and `related:` locations, each retaining its full test title and
  `path:line:column`,
- a rule-specific **`action:`** line naming the remedy.

Findings are grouped by rule, ordered by first-participant file. The footer summarizes analyzed tests
and files, displayed severities, inline suppressions, and baseline debt.

## Verdicts drive the remedy

The verdict names what the finding claims, because the remedies differ. See
[Detection Concepts](/docs/detection-concepts/#verdicts) for which rules produce which verdict — the
short version:

| Verdict             | What it claims                                      | Remedy                                       |
| ------------------- | --------------------------------------------------- | -------------------------------------------- |
| `redundant`         | One copy can go.                                    | Review removal, or repair intended coverage. |
| `consolidatable`    | Every case is needed.                               | One `test.each` table — do not delete rows.  |
| `name-collision`    | Two tests share a title.                            | Rename one.                                  |
| `similar-uncertain` | The tests look equivalent; that is not established. | Review decides.                              |

## Fingerprints

A finding's `fingerprint` is its stable identity across runs: the rule plus the normalized
participants, not file positions, so it survives reformatting and line moves. Baselines match on it.

## States a finding can carry

- **Baselined** — visible in reports with a `[baselined]` marker and the original severity, but
  excluded from the gate.
- **Suppressed** — a `vitest-dedup-disable-next-line` directive with a participant on the next line.
  A suppressed finding never consumes baseline allowance and is never recorded by
  `--update-baseline`, because a baseline records accepted debt and the directive claims there is
  none. Every report states how many findings were suppressed this way.
- **Inert participants** — machine formats carry a per-participant `.skip`/`.todo` flag, so an
  integration can tell which side of a duplicate is dead code.

## Machine-readable fields

Structured fields are provided rather than asking a consumer to parse `message`. Beyond verdict and
fingerprint, findings may carry `registrationFiles` — an array parallel to `locations` listing the
sorted caller paths a declaration site represents, when the file declaring a test differs from the
file registering it.

## Determinism

The same admitted input produces byte-identical output. Findings are ordered by their participants'
locations (root-relative path, then position), then by rule, then by message — compared component by
component, so order does not depend on the platform's path separator.
