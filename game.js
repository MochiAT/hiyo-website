/* ============================================================
   HI-YO FLAPPY HORSE — game.js
   Canvas-based Flappy Bird clone with a white horse, Japanese
   candlestick obstacles, coin collectibles and green-book immunity.
   ============================================================ */

(function () {
  'use strict';

  /* ── Canvas setup ─────────────────────────────────── */
  const container = document.getElementById('game-container');
  const canvas    = document.getElementById('game-canvas');
  const ctx       = canvas.getContext('2d');

  const BG        = '#18181B';
  const GRAVITY   = 0.38;
  const JUMP_VEL  = -7.5;
  const PIPE_W    = 52;      // candle body width
  const PIPE_WICK = 8;       // wick half-width in px
  const GAP_START  = 170;    // initial gap (easy)
  const GAP_MIN    = 95;     // minimum gap (hard cap)
  // gap shrinks by 3px per point, floored at GAP_MIN
  function currentGap() { return Math.max(GAP_MIN, GAP_START - score * 3); }
  const PIPE_SPEED_INIT = 2.4;
  const COIN_R    = 12;
  const BOOK_W    = 28;
  const BOOK_H    = 32;
  const IMMUNITY_SECS = 4;

  let W, H;
  function resize() {
    W = canvas.width  = container.clientWidth;
    H = canvas.height = container.clientHeight;
  }
  resize();
  window.addEventListener('resize', () => { resize(); if (state === 'idle') drawIdle(); });

  /* ── Horse SVG image ─────────────────────────────── */
  const horseImg = new Image();
  horseImg.src   = './assets/hiyo-horse-character-game.png';
  let horseReady = false;
  horseImg.onload = () => { horseReady = true; };

  /* ── State ────────────────────────────────────────── */
  let state = 'idle'; // idle | playing | dead
  let score, hiScore = 0, coinScore;
  let pipes, coins, books;
  let horse;
  let pipeTimer, coinTimer, bookTimer;
  let pipeSpeed;
  let immunityTimer = 0;
  let frameId;
  let flashFrame = 0;

  /* ── Horse object ─────────────────────────────────── */
  const HORSE_W = 64, HORSE_H = 52;

  function horseCreate() {
    return {
      x: W * 0.22,
      y: H / 2,
      vy: 0,
      dead: false
    };
  }
  function horseJump(h) { h.vy = JUMP_VEL; }
  function horseUpdate(h) {
    h.vy += GRAVITY;
    h.y  += h.vy;
  }

  /* ── Draw horse using SVG image ──────────────────── */
  function drawHorse(cx, cy, angle, immune) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    const dw = 90, dh = 65; // display size on canvas

    // Immunity glow
    if (immune) {
      const grd = ctx.createRadialGradient(0, 0, 18, 0, 0, 52);
      grd.addColorStop(0, 'rgba(74,222,128,0.55)');
      grd.addColorStop(1, 'rgba(74,222,128,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.ellipse(0, 0, 52, 38, 0, 0, Math.PI * 2);
      ctx.fill();
      // green tint overlay on horse
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(-dw / 2, -dh / 2, dw, dh);
      ctx.globalAlpha = 1;
    }

    if (horseReady) {
      // SVG viewBox is 210x145, centre on origin
      ctx.drawImage(horseImg, -dw / 2, -dh / 2, dw, dh);
    } else {
      // Fallback: simple white oval until image loads
      ctx.fillStyle = immune ? '#bbf7d0' : '#fff';
      ctx.beginPath();
      ctx.ellipse(0, 0, 28, 18, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /* ── Candlestick drawing ──────────────────────────── */
  function drawCandle(x, top, bottom, fromTop, bullish) {
    // fromTop: true = hanging from ceiling (red), false = rising from floor (green)
    const bodyColor  = bullish ? '#22c55e' : '#ef4444';
    const wickColor  = bullish ? '#16a34a' : '#dc2626';

    if (fromTop) {
      const bodyTop    = 0;
      const bodyBottom = bottom; // bottom of body relative to canvas top
      const bodyH      = bodyBottom;

      // Wick (top, goes upward off screen - not drawn; bottom wick below body)
      ctx.fillStyle = wickColor;
      ctx.fillRect(x + PIPE_W / 2 - PIPE_WICK / 2, bodyBottom, PIPE_WICK, 14);

      // Body
      ctx.fillStyle = bodyColor;
      ctx.fillRect(x, bodyTop, PIPE_W, bodyH);

      // highlight
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(x + 4, bodyTop, 10, bodyH);

      // Border
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, bodyTop, PIPE_W, bodyH);

      // Wick top (into ceiling)
      ctx.fillStyle = wickColor;
      ctx.fillRect(x + PIPE_W / 2 - PIPE_WICK / 2, 0, PIPE_WICK, 10);

    } else {
      // Rising from bottom
      const bodyTop    = top; // canvas y where body starts
      const bodyH      = H - bodyTop;

      // Wick above body
      ctx.fillStyle = wickColor;
      ctx.fillRect(x + PIPE_W / 2 - PIPE_WICK / 2, bodyTop - 14, PIPE_WICK, 14);

      // Body
      ctx.fillStyle = bodyColor;
      ctx.fillRect(x, bodyTop, PIPE_W, bodyH);

      // highlight
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(x + 4, bodyTop, 10, bodyH);

      // Border
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, bodyTop, PIPE_W, bodyH);
    }
  }

  /* ── Pipe (pair of candles) factory ──────────────── */
  function createPipe() {
    const gap     = currentGap();
    const minBody = 60;
    const maxBody = H - gap - minBody;
    const topH    = minBody + Math.random() * maxBody;
    return {
      x:      W + 10,
      topH,
      gap,           // store the gap this pipe was created with
      botY:   topH + gap,
      passed: false
    };
  }

  /* ── Coin factory ─────────────────────────────────── */
  function createCoin(pipes) {
    const p = pipes[Math.floor(Math.random() * pipes.length)];
    if (!p) return null;
    const gapMid = p.topH + p.gap / 2;
    return {
      x:    p.x + PIPE_W / 2,
      y:    gapMid + (Math.random() - 0.5) * p.gap * 0.35,
      r:    COIN_R,
      collected: false,
      glimmer: Math.random() * Math.PI * 2
    };
  }

  /* ── Book factory ─────────────────────────────────── */
  function createBook(pipes) {
    const p = pipes[Math.floor(Math.random() * pipes.length)];
    if (!p) return null;
    const gapMid = p.topH + p.gap / 2;
    return {
      x:    p.x + PIPE_W / 2,
      y:    gapMid + (Math.random() - 0.5) * p.gap * 0.28,
      collected: false,
      bob: 0
    };
  }

  /* ── Draw coin ────────────────────────────────────── */
  function drawCoin(c, now) {
    if (c.collected) return;
    const shine = Math.sin(now * 3 + c.glimmer);
    ctx.save();
    ctx.translate(c.x, c.y);
    // glow
    const grd = ctx.createRadialGradient(0, 0, 2, 0, 0, c.r + 6);
    grd.addColorStop(0, 'rgba(250,204,21,0.6)');
    grd.addColorStop(1, 'rgba(250,204,21,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(0, 0, c.r + 6, 0, Math.PI * 2);
    ctx.fill();
    // coin body
    const coinGrd = ctx.createRadialGradient(-3, -3, 1, 0, 0, c.r);
    coinGrd.addColorStop(0, '#fde68a');
    coinGrd.addColorStop(0.6, '#f59e0b');
    coinGrd.addColorStop(1, '#b45309');
    ctx.fillStyle = coinGrd;
    ctx.beginPath();
    ctx.arc(0, 0, c.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // $ sign
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${c.r}px Inter,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 0, 0.5);
    ctx.restore();
  }

  /* ── Draw book ─────────────────────────────────────── */
  function drawBook(b, now) {
    if (b.collected) return;
    const bob = Math.sin(now * 2.5 + b.bob) * 4;
    ctx.save();
    ctx.translate(b.x, b.y + bob);
    // glow
    const grd = ctx.createRadialGradient(0, 0, 4, 0, 0, 30);
    grd.addColorStop(0, 'rgba(74,222,128,0.55)');
    grd.addColorStop(1, 'rgba(74,222,128,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.ellipse(0, 0, 30, 26, 0, 0, Math.PI * 2);
    ctx.fill();

    const bw = BOOK_W, bh = BOOK_H;
    // cover
    ctx.fillStyle = '#16a34a';
    ctx.strokeStyle = '#14532d';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 3);
    ctx.fill();
    ctx.stroke();
    // spine
    ctx.fillStyle = '#15803d';
    ctx.fillRect(-bw / 2, -bh / 2, 5, bh);
    // pages
    ctx.fillStyle = '#fafaf9';
    ctx.fillRect(-bw / 2 + 6, -bh / 2 + 3, bw - 9, bh - 6);
    // lines
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(-bw / 2 + 8,  -bh / 2 + 8 + i * 5);
      ctx.lineTo(bw / 2 - 3,   -bh / 2 + 8 + i * 5);
      ctx.stroke();
    }
    // star icon on cover
    ctx.fillStyle = '#4ade80';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', -bw / 2 + 2.5, 0);

    ctx.restore();
  }

  /* ── Collision ─────────────────────────────────────── */
  function horseRect(h) {
    return { x: h.x - 22, y: h.y - 16, w: 44, h: 32 };
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function circleRectOverlap(cx, cy, r, rx, ry, rw, rh) {
    const nearX = Math.max(rx, Math.min(cx, rx + rw));
    const nearY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - nearX, dy = cy - nearY;
    return dx * dx + dy * dy < r * r;
  }

  /* ── HUD ───────────────────────────────────────────── */
  function drawHUD() {
    // Score badge
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, W / 2 - 80, 16, 160, 48, 12);
    ctx.fill();
    ctx.stroke();
    // Score text
    ctx.font = "bold 28px 'Bangers', cursive";
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`SCORE  ${score}`, W / 2, 40);
    ctx.restore();

    // Coin badge
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, 16, 16, 130, 42, 10);
    ctx.fill();
    ctx.stroke();
    // coin icon
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(36, 37, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = "bold 11px Inter,sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 36, 37.5);
    ctx.fillStyle = '#fde68a';
    ctx.font = "bold 18px 'Bangers', cursive";
    ctx.textAlign = 'left';
    ctx.fillText(`× ${coinScore}`, 52, 37);
    ctx.restore();

    // Immunity bar
    if (immunityTimer > 0) {
      const barW = 160, barH = 10;
      const bx = W / 2 - barW / 2, by = 72;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.roundRect(bx, by, barW, barH, 5);
      ctx.fill();
      const pct = immunityTimer / (IMMUNITY_SECS * 60);
      const grd = ctx.createLinearGradient(bx, 0, bx + barW, 0);
      grd.addColorStop(0, '#4ade80');
      grd.addColorStop(1, '#22c55e');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.roundRect(bx, by, barW * pct, barH, 5);
      ctx.fill();
      ctx.fillStyle = '#bbf7d0';
      ctx.font = "bold 9px Inter,sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('IMMUNITY', W / 2, by + barH / 2);
    }
  }

  /* ── Idle / start screen ───────────────────────────── */
  function drawIdle() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    // decorative candles in background
    drawBgCandles();

    // card — taller to accommodate spacing
    const cw = Math.min(420, W - 40), ch = 300;
    const cx = W / 2 - cw / 2, cy = H / 2 - ch / 2;
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    roundRect(ctx, cx, cy, cw, ch, 16);
    ctx.fill();
    ctx.stroke();

    // Title
    ctx.fillStyle = '#fff';
    ctx.font = "bold 42px 'Bangers', cursive";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('HI-YO RUNNER', W / 2, cy + 50);

    // Horse preview — more room below title (was cy+106, now cy+148)
    drawHorse(W / 2, cy + 152, -0.12, false);

    // ── Comic-style button (matches site's navbar__buy / hero-btn) ──
    const btnW = 230, btnH = 48;
    const btnX = W / 2 - btnW / 2;
    const btnY = cy + ch - 72;

    // Hard black shadow (offset 4px)
    ctx.fillStyle = '#000';
    ctx.fillRect(btnX + 4, btnY + 4, btnW, btnH);

    // Button fill (red)
    ctx.fillStyle = '#E21D26';
    ctx.fillRect(btnX, btnY, btnW, btnH);

    // Black border
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeRect(btnX, btnY, btnW, btnH);

    // Button label
    ctx.fillStyle = '#fff';
    ctx.font = "bold 24px 'Bangers', cursive";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CLICK / SPACE TO PLAY', W / 2, btnY + btnH / 2 + 1);

    requestAnimationFrame(drawIdle);
  }

  function drawBgCandles() {
    const colors = ['#ef444444', '#22c55e44'];
    for (let i = 0; i < 8; i++) {
      const x = (W / 9) * (i + 0.5) - 30;
      const h = 40 + Math.random() * 80;
      const bull = i % 2 === 0;
      ctx.fillStyle = bull ? '#22c55e22' : '#ef444422';
      ctx.fillRect(x, H / 2 - h / 2, 40, h);
    }
  }

  /* ── Game over screen ──────────────────────────────── */
  function drawGameOver() {
    // dim overlay
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, H);

    const cw = Math.min(380, W - 40), ch = 240;
    const cx = W / 2 - cw / 2, cy = H / 2 - ch / 2;
    ctx.fillStyle = '#1a1a1a';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    roundRect(ctx, cx, cy, cw, ch, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.font = "bold 44px 'Bangers', cursive";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GAME OVER', W / 2, cy + 50);

    ctx.fillStyle = '#fff';
    ctx.font = "22px 'Bangers', cursive";
    ctx.fillText(`SCORE: ${score}     COINS: ${coinScore}`, W / 2, cy + 94);

    if (score > hiScore) {
      hiScore = score;
      ctx.fillStyle = '#fde68a';
      ctx.font = "18px 'Bangers', cursive";
      ctx.fillText('✦ NEW BEST ✦', W / 2, cy + 124);
    } else {
      ctx.fillStyle = '#9ca3af';
      ctx.font = "16px 'Bangers', cursive";
      ctx.fillText(`BEST: ${hiScore}`, W / 2, cy + 124);
    }

    // ── Comic-style restart button ──────────────────────
    const btnW = 210, btnH = 48;
    const btnX = W / 2 - btnW / 2;
    const btnY = cy + ch - 68;

    // Hard black shadow
    ctx.fillStyle = '#000';
    ctx.fillRect(btnX + 4, btnY + 4, btnW, btnH);

    // Button fill (red)
    ctx.fillStyle = '#E21D26';
    ctx.fillRect(btnX, btnY, btnW, btnH);

    // Black border
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeRect(btnX, btnY, btnW, btnH);

    // Button label
    ctx.fillStyle = '#fff';
    ctx.font = "bold 24px 'Bangers', cursive";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PLAY AGAIN', W / 2, btnY + btnH / 2 + 1);

    requestAnimationFrame(drawGameOver);
  }

  /* ── Utility: round rect ───────────────────────────── */
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /* ── Start game ────────────────────────────────────── */
  function startGame() {
    cancelAnimationFrame(frameId);
    state       = 'playing';
    score       = 0;
    coinScore   = 0;
    pipes       = [];
    coins       = [];
    books       = [];
    horse       = horseCreate();
    pipeTimer   = 85;  // first pipe appears after ~25 frames instead of 110
    coinTimer   = 0;
    bookTimer   = 0;
    pipeSpeed   = PIPE_SPEED_INIT;
    immunityTimer = 0;
    flashFrame  = 0;
    loop();
  }

  /* ── Main loop ─────────────────────────────────────── */
  function loop() {
    if (state !== 'playing') return;
    frameId = requestAnimationFrame(loop);

    const now = performance.now() / 1000;

    /* --- update --- */
    horseUpdate(horse);
    if (immunityTimer > 0) immunityTimer--;

    // clamp at ceiling
    if (horse.y - 20 < 0) { horse.y = 20; horse.vy = 0; }

    // Increase speed gradually
    pipeSpeed = PIPE_SPEED_INIT + score * 0.035;

    // Spawn pipe
    pipeTimer++;
    const pipeInterval = Math.max(70, 110 - score * 1.2);
    if (pipeTimer >= pipeInterval) { pipes.push(createPipe()); pipeTimer = 0; }

    // Spawn coin (roughly every 120 frames if pipes exist)
    coinTimer++;
    if (coinTimer >= 120 && pipes.length) {
      const c = createCoin(pipes);
      if (c) coins.push(c);
      coinTimer = 0;
    }

    // Spawn book (roughly every 400 frames)
    bookTimer++;
    if (bookTimer >= 400 && pipes.length) {
      const b = createBook(pipes);
      if (b) books.push(b);
      bookTimer = 0;
    }

    // Move pipes
    pipes.forEach(p => {
      p.x -= pipeSpeed;
      if (!p.passed && p.x + PIPE_W < horse.x) {
        p.passed = true;
        score++;
      }
    });
    pipes = pipes.filter(p => p.x + PIPE_W + 30 > 0);

    // Move coins & books along with pipes
    coins.forEach(c => { c.x -= pipeSpeed; c.glimmer += 0.05; });
    books.forEach(b => { b.x -= pipeSpeed; b.bob += 0.04; });
    coins = coins.filter(c => c.x + COIN_R > 0);
    books = books.filter(b => b.x + BOOK_W > 0);

    /* --- collision --- */
    const hr = horseRect(horse);

    // Pipe collision
    if (immunityTimer <= 0) {
      for (const p of pipes) {
        const topRect = { x: p.x, y: 0,      w: PIPE_W, h: p.topH };
        const botRect = { x: p.x, y: p.botY,  w: PIPE_W, h: H - p.botY };
        if (rectsOverlap(hr, topRect) || rectsOverlap(hr, botRect)) {
          killHorse(); return;
        }
      }
    }

    // Floor collision
    if (horse.y + 20 > H) { horse.y = H - 20; killHorse(); return; }

    // Coin collection
    coins.forEach(c => {
      if (!c.collected && circleRectOverlap(c.x, c.y, c.r, hr.x, hr.y, hr.w, hr.h)) {
        c.collected = true;
        coinScore++;
        score += 5;
        spawnParticles(c.x, c.y, '#f59e0b');
      }
    });

    // Book collection
    books.forEach(b => {
      if (!b.collected) {
        const br = { x: b.x - BOOK_W / 2, y: b.y - BOOK_H / 2, w: BOOK_W, h: BOOK_H };
        if (rectsOverlap(hr, br)) {
          b.collected = true;
          immunityTimer = IMMUNITY_SECS * 60;
          spawnParticles(b.x, b.y, '#4ade80');
        }
      }
    });

    /* --- draw --- */
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    // Grid lines (subtle chart feel)
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Pipes
    pipes.forEach(p => {
      drawCandle(p.x, 0,     p.topH, true,  false); // red top
      drawCandle(p.x, p.botY, H,    false, true);   // green bottom
    });

    // Collectibles
    coins.forEach(c => drawCoin(c, now));
    books.forEach(b => drawBook(b, now));

    // Particles
    updateParticles();

    // Horse
    const angle = Math.max(-0.45, Math.min(0.55, horse.vy * 0.055));
    const isImmune = immunityTimer > 0;
    if (!isImmune || flashFrame++ % 8 < 4) {
      drawHorse(horse.x, horse.y, angle, isImmune);
    }

    // HUD
    drawHUD();
  }

  /* ── Kill horse ────────────────────────────────────── */
  function killHorse() {
    state = 'dead';
    cancelAnimationFrame(frameId);
    // Death particles
    spawnParticles(horse.x, horse.y, '#ef4444', 20);
    // Draw once more then show overlay
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(239,68,68,0.18)';
    ctx.fillRect(0, 0, W, H);
    pipes.forEach(p => {
      drawCandle(p.x, 0, p.topH, true, false);
      drawCandle(p.x, p.botY, H, false, true);
    });
    coins.forEach(c => drawCoin(c, performance.now() / 1000));
    books.forEach(b => drawBook(b, performance.now() / 1000));
    drawHorse(horse.x, horse.y, 0.5, false);
    updateParticles();
    drawGameOver();
  }

  /* ── Particles ─────────────────────────────────────── */
  let particles = [];

  function spawnParticles(x, y, color, n = 12) {
    for (let i = 0; i < n; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3.5;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 1,
        decay: 0.025 + Math.random() * 0.02,
        r: 2 + Math.random() * 3,
        color
      });
    }
  }

  function updateParticles() {
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += 0.12;
      p.life -= p.decay;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  /* ── Input ─────────────────────────────────────────── */
  function handleInput() {
    if (state === 'idle') { startGame(); return; }
    if (state === 'playing') { horseJump(horse); return; }
    if (state === 'dead') { startGame(); return; }
  }

  canvas.addEventListener('click',     handleInput);
  canvas.addEventListener('touchstart', e => { e.preventDefault(); handleInput(); }, { passive: false });
  document.addEventListener('keydown', e => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      // only intercept if game is in view
      const rect = canvas.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      if (inView) { e.preventDefault(); handleInput(); }
    }
  });

  /* ── Kick off ──────────────────────────────────────── */
  drawIdle();
})();
