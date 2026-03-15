# De Avonturen van Prins Achmed

Procedural generative storytelling app inspired by the 1926 film *The Adventures of Prince Achmed*.

## Current scaffold

- Electron control window
- HTML/CSS/JavaScript control and output surfaces
- Internal HTTP server with a browser-accessible `/output` route
- Shared procedural story state streamed to the output via Server-Sent Events
- Minimal utilitarian control UI for transport, sizing, routing, and scene selection
- Optional NDI sender path backed by a hidden offscreen Electron renderer and the local NDI SDK

## Run

```bash
npm install
npm start
```

`npm start` runs the browser preview server.

For the Electron shell:

```bash
npm run start:electron
```

To build the native NDI helper manually:

```bash
npm run build:ndi-helper
```

For a LAN-accessible output route:

```bash
npm run start:network
```

The control window lives inside Electron when you use `npm run start:electron`. The output does not open as an Electron window and stays available as a URL:

- `http://127.0.0.1:3030/output` for local browsing
- `http://YOUR_LAN_IP:3030/output` when started with `npm run start:network`

## Control UI

The control surface is currently designed as a utilitarian operator panel:

- Transport controls for run, pause, previous, next, apply, and rebuild
- Direct numeric inputs for seed, beat duration, and intensity
- Direct output width and height controls
- Routing panel for control and output URLs
- Table-style scene queue for fast selection during operation
- NDI panel for source name, frame rate, and stream control

The styling is intentionally minimal. The control UI is meant to read like an operator form, not a decorative dashboard, and it now uses a monochrome dark theme with black backgrounds, white text, and white linework.

## Output surface

The `/output` route is now only a single HTML canvas element. There is no page chrome around it, which avoids visible page scrollbars and keeps the Electron offscreen renderer clean for NDI capture.

Output width and height are controlled from the control UI and flow through a shared output config:

- The output canvas internal size is set from that config
- The hidden Electron offscreen renderer is restarted at that same size when NDI is active
- The NDI sender always uses that same width and height

This keeps browser output and NDI output matched at all times.

## NDI streaming

NDI streaming is available from the Electron control app, not from the plain browser preview.

- The app uses a hidden offscreen Electron renderer to load `/output`
- Frames are forwarded to a small native helper linked against the installed NDI SDK for Apple
- NDI start uses the current shared output width and height rather than a separate resolution setting
- NDI stop now guards the helper pipe shutdown so broken-pipe writes do not crash the Electron control app
- The helper source lives in [native/ndi_sender.c](/Users/u0127995/Documents/Developer/De%20Avonturen%20van%20Prins%20Achmed/Achmed_0.0.1_PB2/native/ndi_sender.c)
- The build script lives in [scripts/build-ndi-helper.js](/Users/u0127995/Documents/Developer/De%20Avonturen%20van%20Prins%20Achmed/Achmed_0.0.1_PB2/scripts/build-ndi-helper.js)
- The Electron-side controller lives in [electron/ndi-manager.js](/Users/u0127995/Documents/Developer/De%20Avonturen%20van%20Prins%20Achmed/Achmed_0.0.1_PB2/electron/ndi-manager.js)

Requirements on this machine:

- NDI SDK for Apple installed under `/Library/NDI SDK for Apple`
- Xcode command line toolchain available so `clang` can build the helper

## Electron note

This environment exports `ELECTRON_RUN_AS_NODE=1`, which breaks Electron by forcing it into plain Node mode. The launcher in [scripts/start-electron.js](/Users/u0127995/Documents/Developer/De%20Avonturen%20van%20Prins%20Achmed/Achmed_0.0.1_PB2/scripts/start-electron.js) strips that variable before starting Electron, and the app bootstrap lives in [electron/main.js](/Users/u0127995/Documents/Developer/De%20Avonturen%20van%20Prins%20Achmed/Achmed_0.0.1_PB2/electron/main.js).

Only the control surface is hosted in Electron. The output surface is intended to stay browser-accessible over the served URL for projection, monitoring, or NDI capture.

## Documentation rule

From this point forward, every substantive code change should be reflected in this README so the repository description stays current.

## Git workflow

Use this as the default loop:

```bash
git status
git add .
git commit -m "Describe the change"
git push
```

If this machine still needs your git identity configured:

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```
