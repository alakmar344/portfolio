/* Al-Aqmar — Lunar Observatory
   Vanilla JS, no dependencies, no network calls, no storage beyond one
   accent preference in localStorage. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const mouse = { x: innerWidth / 2, y: innerHeight / 2, nx: 0, ny: 0, active: false };

  addEventListener('pointermove', (e) => {
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
    mouse.nx = e.clientX / innerWidth - 0.5; mouse.ny = e.clientY / innerHeight - 0.5;
  }, { passive: true });

  const accentRGB = () => getComputedStyle(root).getPropertyValue('--glow').trim().split(/\s+/).map(Number);

  /* ── Toast ─────────────────────────────────────────────────── */
  const toastEl = $('#toast');
  let toastT;
  const toast = (msg) => {
    toastEl.textContent = msg; toastEl.classList.add('is-on');
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('is-on'), 2200);
  };

  /* ── Text splitting ────────────────────────────────────────── */
  $$('.split').forEach((el) => {
    const text = el.textContent;
    el.setAttribute('aria-label', text);
    el.textContent = '';
    [...text].forEach((c, i) => {
      const s = document.createElement('span');
      s.className = 'ch'; s.setAttribute('aria-hidden', 'true');
      s.style.setProperty('--i', i);
      s.textContent = c;
      el.appendChild(s);
    });
  });
  const splitWords = (el) => {
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const w = document.createElement('span'); w.className = 'w'; w.textContent = part; frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
    $$('.w', el).forEach((w, i) => w.style.setProperty('--i', i));
  };
  $$('.reveal-words').forEach(splitWords);
  const manifesto = $('#manifesto');
  if (manifesto) splitWords(manifesto);

  /* ── Boot sequence ─────────────────────────────────────────── */
  const boot = $('#boot');
  const ready = () => { boot && boot.classList.add('is-done'); root.classList.add('is-ready'); runScramble(); };
  if (boot && !reduced) {
    const cnt = $('#boot-count');
    const t0 = performance.now(), dur = 1100;
    const tick = (t) => {
      const p = clamp((t - t0) / dur, 0, 1);
      cnt.textContent = String(Math.round((1 - Math.pow(1 - p, 3)) * 100)).padStart(3, '0');
      if (p < 1) requestAnimationFrame(tick); else setTimeout(ready, 150);
    };
    requestAnimationFrame(tick);
  } else ready();

  /* ── Scramble text ─────────────────────────────────────────── */
  const GLYPHS = '!<>-_\\/[]{}—=+*^?#01ABCDEFXYZ';
  function scramble(el, finalText, dur = 900) {
    if (reduced) { el.textContent = finalText; return; }
    const t0 = performance.now();
    const step = (t) => {
      const p = clamp((t - t0) / dur, 0, 1);
      const reveal = Math.floor(p * finalText.length);
      let out = finalText.slice(0, reveal);
      for (let i = reveal; i < finalText.length; i++) out += finalText[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      el.textContent = out;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function runScramble() {
    $$('[data-scramble]').forEach((el, i) => setTimeout(() => scramble(el, el.dataset.scramble), 500 + i * 180));
  }
  $$('[data-scramble]').forEach((el) => el.addEventListener('pointerenter', () => scramble(el, el.dataset.scramble, 500)));

  /* ── Starfield sky ─────────────────────────────────────────── */
  const sky = $('#sky');
  if (sky) {
    const ctx = sky.getContext('2d');
    let W, H, DPR, stars = [], shooters = [];
    const build = () => {
      DPR = Math.min(devicePixelRatio || 1, 2);
      W = innerWidth; H = innerHeight;
      sky.width = W * DPR; sky.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const n = Math.round(clamp(W * H / 4200, 120, 420));
      stars = Array.from({ length: n }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        z: Math.random() ** 2 * 0.9 + 0.1,
        tw: Math.random() * Math.PI * 2, ts: 0.5 + Math.random() * 2,
      }));
    };
    build();
    addEventListener('resize', build, { passive: true });
    let px = 0, py = 0, lastScroll = scrollY, drift = 0;
    const frame = (t) => {
      ctx.clearRect(0, 0, W, H);
      px = lerp(px, mouse.nx, 0.05); py = lerp(py, mouse.ny, 0.05);
      drift = lerp(drift, (scrollY - lastScroll), 0.15); lastScroll = scrollY;
      const [r, g, b] = accentRGB();
      const near = [];
      for (const s of stars) {
        s.y -= drift * s.z * 0.25;
        if (s.y < -5) s.y += H + 10; else if (s.y > H + 5) s.y -= H + 10;
        const x = s.x - px * 40 * s.z, y = s.y - py * 40 * s.z;
        const a = (0.35 + 0.65 * s.z) * (reduced ? 1 : 0.6 + 0.4 * Math.sin(s.tw + t * 0.001 * s.ts));
        const size = s.z * 1.6 + 0.2;
        ctx.fillStyle = s.z > 0.75 ? `rgba(${r},${g},${b},${a})` : `rgba(235,235,255,${a})`;
        ctx.fillRect(x - size / 2, y - size / 2, size, size);
        if (mouse.active && finePointer) {
          const dx = x - mouse.x, dy = y - mouse.y, d2 = dx * dx + dy * dy;
          if (d2 < 150 * 150) near.push({ x, y, d: Math.sqrt(d2) });
        }
      }
      // constellation lines near cursor
      if (near.length) {
        near.sort((a, b) => a.d - b.d);
        const pts = near.slice(0, 7);
        ctx.lineWidth = 0.6;
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          ctx.strokeStyle = `rgba(${r},${g},${b},${0.5 * (1 - p.d / 150)})`;
          ctx.beginPath(); ctx.moveTo(mouse.x, mouse.y); ctx.lineTo(p.x, p.y); ctx.stroke();
          if (i) { ctx.beginPath(); ctx.moveTo(pts[i - 1].x, pts[i - 1].y); ctx.lineTo(p.x, p.y); ctx.stroke(); }
        }
      }
      // shooting stars
      if (!reduced && Math.random() < 0.004) shooters.push({ x: Math.random() * W, y: Math.random() * H * 0.4, vx: 6 + Math.random() * 6, vy: 2 + Math.random() * 2, life: 1 });
      shooters = shooters.filter((s) => (s.life -= 0.02) > 0);
      for (const s of shooters) {
        s.x += s.vx; s.y += s.vy;
        const grad = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 12, s.y - s.vy * 12);
        grad.addColorStop(0, `rgba(255,255,255,${s.life})`); grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = grad; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 12, s.y - s.vy * 12); ctx.stroke();
      }
      if (!reduced) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /* ── Live moon ─────────────────────────────────────────────── */
  const SYNODIC = 29.530588853;
  const NEW_MOON_REF = Date.UTC(2000, 0, 6, 18, 14);
  const moonPhase = (d = new Date()) => (((d - NEW_MOON_REF) / 864e5 / SYNODIC) % 1 + 1) % 1;
  const phaseName = (p) => {
    const names = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
    return names[Math.round(p * 8) % 8];
  };
  const illum = (p) => (1 - Math.cos(p * 2 * Math.PI)) / 2;
  const tonight = moonPhase();

  const moon = $('#moon');
  const readout = $('#phase-readout');
  const moonApi = { phase: tonight, set: () => {} };
  if (moon) {
    const ctx = moon.getContext('2d');
    const S = 380;
    moon.width = S; moon.height = S;
    // seeded RNG
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    // value noise
    const G = 64, grid = Float32Array.from({ length: G * G }, rnd);
    const vn = (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      const g = (i, j) => grid[((j & (G - 1)) * G) + (i & (G - 1))];
      const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      return lerp(lerp(g(xi, yi), g(xi + 1, yi), u), lerp(g(xi, yi + 1), g(xi + 1, yi + 1), u), v);
    };
    const fbm = (x, y) => { let s = 0, a = 0.5, f = 1; for (let o = 0; o < 5; o++) { s += a * vn(x * f, y * f); a *= 0.5; f *= 2.03; } return s; };
    const craters = Array.from({ length: 70 }, () => { const r = rnd() ** 3 * 0.16 + 0.015; return { x: rnd() * 2 - 1, y: rnd() * 2 - 1, r }; });
    const maria = [[-0.25, -0.3, 0.34], [0.18, -0.12, 0.28], [0.05, 0.28, 0.22], [-0.42, 0.12, 0.2], [0.38, 0.3, 0.16]];

    const N = S * S, nx = new Float32Array(N), ny = new Float32Array(N), nz = new Float32Array(N), alb = new Float32Array(N), inside = new Uint8Array(N);
    const R = S / 2 - 2;
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const x = (i + 0.5 - S / 2) / R, y = (j + 0.5 - S / 2) / R, r2 = x * x + y * y, k = j * S + i;
      if (r2 > 1) continue;
      inside[k] = 1;
      const z = Math.sqrt(1 - r2);
      const sm = (e0, e1, v) => { const u = clamp((v - e0) / (e1 - e0), 0, 1); return u * u * (3 - 2 * u); };
      let a = 0.74 + 0.26 * fbm(x * 3 + 5, y * 3 + 5);
      for (const [mx, my, mr] of maria) {
        const d = Math.hypot(x - mx, y - my) / mr + (fbm(x * 5, y * 5) - 0.5) * 0.7;
        a *= 1 - 0.26 * (1 - sm(0.6, 1.15, d));
      }
      let hx = 0, hy = 0;
      for (const c of craters) {
        const dx = x - c.x, dy = y - c.y, d = Math.hypot(dx, dy) / c.r;
        if (d < 1.4) {
          const bowl = 1 - sm(0.55, 1.0, d);          // soft floor
          const rim = Math.exp(-((d - 1.0) ** 2) / 0.02); // bright raised rim
          a *= 1 - 0.1 * bowl + 0.07 * rim;
          const g = (bowl * 0.6 - rim * 0.5) / c.r * 0.35;
          hx += dx * g; hy += dy * g;
        }
      }
      a *= 0.94 + 0.12 * vn(x * 40, y * 40);
      let Nx = x + hx * 0.12, Ny = y + hy * 0.12, Nz = z; const l = Math.hypot(Nx, Ny, Nz);
      nx[k] = Nx / l; ny[k] = Ny / l; nz[k] = Nz / l; alb[k] = a;
    }
    const img = ctx.createImageData(S, S);
    const render = (p) => {
      const th = p * 2 * Math.PI, Lx = Math.sin(th), Lz = -Math.cos(th);
      const d8 = img.data;
      for (let k = 0; k < N; k++) {
        const o = k * 4;
        if (!inside[k]) { d8[o + 3] = 0; continue; }
        const dot = nx[k] * Lx + nz[k] * Lz;
        const lit = clamp((dot + 0.03) / 0.18, 0, 1);
        const sh = lit * (0.25 + 0.75 * Math.max(0, dot)) ;
        const v = alb[k] * (sh * 1.05 + 0.045); // + earthshine
        const limb = 0.75 + 0.25 * nz[k];
        d8[o] = clamp(v * 245 * limb, 0, 255);
        d8[o + 1] = clamp(v * 240 * limb, 0, 255);
        d8[o + 2] = clamp(v * 232 * limb + 6, 0, 255);
        // antialiased rim
        const i = k % S, j = (k / S) | 0, rr = Math.hypot(i + 0.5 - S / 2, j + 0.5 - S / 2);
        d8[o + 3] = clamp((R - rr + 1) * 255, 0, 255);
      }
      ctx.putImageData(img, 0, 0);
      const days = (p * SYNODIC).toFixed(1);
      const scrubbed = Math.abs(p - tonight) > 0.004;
      readout.textContent = `${scrubbed ? 'scrubbing' : 'tonight'} · ${phaseName(p)} · ${Math.round(illum(p) * 100)}% lit · day ${days}`;
    };
    let cur = tonight, target = tonight, anim = 0, backT;
    const loop = () => {
      cur = lerp(cur, target, 0.18);
      if (Math.abs(cur - target) < 0.0005) cur = target;
      render(((cur % 1) + 1) % 1);
      anim = cur !== target ? requestAnimationFrame(loop) : 0;
    };
    const go = (p) => { target = p; moonApi.phase = ((p % 1) + 1) % 1; if (!anim) anim = requestAnimationFrame(loop); };
    moonApi.set = go;
    // intro: sweep from new moon to tonight
    if (!reduced) { cur = tonight - 1; render(0); setTimeout(() => go(tonight), 900); } else render(tonight);

    let dragging = false, sx = 0, sp = 0;
    moon.addEventListener('pointerdown', (e) => { dragging = true; sx = e.clientX; sp = target; moon.setPointerCapture(e.pointerId); clearTimeout(backT); });
    moon.addEventListener('pointermove', (e) => { if (dragging) go(sp + (e.clientX - sx) / 500); });
    const end = () => { if (!dragging) return; dragging = false; backT = setTimeout(() => go(Math.round(target - tonight) + tonight), 2600); };
    moon.addEventListener('pointerup', end); moon.addEventListener('pointercancel', end);
    moon.addEventListener('dblclick', () => go(Math.round(target - tonight) + tonight));
    moon.tabIndex = 0;
    moon.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); clearTimeout(backT); go(target + (e.key === 'ArrowRight' ? 1 : -1) / 29.53); }
    });
    // parallax float
    const wrap = moon.parentElement;
    if (!reduced) {
      const float = (t) => {
        const y = Math.sin(t / 1600) * 8;
        wrap.style.transform = `translate3d(${mouse.nx * -18}px, ${mouse.ny * -18 + y}px, 0) rotate(${mouse.nx * 4}deg)`;
        requestAnimationFrame(float);
      };
      requestAnimationFrame(float);
    }
  }

  /* ── Cursor + magnetic ─────────────────────────────────────── */
  const cursor = $('#cursor');
  if (cursor && finePointer && !reduced) {
    root.classList.add('has-cursor');
    const dot = $('.cursor__dot', cursor), ring = $('.cursor__ring', cursor), label = $('#cursor-label');
    let rx = mouse.x, ry = mouse.y;
    const draw = () => {
      rx = lerp(rx, mouse.x, 0.16); ry = lerp(ry, mouse.y, 0.16);
      dot.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
    document.addEventListener('pointerover', (e) => {
      const lab = e.target.closest('[data-cursor]');
      const hov = e.target.closest('a, button, input, [data-tilt], canvas#moon');
      cursor.classList.toggle('is-label', !!lab);
      cursor.classList.toggle('is-hover', !lab && !!hov);
      label.textContent = lab ? lab.dataset.cursor : '';
    });
    addEventListener('pointerdown', () => cursor.classList.add('is-down'));
    addEventListener('pointerup', () => cursor.classList.remove('is-down'));
    document.addEventListener('pointerleave', () => { cursor.style.opacity = 0; });
    document.addEventListener('pointerenter', () => { cursor.style.opacity = 1; });

    $$('[data-magnetic]').forEach((el) => {
      const k = parseFloat(el.dataset.magnetic) || 0.35;
      el.style.transition = 'transform 0.5s cubic-bezier(.22,1,.36,1)';
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * k}px, ${(e.clientY - r.top - r.height / 2) * k}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ── Spotlight + tilt ──────────────────────────────────────── */
  $$('[data-spot], [data-tilt]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      el.style.setProperty('--mx', x + 'px'); el.style.setProperty('--my', y + 'px');
      if (el.hasAttribute('data-tilt') && finePointer && !reduced) {
        el.style.setProperty('--ry', ((x / r.width - 0.5) * 10).toFixed(2) + 'deg');
        el.style.setProperty('--rx', ((0.5 - y / r.height) * 8).toFixed(2) + 'deg');
      }
    });
    el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
  });

  /* ── Counters ──────────────────────────────────────────────── */
  const fmt = new Intl.NumberFormat('en-US');
  const count = (el) => {
    const to = +el.dataset.count;
    if (reduced || to === 0) { el.textContent = fmt.format(to); return; }
    const t0 = performance.now(), dur = 1600;
    const step = (t) => {
      const p = clamp((t - t0) / dur, 0, 1), e = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt.format(Math.round(to * e));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  /* ── Reveal observers ──────────────────────────────────────── */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      if (e.target.dataset.count !== undefined) count(e.target);
      io.unobserve(e.target);
    });
  }, { threshold: 0.2 });
  $$('.reveal-words, [data-fade], [data-count], .tile').forEach((el) => io.observe(el));

  /* ── Manifesto: scroll-lit words ───────────────────────────── */
  const mWords = manifesto ? $$('.w', manifesto) : [];
  const litManifesto = () => {
    if (!mWords.length) return;
    const r = manifesto.getBoundingClientRect();
    const p = clamp((innerHeight * 0.8 - r.top) / (r.height + innerHeight * 0.3), 0, 1);
    const n = Math.round(p * mWords.length);
    mWords.forEach((w, i) => w.classList.toggle('on', reduced || i < n));
  };

  /* ── Works reel (pinned horizontal scroll) ─────────────────── */
  const works = $('#works'), track = $('#works-track'), idx = $('#works-idx');
  let reelOn = false;
  const sizeReel = () => {
    if (!works) return;
    reelOn = !reduced && innerWidth > 900;
    works.classList.toggle('is-native', !reelOn);
    if (reelOn) {
      const dist = track.scrollWidth - innerWidth;
      works.style.setProperty('--reel-h', `${dist + innerHeight}px`);
    } else { works.style.removeProperty('--reel-h'); track.style.transform = ''; }
  };
  const scrollReel = () => {
    if (!reelOn) return;
    const r = works.getBoundingClientRect();
    const dist = track.scrollWidth - innerWidth;
    const p = clamp(-r.top / (r.height - innerHeight), 0, 1);
    track.style.transform = `translate3d(${-p * dist}px,0,0)`;
    idx.textContent = String(Math.min(5, Math.floor(p * 4.999) + 1)).padStart(2, '0');
  };
  sizeReel();
  addEventListener('resize', () => { sizeReel(); scrollReel(); }, { passive: true });
  addEventListener('load', sizeReel);

  /* ── Nav: progress, hide-on-scroll, scroll-spy ─────────────── */
  const nav = $('#nav'), bar = $('#progress');
  const navLinks = $$('.nav__links a');
  const secs = navLinks.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  let lastY = scrollY, queued = false;
  const onScroll = () => {
    queued = false;
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    bar.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);
    nav.classList.toggle('is-hidden', y > lastY && y > 400 && !$('#palette:not([hidden])'));
    lastY = y;
    let cur = null;
    secs.forEach((s) => { if (s.getBoundingClientRect().top < innerHeight * 0.4) cur = s.id; });
    navLinks.forEach((a) => a.toggleAttribute('aria-current', a.getAttribute('href') === '#' + cur));
    scrollReel(); litManifesto();
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ── Clock ─────────────────────────────────────────────────── */
  const clock = $('#clock');
  const tickClock = () => {
    try { clock.textContent = 'IST ' + new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }); } catch (_) {}
  };
  tickClock(); setInterval(tickClock, 15000);
  const cookieCount = $('#cookie-count');
  if (cookieCount) cookieCount.textContent = document.cookie ? document.cookie.split(';').length : 0;

  /* ── Attention-matrix canvas (youAI-2B) ────────────────────── */
  const attn = $('#attn');
  if (attn) {
    const ctx = attn.getContext('2d');
    let w, h, cols, rows, cell = 18, vals;
    const size = () => {
      const r = attn.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
      w = r.width; h = r.height; attn.width = w * d; attn.height = h * d; ctx.setTransform(d, 0, 0, d, 0, 0);
      cols = Math.ceil(w / cell); rows = Math.ceil(h / cell);
      vals = Float32Array.from({ length: cols * rows }, () => Math.random());
    };
    size(); addEventListener('resize', size, { passive: true });
    let visible = false, hover = null;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(attn);
    const tile = attn.parentElement;
    tile.addEventListener('pointermove', (e) => { const r = attn.getBoundingClientRect(); hover = { x: e.clientX - r.left, y: e.clientY - r.top }; });
    tile.addEventListener('pointerleave', () => { hover = null; });
    const draw = (t) => {
      if (visible) {
        ctx.clearRect(0, 0, w, h);
        const [r, g, b] = accentRGB();
        for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
          if (i > j + Math.floor(cols - rows)) continue; // causal mask look
          const k = j * cols + i;
          let v = 0.5 + 0.5 * Math.sin(t * 0.0012 + vals[k] * 12 + i * 0.3 - j * 0.2);
          v = v ** 3;
          if (hover) { const d = Math.hypot(i * cell + cell / 2 - hover.x, j * cell + cell / 2 - hover.y); v = Math.max(v, 1 - d / 120); }
          ctx.fillStyle = `rgba(${r},${g},${b},${0.04 + v * 0.5})`;
          ctx.fillRect(i * cell + 2, j * cell + 2, cell - 4, cell - 4);
        }
      }
      if (!reduced) requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  }

  /* ── Accent themes ─────────────────────────────────────────── */
  const ACCENTS = { lunar: 'Lunar silver', solar: 'Solar flare', aurora: 'Aurora', eclipse: 'Blood-moon eclipse' };
  const setAccent = (a) => {
    root.dataset.accent = a;
    try { localStorage.setItem('aaj-accent', a); } catch (_) {}
    toast(`Theme → ${ACCENTS[a]}`);
  };

  /* ── Terminal ──────────────────────────────────────────────── */
  const out = $('#term-out'), form = $('#term-form'), input = $('#term-input');
  const LINKS = {
    esamz: 'https://esamz.info', reallearn: 'https://reallearn-info.vercel.app', pi: 'https://science-project-pi.vercel.app',
    gati: 'https://gati-rho.vercel.app', color: 'https://fit-the-color-info.vercel.app',
    github: 'https://github.com/alakmar344', linkedin: 'https://www.linkedin.com/in/alakmar-teenwala-054067393', instagram: 'https://instagram.com/its_alakmar7',
  };
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const a = (href, text) => `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  const print = (html, cls = '') => { const d = document.createElement('div'); if (cls) d.className = cls; d.innerHTML = html; out.appendChild(d); out.scrollTop = out.scrollHeight; };
  const history = []; let hi = 0;
  const CMDS = {
    help: () => `<span class="hi">available commands</span>
  whoami        who is behind the telescope
  projects      live products in orbit
  gems          open-source repositories
  books         volumes in print
  stack         tools of the trade
  moon          tonight's lunar phase
  privacy       what this site collects (spoiler: nothing)
  theme [name]  lunar · solar · aurora · eclipse
  open [name]   esamz · reallearn · pi · gati · color · github · linkedin
  contact       ways to reach me
  sudo hire-me  you know you want to
  clear         wipe the screen`,
    whoami: () => `<span class="hi">Al-Aqmar Tinwala</span> <span class="dim">(القمر — "the moon")</span>
