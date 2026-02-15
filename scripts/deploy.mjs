// Orchestrator: Setup Supabase + Deploy to Vercel
// Run: node scripts/deploy.mjs
//
// This script:
// 1. Opens Supabase in a browser to create a project and grab API keys
// 2. Pushes code to GitHub
// 3. Opens Vercel to import the repo and deploy with env vars
//
// You'll need to log in to both services in the browser windows.

import { execSync, spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '..');
const ENV_FILE = join(ROOT, '.env.supabase');
const ENV_LOCAL = join(ROOT, 'apps', 'web', '.env.local');

function banner(text) {
  console.log('\n' + '='.repeat(50));
  console.log(text);
  console.log('='.repeat(50) + '\n');
}

async function runScript(name) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [join(ROOT, 'scripts', name)], {
      stdio: 'inherit',
      cwd: ROOT,
    });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${name} exited with code ${code}`));
    });
    proc.on('error', reject);
  });
}

async function main() {
  banner('CROWDCAST DEPLOYMENT');
  console.log('This will set up Supabase + GitHub + Vercel.\n');

  // Phase 1: Supabase
  banner('PHASE 1: SUPABASE PROJECT SETUP');
  try {
    await runScript('setup-supabase.mjs');
  } catch (err) {
    console.error('Supabase setup had issues:', err.message);
    console.log('Continuing anyway — you can add env vars manually.\n');
  }

  // Phase 2: Git push
  banner('PHASE 2: PUSH TO GITHUB');

  const remoteFile = join(ROOT, '.git-remote-url');
  let hasRemote = false;

  try {
    const remotes = execSync('git remote -v', { cwd: ROOT, encoding: 'utf-8' });
    hasRemote = remotes.includes('origin');
    console.log('Current remotes:\n' + remotes);
  } catch {
    console.log('No git remotes configured.');
  }

  if (!hasRemote) {
    console.log('No origin remote found.');
    console.log('The Vercel setup script will help create a GitHub repo.\n');
  } else {
    console.log('Pushing to origin...');
    try {
      execSync('git push -u origin master', { cwd: ROOT, stdio: 'inherit' });
      console.log('✅ Code pushed to GitHub.\n');
    } catch {
      console.log('⚠️  Push failed — you may need to push manually.\n');
    }
  }

  // Phase 3: Vercel
  banner('PHASE 3: VERCEL DEPLOYMENT');
  try {
    await runScript('setup-vercel.mjs');
  } catch (err) {
    console.error('Vercel deployment had issues:', err.message);
  }

  // Summary
  banner('DEPLOYMENT COMPLETE');

  if (existsSync(ENV_FILE)) {
    console.log('Supabase credentials: .env.supabase');
  }
  if (existsSync(join(ROOT, '.vercel-url'))) {
    const url = readFileSync(join(ROOT, '.vercel-url'), 'utf-8').trim();
    console.log(`Live URL: ${url}`);
  }

  console.log('\nNext steps:');
  console.log('1. Run Supabase migrations against your project');
  console.log('2. Deploy Supabase edge functions');
  console.log('3. Configure Stripe keys in Vercel env vars');
  console.log('4. Set up custom domain in Vercel (optional)\n');
}

main();
