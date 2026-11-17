// Keyboard and mouse, nothing else: the robot follows the mouse or the arrow
// keys, Enter / Space / click starts, P pauses, R restarts, M mutes. The game
// reads the held direction every frame; the edge-triggered actions (confirm,
// pause, restart, mute) are queued and read once.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 3;
export const ACTION_MUTE = 4;

export function createInput(canvas, onMouseX) {
  let left = false;
  let right = false;
  let queued = 0;
  let mouseX = null;

  function queue(action) {
    queued |= action;
  }

  function onKeyDown(event) {
    if (event.repeat) return;
    if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') left = true;
    else if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') right = true;
    else if (event.key === 'Enter' || event.key === ' ') { queue(ACTION_CONFIRM); event.preventDefault(); }
    else if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') queue(ACTION_PAUSE);
    else if (event.key === 'r' || event.key === 'R') queue(ACTION_RESTART);
    else if (event.key === 'm' || event.key === 'M') queue(ACTION_MUTE);
  }

  function onKeyUp(event) {
    if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') left = false;
    else if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') right = false;
  }

  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouseX = (event.clientX - rect.left) / rect.width;
    onMouseX(mouseX);
  }

  function onMouseDown() {
    queue(ACTION_CONFIRM);
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);

  return {
    // -1, 0 or 1: keys win over the mouse when both are held, so a keyboard
    // player is never fought by a parked cursor.
    direction() {
      if (left && !right) return -1;
      if (right && !left) return 1;
      return 0;
    },
    mouseX() {
      return mouseX;
    },
    takeActions() {
      const taken = queued;
      queued = 0;
      return taken;
    },
  };
}
