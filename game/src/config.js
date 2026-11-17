// Task Catcher: tuning numbers for one file, so the feel can be tweaked without
// touching the rules. All sizes are in the game's own logical field, 960 by 600;
// the renderer scales that field to whatever window the browser gives it.
export const STEP = 1 / 60;
export const BEST_KEY = 'task-catcher-best';
export const LIVES = 3;

export const FIELD = { width: 960, height: 600, groundY: 528 };

export const PLAYER = {
  width: 104,
  height: 66,
  speed: 560,
  basketWidth: 92,
  basketHeight: 26,
};

export const POOL_SIZE = 48;

// A good catch is worth its base plus a combo bonus (the current combo streak,
// capped), so chaining catches without a miss pays more and more.
export const COMBO_BONUS_CAP = 12;

// Level up every N good catches: everything falls faster and spawns sooner.
export const LEVEL_EVERY = 10;
export const LEVEL_SPEED_PER = 0.09;
export const LEVEL_SPAWN_PER = 0.055;

// Falling items. interval is the mean seconds between spawns at level 1;
// speed is px/s at level 1, plus a random jitter on every spawn.
export const TASK = { size: 46, interval: 0.85, speed: 150, jitter: 40, points: 10 };
export const GEAR = { size: 48, interval: 4.2, speed: 165, jitter: 40, points: 25 };
export const STAR = { size: 44, interval: 9.0, speed: 175, jitter: 30, points: 50 };
export const BUG = { size: 46, interval: 2.4, speed: 170, jitter: 50 };
export const SPAM = { size: 46, interval: 5.5, speed: 160, jitter: 40 };

// Seconds the robot flashes invulnerable after catching something nasty.
export const MERCY_SECONDS = 1.4;

// Cartoon palette: flat, bright, high contrast so the game reads in a screenshot.
export const COLORS = {
  skyTop: '#7ec8f7',
  skyBottom: '#dff3ff',
  sun: '#ffd93d',
  cloud: '#ffffff',
  hillFar: '#a8dba8',
  hillNear: '#7ec850',
  belt: '#5b4a8a',
  beltEdge: '#4a3a72',
  beltStripe: '#ffd93d',
  robotBody: '#ff6b6b',
  robotBelly: '#ffe66d',
  robotDark: '#d94f4f',
  basket: '#8d6bff',
  basketRim: '#6c4fe0',
  task: '#ffffff',
  taskEdge: '#3d8bfd',
  gear: '#ffb703',
  star: '#ffd93d',
  bug: '#e63946',
  spam: '#8d99ae',
  heart: '#ff4d6d',
  ink: '#2b2d42',
  panel: '#ffffff',
};
