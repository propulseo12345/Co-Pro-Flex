import fs from 'fs';
import path from 'path';

const appDir = 'src/app';
const routes = new Set();
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name === 'page.tsx' || e.name === 'route.ts' || e.name === 'route.tsx') {
      let rel = path.relative(appDir, path.dirname(p)).split(path.sep).join('/');
      rel = rel.split('/').filter((s) => !(s.startsWith('(') && s.endsWith(')'))).join('/');
      routes.add('/' + rel);
    }
  }
}
walk(appDir);

function routeToRegex(r) {
  const parts = r.split('/').filter(Boolean).map((seg) => {
    if (seg.startsWith('[...')) return '(?:.+)';
    if (seg.startsWith('[')) return '[^/]+';
    return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  });
  return new RegExp('^/' + parts.join('/') + '/?$');
}
const matchers = [...routes].map((r) => ({ r, re: routeToRegex(r) }));
function resolves(target) {
  if (target === '/') return routes.has('/');
  return matchers.some((m) => m.re.test(target));
}

const linkTargets = new Map();
const dynamic = [];
function scan(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.next') continue;
      scan(p);
    } else if (/\.(tsx?|jsx?)$/.test(e.name)) {
      const src = fs.readFileSync(p, 'utf8');
      const re = /(?:href|to)\s*=\s*[{]?\s*[`"']([^`"']+)[`"']|(?:href|to|path|url)\s*:\s*[`"']([^`"']+)[`"']|(?:router\.(?:push|replace|prefetch)|redirect|permanentRedirect)\(\s*[`"']([^`"']+)[`"']/g;
      let m;
      while ((m = re.exec(src))) {
        const t = m[1] || m[2] || m[3];
        if (!t || !t.startsWith('/') || t.startsWith('//')) continue;
        let clean = t.split('?')[0].split('#')[0];
        const rel = path.relative('.', p).split(path.sep).join('/');
        const isDyn = clean.includes('${');
        // Resolve dynamic template segments: replace ${...} runs with a no-slash placeholder
        if (isDyn) clean = clean.replace(/\$\{[^}]*\}/g, 'X');
        if (clean.includes('${') || clean.includes('}')) { dynamic.push({ t: clean, p: rel }); continue; }
        const key = clean + (isDyn ? '  [dyn]' : '');
        if (!linkTargets.has(key)) linkTargets.set(key, new Set());
        linkTargets.get(key).add(rel);
      }
    }
  }
}
scan('src');

const dead = [];
for (const [t, files] of linkTargets) {
  const target = t.replace('  [dyn]', '');
  if (!resolves(target)) dead.push({ t, files: [...files] });
}
dead.sort((a, b) => a.t.localeCompare(b.t));
console.log('TOTAL real routes:', routes.size);
console.log('TOTAL distinct internal static targets:', linkTargets.size);
console.log('\n=== DEAD LINKS (' + dead.length + ') target -> files ===');
for (const d of dead) {
  console.log('\n' + d.t);
  for (const f of d.files) console.log('   ' + f);
}
console.log('\n=== DYNAMIC templated bases (not statically checkable) ===');
const dynBase = {};
for (const d of dynamic) { const b = d.t.split('${')[0]; dynBase[b] = (dynBase[b] || 0) + 1; }
for (const [b, c] of Object.entries(dynBase).sort()) console.log('   ' + b + '...  (' + c + ')');
