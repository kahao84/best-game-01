// The game's rules and state, with no drawing and no browser in it: the little
// robot, the pool of falling things, spawning, catching, score, combo, lives and
// levels. step() advances one fixed step and returns what happened as bit flags,
// so the caller can react (sounds, particles, announcements) without the world
// knowing about screens or sound. Nothing here allocates after createWorld
// returns, apart from the one state object it already owns.
import {
  BUG,
  COMBO_BONUS_CAP,
  FIELD,
  GEAR,
  LEVEL_EVERY,
  LEVEL_SPAWN_PER,
  LEVEL_SPEED_PER,
  LIVES,
  MERCY_SECONDS,
  PLAYER,
  POOL_SIZE,
  SPAM,
  STAR,
  TASK,
} from './config.js';

export const KIND_TASK = 0;
export const KIND_GEAR = 1;
export const KIND_STAR = 2;
export const KIND_BUG = 3;
export const KIND_SPAM = 4;

export const EVENT_CATCH = 1;
export const EVENT_GOLD = 2;
export const EVENT_HIT = 4;
export const EVENT_MISS = 8;
export const EVENT_LEVEL = 16;
export const EVENT_OVER = 32;

function isGood(kind) {
  return kind === KIND_TASK || kind === KIND_GEAR || kind === KIND_STAR;
}

function basePoints(kind) {
  if (kind === KIND_TASK) return TASK.points;
  if (kind === KIND_GEAR) return GEAR.points;
  return STAR.points;
}

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function createWorld(random) {
  const player = {
    x: 0,
    y: FIELD.groundY - PLAYER.height,
    width: PLAYER.width,
    height: PLAYER.height,
    invulnerable: 0,
  };
  const items = [];
  for (let index = 0; index < POOL_SIZE; index += 1) {
    items.push({ active: false, kind: KIND_TASK, x: 0, y: 0, size: 0, speed: 0, phase: 0, caught: false });
  }
  const state = {
    player,
    items,
    score: 0,
    lives: LIVES,
    level: 1,
    catches: 0,
    combo: 0,
    bestCombo: 0,
    lastCatch: null,
    elapsed: 0,
    shake: 0,
    taskTimer: TASK.interval,
    gearTimer: GEAR.interval,
    starTimer: STAR.interval,
    bugTimer: BUG.interval,
    spamTimer: SPAM.interval,
  };

  function reset() {
    player.x = (FIELD.width - player.width) / 2;
    player.invulnerable = 0;
    for (const item of items) item.active = false;
    state.score = 0;
    state.lives = LIVES;
    state.level = 1;
    state.catches = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.lastCatch = null;
    state.elapsed = 0;
    state.shake = 0;
    state.taskTimer = TASK.interval;
    state.gearTimer = GEAR.interval;
    state.starTimer = STAR.interval;
    state.bugTimer = BUG.interval;
    state.spamTimer = SPAM.interval;
  }

  function freeItem() {
    for (let index = 0; index < items.length; index += 1) {
      if (!items[index].active) return items[index];
    }
    return null;
  }

  function spawn(kind, size, speed, jitter) {
    const item = freeItem();
    if (item === null) return;
    const levelSpeed = 1 + LEVEL_SPEED_PER * (state.level - 1);
    item.active = true;
    item.kind = kind;
    item.size = size;
    item.x = size / 2 + random() * (FIELD.width - size);
    item.y = -size;
    item.speed = speed * levelSpeed + random() * jitter;
    item.phase = random() * Math.PI * 2;
  }

  function levelSpawnFactor() {
    return Math.max(0.55, 1 - LEVEL_SPAWN_PER * (state.level - 1));
  }

  function step(dt, move) {
    let events = 0;
    state.elapsed += dt;
    if (player.invulnerable > 0) player.invulnerable = Math.max(0, player.invulnerable - dt);
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 3);

    player.x = Math.min(
      FIELD.width - player.width,
      Math.max(0, player.x + move * PLAYER.speed * dt),
    );

    // Spawn timers, each with a little jitter so the rain never falls in lockstep.
    state.taskTimer -= dt;
    if (state.taskTimer <= 0) {
      spawn(KIND_TASK, TASK.size, TASK.speed, TASK.jitter);
      state.taskTimer = TASK.interval * levelSpawnFactor() * (0.75 + random() * 0.5);
    }
    state.gearTimer -= dt;
    if (state.gearTimer <= 0) {
      spawn(KIND_GEAR, GEAR.size, GEAR.speed, GEAR.jitter);
      state.gearTimer = GEAR.interval * levelSpawnFactor() * (0.75 + random() * 0.5);
    }
    state.starTimer -= dt;
    if (state.starTimer <= 0) {
      spawn(KIND_STAR, STAR.size, STAR.speed, STAR.jitter);
      state.starTimer = STAR.interval * (0.8 + random() * 0.4);
    }
    state.bugTimer -= dt;
    if (state.bugTimer <= 0) {
      spawn(KIND_BUG, BUG.size, BUG.speed, BUG.jitter);
      state.bugTimer = BUG.interval * levelSpawnFactor() * (0.75 + random() * 0.5);
    }
    state.spamTimer -= dt;
    if (state.spamTimer <= 0) {
      spawn(KIND_SPAM, SPAM.size, SPAM.speed, SPAM.jitter);
      state.spamTimer = SPAM.interval * (0.8 + random() * 0.4);
    }

    // The catch zone is the robot plus the basket it holds overhead.
    const zone = {
      x: player.x - 4,
      y: player.y - PLAYER.basketHeight - 6,
      width: player.width + 8,
      height: player.height + PLAYER.basketHeight + 6,
    };

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item.active) continue;
      item.y += item.speed * dt;
      item.x += Math.sin(state.elapsed * 2 + item.phase) * 14 * dt;
      const box = { x: item.x - item.size / 2, y: item.y - item.size / 2, width: item.size, height: item.size };

      if (overlaps(box, zone)) {
        item.active = false;
        if (isGood(item.kind)) {
          state.combo += 1;
          if (state.combo > state.bestCombo) state.bestCombo = state.combo;
          const bonus = Math.min(state.combo - 1, COMBO_BONUS_CAP);
          const points = basePoints(item.kind) + bonus;
          state.score += points;
          state.lastCatch = { points, kind: item.kind };
          state.catches += 1;
          events |= EVENT_CATCH;
          if (item.kind === KIND_STAR) events |= EVENT_GOLD;
          if (state.catches % LEVEL_EVERY === 0) {
            state.level += 1;
            events |= EVENT_LEVEL;
          }
        } else if (player.invulnerable <= 0) {
          state.lives -= 1;
          state.combo = 0;
          state.shake = 1;
          player.invulnerable = MERCY_SECONDS;
          events |= EVENT_HIT;
          if (state.lives <= 0) events |= EVENT_OVER;
        }
        continue;
      }

      if (item.y - item.size / 2 > FIELD.height) {
        item.active = false;
        if (isGood(item.kind) && state.combo > 0) {
          state.combo = 0;
          events |= EVENT_MISS;
        }
      }
    }
    return events;
  }

  return { state, reset, step };
}