AI Architect · Full-Stack Developer · Author ×2 · Rust enthusiast
Builds heart-first, privacy-first intelligence. 3,000+ daily users. 0 bytes retained.
<span class="dim">"I'm just getting started."</span>`,
    projects: () => [['eSAMz AI', 'esamz', '128k-ctx privacy-first assistant, Rust router'], ['RealLearn AI', 'reallearn', 'question → mastery, 63 languages, SM-2'], ['π — Pi', 'pi', 'atoms & molecules at 60fps'], ['गति — Gati', 'gati', 'hyperlocal Indian mobility, voice intent'], ['Fit The Color', 'color', 'OKLCH distance + WCAG AAA']]
      .map(([n, k, d], i) => `<span class="hi">0${i + 1}</span>  ${a(LINKS[k], n.padEnd(14))} <span class="dim">${d}</span>`).join('\n'),
    gems: () => `<span class="hi">◆ 90</span>  youAI-2B          2B-param transformer from raw tensor math
<span class="hi">◆ 87</span>  gati              14k lines TS, bilingual voice routing
<span class="hi">◆ 82</span>  vinecraft         infinite voxel world in the browser
<span class="hi">◆ 82</span>  science-project   60fps chemistry renderer
<span class="hi">◆ 81</span>  esamz.a           consent tiers + verifiable purge
<span class="dim">◇ --</span>  breeze-framework  uncut
${a(LINKS.github, '→ all 43 repos')}`,
    books: () => `📘 ${a('https://www.amazon.com/dp/B0GX2N6WTT', 'The AI Mastery Handbook')} <span class="dim">— bestseller</span>
