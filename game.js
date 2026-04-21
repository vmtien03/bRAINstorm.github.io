"use strict";

const WIDTH = 1000;
const HEIGHT = 720;
const FPS_STEP = 1000 / 60;
const RAINDROP_START_Y = -50;
const RAINDROP_SIZE = 80;
const RAINDROP_MISS_Y = HEIGHT - 300;

const COLORS = {
  white: "#ffffff",
  black: "#121826",
  bgTop: "#162b4e",
  bgBottom: "#4b87b3",
  panel: "#f7fbff",
  panelBorder: "#9dbed5",
  textMuted: "#586f84",
  accent: "#12969b",
  accentDark: "#086a77",
  red: "#e05252",
  green: "#40c47d",
  amber: "#f9bc4a",
  cyan: "#4fd2e2",
  keyBg: "#2a4158",
  keyHover: "#37546f"
};

const Operation = {
  ADD: "add",
  SUBTRACT: "subtract",
  MULTIPLY: "multiply",
  DIVIDE: "divide"
};

class Raindrop {
  constructor(x, y, operation, num1, num2, speed) {
    this.x = x;
    this.y = y;
    this.operation = operation;
    this.num1 = num1;
    this.num2 = num2;
    this.speed = speed;
    this.size = RAINDROP_SIZE;
  }

  getProblemText() {
    if (this.operation === Operation.ADD) return `${this.num1} + ${this.num2}`;
    if (this.operation === Operation.SUBTRACT) return `${this.num1} - ${this.num2}`;
    if (this.operation === Operation.MULTIPLY) return `${this.num1} x ${this.num2}`;
    return `${this.num1} / ${this.num2}`;
  }

  getAnswer() {
    if (this.operation === Operation.ADD) return this.num1 + this.num2;
    if (this.operation === Operation.SUBTRACT) return this.num1 - this.num2;
    if (this.operation === Operation.MULTIPLY) return this.num1 * this.num2;
    return Math.trunc(this.num1 / this.num2);
  }

  update(stepScale) {
    this.y += this.speed * stepScale;
  }

  isOffScreen() {
    return this.y > RAINDROP_MISS_Y;
  }
}

class MathRainGame {
  constructor(canvas, shell) {
    this.canvas = canvas;
    this.shell = shell;
    this.ctx = canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = true;

    this.state = "menu";
    this.mouse = { x: -1000, y: -1000 };
    this.inputActive = false;
    this.inputText = "";
    this.inputFlashUntil = 0;
    this.recentAnswerText = "";
    this.recentAnswerUntil = 0;
    this.recentAnswerColor = COLORS.black;

    this.setupUi();
    this.resetGame();
    this.bindEvents();

    this.lastFrameTime = performance.now();
    requestAnimationFrame((time) => this.loop(time));
  }

  setupUi() {
    this.playButton = rect(WIDTH / 2 - 115, HEIGHT / 2 + 48, 230, 62);
    this.replayButton = rect(WIDTH / 2 - 115, HEIGHT / 2 + 26, 230, 56);
    this.quitButton = rect(WIDTH / 2 - 115, HEIGHT / 2 + 94, 230, 56);
    this.inputBox = rect(130, HEIGHT - 280, WIDTH - 260, 62);

    this.keyboardButtons = [];
    const keyW = 104;
    const keyH = 42;
    const gap = 10;
    const startX = (WIDTH - (4 * keyW + 3 * gap)) / 2;
    const startY = HEIGHT - 200;
    const rows = [
      ["7", "8", "9", "Back"],
      ["4", "5", "6", "-"],
      ["1", "2", "3", "0"]
    ];

    rows.forEach((row, rowIndex) => {
      row.forEach((label, colIndex) => {
        this.keyboardButtons.push({
          label,
          rect: rect(startX + colIndex * (keyW + gap), startY + rowIndex * (keyH + gap), keyW, keyH)
        });
      });
    });

    this.keyboardButtons.push({
      label: "Enter",
      rect: rect(startX, startY + 3 * (keyH + gap), 4 * keyW + 3 * gap, keyH)
    });
  }

