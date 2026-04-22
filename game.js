"use strict";

const WIDTH = 1000;
const HEIGHT = 720;
const FPS_STEP = 1000 / 60;
const RAINDROP_START_Y = -50;
const RAINDROP_SIZE = 80;
const NATIVE_KEYBOARD_BREAKPOINT = 760;

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
  DIVIDE: "divide",
  SQUARE: "square",
  SQRT: "sqrt",
  LOG: "log"
};

const GameMode = {
  EASY: "easy",
  NORMAL: "normal",
  HARD: "hard",
  EXPERT: "expert"
};

const MODE_OPTIONS = [
  { label: "Easy", mode: GameMode.EASY },
  { label: "Normal", mode: GameMode.NORMAL },
  { label: "Hard", mode: GameMode.HARD },
  { label: "Expert", mode: GameMode.EXPERT }
];

const MODE_DESCRIPTIONS = {
  [GameMode.EASY]: "Add and subtract only",
  [GameMode.NORMAL]: "Base: add, subtract, multiply, divide",
  [GameMode.HARD]: "Normal plus square and square root",
  [GameMode.EXPERT]: "Hard plus logarithms"
};

const START_LEVEL_OPTIONS = [1, 3, 5, 7];

const SUBSCRIPT_DIGITS = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉"
};

