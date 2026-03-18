let outputSize = {
  height: window.innerHeight || 720,
  width: window.innerWidth || 1280
};

function applySketchSize(p5, width, height) {
  if (!p5.canvas) {
    return;
  }

  if (p5.width === width && p5.height === height) {
    return;
  }

  p5.resizeCanvas(width, height, true);
}

function drawSketch(p5) {
  applySketchSize(p5, outputSize.width, outputSize.height);

  const time = p5.millis() * 0.001;
  const centerX = p5.width * 0.5;
  const centerY = p5.height * 0.5;

  p5.background(6, 8, 16);

  p5.noStroke();
  p5.fill(255, 240, 200, 18);
  p5.circle(centerX, centerY, Math.min(p5.width, p5.height) * 0.78);

  for (let index = 0; index < 8; index += 1) {
    const angle = time * 0.7 + index * (p5.TWO_PI / 8);
    const orbit = Math.min(p5.width, p5.height) * (0.18 + index * 0.03);
    const x = centerX + Math.cos(angle) * orbit;
    const y = centerY + Math.sin(angle * 1.4) * orbit * 0.55;
    const size = 28 + index * 10 + Math.sin(time * 2 + index) * 6;

    p5.fill(255 - index * 18, 200 - index * 10, 120 + index * 12, 180);
    p5.circle(x, y, size);
  }

  p5.stroke(255, 255, 255, 90);
  p5.strokeWeight(1);
  p5.line(0, centerY, p5.width, centerY);
  p5.line(centerX, 0, centerX, p5.height);

  p5.noStroke();
  p5.fill(255);
  p5.textAlign(p5.LEFT, p5.TOP);
  p5.textSize(18);
  p5.text('p5.js test sketch', 24, 20);
  p5.text(`${outputSize.width} x ${outputSize.height}`, 24, 44);
}

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed for ${url}`);
  }

  return response.json();
}

async function refreshOutputSize() {
  const nextState = await fetchJson('/api/output/status');
  outputSize = {
    height: Number(nextState.height) || outputSize.height,
    width: Number(nextState.width) || outputSize.width
  };
}

function createSketch() {
  new window.p5((p5) => {
    p5.setup = () => {
      p5.createCanvas(outputSize.width, outputSize.height);
      p5.frameRate(60);
      p5.textFont('sans-serif');
    };

    p5.draw = () => {
      drawSketch(p5);
    };

    p5.windowResized = () => {
      applySketchSize(p5, outputSize.width, outputSize.height);
    };
  });
}

async function initialise() {
  await refreshOutputSize();
  createSketch();

  window.setInterval(() => {
    refreshOutputSize().catch(() => {});
  }, 1000);
}

initialise();
