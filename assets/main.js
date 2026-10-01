/* Al-Aqmar — Lunar Observatory
   Vanilla JS, no dependencies, no network calls, no storage. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const mouse = { nx: 0, ny: 0 };
  let moonApi;

  addEventListener('pointermove', (e) => {
    mouse.nx = e.clientX / innerWidth - 0.5; mouse.ny = e.clientY / innerHeight - 0.5;
  }, { passive: true });

  /* ── Liquid glass: real refraction where the engine supports
     SVG filters in backdrop-filter (Chromium). Others keep frosted glass. */
  if (navigator.userAgentData && navigator.userAgentData.brands.some((b) => /Chrom/.test(b.brand))) root.classList.add('lg-refract');

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

  /* ── Arrival ─────────────────────────────────────────────── */
  const ready = () => {
    root.classList.add('is-ready');
    runScramble();
    setTimeout(() => moonApi && moonApi.intro && moonApi.intro(), 400);
  };
  requestAnimationFrame(() => requestAnimationFrame(ready));

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
    let W, H, stars = [], shooters = [];
    const TINTS = ['255,255,255', '232,238,255', '200,214,255'];
    const build = () => {
      const DPR = Math.min(devicePixelRatio || 1, 2);
      W = innerWidth; H = innerHeight;
      sky.width = W * DPR; sky.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const n = Math.round(clamp(W * H / 6000, 90, 280));
      stars = Array.from({ length: n }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        z: Math.random() ** 2 * 0.9 + 0.1,
        tw: Math.random() * Math.PI * 2, ts: 0.5 + Math.random() * 2,
        tint: TINTS[(Math.random() * TINTS.length) | 0],
      }));
    };
    build();
    addEventListener('resize', build, { passive: true });
    let px = 0, py = 0, lastScroll = scrollY, drift = 0;
    const frame = (t) => {
      ctx.clearRect(0, 0, W, H);
      px = lerp(px, mouse.nx, 0.05); py = lerp(py, mouse.ny, 0.05);
      drift = lerp(drift, scrollY - lastScroll, 0.15); lastScroll = scrollY;
      for (const s of stars) {
        s.y -= drift * s.z * 0.25;
        if (s.y < -5) s.y += H + 10; else if (s.y > H + 5) s.y -= H + 10;
        const x = s.x - px * 30 * s.z, y = s.y - py * 30 * s.z;
        const a = (0.3 + 0.6 * s.z) * (reduced ? 1 : 0.6 + 0.4 * Math.sin(s.tw + t * 0.001 * s.ts));
        const size = s.z * 1.5 + 0.2;
        ctx.fillStyle = `rgba(${s.tint},${a})`;
        if (s.z > 0.8) { ctx.beginPath(); ctx.arc(x, y, size * 0.7, 0, 6.283); ctx.fill(); }
        else ctx.fillRect(x - size / 2, y - size / 2, size, size);
      }
      if (!reduced && Math.random() < 0.002) shooters.push({ x: Math.random() * W, y: Math.random() * H * 0.4, vx: 6 + Math.random() * 6, vy: 2 + Math.random() * 2, life: 1 });
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
  moonApi = { phase: tonight, set: () => {}, intro: () => {} };
  if (moon) {
    const ctx = moon.getContext('2d');
    const S = innerWidth < 700 ? 400 : 520;
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
    const craters = Array.from({ length: 200 }, () => { const r = rnd() ** 4 * 0.17 + 0.008; return { x: rnd() * 2 - 1, y: rnd() * 2 - 1, r }; });
    const maria = [[-0.25, -0.3, 0.34], [0.18, -0.12, 0.28], [0.05, 0.28, 0.22], [-0.42, 0.12, 0.2], [0.38, 0.3, 0.16]];

    const N = S * S, nx = new Float32Array(N), ny = new Float32Array(N), nz = new Float32Array(N), alb = new Float32Array(N), inside = new Uint8Array(N);
    const R = S / 2 - 2;
    // surface is built in short slices so the intro never stutters
    let row = 0;
    const buildRows = (budget) => {
      const end = performance.now() + budget;
      for (; row < S && performance.now() < end; row++) { const j = row; for (let i = 0; i < S; i++) {
      const x = (i + 0.5 - S / 2) / R, y = (j + 0.5 - S / 2) / R, r2 = x * x + y * y, k = j * S + i;
      if (r2 > 1) continue;
      inside[k] = 1;
      const z = Math.sqrt(1 - r2);
      const sm = (e0, e1, v) => { const u = clamp((v - e0) / (e1 - e0), 0, 1); return u * u * (3 - 2 * u); };
      let a = 0.74 + 0.26 * fbm(x * 3 + 5, y * 3 + 5);
      const edge = (fbm(x * 5, y * 5) - 0.5) * 0.7;
      for (const [mx, my, mr] of maria) {
        const d = Math.hypot(x - mx, y - my) / mr + edge;
        a *= 1 - 0.26 * (1 - sm(0.6, 1.15, d));
      }
      let hx = 0, hy = 0;
      for (const c of craters) {
        const dx = x - c.x, dy = y - c.y, lim = c.r * 1.4;
        if (dx > lim || dx < -lim || dy > lim || dy < -lim) continue;
        const d = Math.hypot(dx, dy) / c.r;
        if (d < 1.4) {
          const bowl = 1 - sm(0.55, 1.0, d);          // soft floor
          const rim = Math.exp(-((d - 1.0) ** 2) / 0.02); // bright raised rim
          a *= 1 - 0.1 * bowl + 0.07 * rim;
          const g = (bowl * 0.6 - rim * 0.5) / c.r * 0.35;
          hx += dx * g; hy += dy * g;
        }
      }
      a *= 0.9 + 0.12 * vn(x * 40, y * 40) + 0.08 * vn(x * 130 + 3, y * 130 + 7);
      let Nx = x + hx * 0.12, Ny = y + hy * 0.12, Nz = z; const l = Math.hypot(Nx, Ny, Nz);
      nx[k] = Nx / l; ny[k] = Ny / l; nz[k] = Nz / l; alb[k] = a;
      } }
      return row >= S;
    };
    const rim = new Uint8ClampedArray(N);
    for (let k = 0; k < N; k++) { const i = k % S, j = (k / S) | 0; rim[k] = (R - Math.hypot(i + 0.5 - S / 2, j + 0.5 - S / 2) + 1) * 255; }
    // Instant base sphere for immediate paint
    for (let j = 0; j < S; j++) {
      for (let i = 0; i < S; i++) {
        const x = (i + 0.5 - S / 2) / R, y = (j + 0.5 - S / 2) / R, r2 = x * x + y * y, k = j * S + i;
        if (r2 <= 1) {
          inside[k] = 1;
          const z = Math.sqrt(1 - r2);
          nx[k] = x; ny[k] = y; nz[k] = z; alb[k] = 0.88;
        }
      }
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
        d8[o] = clamp(v * 244 * limb + 4, 0, 255);
        d8[o + 1] = clamp(v * 245 * limb + 4, 0, 255);
        d8[o + 2] = clamp(v * 250 * limb + 8, 0, 255);
        // antialiased rim
        d8[o + 3] = rim[k];
      }
      ctx.putImageData(img, 0, 0);
      const days = (p * SYNODIC).toFixed(1);
      const scrubbed = Math.abs(p - tonight) > 0.004;
      readout.textContent = `${scrubbed ? 'scrubbing' : 'tonight'} · ${phaseName(p)} · ${Math.round(illum(p) * 100)}% lit · day ${days}`;
    };
    render(tonight);

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
    let built = false;
    moonApi.intro = () => { if (built) go(tonight); };
    const buildStep = () => {
      if (!buildRows(25)) { setTimeout(buildStep, 0); return; }
      built = true;
      render(cur);
    };
    buildStep();

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
  }

  /* ── Liquid-glass specular: follows the pointer across any panel ── */
  /* ── Spotlight + tilt ──────────────────────────────────────── */
  document.addEventListener('pointermove', (e) => {
    const el = e.target.closest && e.target.closest('.glass');
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    el.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });

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
    const plateIndex = Math.min(4, Math.floor(p * 4.999));
    if (idx) idx.textContent = String(plateIndex + 1).padStart(2, '0');
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
    nav.classList.toggle('is-hidden', y > lastY && y > 400);
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

  /* ── Constellations for the star catalogue ─────────────────── */
  $$('.constellation').forEach((svg) => {
    let h = 0; for (const c of svg.dataset.seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const rnd = () => ((h = (Math.imul(h, 1103515245) + 12345) >>> 0) / 4294967296);
    const n = 5 + Math.floor(rnd() * 3), pts = [];
    for (let i = 0; i < n; i++) pts.push([10 + (i / (n - 1)) * 180 + (rnd() - 0.5) * 30, 15 + rnd() * 70]);
    svg.setAttribute('viewBox', '0 0 200 100');
    let out = '';
    for (let i = 1; i < n; i++) out += `<line x1="${pts[i - 1][0].toFixed(1)}" y1="${pts[i - 1][1].toFixed(1)}" x2="${pts[i][0].toFixed(1)}" y2="${pts[i][1].toFixed(1)}" style="transition-delay:${i * 0.15}s"/>`;
    if (n > 5) out += `<line x1="${pts[1][0].toFixed(1)}" y1="${pts[1][1].toFixed(1)}" x2="${pts[n - 2][0].toFixed(1)}" y2="${pts[n - 2][1].toFixed(1)}" style="transition-delay:${n * 0.15}s"/>`;
    pts.forEach(([x, y], i) => { out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(1.2 + rnd() * 1.8).toFixed(2)}" style="animation-delay:${i * 0.2}s"/>`; });
    svg.innerHTML = out;
  });

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
  observe       point the telescope at the moon
  privacy       what this site collects (spoiler: nothing)
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
localStorage ......... <span class="ok">0 keys</span>
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
    observe: () => { setTimeout(() => { $('#top').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); }, 400); const p = moonApi.phase; return `<span class="ok">slewing telescope → LUNA</span> <span class="dim">(${phaseName(p)}, ${Math.round(illum(p) * 100)}% lit)</span>`; },
    exit: () => 'you can check out any time you like… but there is no session to leave.',
  };
  const run = (raw) => {
    const cmd = raw.trim(); if (!cmd) return;
    print(esc(cmd), 'cmd');
    history.push(cmd); hi = history.length;
    const [head, ...rest] = cmd.toLowerCase().split(/\s+/);
    const arg = rest.join(' ');
    if (head === 'clear') { out.innerHTML = ''; return; }
    if (head === 'open') {
      if (LINKS[arg]) { window.open(LINKS[arg], '_blank', 'noopener,noreferrer'); print(`opening ${a(LINKS[arg], LINKS[arg])}`); }
      else print('usage: open ' + Object.keys(LINKS).join(' | '));
      return;
    }
    const f = CMDS[cmd.toLowerCase()] || CMDS[head];
    print(f ? f() : `command not found: ${esc(head)}. type <span class="hi">help</span>.`);
  };
  if (out) {
    print(`<span class="hi">lunar-os v2.6</span> <span class="dim">— dome open, telescope tracking LUNA. nothing you type leaves this tab.</span>
type <span class="hi">help</span> to begin.`);
    form.addEventListener('submit', (e) => { e.preventDefault(); run(input.value); input.value = ''; });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp') { e.preventDefault(); hi = Math.max(0, hi - 1); input.value = history[hi] || ''; }
      else if (e.key === 'ArrowDown') { e.preventDefault(); hi = Math.min(history.length, hi + 1); input.value = history[hi] || ''; }
      else if (e.key === 'Tab') {
        e.preventDefault();
        const v = input.value.toLowerCase();
        const m = Object.keys(CMDS).concat('clear', 'open').filter((k) => k.startsWith(v));
        if (m.length === 1) input.value = m[0]; else if (m.length) print(m.join('  '), 'dim');
      }
    });
    $('#term').addEventListener('click', (e) => { if (!e.target.closest('a')) input.focus({ preventScroll: true }); });
    $$('[data-cmd]').forEach((b) => b.addEventListener('click', () => run(b.dataset.cmd)));
  }

})();
