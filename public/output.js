const canvas = document.querySelector('#output-canvas');
const context = canvas.getContext('2d');

let outputState = {
  active: false,
  height: window.innerHeight || 720,
  width: window.innerWidth || 1280
};

function applyCanvasSize(width, height) {
  canvas.width = width;
  canvas.height = height;
}

function renderStandbyScreen() {
  applyCanvasSize(window.innerWidth || 1280, window.innerHeight || 720);
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#000';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const panelWidth = Math.min(760, canvas.width - 80);
  const panelHeight = 220;
  const panelX = (canvas.width - panelWidth) / 2;
  const panelY = (canvas.height - panelHeight) / 2;

  context.strokeStyle = '#333';
  context.lineWidth = 2;
  context.strokeRect(panelX, panelY, panelWidth, panelHeight);

  context.fillStyle = '#fff';
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  context.font = '16px sans-serif';
  context.fillText('NDI ENABLED REALTIME VIDEO DEVELOPMENT KIT', canvas.width / 2, panelY + 42);

  context.font = '34px sans-serif';
  context.fillText('Output Standby', canvas.width / 2, panelY + 92);

  context.font = '20px sans-serif';
  context.fillText('No active output session.', canvas.width / 2, panelY + 138);

  context.font = '18px sans-serif';
  context.fillText('Use Start Output in the control window to arm the canvas and NDI feed.', canvas.width / 2, panelY + 176);

  context.font = '16px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('Status: Idle', canvas.width / 2, panelY + 208);
}

function renderOutputFrame() {
  applyCanvasSize(outputState.width, outputState.height);
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#000';
  context.fillRect(0, 0, canvas.width, canvas.height);
}

function render() {
  if (!outputState.active) {
    renderStandbyScreen();
    return;
  }

  renderOutputFrame();
}

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed for ${url}`);
  }

  return response.json();
}

async function refreshOutputState() {
  outputState = await fetchJson('/api/output/status');
  render();
}

async function initialise() {
  renderStandbyScreen();
  await refreshOutputState();

  window.addEventListener('resize', () => {
    if (!outputState.active) {
      renderStandbyScreen();
    }
  });

  window.setInterval(() => {
    refreshOutputState().catch(() => {});
  }, 1000);
}

initialise();
