---
title: Detection Concepts
description: How a test's identity is computed, the nine rules, and what each verdict claims.
---

## A test's identity is its body

Two tests that do the same thing under different titles are duplicates. Two textually identical
bodies that run under different hooks, mocks, or fixtures are not.

To make that comparison, bodies are normalized before they are compared: titles are ignored, and the
shape of what a test *does* is what counts. The context a body runs in — hooks, mocks, fixtures —
participates in the comparison, which is why identical text under different circumstances is left
alone.

## The rules

| Rule | Default | Meaning |
| --- | --- | --- |
| `duplicate-test` | Error | Two tests have the same normalized body under an equivalent context. |
| `duplicate-test-name` | Warning | Two tests in one file share a full title. |
| `parameterization-candidate` | Warning | Two tests have the same structure and differ only in literal values. |
| `near-duplicate-test` | Warning | Two tests perform the same behavior under an equivalent context, but their normalized bodies differ. |
| `cross-file-duplicate` | Warning | The `duplicate-test` criteria without the single-file restriction. |
| `subsumed-test` | Off | One test's behavior is a strict ordered subsequence of another's. Off by default: its findings are frequently distinct tests rather than redundant ones. |
| `duplicate-suite` | Warning | A whole `describe` block is duplicated within one file, reported once instead of per test. |
| `duplicate-each-row` | Warning | Two rows of one parameterized test, benchmark, or suite carry the same case. |
| `redundant-hook` | Warning | A nested lifecycle hook repeats work an ancestor hook already performs. |

A rule configured at severity `off` is not computed, so a run never reports a finding for it.

## Verdicts

Each finding carries a verdict naming its remedy, because the remedies differ:

- **Redundant** — one copy can go. `duplicate-test`, `cross-file-duplicate`, `duplicate-suite`,
  `duplicate-each-row`, `redundant-hook`.
- **Consolidatable** — every case is needed, and they belong in one `test.each` table.
  `parameterization-candidate`. Deleting a row here would lose coverage.
- **A review prompt** — `near-duplicate-test` and `subsumed-test` flag tests that look equivalent
  without establishing that either adds no coverage. Review decides; for `near-duplicate-test` the
  usual outcome is consolidation into one `test.each` table.
- **Name collision** — two tests share a title; rename one.

`cross-file-duplicate` reports at Warning rather than Error because duplication across unit and
integration layers is sometimes deliberate.

## What comparison cannot see

Some tests cannot be compared: an unreadable config, a dynamic title, a table the analyzer cannot
resolve statically. The run is then marked incomplete and says why, because the absence of a finding
is no longer evidence of its absence. `--fail-on-incomplete` turns that into a gate.

Imported helpers are compared by their resolved body when the import resolves to a readable
ES-module file with a plain parameter list; unresolved imports, defaulted or rest parameters, and
helpers that call helpers fall back to comparing by name. Dynamic test generation that no static
reader can follow is reported as unresolved rather than guessed at.
