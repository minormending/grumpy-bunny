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
| The read-aloud voice never speaks during the stomp phase | `SPOKEN` has no `s-stomp` key |
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

## Pre-reader mode and the voice

A 4–6 year old mid-meltdown can't read "Bunny is all puffed out," and that child is the core
audience — so the reading-dependent screens don't stay reading-dependent. Grown-up settings live
behind a **press-and-hold** on the gear (a quick poke does nothing, which is enough of a gate for
small fingers; keyboard users get it on plain activation).

**Pre-reader mode is visual first.** Every choice on every screen carries a pictogram, chips
restack with the icon large and the label shrunk to something the adult reads along, headings swap
to short labels via `data-short`, and the breathing pacer grows a big ⬆ / ⬇ arrow so it needs no
words at all. None of it depends on the voice being switched on.

**Read-aloud is a separate switch, and deliberately narrow.** Two things constrain it:

- **It is silent for the entire stomp phase.** Kids in meltdown are often already in sensory
  overload, and an unexpected voice at peak arousal can escalate rather than settle. `SPOKEN` has
  no `s-stomp` entry, and that absence is the feature.
- **Short phrases, slow rate (0.82), no narration.** High arousal means less language, not more.
  The breathing cues are two words. Nothing is spoken over the hold — a cue there is just noise.

It also stays quiet when the tab is hidden, and there is no intro utterance on the breathing screen
because the pacer's own "breathe in" would cancel it mid-sentence.

Turning on pre-reader mode switches the voice on with it, since a pre-reader is the case it exists
for — but the two remain independently toggleable, and both default to **off**. If a browser has no
speech voices, the row disables itself and says so. The grown-up copy is explicit that a voice the
child didn't expect can make a meltdown bigger, and that the adult's own voice regulates better
than any device.

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
- `app.js` — screen machine, stomp timer, breathing pacer, squeeze cycle, settings + speech
- `.nojekyll` — skip Jekyll processing on Pages

## Accessibility

Rocks are real `<button>`s, so the stomp phase is keyboard- and screen-reader-navigable. Touch targets
are ≥ 44 px, focus rings are visible, `prefers-reduced-motion` kills the shake and shards, and sound
is synthesized on demand and **off by default**. Pre-reader mode and read-aloud are both opt-in from
grown-up settings; see above for why the voice is scoped the way it is.
