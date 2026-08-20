# Grumpy Bunny 🐰

A tiny offline web game that helps a kid bring a big angry feeling back down. Static HTML/CSS/JS —
no build step, no dependencies, no network calls, no accounts, no analytics. Drop it on GitHub Pages
and it works.

## The design, and why it isn't a rage room

"Let it out to get it out" is one of the most reliably disproven ideas in psychology. In Bushman's
well-known study, people who hit a punching bag while stewing about whoever angered them ended up
*angrier and more aggressive* than people who just sat quietly. Venting rehearses aggression, and it
feels good while doing it — which is the worst possible combination.

So the stomping in this app is bait, not treatment. Four rules keep it that way:

| Rule | Where it lives |
| --- | --- |
| No target ever resembles a person, a face, or a home — only abstract rocks | `ROCK_SVG` in `app.js` |
| **No score for smashing.** Only calm-downs completed are counted | `runDone()` / `localStorage 'gb.calm'` |
| Arousal curve is scripted downward — the meter drains on a timer, spawn rate decays, and it always hands off to breathing | `runStomp()` |
| Rampage can't loop on its own; "one more round" re-enters at the top | `#oneMore` → `s-size` |

The rest of the arc is the actual intervention, in the order clinicians usually teach it:

1. **Name the size** of the feeling, then optionally **name the cause** ("name it to tame it").
2. **Stomp** — short, timed, rhythmic, unscored.
3. **Paced breathing** — 4 s in / 1 s hold / 5 s out, ×4, with a visual pacer.
4. **Squeeze and release** — one round of progressive muscle relaxation, ×2.
5. **Pick one next move** — ask for help, take space, water, tell someone, try again, hug.
6. **Reward the regulation**, and hand the kid a concrete follow-through.

There's a **For grown-ups** screen explaining all of this, plus the point that matters most: kids
borrow a calm nervous system before they build one, so an adult breathing along beats the app alone.

Not a substitute for care. PCIT, parent management training, and child CBT have real evidence behind
them; a browser game does not.

## Run it locally

```bash
python3 -m http.server 8791
```

Then open <http://localhost:8791>.

## Deploy to GitHub Pages

```bash
git init && git add -A && git commit -m "Grumpy Bunny" && git branch -M main
```

Create an empty repo on GitHub, then:

```bash
git remote add origin git@github.com:USER/grumpy-bunny.git && git push -u origin main
```

Then in the repo: **Settings → Pages → Source: Deploy from a branch → `main` / `/ (root)`**. It lands
at `https://USER.github.io/grumpy-bunny/` in a minute or two. `.nojekyll` is already present so
GitHub serves the files as-is.

## Files

- `index.html` — all seven screens plus the bunny SVG
- `styles.css` — palette, animations, the hot→calm background tint that tracks the arc
- `app.js` — screen machine, stomp timer, breathing pacer, squeeze cycle
- `.nojekyll` — skip Jekyll processing on Pages

## Accessibility

Rocks are real `<button>`s, so the stomp phase is keyboard- and screen-reader-navigable. Touch targets
are ≥ 44 px, focus rings are visible, `prefers-reduced-motion` kills the shake and shards, and sound
is synthesized on demand and **off by default**.
