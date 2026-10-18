---
title: Contributing
description: Where development happens, what gates every change, and how to report issues.
---

Development happens in the
[figueiredoluiz/vitest-dedup](https://github.com/figueiredoluiz/vitest-dedup) repository — a Rust
analyzer core with an npm launcher, gated by an extensive verification suite. Start at the
repository's `CONTRIBUTING.md` before opening a pull request.

## Reporting issues

Open an issue on the [issue tracker](https://github.com/figueiredoluiz/vitest-dedup/issues). Bug
reports that include the analyzer version and a minimal reproduction are resolved fastest.
Vulnerabilities follow the process in the repository's `SECURITY.md` rather than a public issue.

## What every change passes

Merges are gated well beyond "tests pass": parser and reporter contract tests, corpus and recall
checks against pinned fixtures, documentation-accuracy checks that keep the docs honest against the
implementation, mutation scoring, coverage ratchets on both the Rust and JavaScript sides, memory
scaling measurements, and secret scanning. The full list lives in the repository's `AGENTS.md` and
`docs/development.md`.

Consequently, contributions that change behavior should come with the documentation that claims it —
the check suite fails when the two drift apart.

## Documentation contributions

The analyzer's technical documentation lives in the source repository under `docs/`, alongside the
code it describes. This website renders its own presentation of the same material; inconsistencies
found here are best fixed here, while inconsistencies about tool behavior belong upstream.

## Code of conduct

The repository's `CODE_OF_CONDUCT.md` applies to every contribution and to the issue tracker.
