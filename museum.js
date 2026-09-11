/*!
 * ALAKMAR Museum — interaction engine (zero dependencies)
 *
 * How the pieces fit:
 *   museum-data.js  → structured project data (single source of truth)
 *   app.breeze      → declarative rooms, keyed lists, UI state (Breeze)
 *   museum.css      → rooms, frames, light, motion
 *   museum.js       → this file: Breeze methods, 3D walk, dossier morph,
 *                     archive filtering, keyboard, a11y, performance guards
 *
 * Breeze owns: room lists, filters, text bindings, nav state, overlay flag.
 * Direct DOM owns: per-frame camera (rAF), FLIP morph, href wiring, observers.
 * Scroll pixels never flow through reactive state — only room changes do.
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

  function markDossierOrigin() {
    var card = null;
    var active = document.activeElement;
    if (active && active.closest) card = active.closest('.bz-card');
    var root = qs('#app');
    if (card && root) {
      var r = card.getBoundingClientRect();
      var dx = (r.left + r.width / 2) - (global.innerWidth / 2);
      var dy = (r.top + r.height / 2) - (global.innerHeight / 2);
      root.style.setProperty('--dossier-dx', Math.round(dx) + 'px');
      root.style.setProperty('--dossier-dy', Math.round(dy) + 'px');
      root.style.setProperty('--dossier-ox', '50%');
      root.style.setProperty('--dossier-oy', '50%');
    }
  }

  function focusDossier() {
    var h = qs('#exhibit h2');
    if (h) {
      h.setAttribute('tabindex', '-1');
      try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); }
    }
  }

  // Single rAF walk driver: scroll camera + pointer light. Stops when idle.
  function createWalk() {
    var reduceMotion = function () {
      return document.body.classList.contains('calm-motion');
    };
    var coarse = function () {
      return typeof global.matchMedia === 'function' && global.matchMedia('(pointer: coarse)').matches;
    };
    var narrow = function () {
      return typeof global.matchMedia === 'function' && global.matchMedia('(max-width: 760px)').matches;
    };
    var tiltX = 0, tiltY = 0, targetX = 0, targetY = 0;
    var running = false, raf = 0;
    var sections = [];

    function snapshot() {
      // The dossier overlay is fixed; the walk camera must never move it.
      sections = qsa('#app .bz-section[id]').filter(function (s) { return s.id !== 'exhibit'; });
    }

    function frame() {
      var vh = global.innerHeight || 800;
      if (!reduceMotion() && !narrow()) {
        tiltX += (targetX - tiltX) * 0.06;
        tiltY += (targetY - tiltY) * 0.06;
        for (var i = 0; i < sections.length; i++) {
          var s = sections[i];
          if (!s.isConnected) continue;
          var r = s.getBoundingClientRect();
          if (r.bottom < -vh || r.top > vh * 2) continue;
          var d = (r.top + r.height / 2 - vh / 2) / vh;
          var clamped = Math.max(-1, Math.min(1, d));
          s.style.transform =
            'rotateX(' + (-clamped * 3.5 + tiltX).toFixed(3) + 'deg)' +
            ' rotateY(' + tiltY.toFixed(3) + 'deg)' +
            ' translateZ(' + (-Math.abs(clamped) * 55).toFixed(1) + 'px)';
        }
      }
      if (document.body.classList.contains('museum-walk-dirty')) {
        document.body.classList.remove('museum-walk-dirty');
        raf = requestAnimationFrame(frame);
      } else if (Math.abs(targetX - tiltX) > 0.01 || Math.abs(targetY - tiltY) > 0.01) {
        raf = requestAnimationFrame(frame);
      } else {
        running = false;
      }
    }

    function kick() {
      document.body.classList.add('museum-walk-dirty');
      if (!running) {
        running = true;
        raf = requestAnimationFrame(frame);
      }
    }

    function onScroll() { kick(); }

    function onPointer(e) {
      if (reduceMotion() || coarse() || narrow()) return;
      var nx = (e.clientX / (global.innerWidth || 1)) - 0.5;
      var ny = (e.clientY / (global.innerHeight || 1)) - 0.5;
      targetY = (nx * 2.2).toFixed(3) * 1;
      targetX = (-ny * 1.6).toFixed(3) * 1;
      kick();
    }

    return {
      start: function () {
        snapshot();
        global.addEventListener('scroll', onScroll, { passive: true });
        global.addEventListener('pointermove', onPointer, { passive: true });
        kick();
        global.setTimeout(kick, 600);
      },
      refresh: snapshot,
      stop: function () {
        running = false;
        if (raf) cancelAnimationFrame(raf);
        global.removeEventListener('scroll', onScroll);
        global.removeEventListener('pointermove', onPointer);
      }
    };
  }

  function initScene(B) {
    // Search lives in a real <form>: Enter must filter, never reload.
    qsa('#app form').forEach(function (f) {
      f.addEventListener('submit', function (e) { e.preventDefault(); });
    });
    // Calm motion: OS preference first, user toggle wins afterwards.
    var mq = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : null;
    if (mq && mq.matches && !B.getState('reducedMotion')) {
      B.setState('reducedMotion', true);
    }
    var syncCalm = function () {
      document.body.classList.toggle('calm-motion', !!B.getState('reducedMotion'));
    };
    syncCalm();
    B.watch('reducedMotion', syncCalm);
    if (mq && mq.addEventListener) {
      mq.addEventListener('change', function (e) {
        B.setState('reducedMotion', !!e.matches);
      });
    }

    // Reveal cards without punishing no-JS visitors (they never get the class).
    if ('IntersectionObserver' in global) {
      var revealBits = qsa('#app .bz-card, #app .bz-section > h2');
      revealBits.forEach(function (el) { el.classList.add('museum-reveal'); });
      var ro = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add('in');
            ro.unobserve(en.target);
          }
        });
      }, { threshold: 0.12 });
      revealBits.forEach(function (el) { ro.observe(el); });

      // Room tracking → Breeze state (discrete) + signage highlight.
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
        ro.disconnect();
        roomObs.disconnect();
      });
    }

    var walk = createWalk();
    walk.start();
    B.watch('archiveList', function () {
      // New shelf cards appear instantly (tool, not cinema) + camera re-sync.
      walk.refresh();
    });

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
      markDossierOrigin();
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
        markDossierOrigin();
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
