// Playwright script: Create Supabase project and extract credentials
// Uses persistent browser profile so you only need to log in once.
// Run: node scripts/setup-supabase.mjs

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const PROJECT_NAME = 'crowdcast';
const DB_PASSWORD = 'Crowdcast' + Math.random().toString(36).slice(2, 10) + '!';
const SCREENSHOTS_DIR = join(import.meta.dirname, '..', 'scripts', 'screenshots');
const CREDENTIALS_FILE = join(import.meta.dirname, '..', '.env.supabase');
const USER_DATA_DIR = join(import.meta.dirname, '..', '.playwright-profile');

try { mkdirSync(SCREENSHOTS_DIR, { recursive: true }); } catch {}

async function screenshot(page, name) {
  const path = join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  console.log(`   [screenshot] ${name}.png`);
}

async function main() {
  console.log('Supabase Project Setup via Playwright');
  console.log('======================================');
  console.log('Using persistent browser profile (login saved between runs)\n');

  // launchPersistentContext saves ALL browser state (cookies, localStorage, etc.)
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    slowMo: 200,
    viewport: { width: 1280, height: 900 },
  });

  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(60000);

  try {
    // Step 1: Go to Supabase dashboard
    console.log('[1/6] Opening Supabase...');
    await page.goto('https://supabase.com/dashboard/projects', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.waitForTimeout(4000);

    // Check if "New project" button is visible (means we're logged in)
    const newProjectBtn = page.locator('button:has-text("New project"), a:has-text("New project")').first();
    let isOnDashboard = await newProjectBtn.isVisible({ timeout: 5000 }).catch(() => false);

    if (!isOnDashboard) {
      console.log('\n   *** Please log in to Supabase in the browser window ***');
      console.log('   Your login will be saved for future runs.');
      console.log('   Waiting up to 5 minutes...\n');

      await newProjectBtn.waitFor({ state: 'visible', timeout: 300_000 });
      await page.waitForTimeout(3000);
    }

    console.log('   Projects dashboard loaded!');
    await screenshot(page, '01-projects');

    // Step 2: Click "New project"
    console.log('[2/6] Clicking "New project"...');
    await newProjectBtn.click();
    await page.waitForTimeout(5000);
    await screenshot(page, '02-new-project-form');

    // Debug form elements
    const inputs = await page.locator('input:visible').all();
    console.log(`   Found ${inputs.length} visible input(s):`);
    for (const input of inputs) {
      const id = await input.getAttribute('id').catch(() => '') || '';
      const placeholder = await input.getAttribute('placeholder').catch(() => '') || '';
      const type = await input.getAttribute('type').catch(() => '') || '';
      console.log(`     id="${id}" placeholder="${placeholder}" type="${type}"`);
    }

    // Step 3: Fill project details
    console.log('[3/6] Filling project details...');

    let nameInput = null;
    const visibleInputs = page.locator('input:visible');
    const inputCount = await visibleInputs.count();

    for (let i = 0; i < inputCount; i++) {
      const el = visibleInputs.nth(i);
      const id = (await el.getAttribute('id').catch(() => '') || '').toLowerCase();
      const placeholder = (await el.getAttribute('placeholder').catch(() => '') || '').toLowerCase();
      const type = (await el.getAttribute('type').catch(() => '') || '').toLowerCase();

      if (type === 'password' || type === 'hidden') continue;
      if (placeholder.includes('search')) continue;

      if (id.includes('name') || id.includes('project') || placeholder.includes('name') || placeholder.includes('project')) {
        nameInput = el;
        break;
      }
    }

    if (!nameInput) {
      for (let i = 0; i < inputCount; i++) {
        const el = visibleInputs.nth(i);
        const type = (await el.getAttribute('type').catch(() => '') || '').toLowerCase();
        const placeholder = (await el.getAttribute('placeholder').catch(() => '') || '').toLowerCase();
        if (type !== 'password' && type !== 'hidden' && !placeholder.includes('search')) {
          nameInput = el;
          break;
        }
      }
    }

    if (nameInput) {
      await nameInput.clear();
      await nameInput.fill(PROJECT_NAME);
      console.log(`   Filled project name: ${PROJECT_NAME}`);
    } else {
      console.log('   Could not find name input. Please fill manually.');
    }

    const passInput = page.locator('input[type="password"]:visible').first();
    if (await passInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await passInput.clear();
      await passInput.fill(DB_PASSWORD);
      console.log(`   DB Password: ${DB_PASSWORD}`);
    }

    await screenshot(page, '03-filled-form');

    // Click "Create new project" button automatically
    console.log('   Clicking "Create new project"...');
    const createBtn = page.locator('button:has-text("Create new project")').first();
    await createBtn.waitFor({ state: 'visible', timeout: 10000 });
    await createBtn.click();
    console.log('   Waiting for project to initialize...\n');

    await page.waitForURL('**/project/**', { timeout: 300_000 });
    console.log('[4/6] Project created! Waiting for initialization...');
    await page.waitForTimeout(15000);
    await screenshot(page, '04-project-created');

    // Step 5: Get API keys
    console.log('[5/6] Extracting API credentials...');

    const projectUrl = page.url();
    const refMatch = projectUrl.match(/\/project\/([a-z0-9]+)/);
    const projectRef = refMatch ? refMatch[1] : null;

    if (projectRef) {
      console.log(`   Project ref: ${projectRef}`);
      await page.goto(
        `https://supabase.com/dashboard/project/${projectRef}/settings/api`,
        { waitUntil: 'domcontentloaded', timeout: 60000 }
      );
    }

    await page.waitForTimeout(5000);
    await screenshot(page, '05-api-settings');

    let supabaseUrl = projectRef ? `https://${projectRef}.supabase.co` : '';
    let anonKey = '';
    let serviceRoleKey = '';

    // Click Reveal buttons
    const allBtns = page.locator('button:visible');
    const btnCount = await allBtns.count();
    for (let i = 0; i < btnCount; i++) {
      const text = (await allBtns.nth(i).textContent().catch(() => '')).trim().toLowerCase();
      if (text.includes('reveal') || text === 'show') {
        await allBtns.nth(i).click().catch(() => {});
        await page.waitForTimeout(500);
      }
    }

    await page.waitForTimeout(2000);
    await screenshot(page, '06-api-revealed');

    // Scan for JWT tokens
    const bodyText = await page.locator('body').textContent();
    const jwtMatches = bodyText.match(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g);

    if (jwtMatches) {
      const unique = [...new Set(jwtMatches)];
      console.log(`   Found ${unique.length} JWT key(s).`);
      if (unique.length >= 1) anonKey = unique[0];
      if (unique.length >= 2) serviceRoleKey = unique[1];
    }

    if (!anonKey) {
      const allInputs = page.locator('input');
      const count = await allInputs.count();
      for (let i = 0; i < count; i++) {
        const val = await allInputs.nth(i).getAttribute('value').catch(() => '');
        if (val && val.startsWith('eyJ') && val.length > 50) {
          if (!anonKey) anonKey = val.trim();
          else if (!serviceRoleKey && val.trim() !== anonKey) serviceRoleKey = val.trim();
        }
      }
    }

    // Step 6: Save credentials
    console.log('[6/6] Saving credentials...\n');

    writeFileSync(CREDENTIALS_FILE, [
      `# Supabase credentials for Crowdcast`,
      `# Generated: ${new Date().toISOString()}`,
      ``,
      `NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}`,
      `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`,
      `SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}`,
      `SUPABASE_DB_PASSWORD=${DB_PASSWORD}`,
      `SUPABASE_PROJECT_REF=${projectRef || ''}`,
    ].join('\n') + '\n');

    const envLocalPath = join(import.meta.dirname, '..', 'apps', 'web', '.env.local');
    writeFileSync(envLocalPath, [
      `NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}`,
      `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`,
      `SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}`,
    ].join('\n') + '\n');

    console.log('=== Supabase Credentials ===');
    console.log(`URL:              ${supabaseUrl || 'NOT FOUND'}`);
    console.log(`Anon Key:         ${anonKey ? anonKey.slice(0, 30) + '...' : 'NOT FOUND'}`);
    console.log(`Service Role Key: ${serviceRoleKey ? serviceRoleKey.slice(0, 30) + '...' : 'NOT FOUND'}`);
    console.log(`DB Password:      ${DB_PASSWORD}`);
    console.log(`Project Ref:      ${projectRef || 'NOT FOUND'}`);
    console.log(`\nSaved to: .env.supabase + apps/web/.env.local`);

    if (!anonKey || !serviceRoleKey) {
      console.log('\nSome keys not auto-detected. Copy from the API settings page.');
      console.log('Browser stays open for 2 minutes.');
      await page.waitForTimeout(120000);
    } else {
      console.log('\nSupabase setup complete!');
      await page.waitForTimeout(5000);
    }

  } catch (err) {
    console.error('Error:', err.message);
    await screenshot(page, 'error').catch(() => {});
    console.log('\nBrowser stays open for 2 minutes.');
    await page.waitForTimeout(120000);
  } finally {
    await context.close();
  }
}

main();
