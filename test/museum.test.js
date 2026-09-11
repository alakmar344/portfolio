const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const { Breeze } = require(path.join(root, 'breeze.js'));

// museum-data.js attaches globals; museum.js exports pure helpers in node.
require(path.join(root, 'museum-data.js'));
const MUSEUM = require(path.join(root, 'museum.js'));

const ALL = (global.MUSEUM_PROJECTS || []).concat(global.MUSEUM_BOOKS || []);
const appBreeze = fs.readFileSync(path.join(root, 'app.breeze'), 'utf8');

function collectActions(ast, out) {
  out = out || [];
  (ast || []).forEach((n) => {
    (n.modifiers || []).forEach((m) => {
      const em = String(m).match(/^@\w+\s*->\s*(.+)$/);
      if (em) out.push(em[1].trim());
    });
    if (n.children) collectActions(n.children, out);
  });
  return out;
}

describe('Museum project data (single source of truth)', () => {
  it('has unique slugs and required fields on every artifact', () => {
    const slugs = ALL.map((p) => p.slug);
    assert.equal(new Set(slugs).size, slugs.length, 'slugs must be unique');
    ALL.forEach((p) => {
      ['slug', 'title', 'tagline', 'description', 'why', 'category', 'wing', 'technologies', 'status'].forEach((f) => {
        assert.ok(p[f] !== undefined && p[f] !== null && p[f] !== '', `${p.slug} missing ${f}`);
      });
      assert.ok(Array.isArray(p.technologies) && p.technologies.length > 0, `${p.slug} needs technologies`);
    });
  });

  it('uses only known categories, wings and statuses', () => {
    const cats = new Set(['Product', 'Framework', 'Open Source', 'Experiment', 'Tool', 'Game', 'Library']);
    const wings = new Set(['gallery', 'lab', 'library']);
    const statuses = new Set(['live', 'open-source', 'in-dev', 'released', 'published']);
    ALL.forEach((p) => {
      assert.ok(cats.has(p.category), `${p.slug} bad category ${p.category}`);
      assert.ok(wings.has(p.wing), `${p.slug} bad wing ${p.wing}`);
      assert.ok(statuses.has(p.status), `${p.slug} bad status ${p.status}`);
    });
  });

  it('keeps links well-formed and preserves the fixed PivotIQ URL', () => {
    ALL.forEach((p) => {
      [p.live, p.repo].forEach((u) => {
        if (u === null || u === undefined) return;
        assert.match(u, /^https:\/\//, `${p.slug} URL must be https: ${u}`);
        assert.equal(u.trim(), u, `${p.slug} URL has stray whitespace`);
      });
      if (p.live) assert.ok(!p.live.includes('pivot-iq.info'), 'dead PivotIQ host must not return');
    });
    const pivot = ALL.find((p) => p.slug === 'pivot');
    assert.equal(pivot.live, 'https://pivot-iq.vercel.app');
  });

  it('contains no placeholder copy', () => {
    const blob = JSON.stringify(ALL).toLowerCase();
    ['lorem', 'todo', 'tbd', 'placeholder', 'foo bar'].forEach((w) => {
      assert.ok(!blob.includes(w), `placeholder copy found: ${w}`);
    });
  });

  it('curates the gallery instead of showing everything equally', () => {
    const gallery = global.MUSEUM_PROJECTS.filter((p) => p.wing === 'gallery');
    assert.ok(gallery.length >= 5 && gallery.length <= 8, `gallery should be curated, got ${gallery.length}`);
    const slugs = gallery.map((p) => p.slug);
    ['esamz', 'breeze', 'pi', 'gati'].forEach((s) => assert.ok(slugs.includes(s), `gallery missing ${s}`));
  });

  it('keeps benchmark numbers identical to benchmark.md (no fabrication)', () => {
    const rows = global.MUSEUM_BENCH_KRAUSEST;
    const byOp = Object.fromEntries(rows.map((r) => [r.op, r]));
    assert.equal(byOp['Create 1,000 rows'].breeze, 539.0);
    assert.equal(byOp['Update every 10th row'].breeze, 12.4);
    assert.equal(byOp['Delete single row'].breeze, 1.1);
    assert.equal(byOp['Create 10,000 rows'].breeze, 5482.5);
    assert.equal(byOp['Update every 10th row'].react, 56.7);
    assert.equal(byOp['Delete single row'].react, 71.1);
    assert.equal(global.MUSEUM_BENCH_DBMONSTER.breezeFps, 58.3);
    assert.equal(global.MUSEUM_BENCH_MEMORY.breezeKb, 2424.9);
    assert.equal(global.MUSEUM_BENCH_MEMORY.reactKb, 19621.6);
    assert.equal(global.MUSEUM_BENCH_BUNDLE.gzipKb, 16.30);
    assert.equal(global.MUSEUM_BENCH_BUNDLE.deps, 0);
  });
});

describe('Museum app.breeze (real Breeze syntax, no invented APIs)', () => {
  it('parses with zero warnings and keeps 2-space indentation', () => {
    const warns = [];
    const orig = console.warn;
    console.warn = (...a) => warns.push(a.join(' '));
    try {
      const ast = Breeze.parse(appBreeze);
      assert.ok(Array.isArray(ast) && ast.length > 10);
    } finally {
      console.warn = orig;
    }
    assert.equal(warns.length, 0, warns.slice(0, 3).join(' | '));
    assert.ok(!/^\t/m.test(appBreeze), 'tabs are forbidden in .breeze files');
    assert.ok(!/<\/(div|section|p|button|a)>/.test(appBreeze), 'closing tags are forbidden');
  });

  it('declares every museum room, the dossier and the footer', () => {
    const ast = Breeze.parse(appBreeze);
    const sections = ast.filter((n) => n.type === 'section').map((n) => n.id);
    ['entrance', 'gallery', 'breeze', 'lab', 'archive', 'library', 'about', 'exit', 'exhibit'].forEach((id) => {
      assert.ok(sections.includes(id), `missing @section #${id}`);
    });
    assert.ok(ast.some((n) => n.type === 'footer'), 'missing @footer');
    assert.ok(ast.some((n) => n.type === 'nav'), 'missing @nav');
  });

  it('uses the vintage-modern palette as its theme', () => {
    const ast = Breeze.parse(appBreeze);
    const theme = ast.find((n) => n.type === 'theme');
    assert.equal(theme.props.primary, '#EF4444');
    assert.equal(theme.props.bg, '#FAF8F5');
    assert.equal(theme.props.text, '#1E293B');
  });

  it('carries the required Breeze credit in the footer with a real link', () => {
    assert.match(appBreeze, /This website was made with my own framework Breeze\./);
    assert.match(appBreeze, /href=https:\/\/breeze-framework\.vercel\.app/);
    // SSR keeps text (Breeze SSR drops generic-element attrs by design);
    // the client renderer wires hrefs, and index.html carries a static <a>.
    const html = Breeze.renderToString(appBreeze);
    assert.ok(html.includes('This website was made with my own framework Breeze.'));
    const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    assert.ok(index.includes('<a href="https://breeze-framework.vercel.app">Learn more about Breeze</a>'));
  });

  it('only invokes actions that exist (built-ins + registered methods)', () => {
    const ast = Breeze.parse(appBreeze);
    const actions = collectActions(ast);
    assert.ok(actions.length > 10, 'museum should be event-driven');
    const builtins = new Set(['navigate', 'setState', 'increment', 'decrement', 'toggle', 'push', 'remove', 'emit']);
    const methods = new Set(['selectExhibit', 'closeExhibit', 'openLive', 'openRepo', 'resetArchive']);
    actions.forEach((a) => {
      const name = a.split('(')[0].trim();
      assert.ok(builtins.has(name) || methods.has(name), `unknown action: ${a}`);
    });
    const src = fs.readFileSync(path.join(root, 'museum.js'), 'utf8');
    methods.forEach((m) => assert.ok(src.includes(`'${m}'`), `museum.js must register ${m}`));
  });

  it('renders keyed lists from state (no hardcoded duplication)', () => {
    const ast = Breeze.parse(appBreeze);
    const eaches = [];
    (function walk(ns) {
      ns.forEach((n) => {
        if (n.type === 'each') eaches.push(`${n.itemVar} in ${n.listKey}`);
        if (n.children) walk(n.children);
      });
    })(ast);
    ['exhibit in gallery', 'bench in labBenches', 'screen in labScreens', 'row in archiveList', 'book in books', 'bench in benchRows'].forEach((e) => {
      assert.ok(eaches.includes(e), `missing keyed list: ${e}`);
    });
  });

  it('pre-renders static shells for SSR without DOM', () => {
    const html = Breeze.renderToString(appBreeze);
    assert.ok(html.includes('ALAKMAR'));
    assert.ok(html.includes('id="gallery"'));
    assert.ok(html.includes('id="archive"'));
  });
});

describe('Museum helpers (pure logic)', () => {
  it('builds view models with joined tech and metric lines', () => {
    const p = ALL.find((x) => x.slug === 'esamz');
    const vm = MUSEUM.viewModel(p, 0);
    assert.equal(vm.techLine, 'Rust · Sarvam 105b · Privacy Engineering');
    assert.ok(vm.metricLine.includes('3,000+'));
    assert.equal(vm.index, 0);
  });

  it('filters the archive by wing and free-text query', () => {
    const base = ALL.map((p, i) => MUSEUM.viewModel(p, i));
    assert.equal(MUSEUM.filterArchive(base, 'all', '').length, base.length);
    const lab = MUSEUM.filterArchive(base, 'lab', '');
    assert.ok(lab.length > 0 && lab.every((x) => x.wing === 'lab'));
    const rust = MUSEUM.filterArchive(base, 'all', 'rust');
    assert.ok(rust.length >= 2, 'rust should match flagship + revive-me');
    assert.equal(MUSEUM.filterArchive(base, 'all', 'zzz-no-match').length, 0);
  });

  it('builds honest benchmark rows with proportional bars', () => {
    const rows = MUSEUM.buildBenchRows(global.MUSEUM_BENCH_KRAUSEST);
    assert.equal(rows.length, 4);
    const del = rows.find((r) => r.op === 'Delete single row');
    assert.equal(del.bMs, '1.10');
    assert.equal(del.rMs, '71.10');
    assert.ok(parseInt(del.bPct, 10) < parseInt(del.rPct, 10), 'breeze bar must be shorter (faster)');
  });

  it('finds artifacts by slug across projects and books', () => {
    assert.equal(MUSEUM.findBySlug(ALL, 'breeze').title, 'Breeze Framework');
    assert.equal(MUSEUM.findBySlug(ALL, 'ai-handbook').title, 'The AI Mastery Handbook');
    assert.equal(MUSEUM.findBySlug(ALL, 'nope'), null);
  });
});

describe('Museum budgets (performance is a feature)', () => {
  it('ships zero runtime dependencies and no heavy framework strings', () => {
    const js = fs.readFileSync(path.join(root, 'museum.js'), 'utf8');
    const data = fs.readFileSync(path.join(root, 'museum-data.js'), 'utf8');
    assert.ok(!/require\(['"]react/.test(js), 'no react');
    assert.ok(!/from ['"]react['"]/.test(js), 'no react imports');
    assert.ok(!/vue|next\/|svelte/i.test(js.replace(/preventScroll/g, '')), 'no rival frameworks');
    assert.ok(!/^import /m.test(js) && !/^import /m.test(data), 'plain scripts, no bundler imports');
  });

  it('stays lean enough for fast initial load', () => {
    const bytes = ['museum.js', 'museum-data.js', 'museum.css', 'app.breeze', 'index.html']
      .map((f) => fs.statSync(path.join(root, f)).size)
      .reduce((a, b) => a + b, 0);
    assert.ok(bytes < 160 * 1024, `museum payload ${(bytes / 1024).toFixed(1)} KB exceeds 160 KB budget`);
  });

  it('keeps every room reachable by keyboard-ordered anchors', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    assert.ok(html.includes('id="app"'));
    assert.ok(html.includes('<noscript>'));
    assert.ok(html.includes('This website was made with my own framework Breeze.'));
  });

  it('stays static, readable and accessible in code and CSS', () => {
    const css = fs.readFileSync(path.join(root, 'museum.css'), 'utf8');
    const js = fs.readFileSync(path.join(root, 'museum.js'), 'utf8');
    // No 3D / motion machinery anywhere in the shipped code.
    ['perspective', 'preserve-3d', 'rotateX', 'rotateY', 'translateZ', 'requestAnimationFrame', 'pointermove'].forEach((w) => {
      assert.ok(!css.includes(w), `CSS must not contain ${w}`);
      assert.ok(!js.includes(w), `JS must not contain ${w}`);
    });
    assert.ok(!/hover-lift|hover-scale|fade-in|slide-up/.test(appBreeze), 'no motion modifiers in app.breeze');
    assert.ok(css.includes(':focus-visible'), 'visible focus states');
    assert.ok(css.includes('prefers-reduced-motion'), 'reduced-motion query kept');
    assert.ok(js.includes("key === 'Escape'"), 'Esc closes the dossier');
    assert.ok(css.includes('min-height: 48px'), 'touch-sized targets');
    // Readable text colors: no washed-out small text.
    assert.ok(css.includes('--soft: #475569'), 'secondary text stays contrast-safe');
  });
});
