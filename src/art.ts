import type Phaser from 'phaser';
import { WIDTH, HEIGHT, OBSTACLES, PLAYER_COLOURS } from './simulation';

type C = CanvasRenderingContext2D;
function oval(c: C, x: number, y: number, rx: number, ry: number, fill: string, stroke?: string) {
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill();
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = 2; c.stroke(); }
}
function round(c: C, x: number, y: number, w: number, h: number, r: number, fill: string, stroke?: string) {
  c.beginPath(); c.roundRect(x, y, w, h, r); c.fillStyle = fill; c.fill();
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = 2; c.stroke(); }
}
function line(c: C, points: number[][], colour: string, width = 2) {
  c.beginPath(); c.moveTo(points[0][0], points[0][1]); for (const p of points.slice(1)) c.lineTo(p[0], p[1]);
  c.strokeStyle = colour; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
}
function texture(scene: Phaser.Scene, key: string, w: number, h: number, draw: (c: C) => void) {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const c = canvas.getContext('2d')!; draw(c); scene.textures.addCanvas(key, canvas);
}
function leaf(c: C, x: number, y: number, a: number, length: number, width: number, colour: string) {
  c.save(); c.translate(x, y); c.rotate(a); c.beginPath(); c.moveTo(0, 0);
  c.quadraticCurveTo(length * 0.5, -width, length, 0); c.quadraticCurveTo(length * 0.5, width * 0.6, 0, 0);
  c.fillStyle = colour; c.fill(); line(c, [[4, 0], [length * 0.9, 0]], '#ffffff16', 1); c.restore();
}
function palm(c: C, x: number, y: number, scale: number, phase: number) {
  c.save(); c.translate(x, y); c.scale(scale, scale);
  oval(c, 8, 19, 66, 35, '#11251e45');
  line(c, [[3, 32], [-3, 2], [0, -22]], '#4b4026', 13);
  line(c, [[1, 29], [-5, 0], [-2, -22]], '#a38b49', 6);
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + phase; leaf(c, 0, -20, a, 72 + i % 3 * 12, 24, i % 2 ? '#396a45' : '#4d8050'); }
  for (let i = 0; i < 5; i++) leaf(c, 0, -20, i * 1.25 + phase + 0.4, 55, 17, i % 2 ? '#6d984d' : '#5a8a46');
  oval(c, -4, -19, 6, 5, '#bb8d48'); oval(c, 5, -17, 5, 5, '#8c6b36'); c.restore();
}

