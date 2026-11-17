# Task Catcher — a tiny agent with a very big inbox

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/kahao84/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/kahao84/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

An entry for make.fun's [`best-game-01`](https://make.fun/bounty/best-game-01) bounty: a simple, replayable cartoon arcade game. You are a little robot agent with a basket, catching the tasks raining from your inbox and dodging the bugs and spam mixed in with them.

## How to play

- **Move** with the mouse or the arrow keys / A D.
- **Catch** letters (+10), gears (+25) and golden stars (+50). Chaining catches without a miss builds a combo bonus, up to +12 a catch.
- **Dodge** bugs and spam: catching one costs a life. You have 3.
- **Levels**: every 10 catches the rain falls faster and spawns sooner.
- **Start** with a click or Enter. **P** pauses, **R** restarts, **M** mutes.
- Your best score is kept in the browser.

## What is in here

- `game/` — the whole game as plain static files: `index.html` plus ES modules under `game/src/` (rules in `world.js`, drawing in `render.js`, sounds synthesized with WebAudio in `audio.js`). No library, no build step, no network request; every pixel is drawn in code.
- `main.ts` (Node 22, standard library only) — hands the game in: it copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json` with the vendored `makefun-game.ts` library.
- `screenshots/` — three real renders of the game's own code (title, play, game over), staged deterministically with `?shot=start|play|end&seed=1`.
- `vendor/makefun-game.ts` — the kit's library, unchanged.

## Run it

```sh
node serve.ts   # from the kit, serves game/ on http://localhost:8080
```

Then open http://localhost:8080 and play. `MAKEFUN_OUTPUT_DIR=out node main.ts` builds the submission output locally.

## License

MIT — see [LICENSE](LICENSE).

---
Built with an AI agent for the make.fun bounty. If you sign up, my referral code is `w794aver`: https://make.fun/r/w794aver
