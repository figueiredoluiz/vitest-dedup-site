// Writes a deterministic ~1,000-test Vitest project to demo/.generated/sample-project.
// Most tests have structurally distinct bodies; a handful of duplicates are seeded by hand.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = join(dirname(fileURLToPath(import.meta.url)), '.generated', 'sample-project');
rmSync(out, { recursive: true, force: true });

let seed = 20260421;
const rnd = (n) => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed % n;
};
const pick = (xs) => xs[rnd(xs.length)];

const DOMAINS = ['auth', 'billing', 'orders', 'catalog', 'search', 'users', 'cart', 'shipping', 'notifications', 'reports'];
const VERBS = ['parse', 'format', 'validate', 'merge', 'filter', 'group', 'sort', 'resolve', 'encode', 'normalize', 'compute', 'render'];
const NOUNS = ['invoice', 'session', 'token', 'address', 'coupon', 'order', 'profile', 'query', 'rate', 'ledger', 'receipt', 'cursor'];
const MATCH = ['toBe', 'toEqual', 'toStrictEqual', 'toContain', 'toHaveLength', 'toBeGreaterThan', 'toMatch'];

const stmt = [
  (f, i) => `const r${i} = ${f}(${rnd(90)});`,
  (f, i) => `const r${i} = await ${f}Async(${JSON.stringify(pick(NOUNS))}, ${rnd(9)});`,
  (f, i) => `const r${i} = [${rnd(9)}, ${rnd(9)}, ${rnd(9)}].map((x) => ${f}(x)).filter(Boolean);`,
  (f, i) => `const r${i} = { ...${f}.defaults, id: ${rnd(500)}, flag: ${rnd(2) ? 'true' : 'false'} };`,
  (f, i) => `let r${i} = 0;\n    for (const k of ${f}.keys()) r${i} += k.length;`,
  (f, i) => `const r${i} = ${f}.has(${JSON.stringify(pick(VERBS))}) ? ${f}(${rnd(9)}) : ${f}.fallback;`,
  (f, i) => `const r${i} = new Map(Object.entries(${f}.table)).get(${JSON.stringify(pick(NOUNS))});`,
  (f, i) => `expect(() => ${f}(null)).toThrow(${JSON.stringify(pick(NOUNS))});`,
  (f, i) => `const r${i} = ${f}(${f}(${rnd(9)}), ${f}(${rnd(9)}));`,
  (f, i) => `const r${i} = String(${f}(${rnd(90)})).padStart(${rnd(8) + 2}, '0');`,
];

function testBody(f) {
  const n = 2 + rnd(5);
  const lines = [];
  for (let i = 0; i < n; i++) lines.push(pick(stmt)(f, i));
  const last = n - 1;
  lines.push(`expect(r${last} ?? 0).${pick(MATCH)}(${rnd(2) ? rnd(100) : JSON.stringify(pick(NOUNS))});`);
  return lines.join('\n    ');
}

function suite(domain, index, count) {
  const mod = `${domain}${index}`;
  const fn = `${pick(VERBS)}${pick(NOUNS)[0].toUpperCase()}${pick(NOUNS).slice(1)}${index}`;
  const tests = [];
  for (let t = 0; t < count; t++) {
    const title = `${pick(VERBS)}s ${pick(NOUNS)} case ${t + 1}`;
    tests.push(`  it(${JSON.stringify(title)}, async () => {\n    ${testBody(fn)}\n  });`);
  }
  return { mod, fn, tests };
}

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'package.json'), '{ "name": "sample-project", "private": true, "type": "module" }\n');

const files = [];
let total = 0;
DOMAINS.forEach((domain, d) => {
  for (let i = 0; i < 4; i++) {
    const count = 22 + rnd(7);
    const { mod, fn, tests } = suite(domain, d * 4 + i, count);
    total += count;
    const dir = join(out, 'tests', domain);
    mkdirSync(dir, { recursive: true });
    const path = join(dir, `${mod}.spec.ts`);
    const src = `import { describe, expect, it } from 'vitest';\nimport { ${fn}, ${fn}Async } from '../../src/${domain}';\n\ndescribe(${JSON.stringify(mod)}, () => {\n${tests.join('\n\n')}\n});\n`;
    writeFileSync(path, src);
    files.push(path);
  }
});

// Hand-written findings, one per kind.
const seeded = join(out, 'tests', 'seeded');
mkdirSync(seeded, { recursive: true });
const head = `import { describe, expect, it } from 'vitest';\nimport { redirectTarget, listUsers } from '../../src/seeded';\n\n`;
writeFileSync(join(seeded, 'login.spec.ts'), `${head}describe('login', () => {
  it('redirects when signed out', () => {
    const target = redirectTarget({ user: null });
    expect(target).toBe('/login');
  });
});
`);
writeFileSync(join(seeded, 'session.spec.ts'), `${head}describe('session', () => {
  it('sends anonymous visitors to login', () => {
    const target = redirectTarget({ user: null });
    expect(target).toBe('/login');
  });

  it('redirects when signed out', () => {
    const target = redirectTarget({ user: null });
    expect(target).toBe('/login');
  });
});
`);
writeFileSync(join(seeded, 'users.spec.ts'), `${head}describe('users', () => {
  it('lists admin users', () => {
    expect(listUsers({ role: 'admin' })).toHaveLength(2);
  });

  it('lists guest users', () => {
    expect(listUsers({ role: 'guest' })).toHaveLength(5);
  });
});
`);
console.log(`generated ${files.length + 3} files, ${total + 4} tests at ${out}`);