export function makeArt(scene: Phaser.Scene) {
  for (let id = 0; id < 4; id++) texture(scene, `monkey${id}`, 88, 88, c => {
    // Draw facing right. The scene rotates the complete overhead silhouette.
    oval(c, 40, 49, 24, 19, '#0c1c164d');
    c.beginPath(); c.moveTo(25, 46); c.bezierCurveTo(0, 64, 1, 16, 22, 21); c.strokeStyle = '#503b25'; c.lineWidth = 7; c.lineCap = 'round'; c.stroke();
    c.beginPath(); c.moveTo(25, 46); c.bezierCurveTo(0, 64, 1, 16, 22, 21); c.strokeStyle = '#92633b'; c.lineWidth = 4; c.stroke();
    oval(c, 31, 29, 9, 6, '#584329'); oval(c, 31, 60, 9, 6, '#584329');
    oval(c, 40, 44, 20, 20, '#72502d', '#392e20'); oval(c, 44, 44, 15, 16, '#ae7643');
    oval(c, 47, 24, 10, 10, '#76502d', '#3d3022'); oval(c, 47, 64, 10, 10, '#76502d', '#3d3022');
    oval(c, 48, 24, 6, 6, '#d49b64'); oval(c, 48, 64, 6, 6, '#d49b64');
    oval(c, 52, 44, 19, 20, '#976333', '#493622'); oval(c, 59, 44, 14, 15, '#e3b67c');
    oval(c, 64, 44, 7, 9, '#f0cb91'); oval(c, 62, 35, 2.4, 3.2, '#30291e'); oval(c, 62, 52, 2.4, 3.2, '#30291e');
    oval(c, 67, 42, 1.5, 1.3, '#5a3a22'); oval(c, 67, 46, 1.5, 1.3, '#5a3a22');
    round(c, 43, 24, 10, 40, 4, PLAYER_COLOURS[id]);
    line(c, [[44, 59], [33, 70], [42, 66]], PLAYER_COLOURS[id], 5);
    oval(c, 52, 62, 8, 5, '#82522f'); oval(c, 53, 60, 6, 4, '#dab077');
    round(c, 57, 60, 25, 7, 2, '#647044', '#313c28'); round(c, 72, 59, 8, 9, 2, '#b2a063');
    line(c, [[61, 62], [75, 62]], '#d8c48a', 1); round(c, 62, 66, 7, 5, 1, '#6a4d2c');
    oval(c, 57, 28, 2, 2, '#fff2c0');
  });

  for (const kind of ['chaser', 'pouncer', 'bruiser', 'boss']) texture(scene, kind, 100, 86, c => {
    const boss = kind === 'boss', heavy = kind === 'bruiser';
    oval(c, 49, 48, 37, 23, '#0d1c1745');
    c.beginPath(); c.moveTo(28, 43); c.bezierCurveTo(-10, 48, 10, 7, 20, 20); c.strokeStyle = '#352d21'; c.lineWidth = 7; c.lineCap = 'round'; c.stroke();
    c.beginPath(); c.moveTo(28, 43); c.bezierCurveTo(-10, 48, 10, 7, 20, 20); c.strokeStyle = '#c59a42'; c.lineWidth = 4; c.stroke();
    for (const [x, y] of [[30, 24], [29, 61], [67, 23], [65, 62]]) {
      oval(c, x, y, 10, 7, '#ad782e', '#3f3524'); oval(c, x + 4, y, 7, 6, '#dfb759');
      line(c, [[x + 7, y - 3], [x + 10, y - 3]], '#f4dfac', 1);
    }
    oval(c, 46, 43, 29, 20, heavy ? '#a8783c' : '#c79c45', '#443522');
    oval(c, 48, 40, 24, 16, boss ? '#edb94f' : '#e6b655');
    for (const [x, y] of [[26, 41], [36, 31], [35, 51], [48, 37], [48, 53], [59, 31], [59, 49], [21, 31], [15, 24]]) {
      oval(c, x, y, 3.6, 3, '#493c29'); oval(c, x + 0.4, y, 1.6, 1.4, '#b99245');
    }
    oval(c, 69, 26, 8, 8, '#8e632d', '#3a3023'); oval(c, 69, 60, 8, 8, '#8e632d', '#3a3023');
    oval(c, 70, 26, 4, 4, '#d2ae78'); oval(c, 70, 60, 4, 4, '#d2ae78');
    oval(c, 73, 43, 17, 19, '#e2b257', '#4a3826');
    oval(c, 83, 38, 8, 7, '#efe1b3'); oval(c, 83, 49, 8, 7, '#efe1b3');
    oval(c, 89, 43, 4, 4, '#4e382b');
    line(c, [[74, 30], [80, 33]], '#443329', 3); line(c, [[74, 56], [80, 53]], '#443329', 3);
    oval(c, 80, 34, 2, 2, kind === 'pouncer' ? '#a7eeec' : '#f9f3d0'); oval(c, 80, 52, 2, 2, '#f9f3d0');
    oval(c, 81, 34, 0.9, 1.7, '#1d2d23'); oval(c, 81, 52, 0.9, 1.7, '#1d2d23');
    if (kind === 'pouncer') round(c, 63, 27, 5, 34, 2, '#58b7b0');
    if (heavy) { round(c, 35, 26, 14, 35, 4, '#735d49'); line(c, [[37, 30], [47, 30]], '#b5a28b', 2); round(c, 61, 25, 8, 38, 2, '#b96345'); }
    if (boss) { c.fillStyle = '#ffda69'; c.beginPath(); c.moveTo(61, 29); c.lineTo(60, 12); c.lineTo(68, 19); c.lineTo(74, 8); c.lineTo(80, 20); c.lineTo(88, 13); c.lineTo(86, 30); c.closePath(); c.fill(); round(c, 61, 27, 25, 5, 1, '#b37634'); }
  });

  texture(scene, 'banana', 32, 32, c => {
    c.translate(16, 16); c.rotate(-0.45); c.beginPath(); c.moveTo(-10, -5); c.quadraticCurveTo(8, 11, 11, -8); c.quadraticCurveTo(13, 13, -8, 6); c.closePath(); c.fillStyle = '#ffe46e'; c.fill(); c.strokeStyle = '#d38b31'; c.lineWidth = 1.5; c.stroke(); line(c, [[10, -8], [12, -11]], '#7b6632', 3);
  });
  texture(scene, 'nuts', 26, 26, c => { oval(c, 13, 14, 8, 10, '#6a432c', '#3f3121'); oval(c, 12, 12, 6, 8, '#c49459'); line(c, [[13, 6], [12, 19]], '#e4bf83', 1.5); });
  texture(scene, 'coconut', 32, 32, c => { oval(c, 16, 18, 12, 12, '#513f2c', '#2d2e20'); oval(c, 15, 15, 10, 10, '#a07948'); oval(c, 12, 13, 1.5, 2, '#453725'); oval(c, 18, 12, 1.5, 2, '#453725'); oval(c, 16, 18, 1.5, 2, '#453725'); line(c, [[8, 10], [9, 21]], '#c2a174', 1); });
  texture(scene, 'melon', 40, 40, c => {
    oval(c, 20, 21, 15, 14, '#25452a', '#142c22'); oval(c, 19, 19, 13, 12, '#80b55d');
    for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(15 + i * 4, 19, 3 + i, 11, 0, -1.8, 1.8); c.strokeStyle = '#3d7f43'; c.lineWidth = 3; c.stroke(); }
    line(c, [[21, 7], [24, 2], [27, 5]], '#b89656', 2);
  });
  texture(scene, 'tank', 104, 92, c => {
    oval(c, 49, 51, 44, 34, '#101c1759');
    round(c, 15, 13, 66, 17, 6, '#273b2c', '#13251e'); round(c, 15, 62, 66, 17, 6, '#273b2c', '#13251e');
    for (let i = 0; i < 7; i++) { line(c, [[20 + i * 9, 15], [20 + i * 9, 26]], '#89906a', 4); line(c, [[20 + i * 9, 65], [20 + i * 9, 75]], '#89906a', 4); }
    round(c, 13, 25, 71, 40, 7, '#796341', '#3a3f29');
    for (let i = 0; i < 5; i++) round(c, 17 + i * 13, 29, 11, 32, 2, i % 2 ? '#b29961' : '#c0a66c');
    round(c, 34, 29, 31, 34, 9, '#6c8050', '#354c35'); oval(c, 45, 45, 12, 11, '#c8b875', '#586342');
    round(c, 51, 38, 45, 13, 3, '#a69e62', '#3c4d33'); round(c, 88, 36, 11, 17, 3, '#4c603d'); line(c, [[59, 41], [86, 41]], '#e3d297', 2);
    oval(c, 43, 44, 7, 7, '#805a31'); oval(c, 46, 44, 5, 5, '#e6bd7f'); round(c, 36, 36, 7, 16, 2, '#f2bd4e');
  });
  texture(scene, 'heal', 36, 36, c => { c.fillStyle = '#f09691'; c.beginPath(); c.moveTo(18, 29); c.bezierCurveTo(-2, 17, 5, 2, 17, 11); c.bezierCurveTo(31, 0, 40, 16, 18, 29); c.fill(); line(c, [[9, 12], [12, 10]], '#ffcec0', 3); });
  texture(scene, 'shield', 38, 40, c => { c.beginPath(); c.moveTo(19, 3); c.lineTo(32, 9); c.lineTo(30, 25); c.lineTo(19, 36); c.lineTo(8, 25); c.lineTo(6, 9); c.closePath(); c.fillStyle = '#90dfdc'; c.fill(); c.strokeStyle = '#326c69'; c.lineWidth = 3; c.stroke(); line(c, [[19, 10], [19, 29]], '#d9ffff', 3); line(c, [[12, 18], [26, 18]], '#d9ffff', 3); });
  texture(scene, 'spark', 12, 12, c => { c.fillStyle = '#fff1a9'; c.beginPath(); c.moveTo(6, 0); c.lineTo(8, 4); c.lineTo(12, 6); c.lineTo(8, 8); c.lineTo(6, 12); c.lineTo(4, 8); c.lineTo(0, 6); c.lineTo(4, 4); c.fill(); });
  for (let world = 0; world < 3; world++) texture(scene, `world${world}`, WIDTH, HEIGHT, c => drawWorld(c, world));
}

