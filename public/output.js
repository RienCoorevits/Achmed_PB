const VIEWBOX_WIDTH = 1600;
const VIEWBOX_HEIGHT = 900;

const canvas = document.querySelector('#output-canvas');
const context = canvas.getContext('2d');

let state = null;
let outputConfig = {
  width: 1280,
  height: 720
};

function scaleContext() {
  context.setTransform(
    canvas.width / VIEWBOX_WIDTH,
    0,
    0,
    canvas.height / VIEWBOX_HEIGHT,
    0,
    0
  );
}

function applyCanvasSize() {
  canvas.width = outputConfig.width;
  canvas.height = outputConfig.height;
  render();
}

function fillPath(points, fillStyle) {
  context.beginPath();
  context.moveTo(points[0][0], points[0][1]);

  for (let index = 1; index < points.length; index += 1) {
    context.lineTo(points[index][0], points[index][1]);
  }

  context.closePath();
  context.fillStyle = fillStyle;
  context.fill();
}

function drawMoon(palette) {
  context.fillStyle = palette.glow;
  context.globalAlpha = 0.14;
  context.beginPath();
  context.arc(1260, 160, 118, 0, Math.PI * 2);
  context.fill();

  context.globalAlpha = 0.9;
  context.beginPath();
  context.arc(1260, 160, 94, 0, Math.PI * 2);
  context.fill();

  context.globalAlpha = 1;
}

function drawStorm(palette) {
  context.fillStyle = palette.haze;
  context.globalAlpha = 0.32;
  context.beginPath();
  context.moveTo(0, 190);
  context.bezierCurveTo(240, 70, 500, 100, 720, 170);
  context.bezierCurveTo(980, 250, 1260, 240, 1600, 170);
  context.lineTo(1600, 360);
  context.bezierCurveTo(1260, 310, 980, 320, 720, 290);
  context.bezierCurveTo(500, 260, 240, 230, 0, 300);
  context.closePath();
  context.fill();
  context.globalAlpha = 1;
}

function drawPalace(palette) {
  context.fillStyle = palette.silhouette;
  fillPath(
    [
      [180, 820],
      [180, 610],
      [240, 610],
      [240, 410],
      [285, 410],
      [285, 610],
      [350, 610],
      [350, 320],
      [430, 320],
      [430, 610],
      [520, 610],
      [520, 360],
      [565, 360],
      [565, 610],
      [650, 610],
      [650, 450],
      [700, 450],
      [700, 610],
      [760, 610],
      [760, 820]
    ],
    palette.silhouette
  );
  context.beginPath();
  context.arc(395, 290, 48, Math.PI, 0);
  context.fill();
  context.beginPath();
  context.arc(550, 330, 30, Math.PI, 0);
  context.fill();
}

function drawTower(palette) {
  fillPath(
    [
      [1130, 820],
      [1130, 360],
      [1200, 270],
      [1270, 360],
      [1270, 820]
    ],
    palette.silhouette
  );
  context.fillRect(1215, 215, 16, 96);
}

function drawHorse(palette) {
  fillPath(
    [
      [680, 630],
      [735, 590],
      [810, 602],
      [870, 574],
      [910, 594],
      [932, 632],
      [1010, 618],
      [1038, 634],
      [986, 664],
      [1000, 720],
      [968, 722],
      [946, 674],
      [898, 678],
      [872, 736],
      [838, 736],
      [842, 676],
      [782, 676],
      [750, 732],
      [718, 732],
      [736, 674],
      [698, 660]
    ],
    palette.silhouette
  );
}

function drawBirds(palette) {
  context.strokeStyle = palette.silhouette;
  context.lineWidth = 8;

  [[960, 220], [1040, 260], [900, 300]].forEach(([x, y]) => {
    context.beginPath();
    context.moveTo(x, y);
    context.quadraticCurveTo(x + 20, y - 20, x + 40, y);
    context.quadraticCurveTo(x + 20, y - 8, x, y);
    context.stroke();
  });
}

