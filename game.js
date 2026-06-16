// --- Constants ---
const CANVAS_W    = 800;
const CANVAS_H    = 600;
const ROOM_W      = 1200;
const ROOM_H      = 900;
const WALL_T      = 32;
const PLAYER_W    = 24;
const PLAYER_H    = 24;
const PLAYER_SPEED = 3;
const ITEM_W      = 20;
const ITEM_H      = 20;
const PICKUP_RADIUS = 40;
const DOOR_WIDTH  = 60;

// --- Canvas setup ---
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
canvas.width  = CANVAS_W;
canvas.height = CANVAS_H;

// --- World dimensions ---
const WORLD_W = ROOM_W + WALL_T * 2;
const WORLD_H = ROOM_H + WALL_T * 2;

// --- Game state ---
const keys = {};
let eKeyDown = false; // edge-trigger tracker for E

const camera = { x: 0, y: 0 };

const player = {
  x: 0, y: 0,
  w: PLAYER_W, h: PLAYER_H,
  speed: PLAYER_SPEED,
  heldItem: null,
  color: '#4af'
};

const room = {
  walls: [],
  floorColor: '#2a2a2a',
  wallColor:  '#555'
};

const items = [];

// --- Room construction ---
function buildRoom() {
  const fullW   = WORLD_W;
  const fullH   = WORLD_H;
  const rightX  = WALL_T + ROOM_W;
  const bottomY = WALL_T + ROOM_H;

  // Top wall — door centered horizontally
  const topDoorX = WALL_T + ROOM_W / 2 - DOOR_WIDTH / 2;
  room.walls.push({ x: 0,                      y: 0, w: topDoorX,                  h: WALL_T });
  room.walls.push({ x: topDoorX + DOOR_WIDTH,  y: 0, w: fullW - topDoorX - DOOR_WIDTH, h: WALL_T });

  // Bottom wall — door centered horizontally
  room.walls.push({ x: 0,                      y: bottomY, w: topDoorX,                  h: WALL_T });
  room.walls.push({ x: topDoorX + DOOR_WIDTH,  y: bottomY, w: fullW - topDoorX - DOOR_WIDTH, h: WALL_T });

  // Left wall — full height, no door
  room.walls.push({ x: 0,      y: 0, w: WALL_T, h: fullH });

  // Right wall — full height, no door
  room.walls.push({ x: rightX, y: 0, w: WALL_T, h: fullH });
}

// --- Item spawning ---
function spawnItems(defs) {
  for (const d of defs) {
    items.push({
      x: WALL_T + d.x,
      y: WALL_T + d.y,
      w: ITEM_W,
      h: ITEM_H,
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

// --- Camera update ---
function updateCamera() {
  camera.x = player.x + player.w / 2 - CANVAS_W / 2;
  camera.y = player.y + player.h / 2 - CANVAS_H / 2;
  camera.x = Math.max(0, Math.min(camera.x, WORLD_W - CANVAS_W));
  camera.y = Math.max(0, Math.min(camera.y, WORLD_H - CANVAS_H));
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
  for (const wall of room.walls) {
    if (aabbOverlap(player.x, player.y, player.w, player.h,
                    wall.x, wall.y, wall.w, wall.h)) {
      if (dx > 0) player.x = wall.x - player.w;
      if (dx < 0) player.x = wall.x + wall.w;
    }
  }

  // Y axis
  player.y += dy;
  for (const wall of room.walls) {
    if (aabbOverlap(player.x, player.y, player.w, player.h,
                    wall.x, wall.y, wall.w, wall.h)) {
      if (dy > 0) player.y = wall.y - player.h;
      if (dy < 0) player.y = wall.y + wall.h;
    }
  }

  // Clamp to world bounds
  player.x = Math.max(0, Math.min(player.x, WORLD_W - player.w));
  player.y = Math.max(0, Math.min(player.y, WORLD_H - player.h));
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

// --- Interact: pickup or drop (edge-triggered from keydown) ---
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
  // Prevent arrow keys from scrolling the page
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) {
    e.preventDefault();
  }

  keys[e.code] = true;

  // E key: edge-trigger (fire only on first press, not on repeat)
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
  const { sx, sy } = toScreen(WALL_T, WALL_T);
  ctx.fillStyle = room.floorColor;
  ctx.fillRect(sx, sy, ROOM_W, ROOM_H);
}

function drawWalls() {
  ctx.fillStyle = room.wallColor;
  for (const wall of room.walls) {
    const { sx, sy } = toScreen(wall.x, wall.y);
    ctx.fillRect(sx, sy, wall.w, wall.h);
  }
}

function drawItems(nearestItem) {
  for (const item of items) {
    if (item.held) continue;

    const { sx, sy } = toScreen(item.x, item.y);

    // Item body
    ctx.fillStyle = item.color;
    ctx.fillRect(sx, sy, item.w, item.h);

    // Item label below
    ctx.fillStyle = '#ccc';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(item.label, sx + item.w / 2, sy + item.h + 12);

    // Pickup hint above nearest item only
    if (item === nearestItem) {
      ctx.fillStyle = '#fff';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('[E]', sx + item.w / 2, sy - 6);
    }
  }
}

function drawPlayer() {
  const { sx, sy } = toScreen(player.x, player.y);

  ctx.fillStyle = player.color;
  ctx.fillRect(sx, sy, player.w, player.h);

  // Direction dot (top-center)
  ctx.fillStyle = '#fff';
  ctx.fillRect(sx + player.w / 2 - 3, sy + 4, 6, 6);

  // Draw held item on top of player
  if (player.heldItem !== null) {
    ctx.fillStyle = player.heldItem.color;
    ctx.fillRect(sx + player.w / 2 - ITEM_W / 2, sy - ITEM_H - 2, ITEM_W, ITEM_H);
  }
}

function drawHUD() {
  // Background box
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(10, 10, 180, 44);

  // Border
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1;
  ctx.strokeRect(10, 10, 180, 44);

  ctx.fillStyle = '#fff';
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

  // Controls hint bottom-right
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(CANVAS_W - 160, CANVAS_H - 36, 150, 26);
  ctx.fillStyle = '#666';
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('Arrows/WASD: move  E: pick up', CANVAS_W - 155, CANVAS_H - 18);
}

function render() {
  // Clear with dark background (wall exterior color)
  ctx.fillStyle = '#111';
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
buildRoom();

spawnItems([
  { x: 300, y: 300, label: 'Key',  color: '#fa4' },
  { x: 800, y: 200, label: 'Gem',  color: '#4fa' },
  { x: 200, y: 600, label: 'Coin', color: '#ff4' },
  { x: 900, y: 650, label: 'Map',  color: '#f4a' },
]);

// Place player in room center
player.x = WALL_T + ROOM_W / 2 - player.w / 2;
player.y = WALL_T + ROOM_H / 2 - player.h / 2;

updateCamera();
requestAnimationFrame(gameLoop);