function drawWorld(c: C, world: number) {
  let seed = 6842;
  const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const jungle = world === 0, lab = world === 1;
  c.fillStyle = jungle ? '#213d2e' : lab ? '#1b3938' : '#191e34'; c.fillRect(0, 0, WIDTH, HEIGHT);
  if (jungle) {
    // Water and rock shelf around the playable clearing.
    round(c, -40, 440, 150, 260, 60, '#315d58');
    for (let i = 0; i < 30; i++) line(c, [[rand() * 110, 470 + rand() * 220], [rand() * 110, 470 + rand() * 220]], '#65918420', 2);
    round(c, 39, 63, WIDTH - 78, HEIGHT - 116, 70, '#263e29');
    round(c, 50, 70, WIDTH - 100, HEIGHT - 130, 65, '#62764b');
    const gradient = c.createRadialGradient(640, 400, 80, 640, 400, 630);
    gradient.addColorStop(0, '#8e9863'); gradient.addColorStop(0.6, '#7a8955'); gradient.addColorStop(1, '#4d6c43');
    c.fillStyle = gradient; c.beginPath(); c.roundRect(57, 78, WIDTH - 114, HEIGHT - 146, 60); c.fill();
    // Worn winding paths.
    c.beginPath(); c.moveTo(95, 387); c.bezierCurveTo(430, 285, 690, 570, 1190, 380); c.strokeStyle = '#ad9c6540'; c.lineWidth = 110; c.stroke();
    c.beginPath(); c.moveTo(640, 85); c.bezierCurveTo(560, 290, 740, 410, 640, 690); c.strokeStyle = '#b2a27330'; c.lineWidth = 105; c.stroke();
    for (let i = 0; i < 2400; i++) {
      const x = 65 + rand() * 1150, y = 86 + rand() * 595;
      c.fillStyle = ['#d6c18b18', '#314f322b', '#aeb5772b'][i % 3]; c.fillRect(x, y, 1 + rand() * 3, 1 + rand() * 2);
    }
    for (let i = 0; i < 190; i++) {
      const x = 70 + rand() * 1140, y = 95 + rand() * 580;
      if (Math.hypot((x - 640) * 0.6, y - 380) < 240 && rand() < 0.85) continue;
      line(c, [[x - 4, y], [x - 6, y - 5], [x, y]], '#47663790', 1.5); line(c, [[x, y], [x + 1, y - 7], [x + 4, y]], '#b4bf7180', 1.5);
    }
    for (let i = 0; i < 45; i++) { const x = 75 + rand() * 1130, y = 97 + rand() * 568; oval(c, x + 1, y + 1, 4, 2, '#34442c45'); oval(c, x, y, 3, 2, '#b9b08766'); }
    // The tiny banana temple at the northern entrance.
    for (let i = 0; i < 4; i++) round(c, 537 + i * 15, 12 + i * 10, 206 - i * 30, 18, 3, ['#405743', '#566c4e', '#738364', '#8c9572'][i]);
    round(c, 598, 30, 84, 35, 3, '#314d3b'); round(c, 620, 26, 40, 29, 15, '#a9a76b');
    c.save(); c.translate(640, 38); c.rotate(-0.7); c.fillStyle = '#efd27a'; c.beginPath(); c.arc(0, -4, 10, 0, Math.PI); c.arc(0, -7, 8, Math.PI, 0, true); c.fill(); c.restore();
    // Arena entry stones and corner vegetation.
    for (const [x, y] of [[64, 328], [64, 440], [1217, 328], [1217, 440], [580, 699], [700, 699]]) {
      round(c, x - 16, y - 13, 34, 30, 5, '#354c38'); round(c, x - 15, y - 17, 30, 29, 5, '#8d9871', '#465c43'); line(c, [[x - 10, y - 10], [x + 8, y - 10]], '#c6c79a60', 2);
    }
    const palms = [[55, 56, 1.2], [160, 28, 0.9], [350, 18, 0.85], [935, 16, 0.9], [1120, 21, 1.05], [1250, 96, 1.2], [25, 218, 0.95], [1250, 274, 1], [22, 543, 1], [1248, 541, 1.1], [55, 736, 1.3], [220, 759, 0.9], [440, 754, 0.75], [840, 757, 0.85], [1090, 755, 1], [1240, 740, 1.2]];
    for (const [x, y, s] of palms) palm(c, x, y, s, rand());
    for (let i = 0; i < 90; i++) {
      const x = rand() * WIDTH, y = rand() < 0.5 ? rand() * 55 : HEIGHT - rand() * 45;
      for (let j = 0; j < 4; j++) leaf(c, x, y, rand() * Math.PI * 2, 15 + rand() * 20, 8, ['#3e6540', '#71924a', '#52773d'][j % 3]);
      if (i % 6 === 0) { oval(c, x, y, 4, 4, '#e9ad65'); oval(c, x + 4, y - 4, 3, 3, '#f6cf8e'); }
    }
  } else if (lab) {
    round(c, 48, 66, WIDTH - 96, HEIGHT - 125, 22, '#173331', '#608b7b');
    round(c, 60, 78, WIDTH - 120, HEIGHT - 149, 16, '#42615a');
    for (let x = 62; x < WIDTH - 65; x += 52) for (let y = 80; y < HEIGHT - 75; y += 52) {
      round(c, x + 1, y + 1, 49, 49, 2, ((x + y) / 52) % 2 ? '#4d6b6120' : '#77908215');
      c.fillStyle = '#153e3425'; c.fillRect(x, y, 1, 52); c.fillRect(x, y, 52, 1);
    }
    for (let x = 160; x < 1200; x += 170) {
      round(c, x, 12, 85, 58, 10, '#294a44', '#719d83'); round(c, x + 7, 18, 71, 40, 5, '#7bca9d44');
      oval(c, x + 40, 40, 14, 18, '#c6da7590'); line(c, [[x + 12, 24], [x + 17, 24]], '#c7f2ca', 2);
    }
    for (const y of [90, 655]) { c.fillStyle = '#d2ba66'; c.fillRect(84, y, 1112, 4); for (let x = 84; x < 1200; x += 30) { c.fillStyle = '#233e34'; c.fillRect(x, y, 12, 4); } }
    for (const x of [23, 1226]) for (let y = 150; y < 700; y += 160) { round(c, x, y, 30, 95, 6, '#577b69'); round(c, x + 7, y + 5, 16, 40, 3, '#a6df94'); }
    c.fillStyle = '#b6d1a333'; c.font = 'bold 72px sans-serif'; c.textAlign = 'center'; c.fillText('B-04', 640, 422);
  } else {
    for (let i = 0; i < 450; i++) { const x = rand() * WIDTH, y = rand() * HEIGHT; oval(c, x, y, rand() * 1.5, rand() * 1.5, '#cad0ef88'); }
    const g = c.createRadialGradient(640, 384, 100, 640, 384, 650); g.addColorStop(0, '#777780'); g.addColorStop(1, '#3d4355');
    round(c, 46, 65, WIDTH - 92, HEIGHT - 123, 50, '#2b3348', '#9c96ac'); round(c, 57, 77, WIDTH - 114, HEIGHT - 147, 42, '#646776');
    c.fillStyle = g; c.beginPath(); c.roundRect(63, 82, WIDTH - 126, HEIGHT - 158, 38); c.fill();
    for (let i = 0; i < 55; i++) { const x = 100 + rand() * 1080, y = 110 + rand() * 540, r = 4 + rand() * 19; oval(c, x, y + 2, r, r * 0.65, '#a5a4b333'); oval(c, x, y, r, r * 0.65, '#393e5140'); }
    for (let x = 130; x < 1200; x += 180) { round(c, x, 35, 80, 35, 10, '#39405b', '#8b8fa6'); round(c, x + 9, 41, 62, 18, 6, '#8bcdcb'); }
    for (const [x, y] of [[95, 120], [1180, 130], [120, 655], [1160, 650]]) { oval(c, x, y, 27, 19, '#242d4650'); round(c, x - 18, y - 20, 36, 30, 7, '#b5b5b6', '#46495b'); round(c, x - 13, y - 16, 26, 16, 5, '#7bc8c1'); }
  }
  for (const o of OBSTACLES) {
    const x = o.x - 25, y = o.y - 25;
    oval(c, o.x + 4, o.y + 18, 31, 19, '#14271d35');
    round(c, x, y, 50, 48, 5, jungle ? '#705639' : lab ? '#365850' : '#474b60', '#34432b');
    round(c, x, y - 5, 50, 43, 4, jungle ? '#b39a60' : lab ? '#8aab8c' : '#9c99ad', jungle ? '#4f5936' : '#4d5e60');
    if (jungle) { for (let i = 0; i < 4; i++) line(c, [[x + 5 + i * 11, y], [x + 5 + i * 11, y + 32]], '#7e6f43', 2); line(c, [[x + 5, y + 1], [x + 44, y + 33]], '#d0b77c', 6); line(c, [[x + 5, y + 32], [x + 44, y + 1]], '#d0b77c', 6); }
    else { round(c, x + 9, y + 4, 32, 20, 4, '#314d49'); line(c, [[x + 16, y + 14], [x + 35, y + 14]], '#b6d6a4', 3); }
    oval(c, x + 5, y + 2, 2, 2, '#eddda4'); oval(c, x + 44, y + 30, 2, 2, '#eddda4');
  }
  // Dark inner edge makes the movement boundary easy to read.
  c.strokeStyle = '#102a2340'; c.lineWidth = 3; c.beginPath(); c.roundRect(53, 73, WIDTH - 106, HEIGHT - 140, 56); c.stroke();
}

