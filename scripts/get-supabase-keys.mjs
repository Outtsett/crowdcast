// Grab API keys from Supabase "Connect" dialog > "API Keys" tab

import { chromium } from 'playwright';
import { writeFileSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const PROJECT_REF = 'ttsuuzefunwzlkzycahh';
const SCREENSHOTS_DIR = join(import.meta.dirname, '..', 'scripts', 'screenshots');
const USER_DATA_DIR = join(import.meta.dirname, '..', '.playwright-profile');
const CREDENTIALS_FILE = join(import.meta.dirname, '..', '.env.supabase');

try { mkdirSync(SCREENSHOTS_DIR, { recursive: true }); } catch {}

async function main() {
  console.log('Grabbing Supabase API Keys\n');

  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    slowMo: 200,
    viewport: { width: 1280, height: 900 },
  });

  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(60000);

  try {
    // Go to project home
    console.log('[1] Opening project dashboard...');
    await page.goto(
      `https://supabase.com/dashboard/project/${PROJECT_REF}`,
      { waitUntil: 'domcontentloaded', timeout: 60000 }
    );
    await page.waitForTimeout(5000);

    // Click "Connect" button in the header
    console.log('[2] Clicking "Connect" button...');
    const connectBtn = page.locator('button:has-text("Connect")').first();
    await connectBtn.waitFor({ state: 'visible', timeout: 30000 });
    await connectBtn.click();
    await page.waitForTimeout(3000);

    // Click "API Keys" tab in the Connect dialog
    console.log('[3] Clicking "API Keys" tab...');
    const apiKeysTab = page.locator('button:has-text("API Keys"), a:has-text("API Keys")').first();
    await apiKeysTab.waitFor({ state: 'visible', timeout: 10000 });
    await apiKeysTab.click();
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: join(SCREENSHOTS_DIR, 'keys-api-tab.png'),
      fullPage: false,
    });
    console.log('   [screenshot] keys-api-tab.png');

    // Click all Reveal buttons
    const revealBtns = page.locator('button:has-text("Reveal"), button:has-text("Show")');
    const revealCount = await revealBtns.count();
    console.log(`   Found ${revealCount} reveal button(s)`);
    for (let i = 0; i < revealCount; i++) {
      await revealBtns.nth(i).click().catch(() => {});
      await page.waitForTimeout(500);
    }

    await page.waitForTimeout(2000);
    await page.screenshot({
      path: join(SCREENSHOTS_DIR, 'keys-revealed.png'),
      fullPage: false,
    });
    console.log('   [screenshot] keys-revealed.png');

    // Scan the dialog/page for JWT keys
    console.log('[4] Scanning for keys...');
    const bodyText = await page.locator('body').textContent();
    const jwtPattern = /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g;
    const jwtMatches = bodyText.match(jwtPattern);

    let anonKey = '';
    let serviceRoleKey = '';

    if (jwtMatches) {
      const unique = [...new Set(jwtMatches)];
      console.log(`   Found ${unique.length} JWT key(s)!`);
      if (unique.length >= 1) anonKey = unique[0];
      if (unique.length >= 2) serviceRoleKey = unique[1];
    }

    // Also try input/code/textarea values
    if (!anonKey) {
      const elements = page.locator('input, code, pre, textarea, [role="dialog"] span');
      const count = await elements.count();
      console.log(`   Scanning ${count} elements...`);
      for (let i = 0; i < count; i++) {
        const val = await elements.nth(i).getAttribute('value').catch(() => '') ||
                    await elements.nth(i).textContent().catch(() => '');
        if (val && val.startsWith('eyJ') && val.length > 50) {
          if (!anonKey) anonKey = val.trim();
          else if (!serviceRoleKey && val.trim() !== anonKey) serviceRoleKey = val.trim();
        }
      }
    }

    // Read existing DB password
    let dbPassword = '';
    try {
      const existing = readFileSync(CREDENTIALS_FILE, 'utf-8');
      const pwMatch = existing.match(/SUPABASE_DB_PASSWORD=(.+)/);
      if (pwMatch) dbPassword = pwMatch[1].trim();
    } catch {}

    const supabaseUrl = `https://${PROJECT_REF}.supabase.co`;

    // Save
    writeFileSync(CREDENTIALS_FILE, [
      `# Supabase credentials for Crowdcast`,
      `# Generated: ${new Date().toISOString()}`,
      ``,
      `NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}`,
      `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`,
      `SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}`,
      `SUPABASE_DB_PASSWORD=${dbPassword}`,
      `SUPABASE_PROJECT_REF=${PROJECT_REF}`,
    ].join('\n') + '\n');

    const envLocalPath = join(import.meta.dirname, '..', 'apps', 'web', '.env.local');
    writeFileSync(envLocalPath, [
      `NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}`,
      `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`,
      `SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}`,
    ].join('\n') + '\n');

    console.log('\n=== Supabase Credentials ===');
    console.log(`URL:              ${supabaseUrl}`);
    console.log(`Anon Key:         ${anonKey ? anonKey.slice(0, 30) + '...' : 'NOT FOUND'}`);
    console.log(`Service Role Key: ${serviceRoleKey ? serviceRoleKey.slice(0, 30) + '...' : 'NOT FOUND'}`);
    console.log(`DB Password:      ${dbPassword}`);

    if (!anonKey) {
      console.log('\nKeys not found automatically. Browser stays open.');
      await page.waitForTimeout(120000);
    } else {
      console.log('\nKeys saved to .env.supabase + apps/web/.env.local');
      await page.waitForTimeout(3000);
    }

  } catch (err) {
    console.error('Error:', err.message);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, 'keys-error.png') }).catch(() => {});
    await page.waitForTimeout(120000);
  } finally {
    await context.close();
  }
}

main();