  bindEvents() {
    this.canvas.addEventListener("pointermove", (event) => {
      this.mouse = this.getCanvasPoint(event);
    });

    this.canvas.addEventListener("pointerleave", () => {
      this.mouse = { x: -1000, y: -1000 };
    });

    this.canvas.addEventListener("pointerdown", (event) => {
      this.canvas.focus();
      const point = this.getCanvasPoint(event);
      this.handlePointerDown(point);
    });

    window.addEventListener("keydown", (event) => {
      this.handleKeyDown(event);
    });
  }

  getCanvasPoint(event) {
    const bounds = this.canvas.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * WIDTH / bounds.width,
      y: (event.clientY - bounds.top) * HEIGHT / bounds.height
    };
  }

  resetGame() {
    this.score = 0;
    this.lives = 3;
    this.problemsSolved = 0;
    this.speed = 1;
    this.raindrops = [];
    this.inputText = "";
    this.recentAnswerText = "";
    this.recentAnswerUntil = 0;
    this.nextSpawnTime = performance.now();
    this.spawnNewRaindrop();
    this.scheduleNextRaindrop();
  }

  startNewGame() {
    this.resetGame();
    this.state = "playing";
    this.inputActive = true;
  }

  getDifficultyLevel() {
    return Math.floor(this.problemsSolved / 10) + 1;
  }

  getSpeedForLevel(level) {
    if (level <= 2) return 1;
    if (level <= 4) return 2;
    if (level <= 6) return 3;
    return 3 + (level - 6);
  }

  getSpawnIntervalForLevel(level) {
    if (level <= 2) return 3200;
    if (level <= 4) return 2600;
    if (level <= 6) return 2100;
    return Math.max(900, 1800 - (level - 7) * 120);
  }

  getMaxRaindropsForLevel(level) {
    if (level <= 2) return 2;
    if (level <= 4) return 3;
    if (level <= 6) return 4;
    return Math.min(7, 5 + Math.floor((level - 7) / 2));
  }

  scheduleNextRaindrop() {
    this.nextSpawnTime = performance.now() + this.getSpawnIntervalForLevel(this.getDifficultyLevel());
  }

  getSpawnX() {
    const minX = RAINDROP_SIZE / 2 + 30;
    const maxX = WIDTH - RAINDROP_SIZE / 2 - 30;
    const minGap = RAINDROP_SIZE + 30;
    const nearbyDrops = this.raindrops.filter((drop) => drop.y < RAINDROP_SIZE * 2);

    for (let attempt = 0; attempt < 24; attempt += 1) {
      const x = randomInt(minX, maxX);
      if (nearbyDrops.every((drop) => Math.abs(x - drop.x) >= minGap)) return x;
    }

    return randomInt(minX, maxX);
  }

  spawnNewRaindrop() {
    const x = this.getSpawnX();
    const y = RAINDROP_START_Y;
    const operation = randomChoice(Object.values(Operation));
    const level = this.getDifficultyLevel();
    this.speed = this.getSpeedForLevel(level);
    let num1;
    let num2;

    if (operation === Operation.ADD) {
      if (level === 1) [num1, num2] = randomPair(1, 10);
      else if (level === 2) [num1, num2] = randomPair(1, 20);
      else if (level === 3) [num1, num2] = randomPair(10, 30);
      else if (level === 4) [num1, num2] = randomPair(10, 50);
      else if (level === 5) [num1, num2] = randomPair(10, 99);
      else if (level === 6) [num1, num2] = randomPair(50, 99);
      else [num1, num2] = randomPair(50, 999);
    } else if (operation === Operation.SUBTRACT) {
      let minValue;
      let maxValue;
      if (level === 1) [minValue, maxValue] = [1, 10];
      else if (level === 2) [minValue, maxValue] = [1, 20];
      else if (level === 3) [minValue, maxValue] = [10, 30];
      else if (level === 4) [minValue, maxValue] = [10, 50];
      else if (level === 5) [minValue, maxValue] = [10, 99];
      else if (level === 6) [minValue, maxValue] = [50, 99];
      else [minValue, maxValue] = [50, 999];

      num1 = randomInt(minValue, maxValue);
      num2 = level < 3 ? randomInt(minValue, num1) : randomInt(minValue, maxValue);
    } else if (operation === Operation.MULTIPLY) {
      if (level === 1) [num1, num2] = randomPair(1, 5);
      else if (level === 2) [num1, num2] = randomPair(1, 9);
      else if (level === 3) {
        num1 = randomInt(2, 9);
        num2 = randomInt(10, 20);
      } else {
        const factorMin = Math.min(99, 10 + (level - 4) * 5);
        const factorMax = Math.min(99, 25 + (level - 4) * 8);
        [num1, num2] = randomPair(factorMin, factorMax);
      }
    } else {
      let divisorMin;
      let divisorMax;
      let quotientMin;
      let quotientMax;
      if (level === 1) [divisorMin, divisorMax, quotientMin, quotientMax] = [1, 5, 1, 5];
      else if (level === 2) [divisorMin, divisorMax, quotientMin, quotientMax] = [1, 10, 1, 10];
      else if (level === 3) [divisorMin, divisorMax, quotientMin, quotientMax] = [2, 10, 2, 20];
      else if (level === 4) [divisorMin, divisorMax, quotientMin, quotientMax] = [2, 20, 2, 30];
      else if (level === 5) [divisorMin, divisorMax, quotientMin, quotientMax] = [5, 30, 5, 50];
      else if (level === 6) [divisorMin, divisorMax, quotientMin, quotientMax] = [10, 50, 10, 99];
      else [divisorMin, divisorMax, quotientMin, quotientMax] = [10, 99, 10, 999];

      num2 = randomInt(divisorMin, divisorMax);
      num1 = num2 * randomInt(quotientMin, quotientMax);
    }

    this.raindrops.push(new Raindrop(x, y, operation, num1, num2, this.speed));
  }

  handlePointerDown(point) {
    if (this.state === "menu") {
      if (containsPoint(this.playButton, point)) this.startNewGame();
      return;
    }

    if (this.state === "playing") {
      this.inputActive = true;
      if (containsPoint(this.inputBox, point)) return;

      const key = this.keyboardButtons.find((button) => containsPoint(button.rect, point));
      if (key) this.processInputAction(key.label);
      return;
    }

    if (this.state === "game_over") {
      if (containsPoint(this.replayButton, point)) this.startNewGame();
      else if (containsPoint(this.quitButton, point)) this.state = "menu";
    }
  }

  handleKeyDown(event) {
    if (event.key === "f" || event.key === "F") {
      toggleFullscreen(this.shell);
      event.preventDefault();
      return;
    }

    if (this.state === "menu") {
      if (event.key === "Enter" || event.key === " ") {
        this.startNewGame();
        event.preventDefault();
      }
      return;
    }

    if (this.state === "game_over") {
      if (event.key === "r" || event.key === "R") this.startNewGame();
      if (event.key === "q" || event.key === "Q" || event.key === "Escape") this.state = "menu";
      return;
    }

    if (this.state !== "playing") return;

    this.inputActive = true;
    if (event.key === "Enter") {
      this.processInputAction("Enter");
      event.preventDefault();
    } else if (event.key === "Backspace") {
      this.processInputAction("Back");
      event.preventDefault();
    } else if (event.key === "-") {
      this.appendInputChar("-");
      event.preventDefault();
    } else if (/^[0-9]$/.test(event.key)) {
      this.appendInputChar(event.key);
      event.preventDefault();
    }
  }

  processInputAction(action) {
    if (action === "Enter") this.checkAnswer();
    else if (action === "Back") {
      this.inputText = this.inputText.slice(0, -1);
      this.recentAnswerText = "";
      this.recentAnswerUntil = 0;
      this.inputFlashUntil = performance.now() + 140;
    } else this.appendInputChar(action);
  }

  appendInputChar(char) {
    if (!char || this.inputText.length >= 5) return;
    if (/^[0-9]$/.test(char)) {
      this.recentAnswerText = "";
      this.recentAnswerUntil = 0;
      this.inputText += char;
      this.inputFlashUntil = performance.now() + 140;
    } else if (char === "-" && this.inputText === "") {
      this.recentAnswerText = "";
      this.recentAnswerUntil = 0;
      this.inputText = "-";
      this.inputFlashUntil = performance.now() + 140;
    }
  }

  checkAnswer() {
    if (!this.inputText || this.inputText === "-" || this.raindrops.length === 0) return;
    const userAnswer = Number.parseInt(this.inputText, 10);
    const matchingDrops = this.raindrops.filter((drop) => drop.getAnswer() === userAnswer);

    if (matchingDrops.length > 0) {
      const solvedDrop = matchingDrops.reduce((lowest, drop) => drop.y > lowest.y ? drop : lowest);
      this.raindrops.splice(this.raindrops.indexOf(solvedDrop), 1);
      this.score += 1;
      this.problemsSolved += 1;
      this.recentAnswerColor = "#006400";
    } else {
      this.lives -= 1;
      this.recentAnswerColor = COLORS.red;
    }

    this.recentAnswerText = this.inputText;
    this.recentAnswerUntil = performance.now() + 650;
    this.inputText = "";

    if (this.lives <= 0) {
      this.state = "game_over";
      this.inputActive = false;
      return;
    }

    if (this.raindrops.length === 0) {
      this.spawnNewRaindrop();
      this.scheduleNextRaindrop();
    }
  }

  update(deltaMs) {
    if (this.state !== "playing") return;

    const level = this.getDifficultyLevel();
    this.speed = this.getSpeedForLevel(level);
    const stepScale = Math.min(3, deltaMs / FPS_STEP);

    for (const drop of [...this.raindrops]) {
      drop.speed = this.speed;
      drop.update(stepScale);
      if (!drop.isOffScreen()) continue;

      this.raindrops.splice(this.raindrops.indexOf(drop), 1);
      this.lives -= 1;
      this.inputText = "";

      if (this.lives <= 0) {
        this.state = "game_over";
        this.inputActive = false;
        return;
      }
    }

    const now = performance.now();
    const maxDrops = this.getMaxRaindropsForLevel(level);
    if (this.raindrops.length < maxDrops && now >= this.nextSpawnTime) {
      this.spawnNewRaindrop();
      this.scheduleNextRaindrop();
    } else if (this.raindrops.length >= maxDrops && now >= this.nextSpawnTime) {
      this.nextSpawnTime = now + 300;
    }

    if (this.raindrops.length === 0 && this.lives > 0) {
      this.spawnNewRaindrop();
      this.scheduleNextRaindrop();
    }
  }

  loop(time) {
    const deltaMs = time - this.lastFrameTime;
    this.lastFrameTime = time;
    this.update(deltaMs);
    this.draw();
    requestAnimationFrame((nextTime) => this.loop(nextTime));
  }

  draw() {
    if (this.state === "menu") this.drawMenu();
    else {
      this.drawPlayingScene();
      if (this.state === "game_over") this.drawGameOverOverlay();
    }
  }

  drawBackground() {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    gradient.addColorStop(0, COLORS.bgTop);
    gradient.addColorStop(1, COLORS.bgBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const ticks = performance.now();
    ctx.strokeStyle = "rgba(202, 241, 248, 0.78)";
    ctx.lineWidth = 1;
    for (let index = 0; index < 42; index += 1) {
      const x = (index * 53 + ticks / 12) % (WIDTH + 80) - 40;
      const y = (index * 97 + ticks / 5) % (HEIGHT + 90) - 60;
      const length = 20 + (index % 5) * 5;
      line(ctx, x, y, x - 8, y + length);
    }
  }

  drawMenu() {
    this.drawBackground();
    this.drawTextWithShadow("Math Rain", "700 58px Segoe UI, Arial", COLORS.white, WIDTH / 2, 170);

    drawCenteredText(this.ctx, "Solve each drop before it reaches the bottom.", WIDTH / 2, 230, "23px Segoe UI, Arial", "#ddeef7");

    ["8 + 5", "6 x 4", "21 / 3"].forEach((text, index) => {
      const x = WIDTH / 2 - 165 + index * 165;
      const y = 320 + (index % 2) * 18;
      this.drawSampleDrop(x, y, text);
    });

    this.drawButton(this.playButton, "Play", COLORS.green, COLORS.black, "#b0f1ca");
  }

  drawSampleDrop(x, y, text) {
    const ctx = this.ctx;
    circle(ctx, x + 4, y + 8, 42, "#244f71");
    circle(ctx, x, y, 40, COLORS.cyan);
    circle(ctx, x - 12, y - 13, 9, "#e3fdff");
    strokeCircle(ctx, x, y, 40, COLORS.accentDark, 2);
    drawCenteredText(ctx, text, x, y + 3, "22px Segoe UI, Arial", COLORS.black);
  }

  drawPlayingScene() {
    this.drawBackground();
    this.drawHud();
    this.drawRaindrops();
    this.drawOnScreenKeyboard();
    this.drawInputArea();
  }

  drawHud() {
    this.drawPanel(rect(20, 16, WIDTH - 40, 58), "#eef7fc", "#94bed4");
    const level = this.getDifficultyLevel();
    const ctx = this.ctx;

    drawText(ctx, "LIVES", 42, 40, "17px Segoe UI, Arial", COLORS.textMuted);
    for (let index = 0; index < 3; index += 1) {
      circle(ctx, 52 + index * 24, 55, 8, index < this.lives ? COLORS.red : "#c9d7e1");
      circle(ctx, 49 + index * 24, 52, 3, COLORS.white);
    }

    drawCenteredText(ctx, "LEVEL", WIDTH / 2, 40, "17px Segoe UI, Arial", COLORS.textMuted);
    drawCenteredText(ctx, String(level), WIDTH / 2, 67, "700 36px Segoe UI, Arial", COLORS.black);

    drawRightText(ctx, "SCORE", WIDTH - 42, 40, "17px Segoe UI, Arial", COLORS.textMuted);
    drawRightText(ctx, String(this.score), WIDTH - 42, 67, "700 36px Segoe UI, Arial", COLORS.black);
  }

  drawRaindrops() {
    [...this.raindrops]
      .sort((a, b) => a.y - b.y)
      .forEach((drop) => this.drawRaindrop(drop));
  }

  drawRaindrop(drop) {
    const ctx = this.ctx;
    const x = drop.x;
    const y = drop.y;
    const radius = drop.size / 2;
    circle(ctx, x + 5, y + 8, radius, "#143756");
    circle(ctx, x, y, radius, "#7ee8f2");
    circle(ctx, x, y + 3, radius - 7, COLORS.cyan);
    circle(ctx, x - 14, y - 15, 10, "#e3fdff");
    strokeCircle(ctx, x, y, radius, COLORS.accentDark, 2);

    const text = drop.getProblemText();
    let font = "700 30px Segoe UI, Arial";
    if (measureText(this.ctx, text, font) > drop.size - 8) font = "700 24px Segoe UI, Arial";
    if (measureText(this.ctx, text, font) > drop.size - 8) font = "700 20px Segoe UI, Arial";
    drawCenteredText(ctx, text, x, y + 8, font, COLORS.black);
  }

  drawInputArea() {
    const borderColor = this.inputActive ? COLORS.accent : COLORS.panelBorder;
    this.drawPanel(this.inputBox, COLORS.panel, borderColor);
    drawText(this.ctx, "Answer", this.inputBox.x + 18, this.inputBox.y + 41, "700 27px Segoe UI, Arial", COLORS.black);

    const answerArea = rect(this.inputBox.x + 128, this.inputBox.y + 5, this.inputBox.w - 138, this.inputBox.h - 10);
    const answerBg = performance.now() < this.inputFlashUntil ? "#e1f7f7" : "#f1f8fb";
    roundRect(this.ctx, answerArea.x, answerArea.y, answerArea.w, answerArea.h, 6, answerBg, borderColor, 2);

    let displayText = this.inputText;
    let displayColor = COLORS.black;
    if (!displayText && performance.now() < this.recentAnswerUntil) {
      displayText = this.recentAnswerText;
      displayColor = this.recentAnswerColor;
    }

    drawText(this.ctx, displayText, answerArea.x + 18, answerArea.y + 41, "700 58px Arial", displayColor);

    if (this.inputActive && Math.floor(performance.now() / 450) % 2 === 0) {
      const textWidth = measureText(this.ctx, displayText, "700 58px Arial");
      const cursorX = answerArea.x + 22 + textWidth;
      line(this.ctx, cursorX, answerArea.y + 8, cursorX, answerArea.y + answerArea.h - 8, COLORS.black, 3);
    }
  }

  drawOnScreenKeyboard() {
    for (const button of this.keyboardButtons) {
      let bgColor = COLORS.keyBg;
      let textColor = COLORS.white;
      let borderColor = "#6b8ba6";

      if (button.label === "Enter") {
        bgColor = COLORS.green;
        textColor = COLORS.black;
        borderColor = "#aee0c8";
      } else if (button.label === "Back") {
        bgColor = COLORS.red;
        borderColor = "#f5aeae";
      } else if (button.label === "-") {
        bgColor = COLORS.amber;
        textColor = COLORS.black;
        borderColor = "#ffe399";
      } else if (containsPoint(button.rect, this.mouse)) {
        bgColor = COLORS.keyHover;
      }

      this.drawButton(button.rect, button.label, bgColor, textColor, borderColor);
    }
  }

  drawGameOverOverlay() {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(18, 24, 38, 0.74)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const panel = rect(WIDTH / 2 - 190, HEIGHT / 2 - 135, 380, 285);
    this.drawPanel(panel, COLORS.panel, COLORS.panelBorder);
    drawCenteredText(ctx, "GAME OVER", WIDTH / 2, HEIGHT / 2 - 78, "700 34px Segoe UI, Arial", COLORS.red);
    drawCenteredText(ctx, `Final score: ${this.score}`, WIDTH / 2, HEIGHT / 2 - 35, "22px Segoe UI, Arial", COLORS.textMuted);
    this.drawButton(this.replayButton, "Replay", COLORS.green, COLORS.black, "#b0f1ca");
    this.drawButton(this.quitButton, "Menu", COLORS.red, COLORS.white, "#f5aeae");
  }

  drawButton(buttonRect, label, bgColor, textColor, borderColor) {
    const fill = containsPoint(buttonRect, this.mouse) ? blendHex(bgColor, COLORS.white, 0.12) : bgColor;
    roundRect(this.ctx, buttonRect.x, buttonRect.y + 4, buttonRect.w, buttonRect.h, 8, "#0d1c30");
    roundRect(this.ctx, buttonRect.x, buttonRect.y, buttonRect.w, buttonRect.h, 8, fill, borderColor, 2);
    drawCenteredText(this.ctx, label, buttonRect.x + buttonRect.w / 2, buttonRect.y + buttonRect.h / 2 + 9, "700 27px Segoe UI, Arial", textColor);
  }

  drawPanel(panelRect, fill, border) {
    roundRect(this.ctx, panelRect.x, panelRect.y + 4, panelRect.w, panelRect.h, 8, "rgba(9, 23, 41, 0.25)");
    roundRect(this.ctx, panelRect.x, panelRect.y, panelRect.w, panelRect.h, 8, fill, border, 2);
  }

  drawTextWithShadow(text, font, color, x, y) {
    drawCenteredText(this.ctx, text, x + 2, y + 3, font, "#0b192b");
    drawCenteredText(this.ctx, text, x, y, font, color);
  }
}

