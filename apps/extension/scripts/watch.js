import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const EXTENSION_DIR = path.resolve('.');
const REPO_ROOT = path.resolve('../..');

// Configs to watch
const WATCH_IGNORES = [
  'dist',
  'node_modules',
  '.git',
  'package.json',
  'package-lock.json',
  'jsconfig.json'
];

console.log('🚀 Starting SellerSuit Extension Watch & Dev Server...');

const localServerChildren = [];
if (process.env.SELLERSUIT_EXTENSION_ONLY !== 'true') {
  console.log('🌐 Starting local SellerSuit apps: marketing:3000, web:3001, admin:3002...');
  localServerChildren.push(spawnWatchProcess('npm', ['run', 'dev:marketing'], REPO_ROOT));
  localServerChildren.push(spawnWatchProcess('npm', ['run', 'dev:web'], REPO_ROOT));
  localServerChildren.push(spawnWatchProcess('npm', ['run', 'dev:admin'], REPO_ROOT));
} else {
  console.log('ℹ️ SELLERSUIT_EXTENSION_ONLY=true; skipping local app servers.');
}

// Helper to spawn child processes
function spawnWatchProcess(command, args, cwd = EXTENSION_DIR) {
  const child = spawn(command, args, {
    cwd,
    shell: true,
    stdio: 'inherit'
  });

  child.on('error', (err) => {
    console.error(`⚠️ Error starting ${command} ${args.join(' ')}:`, err);
  });

  return child;
}

// 1. Run initial prepare:dev to ensure a fresh, complete dev package exists
console.log('📦 Running initial preparation...');
const initialPrepare = spawnWatchProcess('npm', ['run', 'prepare:dev']);

initialPrepare.on('close', (code) => {
  if (code !== 0) {
    console.error('⚠️ Initial preparation failed. Watcher will continue but output might be incomplete.');
  }

  // 2. Start Vite watch builds
  console.log('🔍 Spawning Vite bundlers in watch mode...');
  const viteCore = spawnWatchProcess('npx', ['vite', 'build', '--watch']);
  const viteAmazon = spawnWatchProcess('npx', ['vite', 'build', '--config', 'vite.config.amazon.js', '--watch']);
  const viteWalmart = spawnWatchProcess('npx', ['vite', 'build', '--config', 'vite.config.walmart.js', '--watch']);
  const viteAliExpress = spawnWatchProcess('npx', ['vite', 'build', '--config', 'vite.config.aliexpress.js', '--watch']);
  const viteBackground = spawnWatchProcess('npx', ['vite', 'build', '--config', 'vite.config.background.js', '--watch']);

  const children = [viteCore, viteAmazon, viteWalmart, viteAliExpress, viteBackground, ...localServerChildren];

  // Clean up children on exit
  function cleanup() {
    console.log('\n🛑 Stopping watchers and cleaning up...');
    for (const child of children) {
      if (child && !child.killed) {
        child.kill('SIGTERM');
      }
    }
    process.exit(0);
  }

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // 3. Watch files recursively to copy asset/manifest changes to extension-dev
  let timeout = null;
  let changedFilesQueue = new Set();
  let isSyncing = false;
  let syncPending = false;

  function triggerSync() {
    if (isSyncing) {
      syncPending = true;
      return;
    }

    const files = Array.from(changedFilesQueue);
    changedFilesQueue.clear();

    if (files.length === 0) return;

    isSyncing = true;
    syncPending = false;
    
    console.log(`🔄 Syncing changes (${files.length} files) to dist/extension-dev...`);
    const syncProcess = spawn('npm', ['run', 'prepare:dev'], {
      cwd: EXTENSION_DIR,
      shell: true,
      stdio: 'ignore' // Quiet sync
    });

    syncProcess.on('close', (syncCode) => {
      isSyncing = false;
      if (syncCode === 0) {
        console.log('✅ Dev extension directory synchronized.');
      } else {
        console.error('⚠️ Sync failed.');
      }

      if (syncPending) {
        triggerSync();
      }
    });
  }

  function scheduleSync(relativePath) {
    changedFilesQueue.add(relativePath);
    clearTimeout(timeout);

    // If a source JS file changed (and it's not a build output), wait longer to let Vite compile first.
    // Otherwise, for CSS/HTML/Images or Vite output changes, sync quickly.
    const isSourceScript = relativePath.endsWith('.js') && !relativePath.startsWith('build/');
    const delay = isSourceScript ? 1500 : 150;

    timeout = setTimeout(triggerSync, delay);
  }

  console.log(`👀 Watching extension workspace: ${EXTENSION_DIR}`);
  
  fs.watch(EXTENSION_DIR, { recursive: true }, (eventType, filename) => {
    if (!filename) return;

    // Normalize path separators
    const relativePath = filename.replace(/\\/g, '/');

    // Filter out ignored paths
    const isIgnored = WATCH_IGNORES.some(ignored => relativePath.startsWith(ignored));
    if (isIgnored) return;

    // Ignore temporary files
    if (relativePath.endsWith('~') || relativePath.includes('/.')) return;

    // Log the change and trigger sync
    console.log(`ℹ️ [Watcher] Modified: ${relativePath}`);
    scheduleSync(relativePath);
  });
});
