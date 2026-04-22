"use strict";

const WIDTH = 1000;
const HEIGHT = 720;
const FPS_STEP = 1000 / 60;
const RAINDROP_START_Y = -50;
const RAINDROP_SIZE = 80;
const VIRTUAL_KEYBOARD_BREAKPOINT = 760;

const COLORS = {
  white: "#ffffff",
  black: "#121826",
  bgTop: "#162b4e",
  bgBottom: "#4b87b3",
  panel: "#f7fbff",
  panelAlt: "#e8f2fa",
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

const CODE_TO_CHAR = {
  Digit0: "0",
  Digit1: "1",
  Digit2: "2",
  Digit3: "3",
  Digit4: "4",
  Digit5: "5",
  Digit6: "6",
  Digit7: "7",
  Digit8: "8",
  Digit9: "9",
  Numpad0: "0",
  Numpad1: "1",
  Numpad2: "2",
  Numpad3: "3",
  Numpad4: "4",
  Numpad5: "5",
  Numpad6: "6",
  Numpad7: "7",
  Numpad8: "8",
  Numpad9: "9",
  Minus: "-",
  NumpadSubtract: "-"
};

const SYMBOL_TO_DIGIT = {
  "!": "1",
  "@": "2",
  "#": "3",
  "$": "4",
  "%": "5",
  "^": "6",
  "&": "7",
  "*": "8",
  "(": "9",
  ")": "0",
  "\u00e9": "2",
  "\"": "3",
  "'": "4",
  "\u00e8": "7",
  "_": "8",
  "\u00e7": "9",
  "\u00e0": "0",
  "\u00a7": "3",
  "/": "7",
  "=": "0",
  "[": "8",
  "]": "9",
  "{": "7",
  "}": "0"
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

  isOffScreen(missY) {
    return this.y > missY;
  }
}

class BrainstormGame {
  constructor(canvas, shell, answerProxy) {
    this.canvas = canvas;
    this.shell = shell;
    this.answerProxy = answerProxy;
    this.ctx = canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = true;

    this.state = "menu";
    this.mouse = { x: -1000, y: -1000 };
    this.inputActive = false;
    this.inputText = "";
    this.virtualKeyboardEnabled = false;
    this.keyboardButtons = [];
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

    this.keyboardButtons = [];
    rows.forEach((row, rowIndex) => {
      row.forEach((label, colIndex) => {
        this.keyboardButtons.push({
          label,
          area: rect(startX + colIndex * (keyW + gap), startY + rowIndex * (keyH + gap), keyW, keyH)
        });
      });
    });
    this.keyboardButtons.push({
      label: "Enter",
      area: rect(startX, startY + 3 * (keyH + gap), 4 * keyW + 3 * gap, keyH)
    });

    this.updateVirtualKeyboardMode();
  }

  updateVirtualKeyboardMode() {
    const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
    this.virtualKeyboardEnabled = coarsePointer || window.innerWidth <= VIRTUAL_KEYBOARD_BREAKPOINT;
    this.updateLayout();
  }

  updateLayout() {
    const inputY = this.virtualKeyboardEnabled ? HEIGHT - 280 : HEIGHT - 86;
    this.inputBox = rect(130, inputY, WIDTH - 260, 62);
  }

  bindEvents() {
    this.canvas.addEventListener("pointermove", (event) => {
      this.mouse = this.getCanvasPoint(event);
    });

    this.canvas.addEventListener("pointerleave", () => {
      this.mouse = { x: -1000, y: -1000 };
    });

    this.canvas.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      this.canvas.focus();
      const point = this.getCanvasPoint(event);
      this.handlePointerDown(point);
    });

    window.addEventListener("keydown", (event) => {
      this.handleKeyDown(event);
    });

    window.addEventListener("resize", () => {
      this.updateVirtualKeyboardMode();
    });

    window.addEventListener("orientationchange", () => {
      this.updateVirtualKeyboardMode();
    });

    if (this.answerProxy) {
      this.answerProxy.addEventListener("beforeinput", (event) => {
        this.handleProxyBeforeInput(event);
      });

      this.answerProxy.addEventListener("input", () => {
        this.answerProxy.value = "";
      });
    }
  }

  getCanvasPoint(event) {
    const bounds = this.canvas.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * WIDTH / bounds.width,
      y: (event.clientY - bounds.top) * HEIGHT / bounds.height
    };
  }

  focusTextReceiver() {
    if (this.virtualKeyboardEnabled && this.answerProxy) {
      this.answerProxy.focus({ preventScroll: true });
      return;
    }

    this.canvas.focus({ preventScroll: true });
  }

  handleProxyBeforeInput(event) {
    if (this.state !== "playing" || !this.inputActive) return;

    if (event.inputType === "deleteContentBackward") {
      this.processInputAction("Back");
      event.preventDefault();
      return;
    }

    if (event.inputType === "insertLineBreak") {
      this.processInputAction("Enter");
      event.preventDefault();
      return;
    }

    if (event.data) {
      this.appendInputText(event.data);
      event.preventDefault();
    }
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
    this.focusTextReceiver();
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

  getRaindropMissY() {
    return this.inputBox.y - 20;
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
      const keyboardButton = this.virtualKeyboardEnabled
        ? this.keyboardButtons.find((button) => containsPoint(button.area, point))
        : null;

      if (keyboardButton) {
        this.inputActive = true;
        this.processInputAction(keyboardButton.label);
        this.focusTextReceiver();
        return;
      }

      this.inputActive = containsPoint(this.inputBox, point);
      if (this.inputActive) this.focusTextReceiver();
      return;
    }

    if (this.state === "game_over") {
      if (containsPoint(this.replayButton, point)) this.startNewGame();
      else if (containsPoint(this.quitButton, point)) this.state = "menu";
    }
  }

  handleKeyDown(event) {
    const altEnter = event.key === "Enter" && event.altKey;
    if (event.key === "F11" || altEnter) {
      toggleFullscreen(this.shell);
      event.preventDefault();
      return;
    }

    if (event.key === "Escape" && document.fullscreenElement) {
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
    const proxyTyping = this.virtualKeyboardEnabled && document.activeElement === this.answerProxy;
    if (event.key === "Enter") {
      this.processInputAction("Enter");
      event.preventDefault();
    } else if (event.key === "Backspace") {
      this.processInputAction("Back");
      event.preventDefault();
    } else if (!proxyTyping) {
      const char = this.getCharFromKeydown(event);
      if (!char) return;
      this.appendInputChar(char);
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

  appendInputText(text) {
    for (const char of text) this.appendInputChar(char);
  }

  appendInputChar(char) {
    if (!char || this.inputText.length >= 5) return;
    const normalized = this.normalizeInputChar(char);
    if (!normalized) return;

    if (/^[0-9]$/.test(normalized)) {
      this.recentAnswerText = "";
      this.recentAnswerUntil = 0;
      this.inputText += normalized;
      this.inputFlashUntil = performance.now() + 140;
    } else if (normalized === "-" && this.inputText === "") {
      this.recentAnswerText = "";
      this.recentAnswerUntil = 0;
      this.inputText = "-";
      this.inputFlashUntil = performance.now() + 140;
    }
  }

  normalizeInputChar(char) {
    if (!char) return null;
    if (/^[0-9]$/.test(char)) return char;
    if (Object.prototype.hasOwnProperty.call(SYMBOL_TO_DIGIT, char)) return SYMBOL_TO_DIGIT[char];
    if (char === "-") return "-";
    return null;
  }

  getCharFromKeydown(event) {
    if (Object.prototype.hasOwnProperty.call(CODE_TO_CHAR, event.code)) return CODE_TO_CHAR[event.code];
    return this.normalizeInputChar(event.key);
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
    const missY = this.getRaindropMissY();

    for (const drop of [...this.raindrops]) {
      drop.speed = this.speed;
      drop.update(stepScale);
      if (!drop.isOffScreen(missY)) continue;

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
    for (let index = 0; index < 34; index += 1) {
      const x = (index * 53 + ticks / 12) % (WIDTH + 80) - 40;
      const y = (index * 97 + ticks / 5) % (HEIGHT + 90) - 60;
      const length = 20 + (index % 5) * 5;
      line(ctx, x, y, x - 8, y + length);
    }
  }

  drawMenu() {
    this.drawBackground();
    this.drawTextWithShadow("bRAINstorm", "700 54px Segoe UI, Arial", COLORS.white, WIDTH / 2, 150);

    drawCenteredText(this.ctx, "Solve each drop before it reaches the bottom.", WIDTH / 2, 212, "22px Segoe UI, Arial", "#ddeef7");

    ["8 + 5", "6 x 4", "21 / 3"].forEach((text, index) => {
      const x = WIDTH / 2 - 145 + index * 145;
      const y = 280 + (index % 2) * 16;
      this.drawSampleDrop(x, y, text);
    });

    this.drawButton(this.playButton, "Play", COLORS.green, COLORS.black, "#b0f1ca");
  }

  drawSampleDrop(x, y, text) {
    const ctx = this.ctx;
    circle(ctx, x + 4, y + 8, 42, "#244f71");
    circle(ctx, x, y, 40, COLORS.cyan);
    circle(ctx, x - 12, y - 13, 9, "#aaf0f8");
    strokeCircle(ctx, x, y, 40, COLORS.accentDark, 2);
    drawCenteredText(ctx, text, x, y, "22px Segoe UI, Arial", COLORS.black);
  }

  drawPlayingScene() {
    this.drawBackground();
    this.drawHud();
    this.drawRaindrops();
    this.drawMissBoundary();
    this.drawOnScreenKeyboard();
    this.drawInputArea();
  }

  renderHudValue(text, color, maxWidth) {
    for (let size = 44; size >= 22; size -= 2) {
      const font = `700 ${size}px Segoe UI, Arial`;
      if (measureText(this.ctx, text, font) <= maxWidth) {
        return { text, font, color };
      }
    }

    return { text, font: "700 20px Segoe UI, Arial", color };
  }

  drawHud() {
    this.drawPanel(rect(20, 16, WIDTH - 40, 88), "#eef7fc", "#94bed4");
    const level = this.getDifficultyLevel();
    const ctx = this.ctx;

    const content = rect(29, 23, WIDTH - 58, 74);
    const gap = 12;
    const sectionWidth = Math.floor((content.w - 2 * gap) / 3);
    const livesRect = rect(content.x, content.y, sectionWidth, content.h);
    const levelRect = rect(livesRect.x + sectionWidth + gap, content.y, sectionWidth, content.h);
    const scoreRect = rect(levelRect.x + sectionWidth + gap, content.y, sectionWidth, content.h);

    [livesRect, levelRect, scoreRect].forEach((section) => {
      roundRect(ctx, section.x, section.y, section.w, section.h, 8, COLORS.panelAlt, COLORS.panelBorder, 1);
    });

    drawCenteredText(ctx, "LIVES", livesRect.x + livesRect.w / 2, livesRect.y + 14, "17px Segoe UI, Arial", COLORS.textMuted);
    const heartSpacing = 28;
    const firstHeartX = livesRect.x + livesRect.w / 2 - heartSpacing;
    const heartY = livesRect.y + livesRect.h / 2 + 11;
    for (let index = 0; index < 3; index += 1) {
      const heartX = firstHeartX + index * heartSpacing;
      circle(ctx, heartX, heartY, 9, index < this.lives ? COLORS.red : "#c9d7e1");
      circle(ctx, heartX - 3, heartY - 3, 3, COLORS.white);
    }

    drawCenteredText(ctx, "LEVEL", levelRect.x + levelRect.w / 2, levelRect.y + 14, "17px Segoe UI, Arial", COLORS.textMuted);
    const levelValue = this.renderHudValue(String(level), COLORS.black, levelRect.w - 22);
    drawCenteredText(ctx, levelValue.text, levelRect.x + levelRect.w / 2, levelRect.y + levelRect.h / 2 + 10, levelValue.font, levelValue.color);

    drawCenteredText(ctx, "SCORE", scoreRect.x + scoreRect.w / 2, scoreRect.y + 14, "17px Segoe UI, Arial", COLORS.textMuted);
    const scoreValue = this.renderHudValue(String(this.score), COLORS.black, scoreRect.w - 22);
    drawCenteredText(ctx, scoreValue.text, scoreRect.x + scoreRect.w / 2, scoreRect.y + scoreRect.h / 2 + 10, scoreValue.font, scoreValue.color);
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
    drawCenteredText(ctx, text, x, y + 2, font, COLORS.black);
  }

  drawMissBoundary() {
    const y = this.getRaindropMissY();
    if (y <= 90 || y >= HEIGHT - 20) return;

    const startX = 24;
    const endX = WIDTH - 24;
    const segment = 16;
    const gap = 10;

    let x = startX;
    while (x < endX) {
      const x2 = Math.min(x + segment, endX);
      line(this.ctx, x, y + 1, x2, y + 1, "rgb(90, 34, 34)", 2);
      line(this.ctx, x, y, x2, y, "rgb(241, 108, 108)", 2);
      x += segment + gap;
    }
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
    if (!this.virtualKeyboardEnabled) return;

    this.keyboardButtons.forEach(({ label, area }) => {
      let bgColor;
      let textColor;
      let borderColor;

      if (label === "Enter") {
        bgColor = COLORS.green;
        textColor = COLORS.black;
        borderColor = "#aeecc8";
      } else if (label === "Back") {
        bgColor = COLORS.red;
        textColor = COLORS.white;
        borderColor = "#f5aeae";
      } else if (label === "-") {
        bgColor = COLORS.amber;
        textColor = COLORS.black;
        borderColor = "#ffe399";
      } else {
        bgColor = containsPoint(area, this.mouse) ? COLORS.keyHover : COLORS.keyBg;
        textColor = COLORS.white;
        borderColor = "#6b8ba6";
      }

      this.drawButton(area, label, bgColor, textColor, borderColor);
    });
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
    this.drawButton(this.quitButton, "Quit", COLORS.red, COLORS.white, "#f5aeae");
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
const answerProxy = document.getElementById("answerProxy");
const fullscreenButton = document.getElementById("fullscreenButton");
const game = new BrainstormGame(canvas, shell, answerProxy);

fullscreenButton.addEventListener("click", () => {
  canvas.focus();
  toggleFullscreen(shell);
});

canvas.focus();

window.brainstormGame = game;
