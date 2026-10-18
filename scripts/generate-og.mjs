#!/usr/bin/env node
// Regenerates the social preview image (public/images/og.png) from an inline
// SVG. Committed output; rerun manually after brand changes.
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(projectRoot, 'public/images');
const outFile = path.join(outDir, 'og.png');

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <radialGradient id="glow" cx="28%" cy="0%" r="85%">
      <stop offset="0%" stop-color="#5fd6a4" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#5fd6a4" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="#0b0f0d"/>
  <rect width="1200" height="630" fill="url(#glow)"/>

  <!-- logo mark -->
  <g transform="translate(84,84) scale(2.6)">
    <rect x="2.5" y="2.5" width="17" height="17" rx="4.5" stroke="#5fd6a4" stroke-opacity="0.45" stroke-width="2" fill="none"/>
    <rect x="12" y="12" width="17.5" height="17.5" rx="4.5" fill="#5fd6a4"/>
    <path d="M17 21.2l2.5 2.5 5-5.4" stroke="#0b0f0d" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </g>
  <text x="190" y="152" font-family="sans-serif" font-size="58" font-weight="700" fill="#e8efe9">Vitest<tspan fill="#5fd6a4">Dedup</tspan></text>

  <!-- tagline -->
  <text x="90" y="300" font-family="sans-serif" font-size="44" fill="#93a59a">Find duplicated tests. Reduce redundancy.</text>
  <text x="90" y="362" font-family="sans-serif" font-size="44" fill="#93a59a">Keep your test suite maintainable.</text>

  <!-- terminal hint -->
  <rect x="90" y="430" width="560" height="84" rx="12" fill="#0c1310" stroke="#22302a" stroke-width="2"/>
  <text x="122" y="481" font-family="monospace" font-size="30" fill="#5fd6a4">$ npx vitest-dedup .</text>

  <!-- domain -->
  <text x="90" y="576" font-family="monospace" font-size="26" fill="#93a59a">vitestdedup.dev</text>
</svg>
`;

await mkdir(outDir, { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(outFile);
console.log(`Wrote ${path.relative(projectRoot, outFile)}`);
