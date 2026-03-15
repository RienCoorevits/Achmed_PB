import { advanceScene, createStoryState, regenerateState } from '/shared/story-engine.js';

const stateElements = {
  applyOutputSize: document.querySelector('#apply-output-size'),
  applySettings: document.querySelector('#apply-settings'),
  beatDurationInput: document.querySelector('#beat-duration-input'),
  beatDurationValue: document.querySelector('#beat-duration-value'),
  controlUrl: document.querySelector('#control-url'),
  currentAct: document.querySelector('#current-act'),
  currentCaption: document.querySelector('#current-caption'),
  currentCue: document.querySelector('#current-cue'),
  currentScene: document.querySelector('#current-scene'),
  intensityInput: document.querySelector('#intensity-input'),
  intensityValue: document.querySelector('#intensity-value'),
  ndiFpsInput: document.querySelector('#ndi-fps-input'),
  ndiMessage: document.querySelector('#ndi-message'),
  ndiReason: document.querySelector('#ndi-reason'),
  ndiSourceInput: document.querySelector('#ndi-source-input'),
  ndiStart: document.querySelector('#ndi-start'),
  ndiStatus: document.querySelector('#ndi-status'),
  ndiStop: document.querySelector('#ndi-stop'),
  outputHeightInput: document.querySelector('#output-height-input'),
  outputUrl: document.querySelector('#output-url'),
  outputUrlSecondary: document.querySelector('#output-url-secondary'),
  outputWidthInput: document.querySelector('#output-width-input'),
  playbackMode: document.querySelector('#playback-mode'),
  previousScene: document.querySelector('#previous-scene'),
  regenerateStory: document.querySelector('#regenerate-story'),
  sceneList: document.querySelector('#scene-list'),
  seedInput: document.querySelector('#seed-input'),
  togglePlay: document.querySelector('#toggle-play'),
  nextScene: document.querySelector('#next-scene')
};

let state;
let currentConfig;
let ndiStatus;
let outputConfig;
let playbackTimer;

async function fetchJson(url, options) {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`Request failed for ${url}`);
  }

  return response.json();
}

async function postJson(url, payload = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error ?? `Request failed for ${url}`);
  }

  return body;
}

async function pushState() {
  await postJson('/api/state', state);
}

function syncStoryControls() {
  stateElements.seedInput.value = state.seed;
  stateElements.beatDurationInput.value = String(state.beatDuration);
  stateElements.intensityInput.value = String(state.intensity);
  stateElements.beatDurationValue.textContent = `${state.beatDuration} ms`;
  stateElements.intensityValue.textContent = `${Math.round(state.intensity * 100)}%`;
}

function syncOutputControls() {
  if (!outputConfig) {
    return;
  }

  stateElements.outputWidthInput.value = String(outputConfig.width);
  stateElements.outputHeightInput.value = String(outputConfig.height);
}

function syncNdiControls() {
  if (!ndiStatus) {
    return;
  }

  stateElements.ndiStatus.textContent = ndiStatus.available ? (ndiStatus.running ? 'Streaming' : 'Ready') : 'Unavailable';
  stateElements.ndiReason.textContent = ndiStatus.reason ?? 'idle';
  stateElements.ndiMessage.textContent =
    ndiStatus.lastError ?? (ndiStatus.available ? 'NDI sender is idle.' : 'NDI requires the Electron control app.');

  if (typeof ndiStatus.sourceName === 'string') {
    stateElements.ndiSourceInput.value = ndiStatus.sourceName;
  }

  if (typeof ndiStatus.fps === 'number') {
    stateElements.ndiFpsInput.value = String(ndiStatus.fps);
  }

  stateElements.ndiStart.disabled = !ndiStatus.available;
  stateElements.ndiStop.disabled = !ndiStatus.available || !ndiStatus.running;
}

function renderSceneList() {
  stateElements.sceneList.innerHTML = state.scenes
    .map((scene, index) => {
      const isActive = index === state.currentIndex ? ' scene-row-active' : '';

      return `
        <button class="scene-table scene-row${isActive}" data-index="${index}">
          <span>${index + 1}</span>
          <span>${scene.act}</span>
          <span>${scene.title}<br>${scene.subtitle}</span>
          <span>${scene.cue}</span>
        </button>
      `;
    })
    .join('');
}