function toSubscriptNumber(value) {
  return String(value).replace(/[0-9]/g, (digit) => SUBSCRIPT_DIGITS[digit]);
}

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
    if (this.operation === Operation.MULTIPLY) return `${this.num1} × ${this.num2}`;
    if (this.operation === Operation.DIVIDE) return `${this.num1} ÷ ${this.num2}`;
    if (this.operation === Operation.SQUARE) return `${this.num1}²`;
    if (this.operation === Operation.SQRT) return `√${this.num1}`;
    if (this.operation === Operation.LOG) return `log${toSubscriptNumber(this.num2)}${this.num1}`;
    return `${this.num1} ÷ ${this.num2}`;
  }

  getAnswer() {
    if (this.operation === Operation.ADD) return this.num1 + this.num2;
    if (this.operation === Operation.SUBTRACT) return this.num1 - this.num2;
    if (this.operation === Operation.MULTIPLY) return this.num1 * this.num2;
    if (this.operation === Operation.DIVIDE) return Math.trunc(this.num1 / this.num2);
    if (this.operation === Operation.SQUARE) return this.num1 * this.num1;
    if (this.operation === Operation.SQRT) return Math.trunc(Math.sqrt(this.num1));
    if (this.operation === Operation.LOG) {
      let answer = 0;
      let value = this.num1;
      while (value > 1 && value % this.num2 === 0) {
        value /= this.num2;
        answer += 1;
      }
      return answer;
    }
    return 0;
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
    this.nativeKeyboardEnabled = false;
    this.inputFlashUntil = 0;
    this.recentAnswerText = "";
    this.recentAnswerUntil = 0;
    this.recentAnswerColor = COLORS.black;
    this.gameMode = GameMode.NORMAL;
    this.startingLevel = 1;

    this.setupUi();
    this.resetGame();
    this.bindEvents();

    this.lastFrameTime = performance.now();
    requestAnimationFrame((time) => this.loop(time));
  }

  setupUi() {
    this.playButton = rect(WIDTH / 2 - 115, HEIGHT / 2 + 225, 230, 62);
    this.replayButton = rect(WIDTH / 2 - 130, HEIGHT / 2 + 22, 260, 50);
    this.menuButton = rect(WIDTH / 2 - 130, HEIGHT / 2 + 80, 260, 50);
    this.quitButton = rect(WIDTH / 2 - 130, HEIGHT / 2 + 138, 260, 50);
    this.hudMenuButton = rect(WIDTH - 84, 36, 48, 48);

    const modeW = 132;
    const modeH = 46;
    const modeGap = 12;
    const modeTotalW = MODE_OPTIONS.length * modeW + (MODE_OPTIONS.length - 1) * modeGap;
    const modeStartX = (WIDTH - modeTotalW) / 2;
    const modeY = HEIGHT / 2 + 30;
    this.modeButtons = MODE_OPTIONS.map(({ mode }, index) => ({
      mode,
      area: rect(modeStartX + index * (modeW + modeGap), modeY, modeW, modeH)
    }));

    const levelW = 76;
    const levelH = 42;
    const levelGap = 12;
    const levelTotalW = START_LEVEL_OPTIONS.length * levelW + (START_LEVEL_OPTIONS.length - 1) * levelGap;
    const levelStartX = (WIDTH - levelTotalW) / 2;
    const levelY = HEIGHT / 2 + 150;
    this.startLevelButtons = START_LEVEL_OPTIONS.map((level, index) => ({
      level,
      area: rect(levelStartX + index * (levelW + levelGap), levelY, levelW, levelH)
    }));

    this.updateVirtualKeyboardMode();
  }

  updateVirtualKeyboardMode() {
    const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
    this.nativeKeyboardEnabled = coarsePointer || window.innerWidth <= NATIVE_KEYBOARD_BREAKPOINT;
    this.updateLayout();
  }

  updateLayout() {
    const inputY = HEIGHT - 86;
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
    if (this.nativeKeyboardEnabled && this.answerProxy) {
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

  returnToMenu() {
    this.state = "menu";
    this.inputText = "";
    this.recentAnswerText = "";
    this.recentAnswerUntil = 0;
    this.inputActive = false;
  }

  getDifficultyLevel() {
    return this.startingLevel + Math.floor(this.problemsSolved / 10);
  }

  setGameMode(mode) {
    this.gameMode = mode;
  }

  changeGameMode(direction) {
    const modes = MODE_OPTIONS.map((option) => option.mode);
    const currentIndex = modes.indexOf(this.gameMode);
    const nextIndex = (currentIndex + direction + modes.length) % modes.length;
    this.gameMode = modes[nextIndex];
  }

  setStartingLevel(level) {
    this.startingLevel = level;
  }

  changeStartingLevel(direction) {
    const currentIndex = START_LEVEL_OPTIONS.indexOf(this.startingLevel);
    const nextIndex = (currentIndex + direction + START_LEVEL_OPTIONS.length) % START_LEVEL_OPTIONS.length;
    this.startingLevel = START_LEVEL_OPTIONS[nextIndex];
  }

  getOperationsForMode() {
    if (this.gameMode === GameMode.EASY) return [Operation.ADD, Operation.SUBTRACT];

    const operations = [Operation.ADD, Operation.SUBTRACT, Operation.MULTIPLY, Operation.DIVIDE];
    if (this.gameMode === GameMode.HARD || this.gameMode === GameMode.EXPERT) {
      operations.push(Operation.SQUARE, Operation.SQRT);
    }
    if (this.gameMode === GameMode.EXPERT) operations.push(Operation.LOG);
    return operations;
  }

  getSquareRangeForLevel(level) {
    if (level === 1) return [2, 5];
    if (level === 2) return [2, 10];
    if (level === 3) return [5, 12];
    if (level === 4) return [7, 14];
    if (level === 5) return [9, 16];
    if (level === 6) return [10, 18];
    if (level === 7) return [11, 20];
    return [11, 30];
  }

  getSquareRootRangeForLevel(level) {
    return this.getSquareRangeForLevel(level);
  }

  getLogProblemValues(level) {
    let bases;
    let exponentMin;
    let exponentMax;
    if (level <= 2) {
      bases = [2, 10];
      [exponentMin, exponentMax] = [1, 3];
    } else if (level <= 4) {
      bases = [2, 3, 5, 10];
      [exponentMin, exponentMax] = [1, 4];
    } else if (level <= 6) {
      bases = [2, 3, 4, 5, 10];
      [exponentMin, exponentMax] = [2, 5];
    } else {
      bases = [2, 3, 4, 5, 10];
      exponentMin = 2;
      exponentMax = Math.min(8, 5 + Math.floor((level - 6) / 2));
    }

    const maxProblemValue = 99999;
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const base = randomChoice(bases);
      let maxValidExponent = exponentMax;
      while (base ** maxValidExponent > maxProblemValue) maxValidExponent -= 1;
      if (maxValidExponent < exponentMin) continue;

      const exponent = randomInt(exponentMin, maxValidExponent);
      return [base ** exponent, base];
    }

    return [100, 10];
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
    const operation = randomChoice(this.getOperationsForMode());
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
        num2 = randomInt(5, 15);
      } else if (level === 4) {
        num1 = randomInt(2, 9);
        num2 = randomInt(5, 15);
      } else if (level === 5) {
        num1 = randomInt(3, 9);
        num2 = randomInt(5, 20);
      } else if (level === 6) {
        num1 = randomInt(3, 9);
        num2 = randomInt(10, 30);
      } else if (level === 7) {
        [num1, num2] = randomPair(11, 20);
      } else if (level === 8) {
        [num1, num2] = randomPair(20, 50);
      } else {
        const factorMin = Math.min(99, 20 + (level - 8) * 5);
        const factorMax = Math.min(99, 50 + (level - 8) * 8);
        [num1, num2] = randomPair(factorMin, factorMax);
      }
    } else if (operation === Operation.DIVIDE) {
      let divisorMin;
      let divisorMax;
      let quotientMin;
      let quotientMax;
      if (level === 1) [divisorMin, divisorMax, quotientMin, quotientMax] = [1, 5, 1, 5];
      else if (level === 2) [divisorMin, divisorMax, quotientMin, quotientMax] = [1, 5, 1, 10];
      else if (level === 3) [divisorMin, divisorMax, quotientMin, quotientMax] = [2, 10, 2, 10];
      else if (level === 4) [divisorMin, divisorMax, quotientMin, quotientMax] = [2, 10, 2, 15];
      else if (level === 5) [divisorMin, divisorMax, quotientMin, quotientMax] = [2, 10, 2, 30];
      else if (level === 6) [divisorMin, divisorMax, quotientMin, quotientMax] = [2, 15, 2, 30];
      else if (level === 7) [divisorMin, divisorMax, quotientMin, quotientMax] = [2, 20, 10, 50];
      else if (level === 8) [divisorMin, divisorMax, quotientMin, quotientMax] = [11, 20, 11, 50];
      else {
        const extraLevel = level - 8;
        divisorMin = Math.min(99, 11 + extraLevel * 5);
        divisorMax = Math.min(99, 20 + extraLevel * 10);
        quotientMin = Math.min(999, 11 + extraLevel * 5);
        quotientMax = Math.min(999, 50 + extraLevel * 25);
      }

      num2 = randomInt(divisorMin, divisorMax);
      num1 = num2 * randomInt(quotientMin, quotientMax);
    } else if (operation === Operation.SQUARE) {
      const [rootMin, rootMax] = this.getSquareRangeForLevel(level);
      num1 = randomInt(rootMin, rootMax);
      num2 = 2;
    } else if (operation === Operation.SQRT) {
      const [rootMin, rootMax] = this.getSquareRootRangeForLevel(level);
      const rootValue = randomInt(rootMin, rootMax);
      num1 = rootValue * rootValue;
      num2 = 2;
    } else if (operation === Operation.LOG) {
      [num1, num2] = this.getLogProblemValues(level);
    } else {
      [num1, num2] = randomPair(1, 20);
    }

    this.raindrops.push(new Raindrop(x, y, operation, num1, num2, this.speed));
  }

  handlePointerDown(point) {
    if (this.state === "menu") {
      const modeButton = this.modeButtons.find((button) => containsPoint(button.area, point));
      if (modeButton) {
        this.setGameMode(modeButton.mode);
        return;
      }

      const levelButton = this.startLevelButtons.find((button) => containsPoint(button.area, point));
      if (levelButton) {
        this.setStartingLevel(levelButton.level);
        return;
      }

      if (containsPoint(this.playButton, point)) this.startNewGame();
      return;
    }

    if (this.state === "playing") {
      if (containsPoint(this.hudMenuButton, point)) {
        this.returnToMenu();
        return;
      }

      this.inputActive = containsPoint(this.inputBox, point);
      if (this.inputActive) this.focusTextReceiver();
      return;
    }

    if (this.state === "game_over") {
      if (containsPoint(this.replayButton, point)) this.startNewGame();
      else if (containsPoint(this.menuButton, point)) this.returnToMenu();
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
      } else if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
        this.changeGameMode(-1);
        event.preventDefault();
      } else if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
        this.changeGameMode(1);
        event.preventDefault();
      } else if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") {
        this.changeStartingLevel(-1);
        event.preventDefault();
      } else if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") {
        this.changeStartingLevel(1);
        event.preventDefault();
      } else if (event.key === "1") {
        this.setGameMode(GameMode.EASY);
        event.preventDefault();
      } else if (event.key === "2") {
        this.setGameMode(GameMode.NORMAL);
        event.preventDefault();
      } else if (event.key === "3") {
        this.setGameMode(GameMode.HARD);
        event.preventDefault();
      } else if (event.key === "4") {
        this.setGameMode(GameMode.EXPERT);
        event.preventDefault();
      }
      return;
    }

    if (this.state === "game_over") {
      if (event.key === "r" || event.key === "R") this.startNewGame();
      if (event.key === "m" || event.key === "M" || event.key === "Escape") this.returnToMenu();
      if (event.key === "q" || event.key === "Q") this.returnToMenu();
      return;
    }

    if (this.state !== "playing") return;

    if (event.key === "m" || event.key === "M") {
      this.returnToMenu();
      event.preventDefault();
      return;
    }

    this.inputActive = true;
    const proxyTyping = this.nativeKeyboardEnabled && document.activeElement === this.answerProxy;
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
    if (!this.inputText || this.raindrops.length === 0) return;

    const submittedAnswer = this.inputText;
    const userAnswer = Number.parseInt(submittedAnswer, 10);
    const matchingDrops = Number.isNaN(userAnswer)
      ? []
      : this.raindrops.filter((drop) => drop.getAnswer() === userAnswer);

    if (matchingDrops.length > 0) {
      const solvedDrop = matchingDrops.reduce((lowest, drop) => drop.y > lowest.y ? drop : lowest);
      this.raindrops.splice(this.raindrops.indexOf(solvedDrop), 1);
      this.score += 1;
      this.problemsSolved += 1;
      this.recentAnswerColor = "#006400";
    } else {
      this.markWrongAnswer();
    }

    this.recentAnswerText = submittedAnswer;
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

  markWrongAnswer() {
    this.recentAnswerColor = COLORS.red;
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

    ["8 + 5", "6 × 4", "21 ÷ 3"].forEach((text, index) => {
      const x = WIDTH / 2 - 145 + index * 145;
      const y = 280 + (index % 2) * 16;
      this.drawSampleDrop(x, y, text);
    });

    this.drawModeSelector();
    this.drawStartLevelSelector();
    this.drawButton(this.playButton, "Play", COLORS.green, COLORS.black, "#b0f1ca");
  }

  drawModeSelector() {
    const labelY = this.modeButtons[0].area.y - 26;
    drawCenteredText(this.ctx, "Mode", WIDTH / 2, labelY, "700 22px Segoe UI, Arial", "#ddeef7");

    MODE_OPTIONS.forEach(({ label, mode }, index) => {
      const button = this.modeButtons[index].area;
      const selected = mode === this.gameMode;
      if (selected) {
        this.drawButton(button, label, COLORS.amber, COLORS.black, "#ffe69a");
      } else {
        this.drawButton(button, label, COLORS.panelAlt, COLORS.black, "#9abed5");
      }
    });

    const descriptionY = this.modeButtons[0].area.y + this.modeButtons[0].area.h + 18;
    drawCenteredText(this.ctx, MODE_DESCRIPTIONS[this.gameMode], WIDTH / 2, descriptionY, "17px Segoe UI, Arial", "#ddeef7");
  }

  drawStartLevelSelector() {
    const labelY = this.startLevelButtons[0].area.y - 25;
    drawCenteredText(this.ctx, "Start Level", WIDTH / 2, labelY, "700 22px Segoe UI, Arial", "#ddeef7");

    this.startLevelButtons.forEach(({ level, area }) => {
      const selected = level === this.startingLevel;
      if (selected) {
        this.drawButton(area, `L${level}`, COLORS.amber, COLORS.black, "#ffe69a");
      } else {
        this.drawButton(area, `L${level}`, COLORS.panelAlt, COLORS.black, "#9abed5");
      }
    });
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

  renderInputFont(text, maxWidth) {
    for (let size = 52; size >= 34; size -= 2) {
      const font = `700 ${size}px Segoe UI, Arial`;
      if (measureText(this.ctx, text, font) <= maxWidth) return font;
    }

    return "700 32px Segoe UI, Arial";
  }

  getCurrentModeLabel() {
    const option = MODE_OPTIONS.find(({ mode }) => mode === this.gameMode);
    return option ? option.label : "Normal";
  }

  drawHudMenuButton() {
    const button = this.hudMenuButton;
    const hovered = containsPoint(button, this.mouse);
    const fill = hovered ? COLORS.keyHover : COLORS.keyBg;
    roundRect(this.ctx, button.x, button.y + 3, button.w, button.h, 8, "rgba(8, 20, 36, 0.34)");
    roundRect(this.ctx, button.x, button.y, button.w, button.h, 8, fill, "#6b8ba6", 2);

    const lineLeft = button.x + 13;
    const lineRight = button.x + button.w - 13;
    [button.y + 16, button.y + 24, button.y + 32].forEach((y) => {
      line(this.ctx, lineLeft, y, lineRight, y, COLORS.white, 3);
    });
  }

  drawHud() {
    this.drawPanel(rect(20, 16, WIDTH - 40, 88), "#eef7fc", "#94bed4");
    const level = this.getDifficultyLevel();
    const ctx = this.ctx;

    const content = rect(29, 23, this.hudMenuButton.x - 12 - 29, 74);
    const gap = 12;
    const sectionWidth = Math.floor((content.w - 3 * gap) / 4);
    const livesRect = rect(content.x, content.y, sectionWidth, content.h);
    const modeRect = rect(livesRect.x + sectionWidth + gap, content.y, sectionWidth, content.h);
    const levelRect = rect(modeRect.x + sectionWidth + gap, content.y, sectionWidth, content.h);
    const scoreRect = rect(levelRect.x + sectionWidth + gap, content.y, sectionWidth, content.h);

    [livesRect, modeRect, levelRect, scoreRect].forEach((section) => {
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

    drawCenteredText(ctx, "MODE", modeRect.x + modeRect.w / 2, modeRect.y + 14, "17px Segoe UI, Arial", COLORS.textMuted);
    const modeValue = this.renderHudValue(this.getCurrentModeLabel(), COLORS.black, modeRect.w - 22);
    drawCenteredText(ctx, modeValue.text, modeRect.x + modeRect.w / 2, modeRect.y + modeRect.h / 2 + 10, modeValue.font, modeValue.color);

    drawCenteredText(ctx, "LEVEL", levelRect.x + levelRect.w / 2, levelRect.y + 14, "17px Segoe UI, Arial", COLORS.textMuted);
    const levelValue = this.renderHudValue(String(level), COLORS.black, levelRect.w - 22);
    drawCenteredText(ctx, levelValue.text, levelRect.x + levelRect.w / 2, levelRect.y + levelRect.h / 2 + 10, levelValue.font, levelValue.color);

    drawCenteredText(ctx, "SCORE", scoreRect.x + scoreRect.w / 2, scoreRect.y + 14, "17px Segoe UI, Arial", COLORS.textMuted);
    const scoreValue = this.renderHudValue(String(this.score), COLORS.black, scoreRect.w - 22);
    drawCenteredText(ctx, scoreValue.text, scoreRect.x + scoreRect.w / 2, scoreRect.y + scoreRect.h / 2 + 10, scoreValue.font, scoreValue.color);
    this.drawHudMenuButton();
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
    if (measureText(this.ctx, text, font) > drop.size - 8) font = "700 16px Segoe UI, Arial";
    if (measureText(this.ctx, text, font) > drop.size - 8) font = "700 12px Segoe UI, Arial";
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

    const labelArea = rect(this.inputBox.x + 14, this.inputBox.y + 8, 104, this.inputBox.h - 16);
    drawCenteredText(this.ctx, "Answer", labelArea.x + labelArea.w / 2, labelArea.y + labelArea.h / 2, "700 26px Segoe UI, Arial", COLORS.black);

    const answerArea = rect(this.inputBox.x + 128, this.inputBox.y + 7, this.inputBox.w - 140, this.inputBox.h - 14);
    const answerBg = performance.now() < this.inputFlashUntil ? "#e1f7f7" : "#f1f8fb";
    roundRect(this.ctx, answerArea.x, answerArea.y, answerArea.w, answerArea.h, 6, answerBg, borderColor, 2);

    let displayText = this.inputText;
    let displayColor = COLORS.black;
    if (!displayText && performance.now() < this.recentAnswerUntil) {
      displayText = this.recentAnswerText;
      displayColor = this.recentAnswerColor;
    }

    const inputFont = this.renderInputFont(displayText, answerArea.w - 48);
    const textX = answerArea.x + 22;
    const textY = answerArea.y + answerArea.h / 2 + 1;
    drawMiddleLeftText(this.ctx, displayText, textX, textY, inputFont, displayColor);

    if (this.inputActive && Math.floor(performance.now() / 450) % 2 === 0) {
      const textWidth = measureText(this.ctx, displayText, inputFont);
      const cursorX = textX + textWidth + 5;
      line(this.ctx, cursorX, answerArea.y + 9, cursorX, answerArea.y + answerArea.h - 9, COLORS.black, 3);
    }
  }

  drawGameOverOverlay() {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(18, 24, 38, 0.82)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const panel = rect(WIDTH / 2 - 220, HEIGHT / 2 - 205, 440, 410);
    this.drawPanel(panel, COLORS.panel, COLORS.panelBorder);

    roundRect(ctx, panel.x + 30, panel.y + 28, panel.w - 60, 4, 2, COLORS.red);
    drawCenteredText(ctx, "GAME OVER", WIDTH / 2, panel.y + 78, "700 34px Segoe UI, Arial", COLORS.red);
    drawCenteredText(ctx, "Final score", WIDTH / 2, panel.y + 133, "22px Segoe UI, Arial", COLORS.textMuted);
    drawCenteredText(ctx, String(this.score), WIDTH / 2, panel.y + 174, "700 46px Segoe UI, Arial", COLORS.black);

    this.drawButton(this.replayButton, "Replay", COLORS.green, COLORS.black, "#b0f1ca");
    this.drawButton(this.menuButton, "Menu", COLORS.amber, COLORS.black, "#ffe69a");
    this.drawButton(this.quitButton, "Quit", COLORS.red, COLORS.white, "#f5aeae");
  }

  drawButton(buttonRect, label, bgColor, textColor, borderColor) {
    const fill = containsPoint(buttonRect, this.mouse) ? blendHex(bgColor, COLORS.white, 0.12) : bgColor;
    roundRect(this.ctx, buttonRect.x, buttonRect.y + 4, buttonRect.w, buttonRect.h, 8, "rgba(8, 20, 36, 0.34)");
    roundRect(this.ctx, buttonRect.x, buttonRect.y, buttonRect.w, buttonRect.h, 8, fill, borderColor, 2);
    drawCenteredText(this.ctx, label, buttonRect.x + buttonRect.w / 2, buttonRect.y + buttonRect.h / 2, "700 27px Segoe UI, Arial", textColor);
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

function drawMiddleLeftText(ctx, text, x, y, font, color) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
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
const game = new BrainstormGame(canvas, shell, answerProxy);

canvas.focus();

window.brainstormGame = game;
