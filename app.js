const EPS = 1e-12;

function complex(re, im = 0) {
  return { re, im };
}

function cAdd(a, b) {
  return complex(a.re + b.re, a.im + b.im);
}

function cSub(a, b) {
  return complex(a.re - b.re, a.im - b.im);
}

function cMul(a, b) {
  return complex(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
}

function cDiv(a, b) {
  const denom = b.re * b.re + b.im * b.im;
  if (denom < EPS) {
    throw new Error("Division by zero in complex arithmetic.");
  }
  return complex(
    (a.re * b.re + a.im * b.im) / denom,
    (a.im * b.re - a.re * b.im) / denom
  );
}

function cAbs(a) {
  return Math.hypot(a.re, a.im);
}

function cArg(a) {
  return Math.atan2(a.im, a.re);
}

function cFromPolar(radius, angle) {
  return complex(radius * Math.cos(angle), radius * Math.sin(angle));
}

function cPow(a, power) {
  const magnitude = cAbs(a);
  if (magnitude < EPS) {
    return complex(0, 0);
  }
  const angle = cArg(a);
  return cFromPolar(magnitude ** power, angle * power);
}

function cSqrt(a) {
  return cPow(a, 0.5);
}

function prettyNumber(value) {
  const normalized = Math.abs(value) < 1e-12 ? 0 : value;
  return Number.parseFloat(normalized.toPrecision(10)).toString();
}

function formatComplex(value) {
  if (Math.abs(value.im) < 1e-9) {
    return prettyNumber(value.re);
  }
  const sign = value.im >= 0 ? "+" : "-";
  return `${prettyNumber(value.re)} ${sign} ${prettyNumber(Math.abs(value.im))}i`;
}

function parseNumber(raw, name) {
  const normalized = raw.trim().replace(",", ".");
  if (!normalized) {
    throw new Error(`Coefficient ${name} is empty.`);
  }
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Coefficient ${name} is not a valid number.`);
  }
  return parsed;
}

function solveQuadratic(a, b, c) {
  if (Math.abs(a) < EPS) {
    if (Math.abs(b) < EPS) {
      return [];
    }
    return [complex(-c / b, 0)];
  }

  const delta = b * b - 4 * a * c;
  const sqrtDelta = cSqrt(complex(delta, 0));
  const twoA = complex(2 * a, 0);
  const minusB = complex(-b, 0);

  return [
    cDiv(cAdd(minusB, sqrtDelta), twoA),
    cDiv(cSub(minusB, sqrtDelta), twoA),
  ];
}

function solveCubic(a, b, c, d) {
  if (Math.abs(a) < EPS) {
    return solveQuadratic(b, c, d);
  }

  const A = b / a;
  const B = c / a;
  const C = d / a;

  const p = B - (A * A) / 3;
  const q = (2 * A ** 3) / 27 - (A * B) / 3 + C;

  const delta = complex((q / 2) ** 2 + (p / 3) ** 3, 0);
  const sqrtDelta = cSqrt(delta);

  const minusHalfQ = complex(-q / 2, 0);
  const u = cPow(cAdd(minusHalfQ, sqrtDelta), 1 / 3);
  const v = cPow(cSub(minusHalfQ, sqrtDelta), 1 / 3);

  const omega = complex(-0.5, Math.sqrt(3) / 2);
  const omega2 = complex(-0.5, -Math.sqrt(3) / 2);

  const y1 = cAdd(u, v);
  const y2 = cAdd(cMul(omega, u), cMul(omega2, v));
  const y3 = cAdd(cMul(omega2, u), cMul(omega, v));

  const shift = complex(A / 3, 0);
  const x1 = cSub(y1, shift);
  const x2 = cSub(y2, shift);
  const x3 = cSub(y3, shift);

  return [x1, x2, x3];
}

function extractRealValues(values, eps = 1e-8) {
  const result = [];
  for (const value of values) {
    if (Math.abs(value.im) < eps) {
      result.push(value.re);
    }
  }
  return result;
}

function uniqueSorted(values, tolerance = 1e-6) {
  const ordered = [...values].sort((left, right) => left - right);
  const unique = [];
  for (const value of ordered) {
    if (unique.length === 0 || Math.abs(value - unique[unique.length - 1]) > tolerance) {
      unique.push(value);
    }
  }
  return unique;
}

function polyValue(a, b, c, d, x) {
  return ((a * x + b) * x + c) * x + d;
}

function suggestRange(a, b, c, d) {
  const points = [];
  points.push(...extractRealValues(solveCubic(a, b, c, d)));
  points.push(...extractRealValues(solveQuadratic(3 * a, 2 * b, c)));

  if (points.length === 0) {
    points.push(0);
  }

  const left = Math.min(...points);
  const right = Math.max(...points);
  let width = right - left;

  if (width < 1) {
    width = 4;
  } else {
    width = Math.max(4, width * 1.8);
  }

  const center = (left + right) / 2;
  return {
    xMin: center - width / 2,
    xMax: center + width / 2,
  };
}

const refs = {
  form: document.getElementById("coeffForm"),
  inputA: document.getElementById("coeffA"),
  inputB: document.getElementById("coeffB"),
  inputC: document.getElementById("coeffC"),
  inputD: document.getElementById("coeffD"),
  solveButton: document.getElementById("solveButton"),
  plotButton: document.getElementById("plotButton"),
  clearButton: document.getElementById("clearButton"),
  equationPreview: document.getElementById("equationPreview"),
  rootsOutput: document.getElementById("rootsOutput"),
  metaOutput: document.getElementById("metaOutput"),
  rangeOutput: document.getElementById("rangeOutput"),
  canvas: document.getElementById("plotCanvas"),
};

let currentCoefficients = null;

function classifyEquation(a, b, c) {
  if (Math.abs(a) >= EPS) {
    return "cubic";
  }
  if (Math.abs(b) >= EPS) {
    return "quadratic";
  }
  if (Math.abs(c) >= EPS) {
    return "linear";
  }
  return "constant";
}

function setRootsOutput(lines) {
  refs.rootsOutput.textContent = lines.join("\n");
}

function readCoefficients() {
  return {
    a: parseNumber(refs.inputA.value, "a"),
    b: parseNumber(refs.inputB.value, "b"),
    c: parseNumber(refs.inputC.value, "c"),
    d: parseNumber(refs.inputD.value, "d"),
  };
}

function updateEquationPreview() {
  const rawA = refs.inputA.value.trim() || "?";
  const rawB = refs.inputB.value.trim() || "?";
  const rawC = refs.inputC.value.trim() || "?";
  const rawD = refs.inputD.value.trim() || "?";
  refs.equationPreview.textContent = `f(x) = (${rawA})x^3 + (${rawB})x^2 + (${rawC})x + (${rawD})`;
}

function drawPlaceholder() {
  const context = refs.canvas.getContext("2d");
  const width = refs.canvas.clientWidth;
  const height = refs.canvas.clientHeight;

  refs.canvas.width = width;
  refs.canvas.height = height;

  context.clearRect(0, 0, width, height);
  context.fillStyle = "#f7f8fb";
  context.fillRect(0, 0, width, height);

  context.strokeStyle = "#e3e7ef";
  context.strokeRect(8, 8, width - 16, height - 16);

  context.fillStyle = "#687284";
  context.font = "500 15px 'Space Grotesk', sans-serif";
  context.textAlign = "center";
  context.fillText("Press Plot Graph to render the cubic curve", width / 2, height / 2);
}

function prepareCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(300, Math.floor(refs.canvas.clientWidth));
  const height = Math.max(200, Math.floor(refs.canvas.clientHeight));

  refs.canvas.width = Math.floor(width * dpr);
  refs.canvas.height = Math.floor(height * dpr);

  const context = refs.canvas.getContext("2d");
  context.setTransform(dpr, 0, 0, dpr, 0, 0);

  return { context, width, height };
}

function drawPlot(coefficients) {
  const { a, b, c, d } = coefficients;
  const { context, width, height } = prepareCanvas();

  context.clearRect(0, 0, width, height);

  const padding = 42;
  const plotWidth = width - 2 * padding;
  const plotHeight = height - 2 * padding;
  if (plotWidth < 40 || plotHeight < 40) {
    return;
  }

  const range = suggestRange(a, b, c, d);
  const sampleCount = Math.max(320, plotWidth);
  const xStep = (range.xMax - range.xMin) / sampleCount;

  const xs = [];
  const ys = [];
  for (let index = 0; index <= sampleCount; index += 1) {
    const x = range.xMin + xStep * index;
    xs.push(x);
    ys.push(polyValue(a, b, c, d, x));
  }

  let yMin = Math.min(...ys);
  let yMax = Math.max(...ys);

  if (Math.abs(yMax - yMin) < 1e-9) {
    const pad = Math.max(1, Math.abs(yMax) * 0.2 + 1);
    yMin -= pad;
    yMax += pad;
  } else {
    const pad = (yMax - yMin) * 0.15;
    yMin -= pad;
    yMax += pad;
  }

  const mapX = (x) => padding + ((x - range.xMin) * plotWidth) / (range.xMax - range.xMin);
  const mapY = (y) => height - padding - ((y - yMin) * plotHeight) / (yMax - yMin);

  context.fillStyle = "#ffffff";
  context.fillRect(padding, padding, plotWidth, plotHeight);

  context.strokeStyle = "#edf1f7";
  context.lineWidth = 1;
  const gridSteps = 8;
  for (let index = 0; index <= gridSteps; index += 1) {
    const xLine = padding + (plotWidth * index) / gridSteps;
    const yLine = padding + (plotHeight * index) / gridSteps;

    context.beginPath();
    context.moveTo(xLine, padding);
    context.lineTo(xLine, height - padding);
    context.stroke();

    context.beginPath();
    context.moveTo(padding, yLine);
    context.lineTo(width - padding, yLine);
    context.stroke();
  }

  context.strokeStyle = "#d6deea";
  context.strokeRect(padding, padding, plotWidth, plotHeight);

  context.fillStyle = "#334155";
  context.font = "500 11px 'IBM Plex Mono', monospace";

  if (range.xMin <= 0 && range.xMax >= 0) {
    const yAxis = mapX(0);
    context.strokeStyle = "#344055";
    context.lineWidth = 1.4;
    context.beginPath();
    context.moveTo(yAxis, padding);
    context.lineTo(yAxis, height - padding);
    context.stroke();
    context.fillText("y", yAxis + 8, padding + 14);
  }

  if (yMin <= 0 && yMax >= 0) {
    const xAxis = mapY(0);
    context.strokeStyle = "#344055";
    context.lineWidth = 1.4;
    context.beginPath();
    context.moveTo(padding, xAxis);
    context.lineTo(width - padding, xAxis);
    context.stroke();
    context.fillText("x", width - padding - 12, xAxis - 8);
  }

  context.strokeStyle = "#0b6e4f";
  context.lineWidth = 2.6;
  context.beginPath();
  context.moveTo(mapX(xs[0]), mapY(ys[0]));
  for (let index = 1; index < xs.length; index += 1) {
    context.lineTo(mapX(xs[index]), mapY(ys[index]));
  }
  context.stroke();

  const roots = solveCubic(a, b, c, d);
  const realRoots = uniqueSorted(extractRealValues(roots));
  for (const root of realRoots) {
    if (root < range.xMin || root > range.xMax) {
      continue;
    }
    const px = mapX(root);
    const py = mapY(polyValue(a, b, c, d, root));

    context.fillStyle = "#d84d3a";
    context.beginPath();
    context.arc(px, py, 4, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#b34130";
    context.font = "500 10px 'IBM Plex Mono', monospace";
    context.fillText(prettyNumber(root), px + 6, py - 8);
  }

  refs.rangeOutput.textContent =
    `x-range: [${prettyNumber(range.xMin)}, ${prettyNumber(range.xMax)}] | ` +
    `y-range: [${prettyNumber(yMin)}, ${prettyNumber(yMax)}] | ` +
    `real roots highlighted: ${realRoots.length}`;
}

function solveAndUpdate({ shouldPlot = false } = {}) {
  let coefficients;
  try {
    coefficients = readCoefficients();
  } catch (error) {
    setRootsOutput([`Input error: ${error.message}`]);
    refs.metaOutput.textContent = "Please check the four coefficient values.";
    return;
  }

  currentCoefficients = coefficients;

  const equationType = classifyEquation(coefficients.a, coefficients.b, coefficients.c);
  const roots = solveCubic(coefficients.a, coefficients.b, coefficients.c, coefficients.d);

  if (roots.length === 0) {
    setRootsOutput(["No unique root can be determined for this equation."]);
  } else if (roots.length === 1) {
    setRootsOutput([`Root: ${formatComplex(roots[0])}`]);
  } else {
    const lines = ["Roots:"];
    roots.forEach((root, index) => {
      lines.push(`x${index + 1} = ${formatComplex(root)}`);
    });

    const realRoots = uniqueSorted(extractRealValues(roots));
    if (realRoots.length > 0) {
      lines.push("");
      lines.push(`Distinct real roots (${realRoots.length}): ${realRoots.map(prettyNumber).join(", ")}`);
    }
    setRootsOutput(lines);
  }

  refs.metaOutput.textContent = `Detected equation type: ${equationType}. Complex roots are computed using Cardano's method.`;

  if (shouldPlot) {
    drawPlot(coefficients);
  }
}

function resetForm() {
  refs.inputA.value = "1";
  refs.inputB.value = "0";
  refs.inputC.value = "0";
  refs.inputD.value = "-1";

  currentCoefficients = null;
  updateEquationPreview();

  setRootsOutput(["Enter coefficients, then click Solve."]);
  refs.metaOutput.textContent = "The tool supports complex roots and degenerate cases.";
  refs.rangeOutput.textContent = "x-range and y-range will appear after plotting.";

  drawPlaceholder();
}

refs.form.addEventListener("submit", (event) => {
  event.preventDefault();
  solveAndUpdate({ shouldPlot: false });
});

refs.plotButton.addEventListener("click", () => {
  solveAndUpdate({ shouldPlot: true });
});

refs.clearButton.addEventListener("click", () => {
  resetForm();
});

for (const input of [refs.inputA, refs.inputB, refs.inputC, refs.inputD]) {
  input.addEventListener("input", () => {
    updateEquationPreview();
  });
}

let resizeTimer = null;
window.addEventListener("resize", () => {
  if (resizeTimer !== null) {
    window.clearTimeout(resizeTimer);
  }
  resizeTimer = window.setTimeout(() => {
    if (currentCoefficients !== null) {
      drawPlot(currentCoefficients);
    } else {
      drawPlaceholder();
    }
  }, 80);
});

updateEquationPreview();
drawPlaceholder();