📗 ${a('https://www.amazon.com/dp/B0GY1F3573', '30 Days Mastering Claude Code')} <span class="dim">— new release</span>`,
    stack: () => `<span class="hi">lang</span>   Rust · TypeScript · Vanilla JS · GLSL
<span class="hi">web</span>    Next.js · Three.js · WebGL · Canvas
<span class="hi">ai</span>     Sarvam 105b · Groq · Gemini · Whisper · on-device LLMs
<span class="hi">ml</span>     RoPE · GQA · SwiGLU · LoRA · DPO`,
    moon: () => { const p = moonApi.phase; return `🌙 ${phaseName(p)} — ${Math.round(illum(p) * 100)}% illuminated, day ${(p * SYNODIC).toFixed(1)} of ${SYNODIC.toFixed(2)}
<span class="dim">computed locally from a 2000-01-06 new-moon epoch. no API calls.</span>`; },
    privacy: () => `cookies set .......... <span class="ok">${document.cookie ? document.cookie.split(';').length : 0}</span>
trackers loaded ...... <span class="ok">0</span>
third-party requests . <span class="ok">0</span>
localStorage ......... <span class="ok">1 key</span> <span class="dim">(your theme choice)</span>
<span class="dim">fonts are self-hosted. the moon is rendered on your device.</span>`,
    contact: () => `github     ${a(LINKS.github, '@alakmar344')}