export function monkeyPortrait(colour = '#f6bf54') {
  return `<svg viewBox="0 0 100 100" fill="none" aria-hidden="true"><path d="M23 85c-4-24 2-38 26-39 23-1 37 16 30 39" fill="#6c4b2f"/><circle cx="19" cy="45" r="12" fill="#a26c3b" stroke="#3e3527" stroke-width="3"/><circle cx="81" cy="45" r="12" fill="#a26c3b" stroke="#3e3527" stroke-width="3"/><circle cx="19" cy="45" r="7" fill="#dca56b"/><circle cx="81" cy="45" r="7" fill="#dca56b"/><path d="M23 39C23 12 78 12 78 39v20c-4 26-51 26-55 0Z" fill="#936037" stroke="#3e3527" stroke-width="3"/><path d="M31 46c0-16 16-18 19-9 5-10 20-7 20 9v15c-4 16-35 16-39 0Z" fill="#e6ba7c"/><ellipse cx="40" cy="48" rx="3" ry="5" fill="#2e3024"/><ellipse cx="61" cy="48" rx="3" ry="5" fill="#2e3024"/><ellipse cx="51" cy="60" rx="11" ry="8" fill="#f1cd95"/><path d="M45 64q6 5 12 0" stroke="#6b4930" stroke-width="2" stroke-linecap="round"/><path d="M20 30q32-14 60 0l-2 11q-30-9-56 0Z" fill="${colour}"/><path d="m24 35-13 17 14-4-2 13 12-23" fill="${colour}"/><path d="m40 24 8-7 10 5" stroke="#684b2e" stroke-width="5" stroke-linecap="round"/></svg>`;
}