function rect(x, y, w, h) {
  return { x, y, w, h };
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + Math.floor(min);
}

function randomChoice(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function randomPair(min, max) {
  return [randomInt(min, max), randomInt(min, max)];
}

function containsPoint(area, point) {
  return point.x >= area.x && point.x <= area.x + area.w && point.y >= area.y && point.y <= area.y + area.h;
}

function roundRect(ctx, x, y, w, h, radius, fill, stroke, lineWidth = 1) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();

  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }

  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function circle(ctx, x, y, radius, fill) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function strokeCircle(ctx, x, y, radius, color, lineWidth) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function line(ctx, x1, y1, x2, y2, color = "rgba(202, 241, 248, 0.78)", lineWidth = 1) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function drawText(ctx, text, x, y, font, color) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, x, y);
}

function drawCenteredText(ctx, text, x, y, font, color) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
}

function drawRightText(ctx, text, x, y, font, color) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, x, y);
}

function measureText(ctx, text, font) {
  ctx.font = font;
  return ctx.measureText(text).width;
}

function blendHex(hexA, hexB, amount) {
  const a = parseHex(hexA);
  const b = parseHex(hexB);
  const mixed = a.map((channel, index) => Math.round(channel + (b[index] - channel) * amount));
  return `rgb(${mixed[0]}, ${mixed[1]}, ${mixed[2]})`;
}

function parseHex(hex) {
  const value = hex.replace("#", "");
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16)
  ];
}

function toggleFullscreen(element) {
  if (!document.fullscreenElement) {
    element.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}

const canvas = document.getElementById("gameCanvas");
const shell = document.getElementById("gameShell");
const fullscreenButton = document.getElementById("fullscreenButton");
const game = new MathRainGame(canvas, shell);

fullscreenButton.addEventListener("click", () => {
  canvas.focus();
  toggleFullscreen(shell);
});

canvas.focus();

window.mathRainGame = game;
