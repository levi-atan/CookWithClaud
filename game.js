// --- Constants ---
const CANVAS_W     = 800;
const CANVAS_H     = 600;
const WALL_T       = 32;
const PLAYER_W     = 24;
const PLAYER_H     = 24;
const PLAYER_SPEED = 3;
const ITEM_W       = 20;
const ITEM_H       = 20;
const PICKUP_RADIUS = 40;
const DOOR_WIDTH   = 60;

// --- Canvas setup ---
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
canvas.width  = CANVAS_W;
canvas.height = CANVAS_H;

// --- Game state ---
const keys = {};
let eKeyDown    = false;
let walkCycle   = 0;       // drives rotation + scale animation
let playerFacing = 0;      // radians; last movement direction (0 = right)

const camera = { x: 0, y: 0 };

const player = {
  x: 0, y: 0,
  w: PLAYER_W, h: PLAYER_H,
  speed: PLAYER_SPEED,
  heldItem: null,
  color: '#4af'
};

// Building 1: original (larger), Building 2: second (smaller)
const buildings = [
  { x: 150, y: 150, w: 500, h: 400, walls: [], floorColor: '#888', wallColor: '#666' },
  { x: 780, y: 200, w: 300, h: 250, walls: [], floorColor: '#888', wallColor: '#555' },
];

const allWalls = []; // flat list of every wall rect across all buildings
const items    = [];

// --- Building construction ---
function buildBuilding(b) {
  const fullW   = b.w + WALL_T * 2;
  const fullH   = b.h + WALL_T * 2;
  const rightX  = b.x + WALL_T + b.w;
  const bottomY = b.y + WALL_T + b.h;
  const doorX   = b.x + WALL_T + b.w / 2 - DOOR_WIDTH / 2;

  // Top wall — door centered
  b.walls.push({ x: b.x,                y: b.y,     w: doorX - b.x,                         h: WALL_T });
  b.walls.push({ x: doorX + DOOR_WIDTH, y: b.y,     w: b.x + fullW - doorX - DOOR_WIDTH,    h: WALL_T });

  // Bottom wall — door centered
  b.walls.push({ x: b.x,                y: bottomY, w: doorX - b.x,                         h: WALL_T });
  b.walls.push({ x: doorX + DOOR_WIDTH, y: bottomY, w: b.x + fullW - doorX - DOOR_WIDTH,    h: WALL_T });

  // Left wall — full height
  b.walls.push({ x: b.x,    y: b.y, w: WALL_T, h: fullH });

  // Right wall — full height
  b.walls.push({ x: rightX, y: b.y, w: WALL_T, h: fullH });

  for (const w of b.walls) allWalls.push(w);
}

// --- Item spawning (absolute world coords) ---
function spawnItems(defs) {
  for (const d of defs) {
    items.push({
      x: d.x, y: d.y,
      w: ITEM_W, h: ITEM_H,
      color: d.color,
      label: d.label,
      held: false
    });
  }
}

// --- AABB collision test ---
function aabbOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw &&
         ax + aw > bx &&
         ay < by + bh &&
         ay + ah > by;
}

// --- Camera update (unclamped — open world) ---
function updateCamera() {
  camera.x = player.x + player.w / 2 - CANVAS_W / 2;
  camera.y = player.y + player.h / 2 - CANVAS_H / 2;
}

// --- World to screen ---
function toScreen(wx, wy) {
  return { sx: wx - camera.x, sy: wy - camera.y };
}

// --- Player movement + wall collision ---
function handleMovement() {
  let dx = 0, dy = 0;

  if (keys['ArrowLeft']  || keys['KeyA']) dx -= player.speed;
  if (keys['ArrowRight'] || keys['KeyD']) dx += player.speed;
  if (keys['ArrowUp']    || keys['KeyW']) dy -= player.speed;
  if (keys['ArrowDown']  || keys['KeyS']) dy += player.speed;

  // X axis
  player.x += dx;
  for (const wall of allWalls) {
    if (aabbOverlap(player.x, player.y, player.w, player.h,
                    wall.x, wall.y, wall.w, wall.h)) {
      if (dx > 0) player.x = wall.x - player.w;
      if (dx < 0) player.x = wall.x + wall.w;
    }
  }

  // Y axis
  player.y += dy;
  for (const wall of allWalls) {
    if (aabbOverlap(player.x, player.y, player.w, player.h,
                    wall.x, wall.y, wall.w, wall.h)) {
      if (dy > 0) player.y = wall.y - player.h;
      if (dy < 0) player.y = wall.y + wall.h;
    }
  }
  // No world clamp — player moves freely outside buildings

  // Walking animation state
  if (dx !== 0 || dy !== 0) {
    walkCycle += 0.15;
    playerFacing = Math.atan2(dy, dx);
  } else {
    walkCycle *= 0.75; // damp smoothly to 0 when stopped
  }
}

// --- Nearest item within pickup radius ---
function findNearestItem() {
  const px = player.x + player.w / 2;
  const py = player.y + player.h / 2;
  let closest = null;
  let closestDist = PICKUP_RADIUS;

  for (const item of items) {
    if (item.held) continue;
    const ix = item.x + item.w / 2;
    const iy = item.y + item.h / 2;
    const dist = Math.sqrt((px - ix) ** 2 + (py - iy) ** 2);
    if (dist < closestDist) {
      closestDist = dist;
      closest = item;
    }
  }
  return closest;
}

