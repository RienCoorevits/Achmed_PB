import { spawn } from 'node:child_process';
import electronBinary from 'electron';

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronBinary, ['.', ...process.argv.slice(2)], {
  cwd: process.cwd(),
  env,
  stdio: 'inherit'
});

child.on('exit', (code, signal) => {
  if (code !== null) {
    process.exit(code);
  }

  console.error(`[achmed-electron] Electron exited with signal ${signal ?? 'unknown'}.`);
  process.exit(1);
});

