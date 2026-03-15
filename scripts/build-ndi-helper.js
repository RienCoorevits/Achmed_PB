import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const projectRoot = process.cwd();
const outputDirectory = path.join(projectRoot, 'bin');
const outputBinary = path.join(outputDirectory, 'ndi_sender');
const sourceFile = path.join(projectRoot, 'native', 'ndi_sender.c');

const sdkRoot = '/Library/NDI SDK for Apple';
const includeDirectory = path.join(sdkRoot, 'include');
const libraryCandidates = [
  path.join(sdkRoot, 'lib', 'macOS', 'libndi.dylib'),
  '/usr/local/lib/libndi.dylib'
];
const ndiLibrary = libraryCandidates.find((candidate) => existsSync(candidate));

if (!ndiLibrary) {
  throw new Error('Unable to locate libndi.dylib. Install the NDI SDK for Apple first.');
}

await mkdir(outputDirectory, {
  recursive: true
});

const clangArguments = [
  '-O2',
  '-std=c11',
  sourceFile,
  '-I',
  includeDirectory,
  ndiLibrary,
  '-Wl,-rpath,/Library/NDI SDK for Apple/lib/macOS',
  '-Wl,-rpath,/usr/local/lib',
  '-o',
  outputBinary
];

await new Promise((resolve, reject) => {
  const build = spawn('clang', clangArguments, {
    stdio: 'inherit'
  });

  build.on('exit', (code) => {
    if (code === 0) {
      resolve();
      return;
    }

    reject(new Error(`clang exited with code ${code ?? 'unknown'}`));
  });

  build.on('error', reject);
});

console.log(`[achmed-ndi] Built helper at ${outputBinary}`);
