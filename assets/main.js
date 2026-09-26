/* The Al-Aqmar Journal — interaction layer.
   Restrained by design: an edition switch, a reading indicator,
   a scroll-spy, a seamless ticker, and one reveal. Nothing else. */
(() => {
  'use strict';

  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  /* ── Edition (day / night) ───────────────────────────────── */
  const themeMetas = [...document.querySelectorAll('meta[name="theme-color"]')];
  const paint = (edition) => {
    root.dataset.edition = edition;
    const night = edition === 'night';
    document.querySelectorAll('.edition-toggle').forEach((b) => {
      b.setAttribute('aria-pressed', String(night));
    });
    const name = document.getElementById('edition-name');
    if (name) name.textContent = night ? 'Night' : 'Day';
    // single authoritative theme-color while a choice is active
    themeMetas.forEach((m) => m.remove());
    let live = document.getElementById('tc');
    if (!live) {
      live = document.createElement('meta');
      live.id = 'tc';
      live.name = 'theme-color';
      document.head.appendChild(live);
    }
    live.content = night ? '#0b0c0e' : '#f3f2ed';
  };

  let stored = null;
  try { stored = localStorage.getItem('aaj-edition'); } catch (_) {}
  paint(stored || (matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day'));

  document.querySelectorAll('.edition-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = root.dataset.edition === 'night' ? 'day' : 'night';
      paint(next);
      try { localStorage.setItem('aaj-edition', next); } catch (_) {}
    });
  });

  /* ── Seamless ticker: duplicate the track ────────────────── */
  const track = document.getElementById('ticker-a');
  if (track && !reduced.matches) {
    const clone = track.cloneNode(true);
    clone.removeAttribute('id');
    clone.setAttribute('aria-hidden', 'true');
    track.parentElement.appendChild(clone);
  }

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
  const links = [...document.querySelectorAll('.rail nav a')];
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
    // anything already in view on load should not wait for a scroll
    requestAnimationFrame(() => {
      targets.forEach((t) => {
        if (t.getBoundingClientRect().top < innerHeight * 0.92) t.classList.add('is-in');
      });
    });
  }
})();
