---
title: Introduction
description: What VitestDedup is, the judgment it makes, and how this documentation is organized.
---

VitestDedup is a static analyzer that finds duplicate and near-duplicate Vitest tests.

It reads project configuration and test files without importing or executing either one. A test's
identity is its body: two tests that do the same thing under different titles are duplicates, and two
textually identical bodies that run under different hooks, mocks, or fixtures are not.

## Why a static analyzer

Copy-pasting a test and tweaking a value is fast today and expensive tomorrow. Duplicated tests make
refactors touch the same logic several times, inflate CI time, and blur which test is authoritative.

VitestDedup surfaces that duplication deliberately: it names what each finding claims — a
[verdict](/docs/understanding-results/) with a remedy — and the decision to consolidate stays with
you. It never edits or deletes your tests.

## Where to go next

- [Installation](/docs/installation/) — add the analyzer to a project, or run it once without installing.
- [Quick Start](/docs/quick-start/) — your first analysis run and what to do with its findings.
- [Detection Concepts](/docs/detection-concepts/) — the rules, how bodies are normalized, and what a verdict claims.
- [CI Integration](/docs/ci-integration/) — thresholds, baselines, and the GitHub Action.

## At a glance

| | |
| --- | --- |
| Current version | v0.5.0 — see the [changelog](/changelog/) |
| License | MIT |
| Runtime | Node 20 or later launches the analyzer binary; the analysis itself runs without importing your code |
| Platforms | macOS (arm64, x64), Linux (arm64, x64; glibc and musl), Windows (arm64, x64) |
| Source | [figueiredoluiz/vitest-dedup](https://github.com/figueiredoluiz/vitest-dedup) |