linkedin   ${a(LINKS.linkedin, 'Al-Aqmar Teenwala')}
instagram  ${a(LINKS.instagram, '@its_alakmar7')}`,
    'sudo hire-me': () => `<span class="dim">[sudo] password for guest: ********</span>
<span class="ok">✓ access granted.</span> opening a channel… ${a(LINKS.linkedin, 'LinkedIn →')}
<span class="dim">no password was stored. obviously.</span>`,
    sudo: () => 'guest is not in the sudoers file. try <span class="hi">sudo hire-me</span>.',
    ls: () => 'projects/  gems/  books/  manifesto.txt  <span class="dim">.secrets (empty — we keep nothing)</span>',
    'cat manifesto.txt': () => 'Software should grant dignity, not extract attention.',
    'rm -rf /': () => '<span class="ok">nothing to delete.</span> zero retention by design.',
    exit: () => 'you can check out any time you like… but there is no session to leave.',
  };
  const run = (raw) => {
    const cmd = raw.trim(); if (!cmd) return;
    print(esc(cmd), 'cmd');
    history.push(cmd); hi = history.length;
    const [head, ...rest] = cmd.toLowerCase().split(/\s+/);
    const arg = rest.join(' ');
    if (head === 'clear') { out.innerHTML = ''; return; }
    if (head === 'theme') {
      if (ACCENTS[arg]) { setAccent(arg); print(`<span class="ok">theme set →</span> ${ACCENTS[arg]}`); }
      else print('usage: theme lunar | solar | aurora | eclipse');
      return;
    }
    if (head === 'open') {
      if (LINKS[arg]) { window.open(LINKS[arg], '_blank', 'noopener,noreferrer'); print(`opening ${a(LINKS[arg], LINKS[arg])}`); }
      else print('usage: open ' + Object.keys(LINKS).join(' | '));
      return;
    }
    const f = CMDS[cmd.toLowerCase()] || CMDS[head];
    print(f ? f() : `command not found: ${esc(head)}. type <span class="hi">help</span>.`);
  };
  if (out) {
    print(`<span class="hi">lunar-os v2.6</span> <span class="dim">— observatory shell. nothing you type leaves this tab.</span>
