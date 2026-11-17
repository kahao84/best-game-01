// All drawing: a bright cartoon world, flat colours, round shapes and a face on
// almost everything. The game lives in a logical 960 by 600 field that is scaled
// to fit the window; the renderer also owns the particles, floating score texts
// and banners, fed by the events the world reports each step.
import { COLORS, FIELD, PLAYER } from './config.js';
import { KIND_BUG, KIND_GEAR, KIND_SPAM, KIND_STAR, KIND_TASK } from './world.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_OVER = 3;

const FONT = "'Trebuchet MS', Verdana, sans-serif";

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function circle(ctx, x, y, radius) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
}

function starPath(ctx, x, y, radius, points) {
  ctx.beginPath();
  for (let index = 0; index < points * 2; index += 1) {
    const r = index % 2 === 0 ? radius : radius * 0.45;
    const angle = (index * Math.PI) / points - Math.PI / 2;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (index === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function face(ctx, x, y, size, mood) {
  // Two eyes and a mouth, sized to the item; mood is 'happy', 'angry' or 'grumpy'.
  const eyeY = y - size * 0.08;
  const eyeDX = size * 0.18;
  const eyeR = size * 0.09;
  ctx.fillStyle = '#2b2d42';
  if (mood === 'happy') {
    // Closed happy eyes: two little arcs.
    ctx.lineWidth = Math.max(2, size * 0.05);
    ctx.strokeStyle = '#2b2d42';
    ctx.beginPath();
    ctx.arc(x - eyeDX, eyeY, eyeR, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + eyeDX, eyeY, eyeR, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else {
    circle(ctx, x - eyeDX, eyeY, eyeR);
    ctx.fill();
    circle(ctx, x + eyeDX, eyeY, eyeR);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    circle(ctx, x - eyeDX + eyeR * 0.35, eyeY - eyeR * 0.35, eyeR * 0.35);
    ctx.fill();
    circle(ctx, x + eyeDX + eyeR * 0.35, eyeY - eyeR * 0.35, eyeR * 0.35);
    ctx.fill();
  }
  ctx.strokeStyle = '#2b2d42';
  ctx.lineWidth = Math.max(2, size * 0.05);
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (mood === 'happy') {
    ctx.arc(x, y + size * 0.08, size * 0.2, Math.PI * 0.15, Math.PI * 0.85);
  } else if (mood === 'angry') {
    ctx.moveTo(x - size * 0.16, y + size * 0.28);
    ctx.lineTo(x, y + size * 0.14);
    ctx.lineTo(x + size * 0.16, y + size * 0.28);
    // Angry brows.
    ctx.moveTo(x - eyeDX - eyeR, eyeY - eyeR * 1.6);
    ctx.lineTo(x - eyeDX + eyeR, eyeY - eyeR * 0.7);
    ctx.moveTo(x + eyeDX + eyeR, eyeY - eyeR * 1.6);
    ctx.lineTo(x + eyeDX - eyeR, eyeY - eyeR * 0.7);
  } else {
    ctx.moveTo(x - size * 0.14, y + size * 0.22);
    ctx.lineTo(x + size * 0.14, y + size * 0.22);
  }
  ctx.stroke();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const particles = [];
  const floats = [];
  let banner = null;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  function frame() {
    const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
    const offsetX = (window.innerWidth - FIELD.width * scale) / 2;
    const offsetY = (window.innerHeight - FIELD.height * scale) / 2;
    return { scale, offsetX, offsetY };
  }

  function drawBackground(state) {
    const sky = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    sky.addColorStop(0, COLORS.skyTop);
    sky.addColorStop(1, COLORS.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);

    // Sun with slow rays.
    const sunX = 830;
    const sunY = 84;
    ctx.save();
    ctx.translate(sunX, sunY);
    ctx.rotate(state.elapsed * 0.05);
    ctx.fillStyle = 'rgba(255, 217, 61, 0.35)';
    for (let index = 0; index < 8; index += 1) {
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-4, -58, 8, 22);
    }
    ctx.restore();
    ctx.fillStyle = COLORS.sun;
    circle(ctx, sunX, sunY, 34);
    ctx.fill();
    ctx.fillStyle = '#fff3b0';
    circle(ctx, sunX, sunY, 24);
    ctx.fill();

    // Drifting clouds.
    ctx.fillStyle = COLORS.cloud;
    for (let index = 0; index < 4; index += 1) {
      const cx = ((index * 260 + state.elapsed * (8 + index * 3)) % (FIELD.width + 220)) - 110;
      const cy = 52 + index * 42;
      circle(ctx, cx, cy, 26);
      ctx.fill();
      circle(ctx, cx + 26, cy + 6, 20);
      ctx.fill();
      circle(ctx, cx + 52, cy, 24);
      ctx.fill();
    }

    // Rolling hills and a sleepy skyline.
    ctx.fillStyle = COLORS.hillFar;
    ctx.beginPath();
    ctx.moveTo(0, 470);
    ctx.quadraticCurveTo(240, 400, 480, 462);
    ctx.quadraticCurveTo(720, 520, 960, 448);
    ctx.lineTo(960, FIELD.height);
    ctx.lineTo(0, FIELD.height);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = COLORS.hillNear;
    ctx.beginPath();
    ctx.moveTo(0, 500);
    ctx.quadraticCurveTo(300, 448, 620, 496);
    ctx.quadraticCurveTo(820, 528, 960, 492);
    ctx.lineTo(960, FIELD.height);
    ctx.lineTo(0, FIELD.height);
    ctx.closePath();
    ctx.fill();

    // The conveyor belt the robot rides.
    ctx.fillStyle = COLORS.belt;
    ctx.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
    ctx.fillStyle = COLORS.beltEdge;
    ctx.fillRect(0, FIELD.groundY, FIELD.width, 6);
    ctx.fillStyle = COLORS.beltStripe;
    const stripeOffset = (state.elapsed * 60) % 64;
    for (let x = -64 + stripeOffset; x < FIELD.width; x += 64) {
      ctx.save();
      ctx.translate(x, FIELD.groundY + 30);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-6, -26, 12, 52);
      ctx.restore();
    }
  }

  function drawRobot(state) {
    const player = state.player;
    if (player.invulnerable > 0 && Math.floor(state.elapsed * 12) % 2 === 0) return; // Mercy blink.
    const bounce = Math.sin(state.elapsed * 6) * 2;
    const x = player.x;
    const y = player.y + bounce;
    const w = player.width;
    const h = player.height;

    // Basket overhead.
    ctx.fillStyle = COLORS.basket;
    ctx.beginPath();
    ctx.moveTo(x + 8, y - PLAYER.basketHeight);
    ctx.lineTo(x + w - 8, y - PLAYER.basketHeight);
    ctx.lineTo(x + w - 16, y - 2);
    ctx.lineTo(x + 16, y - 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = COLORS.basketRim;
    roundRect(ctx, x + 2, y - PLAYER.basketHeight - 4, w - 4, 10, 5);
    ctx.fill();

    // Arms reaching up to the basket.
    ctx.strokeStyle = COLORS.robotDark;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + 12, y + 18);
    ctx.lineTo(x + 6, y - PLAYER.basketHeight + 8);
    ctx.moveTo(x + w - 12, y + 18);
    ctx.lineTo(x + w - 6, y - PLAYER.basketHeight + 8);
    ctx.stroke();

    // Body.
    ctx.fillStyle = COLORS.robotBody;
    roundRect(ctx, x, y, w, h, 18);
    ctx.fill();
    ctx.fillStyle = COLORS.robotBelly;
    roundRect(ctx, x + 18, y + 30, w - 36, h - 38, 12);
    ctx.fill();

    // Antenna with a blinking light.
    ctx.strokeStyle = COLORS.robotDark;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w / 2, y - 16);
    ctx.stroke();
    ctx.fillStyle = Math.floor(state.elapsed * 2) % 2 === 0 ? '#ff5964' : '#ffd93d';
    circle(ctx, x + w / 2, y - 20, 6);
    ctx.fill();

    // Eyes that look where the robot is heading, and a smile.
    const look = Math.sin(state.elapsed * 1.5) * 2;
    ctx.fillStyle = '#ffffff';
    circle(ctx, x + w / 2 - 20, y + 20, 11);
    ctx.fill();
    circle(ctx, x + w / 2 + 20, y + 20, 11);
    ctx.fill();
    ctx.fillStyle = '#2b2d42';
    circle(ctx, x + w / 2 - 20 + look, y + 21, 5.5);
    ctx.fill();
    circle(ctx, x + w / 2 + 20 + look, y + 21, 5.5);
    ctx.fill();
    ctx.strokeStyle = '#2b2d42';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x + w / 2, y + 30, 12, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  }

  function drawItem(item, elapsed) {
    const x = item.x;
    const y = item.y;
    const size = item.size;
    const tilt = Math.sin(elapsed * 2 + item.phase) * 0.14;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    if (item.kind === KIND_TASK) {
      ctx.fillStyle = COLORS.task;
      roundRect(ctx, -size / 2, -size / 2, size, size * 0.78, 6);
      ctx.fill();
      ctx.strokeStyle = COLORS.taskEdge;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = COLORS.taskEdge;
      ctx.beginPath();
      ctx.moveTo(-size / 2, -size / 2 + 4);
      ctx.lineTo(0, size * 0.1);
      ctx.lineTo(size / 2, -size / 2 + 4);
      ctx.lineTo(size / 2, -size / 2);
      ctx.lineTo(-size / 2, -size / 2);
      ctx.closePath();
      ctx.fill();
      face(ctx, 0, size * 0.08, size * 0.62, 'happy');
    } else if (item.kind === KIND_GEAR) {
      ctx.fillStyle = COLORS.gear;
      ctx.save();
      ctx.rotate(elapsed * 0.8 + item.phase);
      for (let index = 0; index < 8; index += 1) {
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-5, -size / 2 - 4, 10, 12);
      }
      ctx.restore();
      circle(ctx, 0, 0, size * 0.36);
      ctx.fill();
      ctx.fillStyle = '#fff3b0';
      circle(ctx, 0, 0, size * 0.2);
      ctx.fill();
      face(ctx, 0, 2, size * 0.6, 'happy');
    } else if (item.kind === KIND_STAR) {
      ctx.fillStyle = COLORS.star;
      starPath(ctx, 0, 0, size * 0.52, 5);
      ctx.fill();
      ctx.strokeStyle = '#f4a900';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      face(ctx, 0, 2, size * 0.55, 'happy');
      ctx.fillStyle = '#ffffff';
      starPath(ctx, -size * 0.42, -size * 0.4, 5, 4);
      ctx.fill();
      starPath(ctx, size * 0.42, -size * 0.3, 4, 4);
      ctx.fill();
    } else if (item.kind === KIND_BUG) {
      ctx.strokeStyle = '#7f1d1d';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      for (let index = -1; index <= 1; index += 1) {
        ctx.beginPath();
        ctx.moveTo(-size * 0.3, index * size * 0.14);
        ctx.lineTo(-size * 0.52, index * size * 0.3);
        ctx.moveTo(size * 0.3, index * size * 0.14);
        ctx.lineTo(size * 0.52, index * size * 0.3);
        ctx.stroke();
      }
      ctx.fillStyle = COLORS.bug;
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.42, size * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7f1d1d';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.3);
      ctx.lineTo(0, size * 0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-size * 0.2, -size * 0.3);
      ctx.quadraticCurveTo(-size * 0.3, -size * 0.5, -size * 0.14, -size * 0.52);
      ctx.moveTo(size * 0.2, -size * 0.3);
      ctx.quadraticCurveTo(size * 0.3, -size * 0.5, size * 0.14, -size * 0.52);
      ctx.stroke();
      face(ctx, 0, -size * 0.04, size * 0.6, 'angry');
    } else {
      // SPAM: a grey junk envelope, unimpressed with itself.
      ctx.fillStyle = COLORS.spam;
      roundRect(ctx, -size / 2, -size / 2, size, size * 0.78, 6);
      ctx.fill();
      ctx.strokeStyle = '#5c677d';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${Math.floor(size * 0.42)}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', 0, -size * 0.18);
      face(ctx, 0, size * 0.12, size * 0.58, 'grumpy');
    }
    ctx.restore();
  }

  function drawHud(state, best) {
    // Score panel, top left.
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    roundRect(ctx, 14, 12, 210, 64, 14);
    ctx.fill();
    ctx.fillStyle = COLORS.ink;
    ctx.font = `800 13px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('SCORE', 28, 32);
    ctx.font = `900 30px ${FONT}`;
    ctx.fillText(String(state.score), 28, 62);
    ctx.font = `700 13px ${FONT}`;
    ctx.fillStyle = '#6c757d';
    ctx.fillText(`BEST ${Math.max(best, state.score)}`, 132, 60);

    // Level badge, top centre.
    ctx.fillStyle = '#8d6bff';
    roundRect(ctx, FIELD.width / 2 - 62, 12, 124, 40, 20);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 20px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(`LEVEL ${state.level}`, FIELD.width / 2, 40);

    // Lives as hearts, top right.
    for (let index = 0; index < 3; index += 1) {
      const hx = FIELD.width - 32 - index * 40;
      const hy = 34;
      ctx.fillStyle = index < state.lives ? COLORS.heart : 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.moveTo(hx, hy + 10);
      ctx.bezierCurveTo(hx - 16, hy - 4, hx - 8, hy - 16, hx, hy - 6);
      ctx.bezierCurveTo(hx + 8, hy - 16, hx + 16, hy - 4, hx, hy + 10);
      ctx.fill();
    }

    // Combo badge under the score when the streak is rolling.
    if (state.combo >= 3) {
      const pulse = 1 + Math.sin(state.elapsed * 8) * 0.05;
      ctx.save();
      ctx.translate(119, 100);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = '#ff6b6b';
      roundRect(ctx, -72, -18, 144, 36, 18);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 19px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(`COMBO x${state.combo}`, 0, 7);
      ctx.restore();
    }

    ctx.fillStyle = 'rgba(43, 45, 66, 0.55)';
    ctx.font = `700 13px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText('M sound  ·  P pause', FIELD.width - 14, FIELD.height - 12);
  }

  function drawPanel(x, y, width, height) {
    ctx.fillStyle = 'rgba(43, 45, 66, 0.25)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = COLORS.panel;
    roundRect(ctx, x, y, width, height, 22);
    ctx.fill();
    ctx.strokeStyle = 'rgba(43, 45, 66, 0.12)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  function drawTitle(state, best) {
    drawBackground(state);
    for (const item of state.items) {
      if (item.active) drawItem(item, state.elapsed);
    }
    // The mascot, big and centre stage.
    ctx.save();
    ctx.translate(FIELD.width / 2 - 52, 200);
    ctx.scale(1.5, 1.5);
    drawRobot({ ...state, player: { ...state.player, x: 0, y: 0, width: PLAYER.width, height: PLAYER.height, invulnerable: 0 }, elapsed: state.elapsed });
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.font = `900 72px ${FONT}`;
    // A dark outline keeps the white title readable over clouds and items.
    ctx.lineWidth = 10;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(43, 45, 66, 0.5)';
    ctx.strokeText('TASK CATCHER', FIELD.width / 2, 110);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('TASK CATCHER', FIELD.width / 2, 110);
    ctx.fillStyle = COLORS.ink;
    ctx.font = `800 22px ${FONT}`;
    ctx.fillText('A tiny agent with a very big inbox', FIELD.width / 2, 142);

    drawPanel(FIELD.width / 2 - 260, 330, 520, 148);
    ctx.fillStyle = COLORS.ink;
    ctx.font = `800 19px ${FONT}`;
    ctx.fillText('Catch the tasks  ·  Dodge the bugs & spam', FIELD.width / 2, 366);
    ctx.font = `700 17px ${FONT}`;
    ctx.fillStyle = '#495057';
    ctx.fillText('Move with the mouse or arrow keys  ·  3 lives', FIELD.width / 2, 396);
    ctx.fillText('Letters +10  ·  Gears +25  ·  Golden stars +50', FIELD.width / 2, 422);
    ctx.fillStyle = '#8d6bff';
    ctx.font = `900 20px ${FONT}`;
    ctx.fillText('CLICK OR PRESS ENTER TO START', FIELD.width / 2, 456);
    if (best > 0) {
      ctx.fillStyle = '#6c757d';
      ctx.font = `800 16px ${FONT}`;
      ctx.fillText(`BEST SCORE ${best}`, FIELD.width / 2, 516);
    }
  }

  function drawOver(state, best) {
    drawBackground(state);
    for (const item of state.items) {
      if (item.active) drawItem(item, state.elapsed);
    }
    drawRobot(state);
    drawPanel(FIELD.width / 2 - 250, 150, 500, 300);
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.ink;
    ctx.font = `900 44px ${FONT}`;
    ctx.fillText('INBOX OVERFLOW!', FIELD.width / 2, 212);
    ctx.font = `800 20px ${FONT}`;
    ctx.fillStyle = '#495057';
    ctx.fillText('The bugs got past your little agent.', FIELD.width / 2, 246);
    ctx.font = `900 54px ${FONT}`;
    ctx.fillStyle = '#8d6bff';
    ctx.fillText(String(state.score), FIELD.width / 2, 316);
    ctx.font = `800 18px ${FONT}`;
    ctx.fillStyle = '#6c757d';
    ctx.fillText(`BEST ${best}  ·  BEST COMBO x${state.bestCombo}  ·  LEVEL ${state.level}`, FIELD.width / 2, 348);
    ctx.fillStyle = '#ff6b6b';
    ctx.font = `900 22px ${FONT}`;
    ctx.fillText('PRESS R OR CLICK TO PLAY AGAIN', FIELD.width / 2, 412);
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(43, 45, 66, 0.45)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 56px ${FONT}`;
    ctx.fillText('PAUSED', FIELD.width / 2, FIELD.height / 2 - 8);
    ctx.font = `800 20px ${FONT}`;
    ctx.fillText('Press P to keep catching', FIELD.width / 2, FIELD.height / 2 + 32);
  }

  function drawFx(dt) {
    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const p = particles[index];
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(index, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 420 * dt;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      circle(ctx, p.x, p.y, p.size);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (let index = floats.length - 1; index >= 0; index -= 1) {
      const f = floats[index];
      f.life -= dt;
      if (f.life <= 0) {
        floats.splice(index, 1);
        continue;
      }
      f.y -= 44 * dt;
      ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
      ctx.fillStyle = f.color;
      ctx.font = `900 ${f.size}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    if (banner !== null) {
      banner.life -= dt;
      if (banner.life <= 0) banner = null;
      else {
        const pop = banner.life > banner.maxLife - 0.18 ? 1 + (banner.maxLife - banner.life) * 1.2 : 1;
        ctx.save();
        ctx.translate(FIELD.width / 2, 150);
        ctx.scale(pop, pop);
        ctx.globalAlpha = Math.min(1, banner.life / 0.4);
        ctx.fillStyle = '#ffffff';
        ctx.font = `900 44px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(43, 45, 66, 0.4)';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 4;
        ctx.fillText(banner.text, 0, 0);
        ctx.shadowOffsetY = 0;
        if (banner.sub) {
          ctx.font = `800 19px ${FONT}`;
          ctx.fillStyle = COLORS.ink;
          ctx.fillText(banner.sub, 0, 32);
        }
        ctx.restore();
      }
    }
  }

  return {
    draw(state, screen, best, dt) {
      const { scale, offsetX, offsetY } = frame();
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.fillStyle = '#1b2a4a';
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);
      // A little shake when the robot is hit.
      if (state.shake > 0) {
        ctx.translate((Math.random() - 0.5) * state.shake * 10, (Math.random() - 0.5) * state.shake * 8);
      }
      ctx.beginPath();
      ctx.rect(0, 0, FIELD.width, FIELD.height);
      ctx.clip();

      if (screen === SCREEN_TITLE) drawTitle(state, best);
      else if (screen === SCREEN_OVER) drawOver(state, best);
      else {
        drawBackground(state);
        for (const item of state.items) {
          if (item.active) drawItem(item, state.elapsed);
        }
        drawRobot(state);
        drawHud(state, best);
        if (screen === SCREEN_PAUSED) drawPaused();
      }
      drawFx(dt);
      ctx.restore();
    },
    burst(x, y, color, count) {
      for (let index = 0; index < count; index += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 60 + Math.random() * 180;
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 60,
          life: 0.55 + Math.random() * 0.3,
          maxLife: 0.85,
          size: 3 + Math.random() * 4,
          color,
        });
      }
    },
    float(x, y, text, color, size) {
      floats.push({ x, y, text, color, size: size ?? 22, life: 0.9, maxLife: 0.9 });
    },
    showBanner(text, sub) {
      banner = { text, sub: sub ?? '', life: 1.4, maxLife: 1.4 };
    },
    // A little life for staged screenshots: a couple of bursts where the action is.
    stageDecor(state) {
      let shown = 0;
      for (const item of state.items) {
        if (shown >= 2) break;
        if (item.active && item.kind !== KIND_BUG && item.kind !== KIND_SPAM) {
          this.burst(item.x, item.y, '#ffd93d', 10);
          shown += 1;
        }
      }
    },
  };
}
