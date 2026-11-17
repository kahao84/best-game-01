// The screenshot scenes behind ?shot=start|play|end. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a
// simple autopilot (chase the lowest good thing, step aside from anything nasty
// about to land on the robot), so the frame is what a short game really looks
// like and the same seed always gives the same frame.
import { FIELD, PLAYER, STEP } from './config.js';
import { EVENT_OVER, KIND_BUG, KIND_SPAM } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const END_LIMIT_SECONDS = 600;
/**
 * How far ahead, in seconds, the autopilot checks each way it could move: the
 * play scene's pilot looks well ahead and keeps all its lives; the end scene's
 * looks only a moment ahead, so it is caught out once the rain speeds up, as a
 * hurried player is.
 */
const HORIZON_PLAY = 0.9;
const HORIZON_END = 0.25;
const SAMPLE = 1 / 30;
const DIRECTIONS = [0, -1, 1];
/** Extra room, each side, it keeps between the robot and a nasty thing. */
const MARGIN = 16;

/** Seconds until moving in `direction` (-1, 0, 1) runs the robot into something nasty; Infinity when it never does. */
function timeToHit(state, direction, horizon) {
  const player = state.player;
  const zoneTop = player.y - 32;
  const zoneBottom = player.y + player.height;
  for (let t = SAMPLE; t <= horizon; t += SAMPLE) {
    const x = Math.min(FIELD.width - player.width, Math.max(0, player.x + direction * PLAYER.speed * t));
    const centre = x + player.width / 2;
    for (let index = 0; index < state.items.length; index += 1) {
      const item = state.items[index];
      if (!item.active || (item.kind !== KIND_BUG && item.kind !== KIND_SPAM)) continue;
      const y = item.y + item.speed * t;
      if (
        y + item.size / 2 > zoneTop &&
        y - item.size / 2 < zoneBottom &&
        Math.abs(item.x - centre) < player.width / 2 + item.size / 2 + MARGIN
      ) {
        return t;
      }
    }
  }
  return Infinity;
}

/**
 * The careless pilot for the end scene: it only steps aside from a nasty thing
 * when it is almost on top of the robot, and the chase drags it straight back
 * under the next one, so it is caught out once the rain speeds up, as a hurried
 * player is.
 */
function carelessPilot(state, horizon) {
  const player = state.player;
  const centre = player.x + player.width / 2;
  const zoneTop = player.y - 32;
  let danger = null;
  let dangerTime = Infinity;
  for (let index = 0; index < state.items.length; index += 1) {
    const item = state.items[index];
    if (!item.active || (item.kind !== KIND_BUG && item.kind !== KIND_SPAM)) continue;
    const time = (zoneTop - item.y) / item.speed;
    if (time < 0 || time > horizon) continue;
    if (Math.abs(item.x - centre) < player.width * 0.75 && time < dangerTime) {
      danger = item.x;
      dangerTime = time;
    }
  }
  if (danger !== null) return danger > centre ? -1 : 1;
  let target = null;
  for (let index = 0; index < state.items.length; index += 1) {
    const item = state.items[index];
    if (!item.active || item.kind === KIND_BUG || item.kind === KIND_SPAM) continue;
    if (target === null || item.y > target.y) target = item;
  }
  const wanted = target === null ? FIELD.width / 2 : target.x;
  if (wanted > centre + 8) return 1;
  if (wanted < centre - 8) return -1;
  return 0;
}

/** Of the safe ways to move, the one toward the lowest good thing (or the centre); else the one that is hit last. */
function autopilot(state, horizon) {
  const player = state.player;
  let target = null;
  for (let index = 0; index < state.items.length; index += 1) {
    const item = state.items[index];
    if (!item.active || item.kind === KIND_BUG || item.kind === KIND_SPAM) continue;
    if (target === null || item.y > target.y) target = item;
  }
  const wantedX = target === null ? FIELD.width / 2 : target.x;
  const centre = player.x + player.width / 2;
  const wanted = wantedX > centre + 8 ? 1 : wantedX < centre - 8 ? -1 : 0;
  let best = wanted;
  let bestTime = timeToHit(state, wanted, horizon);
  for (let index = 0; index < DIRECTIONS.length && bestTime !== Infinity; index += 1) {
    const time = timeToHit(state, DIRECTIONS[index], horizon);
    if (time > bestTime) {
      bestTime = time;
      best = DIRECTIONS[index];
    }
  }
  return best;
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end') {
    // A lively title backdrop: the robot plays for a few seconds, then the
    // score and lives are set back to a fresh game for the picture.
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, autopilot(world.state, HORIZON_PLAY));
    }
    world.state.score = 0;
    world.state.lives = 3;
    world.state.combo = 0;
    world.state.bestCombo = 0;
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  const horizon = name === 'end' ? HORIZON_END : HORIZON_PLAY;
  const pilot = name === 'end' ? carelessPilot : autopilot;
  for (let index = 0; index < limit / STEP; index += 1) {
    if (world.step(STEP, pilot(world.state, horizon)) & EVENT_OVER) break;
  }
  const over = world.state.lives === 0;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
