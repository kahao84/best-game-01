// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between four screens: title, play,
// paused and game over.
//
// ?seed=N fixes the falling pattern. ?shot=start|play|end (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, FIELD, LIVES, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  EVENT_CATCH,
  EVENT_GOLD,
  EVENT_HIT,
  EVENT_LEVEL,
  EVENT_MISS,
  EVENT_OVER,
  KIND_BUG,
  KIND_SPAM,
  createWorld,
} from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  if (name === 'play' || name === 'end') renderer.stageDecor(world.state);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, 0);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let mouseTarget = null;
  const input = createInput(canvas, (fraction) => {
    mouseTarget = fraction * FIELD.width - world.state.player.width / 2;
  });
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    audio.click();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Playing. ${LIVES} lives. Catch the tasks, dodge the bugs and spam.`);
  }

  function endGame() {
    screen = SCREEN_OVER;
    audio.over();
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Game over. Score ${world.state.score}. Best ${best}.`);
  }

  function react(events) {
    const state = world.state;
    if (events & EVENT_CATCH) {
      audio.catch(state.combo);
      const points = state.lastCatch !== null ? state.lastCatch.points : 10;
      renderer.burst(state.player.x + state.player.width / 2, state.player.y - 30, '#ffd93d', 12);
      if (events & EVENT_GOLD) {
        audio.gold();
        renderer.float(state.player.x + state.player.width / 2, state.player.y - 60, 'GOLDEN +50!', '#f4a900', 24);
        renderer.burst(state.player.x + state.player.width / 2, state.player.y - 30, '#ffe66d', 16);
      } else {
        renderer.float(state.player.x + state.player.width / 2, state.player.y - 60, `+${points}`, '#2b2d42', 20);
      }
      if (state.combo >= 3) {
        renderer.float(state.player.x + state.player.width / 2, state.player.y - 92, `COMBO x${state.combo}`, '#ff6b6b', 18);
      }
    }
    if (events & EVENT_HIT) {
      audio.bad();
      renderer.burst(state.player.x + state.player.width / 2, state.player.y, '#e63946', 18);
      renderer.float(state.player.x + state.player.width / 2, state.player.y - 70, 'OUCH!', '#e63946', 24);
      announce(`Ouch! A bug got you. ${state.lives} lives left.`);
    }
    if (events & EVENT_MISS) {
      renderer.float(state.player.x + state.player.width / 2, state.player.y - 70, 'MISSED!', '#6c757d', 18);
    }
    if (events & EVENT_LEVEL) {
      audio.level();
      renderer.showBanner(`LEVEL ${state.level}!`, 'Faster rain — stay sharp');
      announce(`Level ${state.level}. The rain falls faster now.`);
    }
    if (events & EVENT_OVER) endGame();
  }

  function frame(now) {
    const delta = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (screen === SCREEN_TITLE) {
      if (actions & ACTION_CONFIRM) startGame();
    } else if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (actions & ACTION_RESTART) {
        startGame();
      } else {
        const keys = input.direction();
        let move = keys;
        if (keys === 0 && mouseTarget !== null) {
          const target = Math.min(FIELD.width - world.state.player.width, Math.max(0, mouseTarget));
          const diff = target - world.state.player.x;
          move = Math.max(-1, Math.min(1, diff / 90));
          if (Math.abs(diff) < 1) move = 0;
        }
        accumulator += delta;
        while (accumulator >= STEP) {
          accumulator -= STEP;
          react(world.step(STEP, move));
          if (screen !== SCREEN_PLAY) break;
        }
      }
    } else if (screen === SCREEN_PAUSED) {
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      } else if (actions & ACTION_RESTART) {
        startGame();
      }
    } else if (screen === SCREEN_OVER) {
      if (actions & ACTION_CONFIRM || actions & ACTION_RESTART) startGame();
    }
    renderer.draw(world.state, screen, best, delta);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

if (shot !== null) runShot(shot);
else runGame();
