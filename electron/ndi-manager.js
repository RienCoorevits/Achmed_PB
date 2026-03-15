import { access } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { BrowserWindow } from 'electron/main';

const DEFAULT_CONFIG = {
  fps: 30,
  height: 720,
  sourceName: 'Achmed Output',
  width: 1280
};

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function normaliseConfig(baseConfig, config = {}) {
  return {
    fps: Number(config.fps ?? baseConfig.fps),
    height: Number(config.height ?? baseConfig.height),
    sourceName: String(config.sourceName ?? baseConfig.sourceName),
    width: Number(config.width ?? baseConfig.width)
  };
}

export function createNdiController({ projectRoot, resolveOutputUrl }) {
  const helperPath = path.join(projectRoot, 'bin', 'ndi_sender');
  const buildScriptPath = path.join(projectRoot, 'scripts', 'build-ndi-helper.js');

  let helperProcess = null;
  let outputWindow = null;
  let latestFrame = null;
  let mostRecentFrame = null;
  let frameTimer = null;
  let waitingForDrain = false;
  let status = {
    available: true,
    fps: DEFAULT_CONFIG.fps,
    height: DEFAULT_CONFIG.height,
    lastError: null,
    outputUrl: null,
    reason: 'idle',
    running: false,
    sourceName: DEFAULT_CONFIG.sourceName,
    width: DEFAULT_CONFIG.width
  };

  function getStatus() {
    return { ...status };
  }

  function updateStatus(nextStatus) {
    status = {
      ...status,
      ...nextStatus
    };
  }

  async function ensureHelperBuilt() {
    if (await fileExists(helperPath)) {
      return;
    }

    await new Promise((resolve, reject) => {
      const build = spawn(process.execPath, [buildScriptPath], {
        cwd: projectRoot,
        stdio: 'inherit'
      });

      build.on('exit', (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(new Error(`NDI helper build failed with code ${code ?? 'unknown'}`));
      });

      build.on('error', reject);
    });
  }

  function cleanupWindow() {
    if (!outputWindow) {
      return;
    }

    outputWindow.webContents.removeAllListeners('paint');
    outputWindow.webContents.removeAllListeners('did-finish-load');
    outputWindow.webContents.removeAllListeners('did-fail-load');
    outputWindow.destroy();
    outputWindow = null;
  }

  function clearFrameTimer() {
    if (!frameTimer) {
      return;
    }

    clearInterval(frameTimer);
    frameTimer = null;
  }

  function resetFrameState() {
    latestFrame = null;
    mostRecentFrame = null;
    waitingForDrain = false;
    clearFrameTimer();
  }

  function isIgnorableStreamError(error) {
    return ['EPIPE', 'ERR_STREAM_DESTROYED', 'ERR_STREAM_WRITE_AFTER_END'].includes(error?.code);
  }

  function handleHelperStreamError(activeHelper, error) {
    if (helperProcess !== activeHelper && activeHelper.exitCode !== null) {
      return;
    }

    waitingForDrain = false;

    if (isIgnorableStreamError(error)) {
      return;
    }

    updateStatus({
      lastError: error instanceof Error ? error.message : String(error),
      reason: 'error',
      running: false
    });
  }

  function cleanupHelper() {
    resetFrameState();

    if (!helperProcess) {
      return;
    }

    const activeHelper = helperProcess;
    helperProcess = null;

    activeHelper.stdin.removeAllListeners('drain');
    activeHelper.stdin.removeAllListeners('error');
    activeHelper.stdin.on('error', () => {});
    activeHelper.removeAllListeners();

    if (!activeHelper.stdin.destroyed && !activeHelper.stdin.writableEnded) {
      activeHelper.stdin.end();
    }

    if (activeHelper.exitCode === null) {
      activeHelper.kill('SIGTERM');
    }
  }

  function writeFrame(frameBuffer) {
    if (
      !helperProcess ||
      helperProcess.stdin.destroyed ||
      helperProcess.stdin.writableEnded ||
      helperProcess.stdin.writableFinished
    ) {
      return;
    }

    let canContinue = false;

    try {
      canContinue = helperProcess.stdin.write(frameBuffer);
    } catch (error) {
      handleHelperStreamError(helperProcess, error);
      return;
    }

    if (!canContinue) {
      waitingForDrain = true;
    }
  }

  function attachPaintPipeline(config, activeHelper) {
    outputWindow.webContents.setFrameRate(config.fps);
    frameTimer = setInterval(() => {
      if (!mostRecentFrame || waitingForDrain) {
        return;
      }

      writeFrame(mostRecentFrame);
    }, Math.max(1, Math.floor(1000 / config.fps)));

    outputWindow.webContents.on('paint', (_event, _dirty, image) => {
      let frameImage = image;
      const imageSize = image.getSize();

      if (imageSize.width !== config.width || imageSize.height !== config.height) {
        frameImage = image.resize({
          width: config.width,
          height: config.height,
          quality: 'good'
        });
      }

      const bitmap = frameImage.toBitmap();
      mostRecentFrame = bitmap;

      if (waitingForDrain) {
        latestFrame = bitmap;
        return;
      }

      writeFrame(bitmap);
    });

    activeHelper.stdin.on('drain', () => {
      if (helperProcess !== activeHelper) {
        return;
      }

      waitingForDrain = false;

      if (!latestFrame) {
        return;
      }

      const bufferedFrame = latestFrame;
      latestFrame = null;
      writeFrame(bufferedFrame);
    });

    activeHelper.stdin.on('error', (error) => {
      handleHelperStreamError(activeHelper, error);
    });
  }

  async function start(config = {}) {
    const nextConfig = normaliseConfig(status, config);
    const outputUrl = resolveOutputUrl();

    if (!outputUrl) {
      throw new Error('Output URL is not ready yet.');
    }

    await stop();
    await ensureHelperBuilt();

    const activeHelper = spawn(
      helperPath,
      [nextConfig.sourceName, String(nextConfig.width), String(nextConfig.height), String(nextConfig.fps)],
      {
        cwd: projectRoot,
        stdio: ['pipe', 'ignore', 'pipe']
      }
    );
    helperProcess = activeHelper;

    activeHelper.stderr.on('data', (chunk) => {
      if (helperProcess !== activeHelper) {
        return;
      }

      const message = chunk.toString().trim();

      if (message) {
        updateStatus({
          lastError: message
        });
      }
    });

    activeHelper.on('exit', (code) => {
      if (helperProcess !== activeHelper) {
        return;
      }

      updateStatus({
        reason: code === 0 ? 'stopped' : 'error',
        running: false
      });

      if (code && code !== 0) {
        updateStatus({
          lastError: `NDI sender exited with code ${code}.`
        });
      }

      cleanupWindow();
      helperProcess = null;
    });

    outputWindow = new BrowserWindow({
      width: nextConfig.width,
      height: nextConfig.height,
      show: false,
      frame: false,
      useContentSize: true,
      backgroundColor: '#000000',
      paintWhenInitiallyHidden: true,
      webPreferences: {
        backgroundThrottling: false,
        contextIsolation: true,
        nodeIntegration: false,
        offscreen: true
      }
    });

    attachPaintPipeline(nextConfig, activeHelper);

    outputWindow.webContents.once('did-finish-load', () => {
      updateStatus({
        fps: nextConfig.fps,
        height: nextConfig.height,
        lastError: null,
        outputUrl,
        reason: 'streaming',
        running: true,
        sourceName: nextConfig.sourceName,
        width: nextConfig.width
      });
    });

    outputWindow.webContents.once('did-fail-load', (_event, errorCode, errorDescription) => {
      updateStatus({
        lastError: `Output renderer failed to load (${errorCode}): ${errorDescription}`,
        reason: 'error',
        running: false
      });
    });

    await outputWindow.loadURL(outputUrl);

    return getStatus();
  }

  async function applyOutputConfig(config = {}) {
    const nextConfig = normaliseConfig(status, config);

    updateStatus({
      height: nextConfig.height,
      width: nextConfig.width
    });

    if (!status.running) {
      return getStatus();
    }

    return start({
      fps: status.fps,
      height: nextConfig.height,
      sourceName: status.sourceName,
      width: nextConfig.width
    });
  }

  async function stop() {
    cleanupWindow();

    if (helperProcess && !helperProcess.stdin.destroyed) {
      helperProcess.stdin.end();
    }

    cleanupHelper();

    updateStatus({
      reason: 'idle',
      running: false
    });

    return getStatus();
  }

  async function shutdown() {
    await stop();
  }

  return {
    applyOutputConfig,
    getStatus,
    shutdown,
    start,
    stop
  };
}
