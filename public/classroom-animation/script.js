'use strict';
(() => {
  const WIDTH = 320, HEIGHT = 180, DURATION = 8000;
  const TIMELINE = Object.freeze([
    { start: 0, end: 2000, phase: 'explain' },
    { start: 2000, end: 3500, phase: 'turn' },
    { start: 3500, end: 5500, phase: 'point' },
    { start: 5500, end: 7000, phase: 'return-facing' },
    { start: 7000, end: 8000, phase: 'return-position' }
  ]);
  const clamp = n => Math.max(0, Math.min(1, n));
  const smooth = n => { n = clamp(n); return n * n * (3 - 2 * n); };
  const pulse = (t, start, end) => t <= start || t >= end ? 0 : Math.sin(Math.PI * (t - start) / (end - start)) ** 2;
  function getState(elapsed) {
    if (!Number.isFinite(elapsed)) throw new TypeError('Time must be finite.');
    const t = ((elapsed % DURATION) + DURATION) % DURATION;
    const travel = t < 3500 ? smooth((t - 2000) / 1500) : t < 7000 ? 1 : 1 - smooth((t - 7000) / 1000);
    let facing = 'front';
    if (t >= 2200 && t < 2500 || t >= 6300 && t < 6700) facing = 'side';
    else if (t >= 2500 && t < 6300) facing = 'back';
    let arm = 0;
    if (t >= 3500 && t < 4000) arm = Math.min(2, Math.floor((t - 3500) / 167));
    else if (t >= 4000 && t < 5500) arm = 2;
    else if (t >= 5500 && t < 6000) arm = Math.max(0, 2 - Math.floor((t - 5500) / 167));
    return {
      phase: TIMELINE.find(s => t >= s.start && t < s.end).phase,
      teacher: { x: Math.round(170 - 11 * travel), y: Math.round(102 - 2 * travel), facing, arm,
        gesture: t < 2000 ? Math.floor(t / 400) % 2 : 0, head: t >= 800 && t < 1200 ? -1 : 0 },
      students: [
        { dx: 0, head: Math.round(2 * pulse(t, 4200, 4900)), writing: 0 },
        { dx: 0, head: Math.round(2 * pulse(t, 3900, 5400)), writing: pulse(t, 3900, 5400) > .25 ? Math.floor((t - 3900) / 150) % 2 : 0 },
        { dx: 0, head: -Math.round(2 * pulse(t, 2400, 3400)), writing: 0 },
        { dx: Math.round(pulse(t, 6100, 6800)), head: 0, writing: 0 }
      ]
    };
  }
  const canvas = document.getElementById('classroom');
  const ctx = canvas.getContext('2d');
  const background = document.createElement('canvas');
  background.width = WIDTH; background.height = HEIGHT;
  const bg = background.getContext('2d');
  function rect(c, color, x, y, w, h) { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), w, h); }
  // Integer Bresenham strokes keep diagonal edges genuinely pixel aligned.
  function line(c, color, x, y, ex, ey, size = 1) {
    let dx = Math.abs(ex - x), sx = x < ex ? 1 : -1;
    let dy = -Math.abs(ey - y), sy = y < ey ? 1 : -1, err = dx + dy;
    for (;;) {
      rect(c, color, x, y, size, size);
      if (x === ex && y === ey) break;
      const e = 2 * err;
      if (e >= dy) { err += dy; x += sx; }
      if (e <= dx) { err += dx; y += sy; }
    }
  }
  function drawScene(c) {
    rect(c, '#eee0b7', 0, 0, 320, 106);
    rect(c, '#f9edcb', 0, 0, 320, 9);
    rect(c, '#d9c79d', 0, 9, 320, 2);
    rect(c, '#c8c9a2', 0, 79, 320, 26);
    rect(c, '#aab394', 0, 80, 320, 2);
    for (let x = 6; x < 320; x += 18) rect(c, '#b8be99', x, 84, 1, 18);
    rect(c, '#806e55', 0, 103, 320, 4);
    rect(c, '#c3976c', 0, 107, 320, 73);
    for (const y of [117, 133, 154, 179]) {
      rect(c, '#ac805f', 0, y, 320, 1);
      rect(c, '#d6ad7e', 0, y + 1, 320, 1);
    }
    for (let x = -140; x < 480; x += 40) line(c, '#b58a64', 160 + Math.round((x - 160) * .48), 107, x, 179);
    // Sunlit window and folded curtains.
    rect(c, '#b59a72', 14, 21, 61, 57);
    rect(c, '#fff1ce', 16, 23, 57, 53);
    rect(c, '#91c5ca', 19, 26, 51, 46);
    rect(c, '#b2d9d9', 20, 27, 49, 25);
    rect(c, '#edf2da', 24, 34, 13, 3); rect(c, '#edf2da', 29, 31, 7, 3);
    rect(c, '#7ba791', 20, 64, 49, 8); rect(c, '#93b69a', 20, 59, 17, 13);
    rect(c, '#93b69a', 49, 61, 20, 11);
    rect(c, '#f7e9c4', 43, 25, 3, 49); rect(c, '#f7e9c4', 18, 49, 53, 3);
    rect(c, '#cdbd94', 12, 76, 65, 3);
    for (const x of [10, 70]) { rect(c, '#d9a16f', x, 20, 7, 49); rect(c, '#edbd86', x + 1, 21, 3, 42); }
    // Board frame, static chalk geometry, and chalk tray.
    rect(c, '#765d47', 88, 21, 154, 59); rect(c, '#b58d58', 90, 22, 150, 56);
    rect(c, '#355b51', 94, 26, 142, 48); rect(c, '#40685a', 96, 28, 138, 44);
    rect(c, '#c9d4ac', 104, 33, 24, 1); rect(c, '#81977b', 104, 37, 14, 1);
    line(c, '#f1e5b4', 118, 64, 130, 44); line(c, '#f1e5b4', 130, 44, 142, 64); line(c, '#f1e5b4', 142, 64, 118, 64);
    rect(c, '#cbdcbe', 155, 45, 18, 1); rect(c, '#cbdcbe', 155, 45, 1, 19); rect(c, '#cbdcbe', 173, 45, 1, 19); rect(c, '#cbdcbe', 155, 64, 19, 1);
    line(c, '#e2c789', 190, 52, 196, 46); line(c, '#e2c789', 196, 46, 203, 52); line(c, '#e2c789', 203, 52, 196, 59); line(c, '#e2c789', 196, 59, 190, 52);
    rect(c, '#e4dfba', 212, 49, 8, 1); rect(c, '#e4dfba', 212, 53, 8, 1);
    rect(c, '#cba573', 87, 78, 156, 3); rect(c, '#f2e8cc', 105, 76, 7, 2); rect(c, '#d1ad79', 218, 75, 10, 3);
    // Clock and a restrained noticeboard.
    rect(c, '#806e55', 260, 16, 17, 17); rect(c, '#fcf0ce', 262, 18, 13, 13);
    rect(c, '#746b59', 268, 20, 1, 6); rect(c, '#746b59', 268, 25, 4, 1);
    rect(c, '#aa815a', 255, 44, 48, 29); rect(c, '#c6a87a', 258, 47, 42, 23);
    for (const [x, y, col] of [[261, 50, '#f5e6bd'], [276, 51, '#c6d7c5'], [288, 49, '#eac29c']]) {
      rect(c, col, x, y, 9, 15); rect(c, '#c27458', x + 4, y, 1, 2); rect(c, '#ad9c7c', x + 2, y + 5, 5, 1);
    }
    // Low teaching platform and lectern.
    rect(c, '#ad825f', 83, 107, 166, 4); rect(c, '#ddbb88', 83, 104, 166, 3);
    rect(c, '#947257', 215, 109, 31, 3);
    rect(c, '#725843', 218, 89, 3, 20); rect(c, '#725843', 239, 89, 3, 20);
    rect(c, '#aa7650', 216, 89, 27, 15); rect(c, '#c49360', 219, 91, 21, 10);
    rect(c, '#765743', 211, 86, 36, 4); rect(c, '#deb07a', 211, 85, 36, 2);
    rect(c, '#788f7d', 217, 82, 12, 3); rect(c, '#efe2b8', 218, 82, 10, 1);
    rect(c, '#bc7356', 237, 80, 4, 5); rect(c, '#525b4d', 239, 76, 1, 4);
  }
  function drawTeacher(c, s) {
    const x = s.x, y = s.y, h = s.head;
    rect(c, '#a07c5a', x - 10, y, 23, 2);
    rect(c, '#3e4851', x - 6, y - 17, 5, 15); rect(c, '#3e4851', x + 2, y - 17, 5, 15);
    rect(c, '#303b44', x - 7, y - 2, 6, 3); rect(c, '#303b44', x + 2, y - 2, 7, 3);
    const side = s.facing === 'side';
    rect(c, '#654d40', x - (side ? 5 : 8), y - 34, side ? 11 : 17, 19);
    rect(c, '#d7a466', x - (side ? 4 : 7), y - 33, side ? 9 : 15, 16);
    rect(c, '#f3dfb2', x - 3, y - 33, 6, 15);
    if (s.facing === 'back') rect(c, '#d7a466', x - 5, y - 33, 11, 16);
    else { rect(c, '#b58454', x - 7, y - 22, 4, 4); rect(c, '#b58454', x + 4, y - 22, 3, 4); }
    rect(c, '#c78b66', x - 2, y - 36 + h, 5, 4);
    rect(c, '#54463f', x - 7, y - 49 + h, 15, 14);
    rect(c, '#54463f', x - 5, y - 51 + h, 10, 3);
    if (s.facing === 'back') {
      rect(c, '#715347', x - 5, y - 48 + h, 10, 8); rect(c, '#d4a074', x - 8, y - 41 + h, 2, 4);
      rect(c, '#3e3937', x + 3, y - 39 + h, 6, 5);
    } else {
      rect(c, '#e9b588', x - 5, y - 45 + h, side ? 8 : 12, 9);
      rect(c, '#f3c69a', x - 4, y - 44 + h, side ? 6 : 10, 6);
      rect(c, '#54463f', x - 6, y - 47 + h, 11, 4);
      rect(c, '#403e39', x - 3, y - 41 + h, 1, 2);
      if (!side) rect(c, '#403e39', x + 4, y - 41 + h, 1, 2);
      else rect(c, '#e9b588', x - 7, y - 41 + h, 3, 3);
      rect(c, '#ac7057', x, y - 37 + h, 3, 1);
    }
    if (s.facing === 'back' && s.arm) {
      const handY = s.arm === 2 ? y - 43 : y - 32;
      line(c, '#674e3e', x - 8, y - 31, x - 19, handY, 4);
      line(c, '#d7a466', x - 8, y - 31, x - 19, handY, 3);
      rect(c, '#e9b588', x - 21, handY - 2, 4, 4);
      if (s.arm === 2) line(c, '#e9b588', x - 20, handY, x - 23, handY - 4, 2);
    } else { rect(c, '#b78555', x - 10, y - 31, 4, 13); rect(c, '#e9b588', x - 10, y - 18, 4, 4); }
    if (s.facing === 'front') {
      line(c, '#b78555', x + 8, y - 31, x + 11, y - 23, 4);
      line(c, '#e9b588', x + 11, y - 23, x + 17, y - 25 - s.gesture * 4, 3);
    } else { rect(c, '#b78555', x + 7, y - 31, 4, 12); rect(c, '#e9b588', x + 7, y - 19, 4, 4); }
  }
  const STUDENTS = [
    { x: 105, y: 122, hair: '#59483e', shirt: '#73958d', skin: '#e6b087', style: 0 },
    { x: 214, y: 122, hair: '#443e3b', shirt: '#cd896e', skin: '#dca279', style: 1 },
    { x: 69, y: 158, hair: '#5a443a', shirt: '#c1a65c', skin: '#e7b78e', style: 2 },
    { x: 250, y: 158, hair: '#6a4d3d', shirt: '#7a91ad', skin: '#c68e67', style: 0 }
  ];
  function drawStudent(c, p, s) {
    const x = p.x, y = p.y, bx = x + s.dx;
    rect(c, '#ac805e', x - 22, y + 14, 46, 4);
    for (const dx of [-20, 18]) { rect(c, '#65594b', x + dx, y - 3, 3, 18); rect(c, '#83705a', x + dx + 1, y - 3, 1, 16); }
    rect(c, '#775740', x - 25, y - 10, 50, 6); rect(c, '#dfb57d', x - 25, y - 14, 50, 5);
    rect(c, '#efcb91', x - 23, y - 14, 46, 1);
    rect(c, '#eee5c8', x - 10, y - 13, 20, 5); rect(c, '#afa98f', x, y - 13, 1, 5);
    rect(c, '#a7b6a3', x - 8, y - 12, 6, 1); rect(c, '#a7b6a3', x + 3, y - 10, 5, 1);
    rect(c, '#394650', bx - 8, y + 5, 6, 11); rect(c, '#394650', bx + 3, y + 5, 6, 11);
    rect(c, '#3e3e3c', bx - 9, y + 15, 7, 3); rect(c, '#3e3e3c', bx + 3, y + 15, 7, 3);
    rect(c, p.skin, bx - 14, y - 9, 6, 4); rect(c, p.skin, bx + 9, y - 9 - s.writing, 6, 4);
    rect(c, '#685747', bx + 14 + s.writing, y - 12, 1, 5);
    rect(c, '#515953', bx - 10, y - 8, 21, 17); rect(c, p.shirt, bx - 9, y - 8, 19, 16);
    rect(c, p.skin, bx - 3, y - 14 + s.head, 7, 7);
    rect(c, p.skin, bx - 10, y - 22 + s.head, 21, 10);
    rect(c, p.hair, bx - 9, y - 28 + s.head, 19, 17);
    rect(c, p.hair, bx - 6, y - 30 + s.head, 13, 3);
    rect(c, '#80604a', bx - 5, y - 27 + s.head, 10, 2);
    if (p.style === 1) { rect(c, p.hair, bx - 12, y - 19 + s.head, 5, 10); rect(c, '#e2b56f', bx - 12, y - 20 + s.head, 5, 2); }
    if (p.style === 2) { rect(c, p.hair, bx - 12, y - 20 + s.head, 5, 9); rect(c, p.hair, bx + 8, y - 20 + s.head, 5, 9); rect(c, '#c17d64', bx - 12, y - 21 + s.head, 4, 2); rect(c, '#c17d64', bx + 9, y - 21 + s.head, 4, 2); }
    rect(c, '#72553f', x - 12, y + 3, 3, 17); rect(c, '#72553f', x + 10, y + 3, 3, 17);
    rect(c, '#956641', x - 14, y + 3, 29, 9); rect(c, '#c9955e', x - 13, y + 4, 27, 6);
    rect(c, '#dfb077', x - 12, y + 4, 25, 1);
  }
  drawScene(bg);
  function renderAt(elapsed) {
    const state = getState(elapsed);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(background, 0, 0);
    drawTeacher(ctx, state.teacher);
    STUDENTS.forEach((student, i) => drawStudent(ctx, student, state.students[i]));
    return state;
  }
  function resize() {
    const available = Math.min(window.innerWidth / WIDTH, window.innerHeight / HEIGHT);
    const scale = available >= 1 ? Math.floor(available) : available;
    canvas.style.width = `${WIDTH * scale}px`;
    canvas.style.height = `${HEIGHT * scale}px`;
  }
  let requestId = null, epoch = performance.now();
  function frame(now) { renderAt(now - epoch); requestId = requestAnimationFrame(frame); }
  function pause() { if (requestId !== null) cancelAnimationFrame(requestId); requestId = null; }
  function resume() { if (requestId === null) requestId = requestAnimationFrame(frame); }
  // Internal verification API; pause before rendering a fixed timestamp.
  window.classroomAnimation = Object.freeze({ DURATION, TIMELINE, getState, renderAt, pause, resume });
  window.addEventListener('resize', resize);
  resize(); renderAt(0); resume();
})();
