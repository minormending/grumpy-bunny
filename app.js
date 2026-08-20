/* Grumpy Bunny — a calm-down game.
   Design rule: the stomp phase is bait. It is timed, unscored, unrepeatable on its
   own, and it always hands off to arousal reduction. Never add a smash counter. */
(() => {
  'use strict';

  const $  = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const stage = $('#stage');
  const bunnyWrap = $('#bunnyWrap');
  const bunny = $('#bunny');
  const belly = $('#belly');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const STOMP_MS = { grumbly: 18000, steaming: 28000, volcano: 38000 };
  const BREATHS = 4, IN_MS = 4000, HOLD_MS = 1000, OUT_MS = 5000;
  const SQUEEZES = 2, TIGHT_MS = 5000, LOOSE_MS = 6000;

  const state = { size: 'steaming', why: null, plan: null };
  let token = 0;                 // invalidates any loop from a previous screen
  let timers = [];

  /* ---------------- screen plumbing ---------------- */
  const BUNNY_BY_SCREEN = {
    's-start':    { mood: 'grumpy', cls: '' },
    's-size':     { mood: 'grumpy', cls: 'small' },
    's-why':      { mood: 'grumpy', cls: 'small' },
    's-stomp':    { mood: 'grumpy', cls: 'stomping' },
    's-breathe':  { mood: 'tired',  cls: 'small pooped' },
    's-squeeze':  { mood: 'tired',  cls: 'small' },
    's-plan':     { mood: 'calm',   cls: 'small' },
    's-done':     { mood: 'calm',   cls: '' },
    's-grownups': { mood: 'calm',   cls: 'hide' },
  };

  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function later(fn, ms) { const t = setTimeout(fn, ms); timers.push(t); return t; }

  function show(id) {
    token++;
    clearTimers();
    $$('.screen').forEach((s) => s.classList.toggle('is-on', s.id === id));
    const b = BUNNY_BY_SCREEN[id] || { mood: 'grumpy', cls: '' };
    bunnyWrap.className = 'bunny-wrap ' + b.cls;
    bunny.dataset.mood = b.mood;
    belly.style.transform = '';
    document.body.dataset.tint =
      id === 's-stomp' ? 'hot' :
      (id === 's-breathe' || id === 's-squeeze' || id === 's-plan' || id === 's-done') ? 'calm' : '';
    if (id === 's-stomp') runStomp();
    if (id === 's-breathe') runBreathe();
    if (id === 's-squeeze') runSqueeze();
    if (id === 's-done') runDone();
  }

  /* ---------------- sound (off by default, no assets) ---------------- */
  let ac = null, soundOn = false;
  const toggle = $('#soundToggle');
  toggle.addEventListener('click', () => {
    soundOn = !soundOn;
    toggle.textContent = soundOn ? '🔊' : '🔇';
    toggle.setAttribute('aria-pressed', String(soundOn));
    if (soundOn && !ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    if (soundOn) beep(180, 0.08, 'sine', 0.12);
  });
  function beep(freq, dur, type, gain) {
    if (!soundOn || !ac) return;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(gain, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + dur);
  }
  const thump = () => { beep(70 + Math.random() * 40, 0.16, 'square', 0.16); };

  /* ---------------- 1. how big is it ---------------- */
  $$('[data-size]').forEach((el) => el.addEventListener('click', () => {
    state.size = el.dataset.size;
    show('s-why');
  }));

  /* ---------------- 2. name it ---------------- */
  $$('#whyChips .chip').forEach((el) => el.addEventListener('click', () => {
    state.why = el.dataset.why;
    el.classList.add('picked');
    later(() => { el.classList.remove('picked'); show('s-stomp'); }, 260);
  }));

  /* ---------------- 3. stomp (timed, unscored) ---------------- */
  const arena = $('#arena'), meterFill = $('#meterFill'), coach = $('#stompCoach');
  const ROCK_SVG =
    '<svg viewBox="0 0 60 60" aria-hidden="true"><path d="M8 34 L4 18 L18 6 L40 4 L56 16 L52 40 L36 56 L14 52 Z"' +
    ' fill="#8f7fb0" stroke="#5d4d80" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M20 20 L30 14 L38 24 L28 30 Z" fill="#a798c4"/></svg>';
  const COACH = [
    [1.00, 'STOMP THE ROCKS!'],
    [0.72, 'GET IT ALL OUT!'],
    [0.46, 'Bunny is slowing down…'],
    [0.22, 'Bunny is getting sleepy…'],
    [0.00, 'Bunny is all puffed out.'],
  ];

  function runStomp() {
    const mine = token;
    const total = STOMP_MS[state.size] || STOMP_MS.steaming;
    const start = performance.now();
    arena.innerHTML = '';

    (function spawn() {
      if (token !== mine) return;
      const frac = 1 - (performance.now() - start) / total;
      if (frac <= 0) return;
      addRock();
      later(spawn, 340 + (1 - frac) * 950);   // rate decays as bunny tires
    })();

    (function tick(now) {
      if (token !== mine) return;
      const frac = Math.max(0, 1 - (now - start) / total);
      meterFill.style.width = (frac * 100).toFixed(1) + '%';
      const line = COACH.find(([t]) => frac >= t);
      if (line && coach.textContent !== line[1]) coach.textContent = line[1];
      if (frac <= 0) { bunnyWrap.classList.replace('stomping', 'pooped'); later(() => show('s-breathe'), 1100); return; }
      requestAnimationFrame(tick);
    })(start);
  }

  function addRock() {
    const r = document.createElement('button');
    r.className = 'rock';
    r.type = 'button';
    r.setAttribute('aria-label', 'Stomp the rock');
    r.innerHTML = ROCK_SVG;
    const w = arena.clientWidth, h = arena.clientHeight;
    r.style.left = Math.random() * Math.max(0, w - 74) + 'px';
    r.style.top  = Math.random() * Math.max(0, h - 74) + 'px';
    r.style.rotate = (Math.random() * 60 - 30) + 'deg';
    r.addEventListener('click', () => smash(r), { once: true });
    arena.appendChild(r);
    later(() => r.isConnected && !r.classList.contains('gone') && r.remove(), 6000);
  }

  function smash(r) {
    r.classList.add('gone');
    thump();
    if (!reduced) {
      stage.classList.add('shake');
      later(() => stage.classList.remove('shake'), 180);
      const x = parseFloat(r.style.left) + 30, y = parseFloat(r.style.top) + 30;
      for (let i = 0; i < 7; i++) {
        const s = document.createElement('i');
        s.className = 'shard';
        s.style.left = x + 'px'; s.style.top = y + 'px';
        s.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px');
        s.style.setProperty('--dy', (Math.random() * -120 - 20) + 'px');
        s.style.setProperty('--r', (Math.random() * 540 - 270) + 'deg');
        arena.appendChild(s);
        later(() => s.remove(), 600);
      }
    }
    later(() => r.remove(), 320);
  }

  $('#skipStomp').addEventListener('click', () => show('s-breathe'));

  /* ---------------- 4. paced breathing ---------------- */
  const ring = $('#breathRing'), word = $('#breathWord'), rounds = $('#breathRounds');
  const ease = (t) => 0.5 - Math.cos(Math.PI * t) / 2;

  function runBreathe() {
    const mine = token;
    const cycle = IN_MS + HOLD_MS + OUT_MS;
    /* elapsed accumulates clamped frame deltas rather than wall-clock, so backgrounding
       the tab pauses the pacer instead of skipping the kid past several breaths. */
    let elapsed = -700, prev = performance.now();

    (function tick(now) {
      if (token !== mine) return;
      elapsed += Math.min(120, now - prev);
      prev = now;
      if (elapsed < 0) { requestAnimationFrame(tick); return; }
      const n = Math.floor(elapsed / cycle);
      if (n >= BREATHS) { show('s-squeeze'); return; }
      const t = elapsed % cycle;
      let scale, label;
      if (t < IN_MS)                { scale = 0.62 + 0.38 * ease(t / IN_MS);                 label = 'Breathe in…'; }
      else if (t < IN_MS + HOLD_MS) { scale = 1;                                             label = 'Hold'; }
      else                          { scale = 1 - 0.38 * ease((t - IN_MS - HOLD_MS) / OUT_MS); label = 'Breathe out…'; }
      ring.style.transform = 'scale(' + scale.toFixed(3) + ')';
      belly.style.transform = 'scale(' + (0.9 + (scale - 0.62) * 0.42).toFixed(3) + ')';
      if (word.textContent !== label) { word.textContent = label; beep(label === 'Breathe in…' ? 330 : 220, 0.5, 'sine', 0.05); }
      const r = 'Breath ' + (n + 1) + ' of ' + BREATHS;
      if (rounds.textContent !== r) rounds.textContent = r;
      requestAnimationFrame(tick);
    })(performance.now());
  }

  /* ---------------- 5. squeeze and release ---------------- */
  const orb = $('#squeezeOrb'), sqAsk = $('#squeezeAsk'), sqRounds = $('#squeezeRounds');

  function runSqueeze() {
    const mine = token;
    let n = 0;
    (function phase() {
      if (token !== mine) return;
      if (n >= SQUEEZES) { show('s-plan'); return; }
      sqRounds.textContent = 'Squeeze ' + (n + 1) + ' of ' + SQUEEZES;
      sqAsk.textContent = 'Squeeze everything tight!';
      orb.className = 'squeeze-orb tight';
      later(() => {
        if (token !== mine) return;
        sqAsk.textContent = 'Now let it all flop…';
        orb.className = 'squeeze-orb loose';
        later(() => { n++; phase(); }, LOOSE_MS);
      }, TIGHT_MS);
    })();
  }

  /* ---------------- 6. one next move ---------------- */
  const PLAN = {
    help:  'Go find a grown-up and say: "I need some help."',
    space: 'Find a comfy spot and just be quiet for a minute. That counts.',
    water: 'Go get a big drink of water. Slow sips.',
    tell:  'Tell someone the whole story. They want to hear it.',
    again: 'Try it one more time — slower this time.',
    hug:   'Go ask for a hug. Asking is the brave part.',
  };
  const WHY_NOTE = {
    unfair: 'Unfair things are worth telling someone about.',
    hard:   'Hard things get easier with a helper.',
    left:   'Being left out really hurts. That was a real thing.',
    tired:  'Tired and hungry make everything feel twice as big.',
  };

  $$('#planChips .chip').forEach((el) => el.addEventListener('click', () => {
    state.plan = el.dataset.plan;
    $$('#planChips .chip').forEach((c) => c.classList.remove('picked'));
    el.classList.add('picked');
    later(() => show('s-done'), 300);
  }));

  /* ---------------- 7. reward the calm, never the smashing ---------------- */
  const DONE_TITLE = {
    grumbly:  'Grumbly → calm. Nice.',
    steaming: 'Steaming → calm. Look at you.',
    volcano:  'VOLCANO → calm. That was big.',
  };

  function readCount() { return parseInt(localStorage.getItem('gb.calm') || '0', 10) || 0; }

  function runDone() {
    let n = readCount() + 1;
    try { localStorage.setItem('gb.calm', String(n)); } catch (e) { /* private mode */ }
    $('#doneTitle').textContent = DONE_TITLE[state.size] || 'You did it.';
    const note = WHY_NOTE[state.why];
    $('#donePlan').textContent = (PLAN[state.plan] || 'You brought it all the way down.') + (note ? ' ' + note : '');
    $('#badgeCount').textContent = n;
    beep(520, 0.18, 'sine', 0.1);
    later(() => beep(780, 0.3, 'sine', 0.09), 170);
  }

  /* one more round always re-enters at the top, never straight back to stomping */
  $('#oneMore').addEventListener('click', () => show('s-size'));
  $$('[data-go]').forEach((el) => el.addEventListener('click', () => show(el.dataset.go)));

  $('#badgeCount').textContent = readCount();
  show('s-start');
})();
