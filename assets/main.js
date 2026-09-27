/* The Al-Aqmar Gazette — interaction layer.
   Restrained by design: edition switch, reading indicator,
   scroll-spy, and gentle reveal. Nothing else. */
(() => {
  'use strict';

  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  /* ── Edition (day / evening) ─────────────────────────────── */
  const paint = (edition) => {
    root.dataset.edition = edition;
    const evening = edition === 'evening';
    document.querySelectorAll('.edition-toggle').forEach((b) => {
      b.setAttribute('aria-pressed', String(evening));
    });

    const label = document.getElementById('edition-label');
    if (label) label.textContent = (evening ? 'Evening' : 'Day') + ' Edition';

    const metas = [...document.querySelectorAll('meta[name="theme-color"]')];
    metas.forEach((m) => m.setAttribute('content', evening ? '#161410' : '#eaddcf'));
  };

  let stored = null;
  try { stored = localStorage.getItem('aaj-edition'); } catch (_) {}
  paint(stored || (matchMedia('(prefers-color-scheme: dark)').matches ? 'evening' : 'day'));

  document.querySelectorAll('.edition-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = root.dataset.edition === 'evening' ? 'day' : 'evening';
      paint(next);
      try { localStorage.setItem('aaj-edition', next); } catch (_) {}
    });
  });

  /* ── Reading indicator ───────────────────────────────────── */
  const bar = document.getElementById('progress');
  if (bar) {
    let queued = false;
    const draw = () => {
      queued = false;
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.setProperty('--p', max > 0 ? (scrollY / max).toFixed(4) : '0');
    };
    addEventListener('scroll', () => {
      if (!queued) { queued = true; requestAnimationFrame(draw); }
    }, { passive: true });
    addEventListener('resize', draw, { passive: true });
    draw();
  }

  /* ── Scroll-spy on the rail ──────────────────────────────── */
  const links = [...document.querySelectorAll('.rail__inner a')];
  const sections = links
    .map((a) => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);

  if (sections.length && 'IntersectionObserver' in window) {
    const seen = new Map();
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((e) => seen.set(e.target.id, e.intersectionRatio));
      let best = null, ratio = 0;
      seen.forEach((r, id) => { if (r > ratio) { ratio = r; best = id; } });
      links.forEach((a) => {
        const on = best && a.getAttribute('href') === '#' + best;
        if (on) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }, { rootMargin: '-12% 0px -55% 0px', threshold: [0, 0.15, 0.4, 0.75, 1] });
    sections.forEach((s) => spy.observe(s));
  }

  /* ── Reveal on approach ──────────────────────────────────── */
  const targets = [...document.querySelectorAll('[data-reveal]')];
  if (reduced.matches || !('IntersectionObserver' in window)) {
    targets.forEach((t) => t.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    targets.forEach((t) => io.observe(t));
    requestAnimationFrame(() => {
      targets.forEach((t) => {
        if (t.getBoundingClientRect().top < innerHeight * 0.92) t.classList.add('is-in');
      });
    });
  }
})();
