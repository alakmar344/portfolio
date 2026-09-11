/*!
 * ALAKMAR Museum — Structured Project Data (single source of truth)
 * Every exhibit, lab bench, archive row and library card renders from here.
 * No metadata is hardcoded in multiple UI locations.
 *
 * Fields per project:
 *   slug, title, tagline, description, why, category, wing, exhibit,
 *   technologies[], live, repo, featured, status, metrics{}, related[]
 */
(function (global) {
  'use strict';

  var PROJECTS = [
    {
      slug: 'esamz',
      title: 'eSAMz AI',
      tagline: 'Flagship privacy-first intelligence',
      description: 'Flagship conversational AI with live web search and a 128k context window, engineered for zero data retention. The moon this whole museum orbits.',
      why: 'Proves privacy and capability can coexist at real user scale.',
      category: 'Product',
      wing: 'gallery',
      exhibit: 'pedestal',
      technologies: ['Rust', 'Sarvam 105b', 'Privacy Engineering'],
      live: 'https://esamz.info',
      repo: 'https://github.com/alakmar344/esamz.a',
      featured: 'flagship',
      status: 'live',
      metrics: { users: '3,000+', context: '128k tokens', retention: 'Zero retention' },
      related: ['breeze', 'mindease', 'reallearn']
    },
    {
      slug: 'breeze',
      title: 'Breeze Framework',
      tagline: 'The museum flagship artifact',
      description: 'Ultra-lightweight declarative web framework. Indentation syntax, fine-grained reactivity and keyed DOM updates in about 8 KB with zero dependencies. This very museum is built with it.',
      why: 'The strongest technical artifact here, and the medium of the museum itself.',
      category: 'Framework',
      wing: 'gallery',
      exhibit: 'machine',
      technologies: ['Vanilla JS', 'Reactive Signals', 'Zero Dependencies'],
      live: 'https://breeze-framework.vercel.app',
      repo: 'https://github.com/alakmar344/breeze-framework',
      featured: 'centerpiece',
      status: 'live',
      metrics: { runtime: '~8 KB gzipped', deps: 'Zero dependencies', updates: '4.6x faster than React 18' },
      related: ['esamz', 'youai', 'vinecraft']
    },
    {
      slug: 'pi',
      title: 'Pi Science Playground',
      tagline: 'Atoms and molecules, alive',
      description: 'Playful visual science playground. Tap and swipe through covalent bonds, electron shells and molecular geometry at smooth 60fps, tuned for low-spec school laptops.',
      why: 'Makes abstract chemistry tangible for curious minds.',
      category: 'Product',
      wing: 'gallery',
      exhibit: 'portal',
      technologies: ['Interactive 3D', 'WebGL', 'EdTech'],
      live: 'https://science-project-pi.vercel.app',
      repo: 'https://github.com/alakmar344/science-project',
      featured: 'major',
      status: 'live',
      metrics: { fps: '60fps animations', audience: 'Students', data: 'Verified chemistry data' },
      related: ['gati', 'reallearn']
    },
    {
      slug: 'gati',
      title: 'Gati Mobility',
      tagline: 'Indian mobility, reimagined',
      description: 'Gati means motion. Autos, metros, buses and last-mile bikes fused into one hyperlocal journey planner with live ETAs and bilingual voice.',
      why: 'India-first transit UX with real-time soul.',
      category: 'Product',
      wing: 'gallery',
      exhibit: 'portal',
      technologies: ['TypeScript', 'Voice AI', 'Real-time ETA'],
      live: 'https://gati-rho.vercel.app',
      repo: 'https://github.com/alakmar344/gati',
      featured: 'major',
      status: 'live',
      metrics: { scale: '14.1k lines', history: '57 commits', voice: 'Bilingual EN and Hindi' },
      related: ['pi', 'hissab']
    },
    {
      slug: 'youai',
      title: 'youAI 2B',
      tagline: 'A transformer, built from raw math',
      description: 'Complete framework for training a 2B-parameter transformer from scratch, grown into a pip-installable toolkit with 15 model families, alignment, merging, eval and streaming inference.',
      why: 'The deepest engineering stone in the collection.',
      category: 'Open Source',
      wing: 'gallery',
      exhibit: 'machine',
      technologies: ['Python', 'PyTorch', 'DPO', 'LoRA'],
      live: null,
      repo: 'https://github.com/alakmar344/youAI-2B-From-Scratch-Transformer-Implementation',
      featured: 'major',
      status: 'open-source',
      metrics: { params: '2B parameters', modules: '20 modules', tests: '14 test files' },
      related: ['breeze', 'mycode']
    },
    {
      slug: 'reallearn',
      title: 'RealLearn',
      tagline: 'One question, a three-part journey',
      description: 'Adaptive learning engine that turns a single question into a structured three-part journey with real-world context.',
      why: 'EdTech that respects curiosity instead of quizzing it to death.',
      category: 'Product',
      wing: 'gallery',
      exhibit: 'frame',
      technologies: ['Sarvam 105b', 'EdTech'],
      live: 'https://reallearn-info.vercel.app',
      repo: null,
      featured: 'standard',
      status: 'live',
      metrics: { journey: '3-part structure', context: 'Real-world grounded' },
      related: ['pi', 'mindease']
    },
    {
      slug: 'mindease',
      title: 'MindEase',
      tagline: 'Gentle support, on-device only',
      description: 'Emotional-support chatbot in 20 languages with voice output. Fully on-device processing, zero storage, maximum gentleness.',
      why: 'Wellness AI that cannot spy by architecture, not by promise.',
      category: 'Product',
      wing: 'gallery',
      exhibit: 'frame',
      technologies: ['On-Device LLM', 'Voice AI', 'Wellness'],
      live: 'https://me.esamz.info',
      repo: null,
      featured: 'standard',
      status: 'live',
      metrics: { langs: '20 languages', storage: 'Zero storage', voice: 'Voice output' },
      related: ['esamz', 'reallearn']
    },
    {
      slug: 'vinecraft',
      title: 'Vinecraft',
      tagline: 'A voxel world in the browser',
      description: 'Browser voxel engine in vanilla JS and Three.js. Infinite procedural terrain, ambient occlusion, real-time shadows, weather, caves, crafting and mobile touch. Runs locally, offline forever.',
      why: 'A full game engine as a lab experiment.',
      category: 'Experiment',
      wing: 'lab',
      exhibit: 'bench',
      technologies: ['JavaScript', 'Three.js', 'WebGL'],
      live: null,
      repo: 'https://github.com/alakmar344/vinecraft',
      featured: false,
      status: 'open-source',
      metrics: { blocks: '46 blocks', biomes: '10 biomes', license: 'MIT' },
      related: ['pi', 'tictactoe']
    },
    {
      slug: 'analyticshub',
      title: 'Analytics Hub',
      tagline: 'Analytics that cannot spy',
      description: 'Self-hosted analytics where visitor IPs are HMAC-SHA256 hashed in tested middleware. The raw IP is never stored. Privacy proven in code, not copy.',
      why: 'Zero-surveillance measurement, literally implemented.',
      category: 'Open Source',
      wing: 'lab',
      exhibit: 'bench',
      technologies: ['JavaScript', 'Node.js', 'MongoDB'],
      live: null,
      repo: 'https://github.com/alakmar344/analytics-hub',
      featured: false,
      status: 'open-source',
      metrics: { privacy: 'HMAC-SHA256 IPs', storage: 'Raw IP never stored', tests: 'Tested middleware' },
      related: ['esamz', 'reviveme']
    },
    {
      slug: 'mycode',
      title: 'eSAMz Code',
      tagline: 'A browser agent that codes',
      description: 'Browser-first AI coding workspace with a plan, execute, observe and retry agent loop, virtual file system and sandboxed execution with resource caps.',
      why: 'Agentic workflows without leaving the tab.',
      category: 'Experiment',
      wing: 'lab',
      exhibit: 'bench',
      technologies: ['JavaScript', 'React', 'Docker', 'Agents'],
      live: null,
      repo: 'https://github.com/alakmar344/My-code',
      featured: false,
      status: 'open-source',
      metrics: { loop: 'Plan, execute, observe, retry', fs: 'Virtual FS', sandbox: 'Docker caps' },
      related: ['youai', 'breeze']
    },
    {
      slug: 'reviveme',
      title: 'revive-me',
      tagline: 'File revival, no cloud',
      description: 'Local-only bridge that revives old unsupported files into clean JSON and spreadsheets. Nothing leaves the machine. The only Rust in the vault besides the flagship.',
      why: 'Data rescue with absolute locality.',
      category: 'Tool',
      wing: 'lab',
      exhibit: 'bench',
      technologies: ['Rust', 'Local-first'],
      live: null,
      repo: 'https://github.com/alakmar344/revive-me',
      featured: false,
      status: 'open-source',
      metrics: { runtime: 'Rust core', cloud: 'No cloud', scope: 'Focused bridge' },
      related: ['analyticshub', 'launcher']
    },
    {
      slug: 'launcher',
      title: 'Not-a-Thing Launcher',
      tagline: 'An Android launcher, shipped',
      description: 'Nothing-style Android launcher in Kotlin with dot-matrix clock, gestures, widgets and boot persistence. Shipped as tagged releases with APKs from CI.',
      why: 'The only artifact here with real binary distribution.',
      category: 'Experiment',
      wing: 'lab',
      exhibit: 'bench',
      technologies: ['Kotlin', 'Android', 'CI Releases'],
      live: null,
      repo: 'https://github.com/alakmar344/Not-a-thing-launcher',
      featured: false,
      status: 'released',
      metrics: { releases: 'Tagged releases', dist: 'CI-built APKs', clock: 'Dot-matrix clock' },
      related: ['reviveme', 'vinecraft']
    },
    {
      slug: 'seemarket',
      title: 'SeeMarket',
      tagline: 'Market intelligence, on the bench',
      description: 'Two-service market-intelligence platform computing RSI, MACD and support-resistance server-side, with strict CORS and a written architecture. Actively being built.',
      why: 'Real indicators, computed honestly on the server.',
      category: 'Tool',
      wing: 'lab',
      exhibit: 'bench',
      technologies: ['TypeScript', 'FinTech', 'Real-time'],
      live: null,
      repo: 'https://github.com/alakmar344/See-market',
      featured: false,
      status: 'in-dev',
      metrics: { indicators: 'RSI and MACD', arch: 'Two services', cors: 'Strict CORS' },
      related: ['hissab', 'pivot']
    },
    {
      slug: 'pivot',
      title: 'PivotIQ',
      tagline: 'Kill bad ideas fast',
      description: 'Startup concept validator with investor-style prompts, risk checks and positioning analysis.',
      why: 'A sharp second opinion for founders.',
      category: 'Tool',
      wing: 'lab',
      exhibit: 'screen',
      technologies: ['Gemini AI', 'Strategy'],
      live: 'https://pivot-iq.vercel.app',
      repo: null,
      featured: false,
      status: 'live',
      metrics: { lens: 'Investor-style', checks: 'Risk analysis' },
      related: ['seemarket', 'hissab']
    },
    {
      slug: 'hissab',
      title: 'Hissab',
      tagline: 'Ledger for small business',
      description: 'Sales tracker for Indian small businesses. Mobile-first with 30-day analytics and profit-margin tracking.',
      why: 'Quiet fintech for the shops that run neighborhoods.',
      category: 'Tool',
      wing: 'lab',
      exhibit: 'screen',
      technologies: ['FinTech', 'Analytics', 'Mobile-first'],
      live: 'https://hisaab.esamz.info',
      repo: null,
      featured: false,
      status: 'live',
      metrics: { analytics: '30-day views', margin: 'Profit tracking' },
      related: ['seemarket', 'gati']
    },
    {
      slug: 'cibo',
      title: 'CiboCocinar',
      tagline: 'Hands-free kitchen guidance',
      description: 'Voice-first cooking assistant with sub-200ms latency for multi-tasking chefs.',
      why: 'Voice AI measured in milliseconds, not demos.',
      category: 'Tool',
      wing: 'lab',
      exhibit: 'screen',
      technologies: ['Voice AI', 'Cooking'],
      live: 'https://cibo.esamz.info',
      repo: null,
      featured: false,
      status: 'live',
      metrics: { latency: 'Under 200ms', mode: 'Hands-free' },
      related: ['mindease', 'gati']
    },
    {
      slug: 'fitcolor',
      title: 'Fit The Color',
      tagline: 'Color decisions, mathematically',
      description: 'Color-compatibility engine for strategic UI decisions with color-space analysis.',
      why: 'Design QA with numbers behind the taste.',
      category: 'Tool',
      wing: 'lab',
      exhibit: 'screen',
      technologies: ['Next.js 15', 'Design Math'],
      live: 'https://fit-the-color-info.vercel.app',
      repo: null,
      featured: false,
      status: 'live',
      metrics: { method: 'Color-space math', use: 'Design QA' },
      related: ['pivot', 'tictactoe']
    },
    {
      slug: 'tictactoe',
      title: 'Neon Tic-Tac-Toe',
      tagline: 'Small, sharp, fun',
      description: 'Minimal high-contrast game. Dark-mode first, ultra-responsive, zero dependencies.',
      why: 'Proof that tiny can be polished.',
      category: 'Game',
      wing: 'lab',
      exhibit: 'screen',
      technologies: ['Vanilla JS', 'HTML', 'CSS'],
      live: 'https://tic-info.vercel.app',
      repo: null,
      featured: false,
      status: 'live',
      metrics: { deps: 'Zero dependencies', mode: 'Dark-mode first' },
      related: ['vinecraft', 'fitcolor']
    }
  ];

  var BOOKS = [
    {
      slug: 'ai-handbook',
      title: 'The AI Mastery Handbook',
      tagline: 'Bestseller on Amazon KDP',
      description: 'Claude, Gemini, Llama and ChatGPT explained. AI history, LLM mechanics and practical prompt engineering from the workbench.',
      why: 'Written from shipping, not spectating.',
      category: 'Library',
      wing: 'library',
      exhibit: 'shelf',
      technologies: ['AI History', 'LLMs', 'Prompt Engineering'],
      live: 'https://www.amazon.com/dp/B0GX2N6WTT',
      repo: null,
      featured: 'major',
      status: 'published',
      metrics: { status: 'Bestseller', format: 'Amazon KDP' },
      related: ['claude-code', 'youai']
    },
    {
      slug: 'claude-code',
      title: '30 Days Mastering Claude Code',
      tagline: 'New release on Amazon KDP',
      description: 'A 30-day hands-on journey into agentic workflows and coding automation, written from direct builder experience.',
      why: 'Thirty days of hard-won agent workflows.',
      category: 'Library',
      wing: 'library',
      exhibit: 'shelf',
      technologies: ['Agentic Coding', 'Workflows'],
      live: 'https://www.amazon.com/dp/B0GY1F3573',
      repo: null,
      featured: 'standard',
      status: 'published',
      metrics: { status: 'New release', format: 'Amazon KDP' },
      related: ['ai-handbook', 'mycode']
    }
  ];

  /* Benchmarks below are the SOURCE OF TRUTH from benchmark.md.
   * Never invent performance numbers. These mirror the report exactly. */
  var BENCH_KRAUSEST = [
    { op: 'Create 1,000 rows', breeze: 539.0, vanilla: 893.9, preact: 794.3, vue: 573.2, react: 580.4, note: 'Fastest overall' },
    { op: 'Update every 10th row', breeze: 12.4, vanilla: 48.3, preact: 116.1, vue: 72.6, react: 56.7, note: '4.6x faster than React' },
    { op: 'Select active row', breeze: 12.7, vanilla: 25.5, preact: 53.4, vue: 32.8, react: 14.1, note: 'Fastest overall' },
    { op: 'Swap rows', breeze: 420.9, vanilla: 46.4, preact: 95.3, vue: 58.0, react: 452.5, note: 'Faster than React, slower than Vanilla' },
    { op: 'Delete single row', breeze: 1.1, vanilla: 117.4, preact: 97.1, vue: 81.1, react: 71.1, note: '64.6x faster than React' },
    { op: 'Append 1,000 rows', breeze: 688.6, vanilla: 483.8, preact: 590.1, vue: 479.2, react: 423.0, note: 'Comparable, not fastest' },
    { op: 'Clear rows', breeze: 54.6, vanilla: 55.1, preact: 75.2, vue: 64.3, react: 78.3, note: 'Fastest overall' },
    { op: 'Create 10,000 rows', breeze: 5482.5, vanilla: 6596.4, preact: 7271.3, vue: 5814.0, react: 6735.4, note: 'Fastest under stress' }
  ];

  var BENCH_DBMONSTER = { breezeFps: 58.3, breezeFrame: 17.15, vanillaFps: 20.8, preactFps: 20.0, reactFps: 20.0, vueFps: 18.3, note: '2.9x higher frame throughput' };
  var BENCH_MEMORY = { breezeKb: 2424.9, vanillaKb: 1813.1, preactKb: 15474.5, vueKb: 17240.3, reactKb: 19621.6, note: '8.1x leaner than React' };
  var BENCH_BUNDLE = { rawKb: 76.56, gzipKb: 16.30, brotliKb: 14.05, v8ms: 0.158, deps: 0 };

  var PROFILE = {
    name: 'Al-Aqmar Tinwala',
    moon: 'Al-Aqmar means The Moon',
    role: 'Heart-first AI architect',
    age: '13 and shipping',
    email: 'proman007power@gmail.com',
    github: 'https://github.com/alakmar344',
    linkedin: 'https://www.linkedin.com/in/alakmar-teenwala-054067393',
    instagram: 'https://instagram.com/its_alakmar7',
    stats: [
      { value: '3,000+', label: 'Active users' },
      { value: '18', label: 'Curated artifacts' },
      { value: '20+', label: 'Open-source repos' },
      { value: '2', label: 'Published books' }
    ],
    principles: [
      { title: 'Heart First', text: 'Technology for genuine impact, not attention extraction.' },
      { title: 'Privacy First', text: 'Zero retention by design. Data never leaves your hands.' },
      { title: 'Curiosity First', text: 'Build for wonder: atoms, molecules, motion.' }
    ],
    stack: ['Rust', 'Sarvam 105b', 'Next.js', 'Vanilla JS', 'WebGL', 'Voice AI', 'On-Device LLMs', 'Vercel', 'Privacy Engineering']
  };

  global.MUSEUM_PROJECTS = PROJECTS;
  global.MUSEUM_BOOKS = BOOKS;
  global.MUSEUM_BENCH_KRAUSEST = BENCH_KRAUSEST;
  global.MUSEUM_BENCH_DBMONSTER = BENCH_DBMONSTER;
  global.MUSEUM_BENCH_MEMORY = BENCH_MEMORY;
  global.MUSEUM_BENCH_BUNDLE = BENCH_BUNDLE;
  global.MUSEUM_PROFILE = PROFILE;
})(typeof window !== 'undefined' ? window : globalThis);
