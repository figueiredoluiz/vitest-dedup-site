---
title: "Vitest test-declaration surface"
description: "What VitestDedup recognizes, and why. This is the reference the extractor is written against: anything Vitest can express that the analyzer must either read ..."
---

<!-- Synced from https://github.com/figueiredoluiz/vitest-dedup@faceb45 docs/vitest-surface.md. Edits belong upstream. -->
What VitestDedup recognizes, and why. This is the reference the extractor is written against:
anything Vitest can express that the analyzer must either read or refuse.

Verified against the Vitest API and config documentation at version **5.0.0**. Facts that are v5
breaking changes relative to v2-v4, the versions most repositories still run, are flagged
`[v5 CHANGE]`. Anything not confirmed by the published docs is marked `UNVERIFIED`.

**Start with [Extraction hazards, ranked](/docs/reference/vitest-surface/hazards/)** if you are reading this to
understand where static analysis of Vitest gets hard. The sections in the table are the surface
itself. Code comments and fixtures cite them by the number in the first column; the pages
themselves are named, not numbered.

| # | Section | Page |
| --- | --- | --- |
| 1 | Test-declaring callables: `test`, `it`, `describe`, `suite`, `bench` | [Declarations](/docs/reference/vitest-surface/declarations/) |
| 2 | Modifiers and chained forms: `.skip`, `.only`, `.todo`, `.each`, chaining order | [Declarations](/docs/reference/vitest-surface/declarations/) |
| 3 | Signature variants: options object vs bare function, legacy timeout | [Declarations](/docs/reference/vitest-surface/declarations/) |
| 4 | `.each` / `.for` table forms | [`.each` and `.for` tables](/docs/reference/vitest-surface/each-tables/) |
| 4b | Title directives, numeric coercion, truncation | [Title formatting](/docs/reference/vitest-surface/title-formatting/) |
| 5 | Lifecycle hooks and their scoping | [Hooks](/docs/reference/vitest-surface/hooks/) |
| 6 | `test.extend` and fixture resolution | [Fixtures](/docs/reference/vitest-surface/test-extend-fixtures/) |
| 7 | Imports vs `globals: true` | [How the API becomes available](/docs/reference/vitest-surface/availability-and-globals/) |
| 8 | `import.meta.vitest` | [In-source testing](/docs/reference/vitest-surface/in-source-testing/) |
| 9 | `include`, `exclude`, benchmark and typecheck channels | [Default file globs and projects](/docs/reference/vitest-surface/discovery-globs-and-projects/) |
| 10 | Per-project resolution | [Default file globs and projects](/docs/reference/vitest-surface/discovery-globs-and-projects/) |
| 11 | Playwright, Jest, Cypress, Mocha, `node:test` | [Look-alikes](/docs/reference/vitest-surface/look-alikes/) |
| 12 | `mock`, `doMock`, `hoisted` and the rest of `vi` | [Module mocking](/docs/reference/vitest-surface/module-mocking/) |
| 12b | Module-scope ambient state: timers, env, spies, `expect.extend` | [Ambient state](/docs/reference/vitest-surface/ambient-state/) |
| | Ranked list of what makes extraction hard | [Extraction hazards](/docs/reference/vitest-surface/hazards/) |

