/*!
 * ALAKMAR Museum — interaction engine (zero dependencies)
 *
 * How the pieces fit:
 *   museum-data.js  → structured project data (single source of truth)
 *   app.breeze      → declarative rooms, keyed lists, UI state (Breeze)
 *   museum.css      → static editorial system (no motion, no 3D)
 *   museum.js       → this file: Breeze methods, dossier panel,
 *                     archive filtering, keyboard, a11y
 *
 * Breeze owns: room lists, filters, text bindings, nav state, overlay flag.
 * Direct DOM owns: href wiring, room highlight, focus management.
 */
(function (global) {
  'use strict';

  // ── 1. Utilities (pure, node-testable) ──────────────────────────────

  function metricLine(metrics) {
    if (!metrics) return '';
    return Object.keys(metrics).map(function (k) { return metrics[k]; }).join(' · ');
  }

  function techLineOf(p) {
    return (p.technologies || []).join(' · ');
  }

  function viewModel(p, index) {
    return {
      slug: p.slug,
      title: p.title,
      tagline: p.tagline,
      description: p.description,
      why: p.why,
      category: p.category,
      wing: p.wing,
      exhibit: p.exhibit,
      status: p.status,
      index: index,
      techLine: techLineOf(p),
      metricLine: metricLine(p.metrics)
    };
  }

  function findBySlug(all, slug) {
    for (var i = 0; i < all.length; i++) {
      if (all[i].slug === slug) return all[i];
    }
    return null;
  }

  function filterArchive(base, wingFilter, query) {
    var q = (query || '').toLowerCase().trim();
    return base.filter(function (item) {
      if (wingFilter && wingFilter !== 'all' && item.wing !== wingFilter) return false;
      if (!q) return true;
      var hay = (item.title + ' ' + item.tagline + ' ' + item.techLine + ' ' + item.category + ' ' + item.status).toLowerCase();
      return hay.indexOf(q) !== -1;
    });
  }

  var BENCH_PICKS = ['Create 1,000 rows', 'Update every 10th row', 'Delete single row', 'Create 10,000 rows'];

  function buildBenchRows(krausest) {
    return krausest.filter(function (r) { return BENCH_PICKS.indexOf(r.op) !== -1; }).map(function (r) {
      var max = Math.max(r.breeze, r.react, 1);
      var pct = function (v) { return Math.max(4, Math.round((v / max) * 100)) + '%'; };
      return {
        op: r.op,
        bMs: r.breeze.toFixed(2),
        rMs: r.react.toFixed(2),
        bPct: pct(r.breeze),
        rPct: pct(r.react),
        note: r.note
      };
    });
  }

  // ── 2. Browser engine ───────────────────────────────────────────────
  // Everything below needs a DOM. Node tests import only the pure helpers.

  var ROOMS = ['entrance', 'gallery', 'breeze', 'lab', 'archive', 'library', 'about', 'exit'];
  var dossierReturnFocus = null;
  var lastRoomHash = '#entrance';
  var toastTimer = null;

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function toast(msg) {
    var el = qs('#museum-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'museum-toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    global.clearTimeout(toastTimer);
    toastTimer = global.setTimeout(function () { el.classList.remove('show'); }, 2600);
  }

  function allItems() {
    return (global.MUSEUM_PROJECTS || []).concat(global.MUSEUM_BOOKS || []);
  }

  function openUrl(url, fallbackMsg) {
    if (url) {
      global.open(url, '_blank', 'noopener');
    } else if (fallbackMsg) {
      toast(fallbackMsg);
    }
  }

  function applyArchive(B) {
    var wing = B.getState('archiveFilter') || 'all';
    var query = B.getState('archiveQuery') || '';
    var base = (global.MUSEUM_ARCHIVE_BASE || []);
    var list = filterArchive(base, wing, query);
    B.setState('archiveList', list);
    B.setState('archiveCount', list.length);
    B.setState('archiveEmpty', list.length === 0);
  }

  function fillDossier(B, slug) {
    var raw = findBySlug(allItems(), slug);
    if (!raw) return false;
    var vm = viewModel(raw, 0);
    B.setState('selectedExhibit', slug);
    B.setState('detailTitle', vm.title);
    B.setState('detailTagline', vm.tagline);
    B.setState('detailDescription', vm.description);
    B.setState('detailWhy', vm.why);
    B.setState('detailStatus', vm.status + ' · ' + vm.category);
    B.setState('detailTech', vm.techLine);
    B.setState('detailMetrics', vm.metricLine);
    B.setState('detailOpen', true);
    document.body.classList.add('museum-dossier-open');
    var live = qs('#detail-live');
    if (live) {
      if (raw.live) {
        live.setAttribute('href', raw.live);
        live.style.display = '';
      } else {
        live.style.display = 'none';
      }
    }
    var repo = qs('#detail-repo');
    if (repo) {
      if (raw.repo) {
        repo.setAttribute('href', raw.repo);
        repo.style.display = '';
      } else {
        repo.style.display = 'none';
      }
    }
    try {
      if ('replaceState' in history) history.replaceState(null, '', '#exhibit-' + slug);
    } catch (e) { /* file:// or sandbox: URL stays as-is */ }
    return true;
  }

  function focusDossier() {
    var h = qs('#exhibit h2');
    if (h) {
      h.setAttribute('tabindex', '-1');
      try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); }
    }
  }

  function initScene(B) {
    // Search lives in a real <form>: Enter must filter, never reload.
    qsa('#app form').forEach(function (f) {
      f.addEventListener('submit', function (e) { e.preventDefault(); });
    });

    // Room tracking → Breeze state (discrete) + nav highlight.
    if ('IntersectionObserver' in global) {
      var roomObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var id = en.target.id;
          if (ROOMS.indexOf(id) === -1) return;
          if (B.getState('currentRoom') !== id) B.setState('currentRoom', id);
          lastRoomHash = '#' + id;
          qsa('.bz-nav-link').forEach(function (a) {
            a.classList.toggle('active', a.getAttribute('href') === '#' + id);
          });
        });
      }, { rootMargin: '-40% 0px -50% 0px', threshold: 0 });
      qsa('#app .bz-section[id]').forEach(function (s) { roomObs.observe(s); });
      global.addEventListener('pagehide', function () {
        roomObs.disconnect();
      });
    }

    // Keyboard: Esc steps back, N/P walk rooms. Never hijack typing.
    document.addEventListener('keydown', function (e) {
      var tag = (e.target && e.target.tagName) || '';
      var typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target && e.target.isContentEditable);
      if (e.key === 'Escape' && B.getState('detailOpen')) {
        e.preventDefault();
        B.methods.closeExhibit();
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'n' || e.key === 'N' || e.key === 'p' || e.key === 'P') {
        var cur = B.getState('currentRoom') || 'entrance';
        var i = ROOMS.indexOf(cur);
        if (i === -1) i = 0;
        i = (e.key === 'n' || e.key === 'N') ? Math.min(ROOMS.length - 1, i + 1) : Math.max(0, i - 1);
        B.navigate('#' + ROOMS[i]);
      }
    });
  }

  function registerMethods(B) {
    B.method('selectExhibit', function (slug) {
      dossierReturnFocus = document.activeElement;
      if (fillDossier(B, String(slug || '').trim())) {
        global.setTimeout(focusDossier, 60);
      } else {
        toast('That artifact is not on the shelf.');
      }
    });

    B.method('closeExhibit', function () {
      B.setState('detailOpen', false);
      B.setState('selectedExhibit', '');
      document.body.classList.remove('museum-dossier-open');
      try {
        if ('replaceState' in history) history.replaceState(null, '', lastRoomHash);
      } catch (e) { /* keep URL */ }
      var back = dossierReturnFocus && dossierReturnFocus.focus ? dossierReturnFocus : null;
      dossierReturnFocus = null;
      if (back) {
        try { back.focus({ preventScroll: true }); } catch (err) { back.focus(); }
      }
    });

    B.method('openLive', function (slug) {
      var raw = findBySlug(allItems(), String(slug || '').trim());
      if (raw && raw.live) openUrl(raw.live);
      else toast('No live demo for this one — open the dossier instead.');
    });

    B.method('openRepo', function (slug) {
      var raw = findBySlug(allItems(), String(slug || '').trim());
      if (raw && raw.repo) openUrl(raw.repo);
      else toast('No public repo for this one — see the dossier.');
    });

    B.method('resetArchive', function () {
      B.setState('archiveFilter', 'all');
      B.setState('archiveQuery', '');
    });
  }

  function buildShelfData() {
    var projects = global.MUSEUM_PROJECTS || [];
    var books = global.MUSEUM_BOOKS || [];
    // Human-facing artifact numbers start at 1 (helpers stay 0-based).
    var gallery = projects.filter(function (p) { return p.wing === 'gallery'; }).map(function (p, i) { return viewModel(p, i + 1); });
    var labBenches = projects.filter(function (p) { return p.wing === 'lab' && p.exhibit === 'bench'; }).map(function (p, i) { return viewModel(p, i + 1); });
    var labScreens = projects.filter(function (p) { return p.wing === 'lab' && p.exhibit === 'screen'; }).map(viewModel);
    var archiveBase = projects.concat(books).map(function (p, i) { return viewModel(p, i); });
    var bookVMs = books.map(function (b, i) { return viewModel(b, i); });
    return { gallery: gallery, labBenches: labBenches, labScreens: labScreens, archiveBase: archiveBase, bookVMs: bookVMs };
  }

  function boot() {
    var B = global.Breeze;
    if (!B) {
      // Breeze failed to load (offline CDN mirror etc.) — leave noscript content.
      // eslint-disable-next-line no-console
      console.error('[Museum] Breeze runtime missing; showing static fallback.');
      return Promise.resolve(false);
    }
    registerMethods(B);

    var shelf = buildShelfData();
    global.MUSEUM_ARCHIVE_BASE = shelf.archiveBase;

    var benchRows = buildBenchRows(global.MUSEUM_BENCH_KRAUSEST || []);
    var profile = global.MUSEUM_PROFILE || { stats: [], principles: [], stack: [] };
    var statVMs = (profile.stats || []).map(function (s, i) { return { value: s.value, label: s.label, index: i }; });
    var principleVMs = (profile.principles || []).map(function (s, i) { return { title: s.title, text: s.text, index: i }; });

    B.watch('archiveFilter', function () { applyArchive(B); });
    B.watch('archiveQuery', function () { applyArchive(B); });

    return B.init('app.breeze', '#app').then(function () {
      B.batch(function () {
        B.setState('gallery', shelf.gallery);
        B.setState('labBenches', shelf.labBenches);
        B.setState('labScreens', shelf.labScreens);
        B.setState('books', shelf.bookVMs);
        B.setState('benchRows', benchRows);
        B.setState('stats', statVMs);
        B.setState('principles', principleVMs);
        B.setState('stackChips', profile.stack || []);
        applyArchive(B);
      });
      initScene(B);
      // Deep link: #exhibit-slug opens its dossier after first paint.
      var hash = (global.location && global.location.hash) || '';
      var m = hash.match(/^#exhibit-([\w-]+)$/);
      if (m) {
        dossierReturnFocus = null;
        if (fillDossier(B, m[1])) global.setTimeout(focusDossier, 120);
      }
      B.emit('museum:ready', { rooms: ROOMS.length, artifacts: shelf.archiveBase.length });
      return true;
    }).catch(function (err) {
      // eslint-disable-next-line no-console
      console.error('[Museum] boot failed:', err);
      return false;
    });
  }

  // Auto-boot in browsers; export pure helpers for node tests.
  if (typeof document !== 'undefined' && typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else {
      boot();
    }
  }

  var api = {
    metricLine: metricLine,
    techLineOf: techLineOf,
    viewModel: viewModel,
    findBySlug: findBySlug,
    filterArchive: filterArchive,
    buildBenchRows: buildBenchRows,
    BENCH_PICKS: BENCH_PICKS,
    ROOMS: ROOMS,
    boot: boot
  };
  global.MUSEUM = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
