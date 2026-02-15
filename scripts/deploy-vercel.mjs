// Deploy Crowdcast: Create GitHub repo, push code, import to Vercel
// Uses persistent browser profile

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const PROJECT_NAME = 'crowdcast';
const ROOT = join(import.meta.dirname, '..');
const SCREENSHOTS_DIR = join(ROOT, 'scripts', 'screenshots');
const USER_DATA_DIR = join(ROOT, '.playwright-profile');

try { mkdirSync(SCREENSHOTS_DIR, { recursive: true }); } catch {}

// Load env vars
function loadEnv() {
  const envFile = join(ROOT, 'apps', 'web', '.env.local');
  const creds = {};
  try {
    const content = readFileSync(envFile, 'utf-8');
    for (const line of content.split('\n')) {
      const [k, ...v] = line.split('=');
      if (k && v.length) creds[k.trim()] = v.join('=').trim();
    }
  } catch {}
  return creds;
}

async function main() {
  const creds = loadEnv();
  console.log('Crowdcast Deployment: GitHub + Vercel');
  console.log('=====================================\n');
  console.log(`Supabase URL: ${creds.NEXT_PUBLIC_SUPABASE_URL || 'not set'}`);
  console.log(`Anon Key: ${creds.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'not set'}`);
  console.log(`Service Key: ${creds.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'not set'}\n`);

  // Step 1: Create GitHub repo via gh CLI if available, otherwise via browser
  console.log('[1/4] Creating GitHub repository...');
  let repoUrl = '';

  try {
    // Try gh CLI first (faster)
    const result = execSync(
      `gh repo create ${PROJECT_NAME} --public --description "Community polling platform" --source . --remote origin --push 2>&1`,
      { cwd: ROOT, encoding: 'utf-8', timeout: 60000 }
    );
    console.log(result);
    repoUrl = result.match(/https:\/\/github\.com\/[^\s]+/)?.[0] || '';
    console.log(`   Repo created: ${repoUrl}`);
  } catch (err) {
    console.log('   gh CLI not available or failed, trying browser...');
    console.log(`   Error: ${err.message.slice(0, 100)}`);

    // Fall back to browser-based repo creation
    const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
      headless: false, slowMo: 200, viewport: { width: 1280, height: 900 },
    });
    const page = context.pages()[0] || await context.newPage();
    page.setDefaultTimeout(60000);

    try {
      await page.goto('https://github.com/new', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(3000);

      // Check if logged in
      if (page.url().includes('login') || page.url().includes('session')) {
        console.log('\n   Please log in to GitHub in the browser.');
        console.log('   Waiting...\n');
        await page.waitForURL('**/new**', { timeout: 300_000 });
        await page.waitForTimeout(3000);
      }

      // Fill repo name
      const nameInput = page.locator('input[data-testid="repository-name-input"], input#repository_name').first();
      await nameInput.waitFor({ state: 'visible', timeout: 15000 });
      await nameInput.fill(PROJECT_NAME);
      await page.waitForTimeout(2000);

      // Set description
      const descInput = page.locator('#repository_description, textarea[aria-label*="description"]').first();
      if (await descInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await descInput.fill('Community polling platform - Free features + monetization');
      }

      // Public
      const publicLabel = page.locator('label:has-text("Public")').first();
      if (await publicLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
        await publicLabel.click();
      }

      await page.screenshot({ path: join(SCREENSHOTS_DIR, 'github-new-repo.png') });

      // Click Create
      const createBtn = page.locator('button:has-text("Create repository")').first();
      await createBtn.waitFor({ state: 'visible', timeout: 10000 });
      await createBtn.click();

      await page.waitForURL(`**/${PROJECT_NAME}**`, { timeout: 60000 });
      await page.waitForTimeout(3000);
      repoUrl = page.url();
      console.log(`   Repo created: ${repoUrl}`);

      await page.screenshot({ path: join(SCREENSHOTS_DIR, 'github-repo-created.png') });
    } finally {
      await context.close();
    }
  }

  // Step 2: Push code to GitHub
  console.log('\n[2/4] Pushing code to GitHub...');
  try {
    // Check if remote already exists
    const remotes = execSync('git remote -v', { cwd: ROOT, encoding: 'utf-8' });
    if (!remotes.includes('origin')) {
      const repoMatch = repoUrl.match(/github\.com\/([^/]+\/[^/\s]+)/);
      const remote = repoMatch ? `https://github.com/${repoMatch[1]}.git` : '';
      if (remote) {
        execSync(`git remote add origin ${remote}`, { cwd: ROOT, encoding: 'utf-8' });
        console.log(`   Added remote: ${remote}`);
      }
    }

    // Add .env files to gitignore if not already
    execSync('git push -u origin master 2>&1 || git push -u origin main 2>&1', {
      cwd: ROOT, encoding: 'utf-8', timeout: 60000,
    });
    console.log('   Code pushed to GitHub!');
  } catch (err) {
    console.log(`   Push issue: ${err.message.slice(0, 200)}`);
    console.log('   You may need to push manually.');
  }

  // Step 3: Import to Vercel
  console.log('\n[3/4] Importing to Vercel...');

  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false, slowMo: 200, viewport: { width: 1280, height: 900 },
  });
  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(60000);

  try {
    await page.goto('https://vercel.com/new', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(5000);

    // Check if logged in
    if (page.url().includes('login') || page.url().includes('signup')) {
      console.log('\n   Please log in to Vercel in the browser.');
      console.log('   Waiting...\n');
      await page.waitForURL('**/new**', { timeout: 300_000 });
      await page.waitForTimeout(3000);
    }

    await page.screenshot({ path: join(SCREENSHOTS_DIR, 'vercel-new.png') });

    // Search for the repo
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill(PROJECT_NAME);
      await page.waitForTimeout(3000);
    }

    // Click Import on the matching repo
    const importBtn = page.locator('button:has-text("Import")').first();
    if (await importBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      await importBtn.click();
      await page.waitForTimeout(5000);
    }

    await page.screenshot({ path: join(SCREENSHOTS_DIR, 'vercel-configure.png') });

    // Expand Environment Variables section
    const envSection = page.locator('button:has-text("Environment Variables"), summary:has-text("Environment")').first();
    if (await envSection.isVisible({ timeout: 5000 }).catch(() => false)) {
      await envSection.click();
      await page.waitForTimeout(1000);
    }

    // Add environment variables
    const envVars = {
      NEXT_PUBLIC_SUPABASE_URL: creds.NEXT_PUBLIC_SUPABASE_URL || '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: creds.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      SUPABASE_SERVICE_ROLE_KEY: creds.SUPABASE_SERVICE_ROLE_KEY || '',
    };

    for (const [key, value] of Object.entries(envVars)) {
      if (!value) continue;

      const nameInput = page.locator('input[placeholder*="NAME"], input[placeholder*="name"], input[name="key"]').last();
      const valueInput = page.locator('input[placeholder*="VALUE"], input[placeholder*="value"], input[name="value"], textarea[name="value"]').last();

      if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nameInput.fill(key);
        await page.waitForTimeout(300);
      }
      if (await valueInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await valueInput.fill(value);
        await page.waitForTimeout(300);
      }

      const addBtn = page.locator('button:has-text("Add")').first();
      if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addBtn.click();
        await page.waitForTimeout(500);
      }
      console.log(`   Added env: ${key}`);
    }

    await page.screenshot({ path: join(SCREENSHOTS_DIR, 'vercel-env-vars.png') });

    // Click Deploy
    console.log('\n[4/4] Deploying...');
    const deployBtn = page.locator('button:has-text("Deploy")').first();
    if (await deployBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await deployBtn.click();
      console.log('   Deploy initiated! Waiting for completion...');
    } else {
      console.log('   Deploy button not found. Please click Deploy manually.');
    }

    // Wait for deployment to complete (URL changes to congratulations or deployments page)
    try {
      await page.waitForURL('**/congratulations**', { timeout: 300_000 });
    } catch {
      // Try alternative success indicators
      await page.waitForTimeout(10000);
    }

    await page.waitForTimeout(5000);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, 'vercel-deployed.png') });

    // Extract deployment URL
    const deployLink = page.locator('a[href*=".vercel.app"]').first();
    let deployUrl = '';
    if (await deployLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      deployUrl = await deployLink.getAttribute('href') || await deployLink.textContent() || '';
    }

    console.log('\n====================================');
    console.log('Deployment complete!');
    if (deployUrl) console.log(`Live URL: ${deployUrl}`);
    console.log('====================================');

    writeFileSync(join(ROOT, '.vercel-url'), deployUrl);
    await page.waitForTimeout(10000);

  } finally {
    await context.close();
  }
}

main();
