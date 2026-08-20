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
    $$('.chip.picked').forEach((c) => c.classList.remove('picked'));  /* no stale selection next round */
    const b = BUNNY_BY_SCREEN[id] || { mood: 'grumpy', cls: '' };
    bunnyWrap.className = 'bunny-wrap ' + b.cls;
    bunny.dataset.mood = b.mood;
    belly.style.transform = '';
    document.body.dataset.tint =
      id === 's-stomp' ? 'hot' :
      (id === 's-breathe' || id === 's-squeeze' || id === 's-plan' || id === 's-done') ? 'calm' : '';
    shush();
    if (SPOKEN[id]) later(() => say(SPOKEN[id], $('#' + id + ' .ask')), 420);
    if (id === 's-stomp') runStomp();
    if (id === 's-breathe') runBreathe();
    if (id === 's-squeeze') runSqueeze();
    if (id === 's-done') runDone();
  }

  /* ---------------- grown-up settings ---------------- */
  const DEFAULTS = { prereader: false, voice: false, sfx: false };
  const S = Object.assign({}, DEFAULTS);
  try { Object.assign(S, JSON.parse(localStorage.getItem('gb.settings') || '{}')); } catch (e) { /* ignore */ }
  const saveSettings = () => { try { localStorage.setItem('gb.settings', JSON.stringify(S)); } catch (e) {} };

  const canSpeak = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance === 'function';

  function applySettings() {
    document.body.dataset.prereader = S.prereader ? '1' : '';
    /* swap the reading-heavy copy for short labels, keeping the original to restore */
    $$('[data-short]').forEach((el) => {
      if (el.dataset.long === undefined) el.dataset.long = el.textContent;
      el.textContent = S.prereader ? el.dataset.short : el.dataset.long;
    });
    $('#optPrereader').checked = S.prereader;
    $('#optVoice').checked = S.voice && canSpeak;
    $('#optSfx').checked = S.sfx;
    $('#optVoice').disabled = !canSpeak;
    $('#voiceRow').classList.toggle('off', !canSpeak);
    $('#testVoice').hidden = !canSpeak;
    if (!canSpeak) $('#voiceNote').textContent = 'This browser has no speech voices available, so the read-aloud option is off. The pictures carry the whole thing on their own.';
    if (!S.voice) shush();
  }

  /* ---------------- speech: short phrases, never during the rampage ----------------
     Kids mid-meltdown are often already in sensory overload, so this is opt-in,
     slowed down, and silent on the stomp screen by design. */
  let voice = null;
  function pickVoice() {
    if (!canSpeak) return null;
    const all = speechSynthesis.getVoices() || [];
    const en = all.filter((v) => /^en/i.test(v.lang));
    return en.find((v) => v.localService) || en[0] || all[0] || null;
  }
  if (canSpeak) {
    voice = pickVoice();
    speechSynthesis.addEventListener('voiceschanged', () => { voice = voice || pickVoice(); });
  }
  function shush() { if (canSpeak) { try { speechSynthesis.cancel(); } catch (e) {} } $$('.speaking').forEach((el) => el.classList.remove('speaking')); }

  function say(text, el) {
    if (!S.voice || !canSpeak || !text || document.hidden) return;
    shush();
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.rate = 0.82; u.pitch = 1.0; u.volume = 1;
    if (el) {
      el.classList.add('speaking');
      const off = () => el.classList.remove('speaking');
      u.onend = off; u.onerror = off;
    }
    try { speechSynthesis.speak(u); } catch (e) { /* ignore */ }
  }

  /* what gets read on arrival, per screen. s-stomp is absent on purpose. */
  const SPOKEN = {
    's-size':    'How big is the feeling?',
    's-why':     'What happened?',
    's-squeeze': 'Squeeze everything tight.',
    's-plan':    'What would help right now?',
  };

  /* ---------------- sound effects (off by default, no assets) ---------------- */
  let ac = null;
  function beep(freq, dur, type, gain) {
    if (!S.sfx) return;
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; } }
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(gain, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + dur);
  }
  const thump = () => { beep(70 + Math.random() * 40, 0.16, 'square', 0.16); };

  /* ---------------- settings sheet, behind a press-and-hold ---------------- */
  const gear = $('#gear'), sheet = $('#sheet');
  let holdTimer = null;

  function openSheet() {
    shush();
    sheet.hidden = false;
    $('#optPrereader').focus();
  }
  function closeSheet() { sheet.hidden = true; gear.focus(); }

  function startHold() {
    gear.classList.add('holding');
    holdTimer = setTimeout(() => { gear.classList.remove('holding'); openSheet(); }, 1200);
  }
  function cancelHold() {
    gear.classList.remove('holding');
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
  }
  gear.addEventListener('pointerdown', startHold);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => gear.addEventListener(ev, cancelHold));
  /* keyboard users get it on plain activation — the hold only exists to stop small fingers */
  gear.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSheet(); } });

  $('#openSettings').addEventListener('click', openSheet);
  $('#sheetClose').addEventListener('click', closeSheet);
  sheet.addEventListener('click', (e) => { if (e.target === sheet) closeSheet(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheet.hidden) closeSheet(); });

  $('#optPrereader').addEventListener('change', (e) => {
    S.prereader = e.target.checked;
    /* a pre-reader is the case the voice is for, so turn it on with them — still separable */
    if (S.prereader && canSpeak && !S.voice) S.voice = true;
    saveSettings(); applySettings();
  });
  $('#optVoice').addEventListener('change', (e) => {
    S.voice = e.target.checked; saveSettings(); applySettings();
    if (S.voice) say('Hello. I will read things out loud.');   // primes the voice on a real gesture
  });
  $('#optSfx').addEventListener('change', (e) => { S.sfx = e.target.checked; saveSettings(); thump(); });
  $('#testVoice').addEventListener('click', () => {
    if (!S.voice) { S.voice = true; saveSettings(); applySettings(); }
    say('Breathe in. And breathe out. Nice and slow.');
  });

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
  const arrow = $('#breathArrow');
  const ease = (t) => 0.5 - Math.cos(Math.PI * t) / 2;
  /* one row per phase: the long label, the pre-reader label, a wordless arrow, and
     what the voice says (silence on the hold — a cue there just adds noise) */
  const BREATH = {
    in:   { long: 'Breathe in…',  short: 'IN',   arrow: '⬆', say: 'Breathe in' },
    hold: { long: 'Hold',         short: 'HOLD', arrow: '✋', say: '' },
    out:  { long: 'Breathe out…', short: 'OUT',  arrow: '⬇', say: 'Breathe out' },
  };

  function runBreathe() {
    const mine = token;
    const cycle = IN_MS + HOLD_MS + OUT_MS;
    /* elapsed accumulates clamped frame deltas rather than wall-clock, so backgrounding
       the tab pauses the pacer instead of skipping the kid past several breaths. */
    let elapsed = -1200, prev = performance.now(), phase = null;
    /* show the first cue straight away rather than an unreadable "Ready…" -- phase
       stays null, so the real transition still speaks when the timeline starts */
    word.textContent = S.prereader ? BREATH.in.short : BREATH.in.long;
    arrow.textContent = BREATH.in.arrow;
    ring.style.transform = 'scale(0.62)';

    (function tick(now) {
      if (token !== mine) return;
      elapsed += Math.min(120, now - prev);
      prev = now;
      if (elapsed < 0) { requestAnimationFrame(tick); return; }   /* 1.2s settle before breath 1 */
      const n = Math.floor(elapsed / cycle);
      if (n >= BREATHS) { show('s-squeeze'); return; }
      const t = elapsed % cycle;
      let scale, key;
      if (t < IN_MS)                { scale = 0.62 + 0.38 * ease(t / IN_MS);                  key = 'in'; }
      else if (t < IN_MS + HOLD_MS) { scale = 1;                                              key = 'hold'; }
      else                          { scale = 1 - 0.38 * ease((t - IN_MS - HOLD_MS) / OUT_MS); key = 'out'; }
      ring.style.transform = 'scale(' + scale.toFixed(3) + ')';
      belly.style.transform = 'scale(' + (0.9 + (scale - 0.62) * 0.42).toFixed(3) + ')';
      if (phase !== key) {
        phase = key;
        const b = BREATH[key];
        word.textContent = S.prereader ? b.short : b.long;
        arrow.textContent = b.arrow;
        beep(key === 'in' ? 330 : 220, 0.5, 'sine', 0.05);
        say(b.say);
      }
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
      sqAsk.textContent = S.prereader ? 'Squeeze!' : 'Squeeze everything tight!';
      orb.className = 'squeeze-orb tight';
      if (n > 0) say('Squeeze tight');
      later(() => {
        if (token !== mine) return;
        sqAsk.textContent = S.prereader ? 'Flop!' : 'Now let it all flop…';
        orb.className = 'squeeze-orb loose';
        say('And let it flop');
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
    later(() => say($('#donePlan').textContent, $('#donePlan')), 500);
    beep(520, 0.18, 'sine', 0.1);
    later(() => beep(780, 0.3, 'sine', 0.09), 170);
  }

  /* one more round always re-enters at the top, never straight back to stomping */
  $('#oneMore').addEventListener('click', () => show('s-size'));
  $$('[data-go]').forEach((el) => el.addEventListener('click', () => show(el.dataset.go)));

  applySettings();
  $('#badgeCount').textContent = readCount();
  show('s-start');
})();