type <span class="hi">help</span> to begin.`);
    form.addEventListener('submit', (e) => { e.preventDefault(); run(input.value); input.value = ''; });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp') { e.preventDefault(); hi = Math.max(0, hi - 1); input.value = history[hi] || ''; }
      else if (e.key === 'ArrowDown') { e.preventDefault(); hi = Math.min(history.length, hi + 1); input.value = history[hi] || ''; }
      else if (e.key === 'Tab') {
        e.preventDefault();
        const v = input.value.toLowerCase();
        const m = Object.keys(CMDS).concat('clear', 'theme', 'open').filter((k) => k.startsWith(v));
        if (m.length === 1) input.value = m[0]; else if (m.length) print(m.join('  '), 'dim');
      }
    });
    $('#term').addEventListener('click', (e) => { if (!e.target.closest('a')) input.focus({ preventScroll: true }); });
    $$('[data-cmd]').forEach((b) => b.addEventListener('click', () => run(b.dataset.cmd)));
  }

  /* ── Command palette ───────────────────────────────────────── */
  const pal = $('#palette'), pin = $('#palette-input'), plist = $('#palette-list');
  const jump = (id) => () => { const el = $(id); el && el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); };
  const ext = (url) => () => window.open(url, '_blank', 'noopener,noreferrer');
  const ITEMS = [
    ['Navigate', '↑', 'Top — the moon', jump('#top')],
    ['Navigate', '◎', 'Works — live products', jump('#works')],
    ['Navigate', '◆', 'Git gems', jump('#gems')],
    ['Navigate', '❏', 'Library — books', jump('#library')],
    ['Navigate', '❯', 'Terminal', () => { jump('#terminal')(); setTimeout(() => input && input.focus({ preventScroll: true }), 600); }],
    ['Navigate', '✉', 'Contact', jump('#contact')],
    ['Launch', '↗', 'eSAMz AI', ext(LINKS.esamz), 'esamz.info'],
    ['Launch', '↗', 'RealLearn AI', ext(LINKS.reallearn)],
    ['Launch', '↗', 'π — Pi', ext(LINKS.pi)],
    ['Launch', '↗', 'गति — Gati', ext(LINKS.gati)],
    ['Launch', '↗', 'Fit The Color', ext(LINKS.color)],
    ['Theme', '●', 'Lunar silver', () => setAccent('lunar')],
    ['Theme', '●', 'Solar flare', () => setAccent('solar')],
    ['Theme', '●', 'Aurora', () => setAccent('aurora')],
    ['Theme', '●', 'Blood-moon eclipse', () => setAccent('eclipse')],
    ['Moon', '◐', 'Show tonight\'s moon', () => { jump('#top')(); moonApi.set(tonight); }],
    ['Moon', '○', 'Jump to full moon', () => { jump('#top')(); moonApi.set(Math.floor(moonApi.phase) + 0.5); }],
    ['Moon', '●', 'Jump to new moon', () => { jump('#top')(); moonApi.set(Math.floor(moonApi.phase) + 1); }],
    ['Connect', '⌥', 'GitHub', ext(LINKS.github), '@alakmar344'],
    ['Connect', '⌥', 'LinkedIn', ext(LINKS.linkedin)],
    ['Connect', '⌥', 'Instagram', ext(LINKS.instagram)],
    ['Connect', '⧉', 'Copy GitHub URL', () => { navigator.clipboard && navigator.clipboard.writeText(LINKS.github).then(() => toast('Copied github.com/alakmar344')); }],
  ];
  let filtered = ITEMS, sel = 0, lastFocus = null;
  const renderPal = () => {
    const q = pin.value.trim().toLowerCase();
    filtered = ITEMS.filter(([g, , l, , h]) => (g + ' ' + l + ' ' + (h || '')).toLowerCase().includes(q));
    sel = clamp(sel, 0, Math.max(0, filtered.length - 1));
    plist.innerHTML = '';
    if (!filtered.length) { plist.innerHTML = '<li class="palette__empty">No results. The void stares back.</li>'; return; }
    let grp = '';
    filtered.forEach(([g, ico, label, , hint], i) => {
      if (g !== grp) { grp = g; const h = document.createElement('li'); h.className = 'palette__group'; h.setAttribute('role', 'presentation'); h.textContent = g; plist.appendChild(h); }
      const li = document.createElement('li');
      li.className = 'palette__item'; li.id = 'pi-' + i; li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(i === sel));
      li.innerHTML = `<span class="ico" aria-hidden="true">${ico}</span><span></span>${hint ? `<span class="hint"></span>` : ''}`;
      li.children[1].textContent = label; if (hint) li.children[2].textContent = hint;
      li.addEventListener('click', () => choose(i));
      li.addEventListener('pointermove', () => { if (sel !== i) { sel = i; mark(); } });
      plist.appendChild(li);
    });
    pin.setAttribute('aria-activedescendant', 'pi-' + sel);
  };
  const mark = () => {
    $$('.palette__item', plist).forEach((li) => li.setAttribute('aria-selected', String(li.id === 'pi-' + sel)));
    const cur = $('#pi-' + sel); cur && cur.scrollIntoView({ block: 'nearest' });
    pin.setAttribute('aria-activedescendant', 'pi-' + sel);
  };
  const openPal = () => { lastFocus = document.activeElement; pal.hidden = false; pin.value = ''; sel = 0; renderPal(); pin.focus(); };
  const closePal = () => { pal.hidden = true; lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true }); };
  const choose = (i) => { const it = filtered[i]; if (!it) return; closePal(); it[3](); };
  pin.addEventListener('input', () => { sel = 0; renderPal(); });
  pin.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % filtered.length; mark(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + filtered.length) % filtered.length; mark(); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(sel); }
    else if (e.key === 'Tab') e.preventDefault();
  });
  $$('[data-close]', pal).forEach((b) => b.addEventListener('click', closePal));
  $('#open-palette').addEventListener('click', openPal);
  $$('[data-open-palette]').forEach((b) => b.addEventListener('click', openPal));

  /* ── Global keys + easter egg ──────────────────────────────── */
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let kpos = 0;
  addEventListener('keydown', (e) => {
    const typing = /INPUT|TEXTAREA/.test(document.activeElement.tagName);
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); pal.hidden ? openPal() : closePal(); return; }
    if (e.key === 'Escape' && !pal.hidden) { closePal(); return; }
    if (typing) return;
    if (e.key === '/' && pal.hidden) { e.preventDefault(); openPal(); return; }
    kpos = e.key === KONAMI[kpos] ? kpos + 1 : (e.key === KONAMI[0] ? 1 : 0);
    if (kpos === KONAMI.length) { kpos = 0; setAccent('eclipse'); moonApi.set(Math.floor(moonApi.phase) + 0.5); toast('🌕 Blood moon unlocked'); }
  });
})();