// --- Interact: pickup or drop (edge-triggered) ---
function handleInteract() {
  if (player.heldItem !== null) {
    const item = player.heldItem;
    item.x = player.x;
    item.y = player.y + player.h + 4;
    item.held = false;
    player.heldItem = null;
  } else {
    const target = findNearestItem();
    if (target !== null) {
      target.held = true;
      player.heldItem = target;
    }
  }
}

// --- Input ---
window.addEventListener('keydown', e => {
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) {
    e.preventDefault();
  }
  keys[e.code] = true;
  if (e.code === 'KeyE' && !eKeyDown) {
    eKeyDown = true;
    handleInteract();
  }
});

window.addEventListener('keyup', e => {
  keys[e.code] = false;
  if (e.code === 'KeyE') eKeyDown = false;
});

// --- Rendering ---
function drawFloor() {
  for (const b of buildings) {
    const { sx, sy } = toScreen(b.x + WALL_T, b.y + WALL_T);
    ctx.fillStyle = b.floorColor;
    ctx.fillRect(sx, sy, b.w, b.h);
  }
}

function drawWalls() {
  for (const b of buildings) {
    ctx.fillStyle = b.wallColor;
    for (const wall of b.walls) {
      const { sx, sy } = toScreen(wall.x, wall.y);
      ctx.fillRect(sx, sy, wall.w, wall.h);
    }
  }
}

function drawItems(nearestItem) {
  for (const item of items) {
    if (item.held) continue;

    const { sx, sy } = toScreen(item.x, item.y);

    ctx.fillStyle = item.color;
    ctx.fillRect(sx, sy, item.w, item.h);

    ctx.fillStyle = '#222';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(item.label, sx + item.w / 2, sy + item.h + 12);

    if (item === nearestItem) {
      ctx.fillStyle = '#fff';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('[E]', sx + item.w / 2, sy - 6);
    }
  }
}

function drawPlayer() {
  const cx = player.x + player.w / 2;
  const cy = player.y + player.h / 2;
  const { sx, sy } = toScreen(cx, cy);

  // Walking animation: rock ±5° and pulse width slightly
  const rotation = Math.sin(walkCycle) * (5 * Math.PI / 180);
  const scaleX   = 1 + Math.sin(walkCycle * 2) * 0.10;

  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(rotation);
  ctx.scale(scaleX, 1);

  ctx.fillStyle = player.color;
  ctx.fillRect(-player.w / 2, -player.h / 2, player.w, player.h);

  // Direction dot (top-center)
  ctx.fillStyle = '#fff';
  ctx.fillRect(-3, -player.h / 2 + 4, 6, 6);

  ctx.restore();

  // Held item orbits ahead of player in the facing direction
  if (player.heldItem !== null) {
    const orbit = ITEM_H + 10;
    const ox = Math.cos(playerFacing) * orbit;
    const oy = Math.sin(playerFacing) * orbit;

    ctx.save();
    ctx.translate(sx + ox, sy + oy);
    ctx.rotate(playerFacing);
    ctx.fillStyle = player.heldItem.color;
    ctx.fillRect(-ITEM_W / 2, -ITEM_H / 2, ITEM_W, ITEM_H);
    ctx.restore();
  }
}

function drawHUD() {
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(10, 10, 180, 44);
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1;
  ctx.strokeRect(10, 10, 180, 44);

  ctx.font = '13px monospace';
  ctx.textAlign = 'left';

  if (player.heldItem) {
    ctx.fillStyle = player.heldItem.color;
    ctx.fillRect(18, 22, 12, 12);
    ctx.fillStyle = '#fff';
    ctx.fillText('Holding: ' + player.heldItem.label, 36, 34);
  } else {
    ctx.fillStyle = '#888';
    ctx.fillText('Holding: nothing', 18, 34);
  }

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(CANVAS_W - 160, CANVAS_H - 36, 150, 26);
  ctx.fillStyle = '#ccc';
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('Arrows/WASD: move  E: pick up', CANVAS_W - 155, CANVAS_H - 18);
}

function render() {
  // Brown exterior ground
  ctx.fillStyle = '#8B6914';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  drawFloor();
  drawWalls();

  const nearestItem = findNearestItem();
  drawItems(nearestItem);
  drawPlayer();
  drawHUD();
}

// --- Game loop ---
function update() {
  handleMovement();
  updateCamera();
}

function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

// --- Init ---
buildings.forEach(buildBuilding);

spawnItems([
  // Building 1 interior (starts at world 182, 182)
  { x: 280, y: 280, label: 'Key',  color: '#fa4' },
  { x: 460, y: 340, label: 'Gem',  color: '#4fa' },
  { x: 360, y: 460, label: 'Coin', color: '#ff4' },
  // Building 2 interior (starts at world 812, 232)
  { x: 880, y: 310, label: 'Map',  color: '#f4a' },
  { x: 980, y: 390, label: 'Orb',  color: '#a4f' },
]);

// Place player in center of building 1
const b1 = buildings[0];
player.x = b1.x + WALL_T + b1.w / 2 - player.w / 2;
player.y = b1.y + WALL_T + b1.h / 2 - player.h / 2;

updateCamera();
requestAnimationFrame(gameLoop);