function render() {
  const currentScene = state.scenes[state.currentIndex];

  syncStoryControls();
  syncOutputControls();
  syncNdiControls();
  renderSceneList();

  stateElements.currentAct.textContent = currentScene.act;
  stateElements.currentScene.textContent = `${state.currentIndex + 1} / ${state.scenes.length} ${currentScene.title}`;
  stateElements.currentCue.textContent = currentScene.cue;
  stateElements.currentCaption.textContent = currentScene.caption;
  stateElements.playbackMode.textContent = state.isPlaying ? 'Running' : 'Manual';
  stateElements.togglePlay.textContent = state.isPlaying ? 'Pause' : 'Run';

  if (currentConfig) {
    const { controlUrl, outputUrl } = currentConfig;

    stateElements.controlUrl.textContent = controlUrl;
    stateElements.controlUrl.href = controlUrl;
    stateElements.outputUrl.textContent = outputUrl;
    stateElements.outputUrl.href = outputUrl;
    stateElements.outputUrlSecondary.textContent = outputUrl;
    stateElements.outputUrlSecondary.href = outputUrl;
  }
}

function schedulePlayback() {
  window.clearTimeout(playbackTimer);

  if (!state.isPlaying) {
    return;
  }

  playbackTimer = window.setTimeout(async () => {
    state = advanceScene(state, 1);
    render();
    await pushState();
    schedulePlayback();
  }, state.beatDuration);
}

async function updateState(nextState) {
  state = {
    ...nextState,
    updatedAt: new Date().toISOString()
  };

  render();
  schedulePlayback();
  await pushState();
}

function handleSceneSelection(event) {
  const target = event.target.closest('[data-index]');

  if (!target) {
    return;
  }

  updateState({
    ...state,
    currentIndex: Number(target.dataset.index)
  });
}

async function refreshNdiStatus() {
  ndiStatus = await fetchJson('/api/ndi/status');
  render();
}

async function refreshOutputConfig() {
  outputConfig = await fetchJson('/api/output-config');
  render();
}

async function initialise() {
  currentConfig = await fetchJson('/api/config');
  ndiStatus = await fetchJson('/api/ndi/status');
  outputConfig = currentConfig.outputConfig ?? (await fetchJson('/api/output-config'));

  try {
    state = await fetchJson('/api/state');
  } catch {
    state = createStoryState();
    await pushState();
  }

  render();
  schedulePlayback();

  const events = new EventSource('/events');
  events.addEventListener('state', (event) => {
    const incomingState = JSON.parse(event.data);

    if (incomingState.updatedAt !== state.updatedAt) {
      state = incomingState;
      render();
      schedulePlayback();
    }
  });
}

stateElements.togglePlay.addEventListener('click', () => {
  updateState({
    ...state,
    isPlaying: !state.isPlaying
  });
});

stateElements.previousScene.addEventListener('click', () => {
  updateState(advanceScene(state, -1));
});

stateElements.nextScene.addEventListener('click', () => {
  updateState(advanceScene(state, 1));
});

stateElements.applySettings.addEventListener('click', () => {
  updateState({
    ...state,
    seed: stateElements.seedInput.value.trim() || state.seed,
    beatDuration: Number(stateElements.beatDurationInput.value),
    intensity: Number(stateElements.intensityInput.value)
  });
});

stateElements.regenerateStory.addEventListener('click', () => {
  updateState(
    regenerateState(state, {
      seed: stateElements.seedInput.value.trim() || `${Date.now()}`,
      beatDuration: Number(stateElements.beatDurationInput.value),
      intensity: Number(stateElements.intensityInput.value)
    })
  );
});

stateElements.beatDurationInput.addEventListener('input', () => {
  stateElements.beatDurationValue.textContent = `${Number(stateElements.beatDurationInput.value)} ms`;
});

stateElements.intensityInput.addEventListener('input', () => {
  stateElements.intensityValue.textContent = `${Math.round(Number(stateElements.intensityInput.value) * 100)}%`;
});

stateElements.applyOutputSize.addEventListener('click', async () => {
  outputConfig = await postJson('/api/output-config', {
    width: Number(stateElements.outputWidthInput.value),
    height: Number(stateElements.outputHeightInput.value)
  });
  await refreshNdiStatus();
});

stateElements.sceneList.addEventListener('click', handleSceneSelection);

stateElements.ndiStart.addEventListener('click', async () => {
  ndiStatus = await postJson('/api/ndi/start', {
    fps: Number(stateElements.ndiFpsInput.value),
    sourceName: stateElements.ndiSourceInput.value.trim() || 'Achmed Output'
  });
  outputConfig = {
    width: ndiStatus.width,
    height: ndiStatus.height
  };
  render();
});

stateElements.ndiStop.addEventListener('click', async () => {
  ndiStatus = await postJson('/api/ndi/stop');
  render();
});

initialise();

window.setInterval(() => {
  refreshNdiStatus().catch(() => {});
  refreshOutputConfig().catch(() => {});
}, 2000);
