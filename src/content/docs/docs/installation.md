---
title: Installation
description: Install VitestDedup into a project, or run it once without installing anything.
---

## Requirements

- Node 20 or later (the `vitest-dedup` command is a launcher that needs it).
- A prebuilt binary platform: macOS (arm64, x64), Linux (arm64, x64; glibc and musl), or Windows
  (arm64, x64). On other platforms, build from source with
  `cargo install --git https://github.com/figueiredoluiz/vitest-dedup`.

## Install into a project

```sh
npm install --save-dev vitest-dedup
```

Installation pulls one prebuilt binary for your platform through `optionalDependencies`. There is no
`postinstall` script, so nothing is downloaded, compiled, or executed at install time.

## Run once, without installing

```sh
npx vitest-dedup .
```

## Verifying what you installed

Packages are published from the repository's release workflow with npm trusted publishing, so
`npm audit signatures` verifies them. Release archives carry SHA-256 checksums, keyless Sigstore
signature bundles, and a build provenance attestation.

## Pointing the launcher elsewhere

`VITEST_DEDUP_BINARY` points the launcher at a specific executable, such as a local build from
source. The launcher execs that binary and forwards its exit code unchanged.