function drawLanterns(palette) {
  [[250, 340, 18], [620, 390, 14], [1320, 280, 16]].forEach(([x, y, radius]) => {
    context.fillStyle = palette.glow;
    context.globalAlpha = 0.25;
    context.beginPath();
    context.arc(x, y, radius * 2.5, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 0.9;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  });
  context.globalAlpha = 1;
}

function drawIsland(palette) {
  fillPath(
    [
      [280, 820],
      [280, 690],
      [380, 590],
      [500, 590],
      [640, 690],
      [640, 820]
    ],
    palette.silhouette
  );
  fillPath(
    [
      [400, 610],
      [430, 460],
      [460, 610]
    ],
    palette.silhouette
  );
  fillPath(
    [
      [490, 620],
      [540, 430],
      [600, 620]
    ],
    palette.silhouette
  );
}

function drawGarden(palette) {
  context.fillStyle = palette.silhouette;
  context.beginPath();
  context.moveTo(880, 760);
  context.quadraticCurveTo(920, 660, 970, 620);
  context.quadraticCurveTo(948, 698, 980, 760);
  context.closePath();
  context.fill();

  context.beginPath();
  context.moveTo(1010, 760);
  context.quadraticCurveTo(1070, 650, 1140, 610);
  context.quadraticCurveTo(1110, 700, 1148, 760);
  context.closePath();
  context.fill();
}

function drawSerpent(palette) {
  context.fillStyle = palette.silhouette;
  context.beginPath();
  context.moveTo(1080, 700);
  context.bezierCurveTo(1160, 640, 1230, 640, 1320, 710);
  context.bezierCurveTo(1380, 760, 1430, 740, 1460, 700);
  context.bezierCurveTo(1440, 780, 1380, 820, 1300, 800);
  context.bezierCurveTo(1210, 774, 1160, 750, 1080, 700);
  context.closePath();
  context.fill();
}

function drawFire(palette) {
  context.fillStyle = palette.glow;
  context.globalAlpha = 0.8;
  fillPath(
    [
      [1180, 760],
      [1210, 700],
      [1200, 650],
      [1230, 610],
      [1260, 660],
      [1270, 710],
      [1300, 760]
    ],
    palette.glow
  );

  context.fillStyle = palette.haze;
  context.globalAlpha = 0.7;
  fillPath(
    [
      [1240, 790],
      [1270, 730],
      [1270, 690],
      [1295, 650],
      [1325, 700],
      [1335, 750],
      [1360, 790]
    ],
    palette.haze
  );
  context.globalAlpha = 1;
}

function drawWaves(palette) {
  context.fillStyle = palette.silhouette;
  context.globalAlpha = 0.92;
  context.beginPath();
  context.moveTo(0, 730);
  context.bezierCurveTo(160, 700, 320, 700, 480, 730);
  context.bezierCurveTo(640, 760, 820, 710, 980, 730);
  context.bezierCurveTo(1140, 750, 1320, 760, 1600, 720);
  context.lineTo(1600, 900);
  context.lineTo(0, 900);
  context.closePath();
  context.fill();
  context.globalAlpha = 1;
}

function drawMotifs(scene) {
  const motifs = new Set(scene.motifs);
  const { palette } = scene;

  if (motifs.has('moon')) {
    drawMoon(palette);
  }

  if (motifs.has('storm')) {
    drawStorm(palette);
  }

  if (motifs.has('island')) {
    drawIsland(palette);
  }

  if (motifs.has('garden')) {
    drawGarden(palette);
  }

  if (motifs.has('palace')) {
    drawPalace(palette);
  }

  if (motifs.has('tower')) {
    drawTower(palette);
  }

  if (motifs.has('horse')) {
    drawHorse(palette);
  }

  if (motifs.has('serpent')) {
    drawSerpent(palette);
  }

  if (motifs.has('fire')) {
    drawFire(palette);
  }

  if (motifs.has('waves')) {
    drawWaves(palette);
  }

  if (motifs.has('bird')) {
    drawBirds(palette);
  }

  if (motifs.has('lantern')) {
    drawLanterns(palette);
  }
}

function drawBackdrop(scene) {
  const gradient = context.createLinearGradient(0, 0, 0, VIEWBOX_HEIGHT);
  gradient.addColorStop(0, scene.palette.skyTop);
  gradient.addColorStop(1, scene.palette.skyBottom);
  context.fillStyle = gradient;
  context.fillRect(0, 0, VIEWBOX_WIDTH, VIEWBOX_HEIGHT);

  context.fillStyle = scene.palette.haze;
  context.globalAlpha = 0.14;
  context.beginPath();
  context.ellipse(800, 600, 680, 260, 0, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 1;

  context.fillStyle = scene.palette.ground;
  context.beginPath();
  context.moveTo(0, 690);
  context.bezierCurveTo(220, 620, 430, 630, 640, 700);
  context.bezierCurveTo(930, 790, 1200, 760, 1600, 690);
  context.lineTo(1600, 900);
  context.lineTo(0, 900);
  context.closePath();
  context.fill();
}

function drawText(scene) {
  context.fillStyle = scene.palette.text;
  context.textBaseline = 'top';

  context.font = '28px sans-serif';
  context.fillText(scene.act, 72, 52);

  context.font = '64px serif';
  context.fillText(scene.title, 72, 92);

  context.font = '28px sans-serif';
  context.fillText(scene.subtitle, 72, 176);

  context.font = '30px sans-serif';
  wrapText(scene.caption, 72, 738, 980, 42);

  context.font = '24px monospace';
  context.fillText(`Seed ${state.seed}`, 72, 844);
  context.fillText(`${state.currentIndex + 1}/${state.scenes.length} ${state.isPlaying ? 'Live' : 'Manual'}`, 1240, 844);
}

function wrapText(text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (const word of words) {
    const nextLine = line ? `${line} ${word}` : word;

    if (context.measureText(nextLine).width <= maxWidth) {
      line = nextLine;
      continue;
    }

    context.fillText(line, x, currentY);
    line = word;
    currentY += lineHeight;
  }

  if (line) {
    context.fillText(line, x, currentY);
  }
}

function render() {
  if (!state) {
    return;
  }

  const scene = state.scenes[state.currentIndex];

  context.save();
  context.imageSmoothingEnabled = true;
  scaleContext();
  context.clearRect(0, 0, VIEWBOX_WIDTH, VIEWBOX_HEIGHT);
  drawBackdrop(scene);
  drawMotifs(scene);
  drawText(scene);
  context.restore();
}

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed for ${url}`);
  }

  return response.json();
}

async function refreshOutputConfig() {
  const nextConfig = await fetchJson('/api/output-config');

  if (nextConfig.width === outputConfig.width && nextConfig.height === outputConfig.height) {
    return;
  }

  outputConfig = nextConfig;
  applyCanvasSize();
}

async function initialise() {
  const [initialState, initialOutputConfig] = await Promise.all([
    fetchJson('/api/state'),
    fetchJson('/api/output-config')
  ]);

  state = initialState;
  outputConfig = initialOutputConfig;
  applyCanvasSize();

  const events = new EventSource('/events');
  events.addEventListener('state', (event) => {
    state = JSON.parse(event.data);
    render();
  });

  window.setInterval(() => {
    refreshOutputConfig().catch(() => {});
  }, 1000);
}

initialise();
