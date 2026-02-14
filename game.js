(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const stats = document.getElementById("stats");

  const TILE = 24;
  const WORLD_W = 220;
  const WORLD_H = 90;
  const GRAVITY = 0.45;

  const keys = new Set();
  const mouse = { x: 0, y: 0 };

  const world = Array.from({ length: WORLD_H }, () => Array(WORLD_W).fill(0));

  const texturePaths = {
    dirt: "textures/dirt.png",
    stone: "textures/stone.png",
    deepStone: "textures/deep-stone.png",
    grassTop: "textures/grass-top.png",
    tree: "textures/tree.png",
    player: "textures/player.png",
    pickaxe: "textures/pickaxe.png",
  };

  const textures = {};

  function loadTexture(path) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ ok: true, img, path });
      img.onerror = () => resolve({ ok: false, img: null, path });
      img.src = path;
    });
  }

  async function loadTextures() {
    const entries = await Promise.all(
      Object.entries(texturePaths).map(async ([key, path]) => [key, await loadTexture(path)]),
    );
    for (const [key, value] of entries) textures[key] = value;
  }

  function generateWorld() {
    let base = 32;
    for (let x = 0; x < WORLD_W; x++) {
      base += (Math.random() - 0.5) * 1.8;
      base = Math.max(24, Math.min(42, base));
      const ground = Math.floor(base);
      for (let y = ground; y < WORLD_H; y++) {
        world[y][x] = y === ground ? 1 : y < ground + 3 ? 2 : 3;
      }
      if (Math.random() < 0.06 && ground > 8) world[ground - 1][x] = 4;
    }

    for (let i = 0; i < 900; i++) {
      const cx = Math.floor(Math.random() * WORLD_W);
      const cy = 42 + Math.floor(Math.random() * (WORLD_H - 42));
      const r = 2 + Math.floor(Math.random() * 4);
      for (let y = cy - r; y <= cy + r; y++) {
        for (let x = cx - r; x <= cx + r; x++) {
          if (!inBounds(x, y)) continue;
          const dx = x - cx;
          const dy = y - cy;
          if (dx * dx + dy * dy <= r * r) world[y][x] = 0;
        }
      }
    }
  }

  const player = {
    x: 20 * TILE,
    y: 12 * TILE,
    w: 16,
    h: 28,
    vx: 0,
    vy: 0,
    onGround: false,
    dirt: 20,
    stone: 0,
    wood: 0,
    facing: 1,
    swing: 0,
  };

  function inBounds(x, y) {
    return x >= 0 && x < WORLD_W && y >= 0 && y < WORLD_H;
  }

  function getTile(x, y) {
    if (!inBounds(x, y)) return 3;
    return world[y][x];
  }

  function setTile(x, y, v) {
    if (!inBounds(x, y)) return;
    world[y][x] = v;
  }

  function rectHitsSolid(x, y, w, h) {
    const x0 = Math.floor(x / TILE);
    const y0 = Math.floor(y / TILE);
    const x1 = Math.floor((x + w - 1) / TILE);
    const y1 = Math.floor((y + h - 1) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const t = getTile(tx, ty);
        if (t === 1 || t === 2 || t === 3 || t === 4) return true;
      }
    }
    return false;
  }

  function movePlayer() {
    player.x += player.vx;
    if (rectHitsSolid(player.x, player.y, player.w, player.h)) {
      player.x -= player.vx;
      player.vx = 0;
    }

    player.y += player.vy;
    if (rectHitsSolid(player.x, player.y, player.w, player.h)) {
      player.y -= player.vy;
      if (player.vy > 0) player.onGround = true;
      player.vy = 0;
    }
  }

  function mineAt(screenX, screenY, cameraX, cameraY) {
    const worldX = Math.floor((screenX + cameraX) / TILE);
    const worldY = Math.floor((screenY + cameraY) / TILE);
    const px = Math.floor((player.x + player.w / 2) / TILE);
    const py = Math.floor((player.y + player.h / 2) / TILE);

    if (Math.hypot(worldX - px, worldY - py) > 6) return;
    const t = getTile(worldX, worldY);
    if (t === 0) return;

    if (t === 1) player.dirt += 1;
    if (t === 2 || t === 3) player.stone += 1;
    if (t === 4) player.wood += 1;
    setTile(worldX, worldY, 0);
  }

  function placeAt(screenX, screenY, cameraX, cameraY) {
    if (player.dirt <= 0) return;
    const worldX = Math.floor((screenX + cameraX) / TILE);
    const worldY = Math.floor((screenY + cameraY) / TILE);
    if (getTile(worldX, worldY) !== 0) return;

    const placeRect = { x: worldX * TILE, y: worldY * TILE, w: TILE, h: TILE };
    const overlapPlayer = !(
      placeRect.x + placeRect.w <= player.x ||
      placeRect.x >= player.x + player.w ||
      placeRect.y + placeRect.h <= player.y ||
      placeRect.y >= player.y + player.h
    );
    if (overlapPlayer) return;
    setTile(worldX, worldY, 1);
    player.dirt -= 1;
  }

  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    mouse.y = ((e.clientY - rect.top) / rect.height) * canvas.height;
  });

  canvas.addEventListener("mousedown", (e) => {
    const camX = player.x - canvas.width / 2;
    const camY = player.y - canvas.height / 2;
    player.swing = 0.25;
    if (e.button === 0) mineAt(mouse.x, mouse.y, camX, camY);
    if (e.button === 2) placeAt(mouse.x, mouse.y, camX, camY);
  });

  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  window.addEventListener("keydown", (e) => {
    keys.add(e.key.toLowerCase());
    if (e.key === " ") e.preventDefault();
  });

  window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

  function drawTexture(tex, x, y, w, h, fallback) {
    if (tex?.ok) {
      ctx.drawImage(tex.img, x, y, w, h);
      return;
    }
    ctx.fillStyle = fallback;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#ff00d9";
    ctx.fillRect(x + 2, y + 2, 4, 4);
  }

  function drawPickaxe(px, py) {
    const armX = px + player.w / 2;
    const armY = py + 12;
    const base = player.facing === 1 ? -0.35 : Math.PI + 0.35;
    const swingOffset = (0.25 - player.swing) * 5;
    const angle = base + swingOffset * player.facing;

    ctx.save();
    ctx.translate(armX, armY);
    ctx.rotate(angle);

    const pickTex = textures.pickaxe;
    if (pickTex?.ok) {
      ctx.drawImage(pickTex.img, 0, -6, 20, 12);
    } else {
      ctx.fillStyle = "#8f6336";
      ctx.fillRect(0, -1, 16, 2);
      ctx.fillStyle = "#9fb3c8";
      ctx.fillRect(11, -5, 8, 6);
    }
    ctx.restore();
  }

  function update() {
    player.vx *= 0.82;
    if (keys.has("a")) {
      player.vx -= 0.6;
      player.facing = -1;
    }
    if (keys.has("d")) {
      player.vx += 0.6;
      player.facing = 1;
    }
    if (keys.has(" ") && player.onGround) {
      player.vy = -9;
      player.onGround = false;
    }

    player.vx = Math.max(-4.2, Math.min(4.2, player.vx));
    player.vy += GRAVITY;
    player.vy = Math.min(player.vy, 11);
    player.onGround = false;
    movePlayer();

    player.swing = Math.max(0, player.swing - 0.02);
  }

  function draw() {
    const camX = Math.max(0, Math.min(player.x - canvas.width / 2, WORLD_W * TILE - canvas.width));
    const camY = Math.max(0, Math.min(player.y - canvas.height / 2, WORLD_H * TILE - canvas.height));

    ctx.fillStyle = "#7fbcff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const x0 = Math.floor(camX / TILE);
    const y0 = Math.floor(camY / TILE);
    const x1 = Math.ceil((camX + canvas.width) / TILE);
    const y1 = Math.ceil((camY + canvas.height) / TILE);

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const t = getTile(x, y);
        if (!t) continue;
        const px = x * TILE - camX;
        const py = y * TILE - camY;

        if (t === 1) {
          drawTexture(textures.dirt, px, py, TILE, TILE, "#8f6f48");
          drawTexture(textures.grassTop, px, py, TILE, 6, "#5e9f4a");
        }
        if (t === 2) drawTexture(textures.stone, px, py, TILE, TILE, "#7f8aa2");
        if (t === 3) drawTexture(textures.deepStone, px, py, TILE, TILE, "#4e5670");
        if (t === 4) drawTexture(textures.tree, px, py, TILE, TILE, "#3a7d3d");
      }
    }

    const px = player.x - camX;
    const py = player.y - camY;
    drawTexture(textures.player, px, py, player.w, player.h, "#ffd166");
    drawPickaxe(px, py);

    const cursorTileX = Math.floor((mouse.x + camX) / TILE);
    const cursorTileY = Math.floor((mouse.y + camY) / TILE);
    ctx.strokeStyle = "rgba(255,255,255,0.65)";
    ctx.strokeRect(cursorTileX * TILE - camX, cursorTileY * TILE - camY, TILE, TILE);

    const missing = Object.values(textures).filter((x) => !x?.ok).length;
    stats.textContent = `Dirt: ${player.dirt} | Stone: ${player.stone} | Wood: ${player.wood} | Missing textures: ${missing}`;
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  async function init() {
    generateWorld();
    await loadTextures();
    loop();
  }

  init();
})();
