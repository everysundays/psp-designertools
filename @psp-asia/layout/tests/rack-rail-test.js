// Enforces the @psp-asia/layout usage contract against HTML fixtures:
//
// 1. No nesting — a `.rack`/`.rail` must never sit inside another rack/rail
//    (rack-in-rack, rail-in-rack, rack-in-rail, rail-in-rail all banned).
// 2. Every rack row must total exactly 12 columns (`col-N` + `offset-N`).
//
// Skipped (not 12-col grids):
//   - utility bars that use `justify-between` (a justified flex bar, not a grid)
//   - lone-column racks (single column, e.g. hero with full-bleed background)
//
// Fixtures: `valid/*.html` must pass, `invalid/*.html` must fail.
//
// Run: `npm test` (also wired into CI).

const { readFileSync, readdirSync } = require('node:fs');
const { join } = require('node:path');
const assert = require('node:assert/strict');
const { parse } = require('node-html-parser');

const FIX = join(__dirname, 'fixtures');

// Column value of a class list: sum of every col-N and offset-N it carries.
function colValue(cls) {
    let v = 0;
    for (const x of cls.matchAll(/\b(?:col|offset)-(\d+)\b/g)) v += +x[1];
    return v;
}

// Returns [nestedViolations[], rowViolations[]] for one HTML string.
function violations(html) {
    const root = parse(html);
    const nested = [];
    const rows = [];

    // rule 1: no nesting — walk every rack/rail up its ancestor chain.
    root.querySelectorAll('[class*="rack"], [class*="rail"]').forEach(el => {
        const cls = el.getAttribute('class') || '';
        if (!cls.split(/\s+/).some(k => k === 'rack' || k === 'rail')) return;
        for (let p = el.parentNode; p && p.nodeType === 1; p = p.parentNode) {
            const pc = p.getAttribute && p.getAttribute('class');
            if (!pc || !pc.split(/\s+/).some(k => k === 'rack' || k === 'rail')) continue;
            nested.push(`<${el.rawTagName} class="${cls.trim()}"> nested inside <${p.rawTagName} class="${pc.trim()}">`);
            break;
        }
    });

    // rule 2: every rack row totals 12.
    root.querySelectorAll('[class*="rack"]').forEach(rack => {
        const cls = rack.getAttribute('class');
        if (!cls.split(/\s+/).includes('rack')) return;          // only real racks
        if (/\bjustify-between\b/.test(cls)) return;             // utility flex bar

        const cols = rack.childNodes.filter(n =>
            n.nodeType === 1 && !/^rail\b/.test(n.getAttribute('class') || '')
        );
        if (cols.length < 2) return;                             // lone-column composition

        let acc = 0;
        const totals = [];
        cols.forEach(node => {
            acc += colValue(node.getAttribute('class') || '');
            if (acc >= 12) { totals.push(acc); acc = 0; }
        });
        if (acc) totals.push(acc);                               // leftover short row

        totals.forEach(r => {
            if (r !== 12) rows.push(`row totals ${r} columns — must be 12`);
        });
    });

    return [nested, rows];
}

let passed = 0;
for (const dir of ['valid', 'invalid']) {
    for (const f of readdirSync(join(FIX, dir)).filter(f => f.endsWith('.html'))) {
        const [nested, rows] = violations(readFileSync(join(FIX, dir, f), 'utf8'));
        const bad = [...nested, ...rows];
        if (dir === 'valid') {
            assert.ok(bad.length === 0, `${dir}/${f} should pass but found:\n  ${bad.join('\n  ')}`);
        } else {
            assert.ok(bad.length > 0, `${dir}/${f} should fail the contract but passed`);
        }
        passed++;
    }
}

// ---- CSS smoke test: the stylesheet must still define the whole system.
const css = readFileSync(join(__dirname, '..', 'grid.css'), 'utf8');
const required = [
    '.rack, .rail',                       // containers
    '.rack { flex-wrap: wrap;',
    '.rail {',
    '.rail::-webkit-scrollbar { display: none;',
    '--psp-gap: 16px',
    '--psp-gutter: 20px',
    '--psp-peek: 32px',
    'scroll-padding-inline: var(--psp-gutter)',   // regression: 8px cuts the first card's gutter
    '.rail > *:first-child { margin-left: auto; scroll-snap-align: start; }',
    '.rail > *:last-child  { margin-right: auto; }',
    '.rail > *:not(:first-child) { scroll-snap-align: center; }',
];
for (let n = 1; n <= 12; n++) {
    required.push(`.rack .col-${n}`);
    required.push(`.rail .col-${n}`);
}
for (let n = 1; n <= 11; n++) required.push(`.rack .offset-${n}`);
for (const s of required) {
    assert.ok(css.includes(s), `grid.css missing: ${s}`);
}
assert.ok(!css.includes('scroll-padding-inline: 8px'), 'grid.css regressed: hard-coded 8px scroll-padding (cuts first card gutter)');

console.log(`OK: ${passed} fixture(s) + ${required.length} CSS smoke checks pass (valid passes, invalid fails)`);
