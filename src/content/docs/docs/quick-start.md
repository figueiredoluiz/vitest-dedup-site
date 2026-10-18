---
title: Quick Start
description: Run your first analysis and act on what it finds.
---

## Run the analyzer

From your project root:

```sh
npx vitest-dedup .
```

Discovery reads your Vitest configuration statically — `test.include`, `test.exclude`, `test.globals`,
project lists, and the typecheck channel — then every matched test file is parsed and compared.
Nothing is imported or executed.

`vitest-dedup check <path>` is the explicit form of `vitest-dedup <path>`.

## Read the output

The terminal report groups findings by rule. Each finding shows its severity and message, a `-->`
primary location and `related:` locations, and a rule-specific `action:` line naming the remedy. The
footer summarizes analyzed tests and files, severities, inline suppressions, and the error-level
duplication threshold.

With the default threshold of 0, any error-severity finding fails the run — see
[exit codes](/docs/cli-reference/#exit-codes).

## Act on findings

The remedy depends on the verdict:

- **Redundant** — one copy can go. Review removal, or repair the coverage one of the copies was
  supposed to provide.
- **Consolidatable** — every case is needed; they belong in one `test.each` table. Deleting a row
  would lose coverage.
- **Name collision** — rename one of the tests.
- **Similar, review decides** — the tests look equivalent without establishing that either adds no
  coverage. Review, and if they are the same behavior, consolidate.

A finding that is not debt — a deliberately parallel pair, for example — can be answered next to the
code instead of in a baseline file:

```ts
// vitest-dedup-disable-next-line these two are deliberately parallel examples
test('adds numbers', () => { expect(add(1, 1)).toBe(2); });
```

Every report states how many findings were suppressed this way.

## Adopting on an existing codebase

A codebase with existing duplication cannot turn the gate on at once. Record what is there, then
gate on what is added:

```sh
vitest-dedup . --baseline dedup-baseline.json --update-baseline   # record today's findings
vitest-dedup . --baseline dedup-baseline.json                     # gate only on what is new
```

See [CI Integration](/docs/ci-integration/) for the full adoption path.

## Next steps

- Browse every flag in the [CLI reference](/docs/cli-reference/).
- Tune severities in [configuration](/docs/configuration/).
- Choose a [report format](/docs/reports/) for how you read results.
