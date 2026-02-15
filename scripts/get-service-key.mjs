// Get service_role key by navigating to Legacy API keys tab and using clipboard

import { chromium } from 'playwright';
import { writeFileSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const PROJECT_REF = 'ttsuuzefunwzlkzycahh';
const SCREENSHOTS_DIR = join(import.meta.dirname, '..', 'scripts', 'screenshots');
const USER_DATA_DIR = join(import.meta.dirname, '..', '.playwright-profile');
const CREDENTIALS_FILE = join(import.meta.dirname, '..', '.env.supabase');

try { mkdirSync(SCREENSHOTS_DIR, { recursive: true }); } catch {}

async function main() {
  console.log('Grabbing service_role Key\n');

  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    slowMo: 150,
    viewport: { width: 1280, height: 900 },
    permissions: ['clipboard-read', 'clipboard-write'],
  });

  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(60000);

  try {
    // Go to API Keys settings
    console.log('[1] Opening API Keys settings...');
    await page.goto(
      `https://supabase.com/dashboard/project/${PROJECT_REF}/settings/api-keys`,
      { waitUntil: 'domcontentloaded', timeout: 60000 }
    );
    await page.waitForTimeout(5000);

    // Click Legacy tab
    console.log('[2] Clicking Legacy tab...');
    const legacyTab = page.locator('button:has-text("Legacy"), a:has-text("Legacy")').first();
    await legacyTab.waitFor({ state: 'visible', timeout: 15000 });
    await legacyTab.click();
    await page.waitForTimeout(3000);

    await page.screenshot({ path: join(SCREENSHOTS_DIR, 'legacy-tab.png') });
    console.log('   [screenshot] legacy-tab.png');

    // Use JavaScript injection to extract keys from the page's React state / DOM
    console.log('[3] Extracting keys via page evaluation...');

    // Strategy: Use the Supabase JS client that's already loaded in the page
    // to call the management API, OR extract from the page's data attributes / React fiber
    const keys = await page.evaluate(async () => {
      const results = { anon: '', serviceRole: '' };

      // Look for all input/code elements with JWT-like values
      const allElements = document.querySelectorAll('input, code, pre, textarea, span, div, p');
      for (const el of allElements) {
        const text = el.value || el.textContent || '';
        if (text.match(/^eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}$/)) {
          // Decode the JWT to check the role
          try {
            const payload = JSON.parse(atob(text.split('.')[1]));
            if (payload.role === 'anon') results.anon = text;
            if (payload.role === 'service_role') results.serviceRole = text;
          } catch {}
        }
      }

      // Also check all elements' data attributes
      const dataEls = document.querySelectorAll('[data-value], [data-key]');
      for (const el of dataEls) {
        const val = el.getAttribute('data-value') || el.getAttribute('data-key') || '';
        if (val.startsWith('eyJ') && val.length > 50) {
          try {
            const payload = JSON.parse(atob(val.split('.')[1]));
            if (payload.role === 'anon') results.anon = val;
            if (payload.role === 'service_role') results.serviceRole = val;
          } catch {}
        }
      }

      return results;
    });

    console.log(`   anon from page: ${keys.anon ? 'found' : 'not found'}`);
    console.log(`   service_role from page: ${keys.serviceRole ? 'found' : 'not found'}`);

    // If service_role not found in DOM, try clicking the reveal (eye) button
    // and then using the copy button
    if (!keys.serviceRole) {
      console.log('[4] Trying to reveal and copy service_role key...');

      // Find the service_role row — look for text "service_role" on the page
      const serviceRoleText = page.locator('text=service_role');
      if (await serviceRoleText.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('   Found service_role label on page.');

        // The row structure is likely: label | masked-key | eye-btn | copy-btn | menu-btn
        // Try to find and click buttons in the same row/container
        // Use xpath to go up to the nearest table row or flex container
        const container = serviceRoleText.first().locator('xpath=ancestor::tr[1] | ancestor::div[contains(@class,"flex")][1] | ancestor::div[contains(@class,"grid")][1]');

        // Click all buttons in that container (eye icon to reveal, copy to clipboard)
        const containerBtns = container.locator('button');
        const btnCount = await containerBtns.count();
        console.log(`   Found ${btnCount} buttons in service_role row`);

        for (let i = 0; i < btnCount; i++) {
          const ariaLabel = await containerBtns.nth(i).getAttribute('aria-label').catch(() => '') || '';
          const title = await containerBtns.nth(i).getAttribute('title').catch(() => '') || '';
          console.log(`   Button ${i}: aria="${ariaLabel}" title="${title}"`);
        }

        // Click the eye/reveal button first (usually second-to-last or has eye icon)
        for (let i = 0; i < btnCount; i++) {
          await containerBtns.nth(i).click().catch(() => {});
          await page.waitForTimeout(500);
        }

        await page.waitForTimeout(1000);
        await page.screenshot({ path: join(SCREENSHOTS_DIR, 'legacy-revealed.png') });
        console.log('   [screenshot] legacy-revealed.png');

        // Now try to extract the revealed key
        const revealedKeys = await page.evaluate(() => {
          const results = { serviceRole: '' };
          const allElements = document.querySelectorAll('input, code, pre, textarea, span, div');
          for (const el of allElements) {
            const text = (el.value || el.textContent || '').trim();
            if (text.match(/^eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}$/)) {
              try {
                const payload = JSON.parse(atob(text.split('.')[1]));
                if (payload.role === 'service_role') results.serviceRole = text;
              } catch {}
            }
          }
          return results;
        });

        if (revealedKeys.serviceRole) {
          keys.serviceRole = revealedKeys.serviceRole;
          console.log('   service_role key revealed!');
        }
      }
    }

    // If still not found, try the full body text scan
    if (!keys.serviceRole) {
      console.log('[5] Full body text scan...');
      const bodyText = await page.locator('body').textContent();
      const jwtPattern = /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g;
      const matches = bodyText.match(jwtPattern);
      if (matches) {
        const unique = [...new Set(matches)];
        for (const token of unique) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.role === 'service_role') {
              keys.serviceRole = token;
              console.log('   Found service_role in body text!');
            }
          } catch {}
        }
      }
    }

    // Read existing credentials
    let existing = {};
    try {
      const content = readFileSync(CREDENTIALS_FILE, 'utf-8');
      for (const line of content.split('\n')) {
        const [k, ...v] = line.split('=');
        if (k && !k.startsWith('#')) existing[k.trim()] = v.join('=').trim();
      }
    } catch {}

    const anonKey = existing.NEXT_PUBLIC_SUPABASE_ANON_KEY || keys.anon || '';
    const serviceRoleKey = keys.serviceRole || '';
    const supabaseUrl = `https://${PROJECT_REF}.supabase.co`;
    const dbPassword = existing.SUPABASE_DB_PASSWORD || '';

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

    console.log('\n=== Results ===');
    console.log(`Anon Key:         ${anonKey ? 'FOUND' : 'NOT FOUND'}`);
    console.log(`Service Role Key: ${serviceRoleKey ? 'FOUND' : 'NOT FOUND'}`);

    if (serviceRoleKey) {
      console.log('\nAll credentials saved!');
      await page.waitForTimeout(3000);
    } else {
      console.log('\nService role key not found automatically.');
      console.log('Browser is open on the Legacy API keys page.');
      console.log('Please click the eye icon next to service_role to reveal it,');
      console.log('then copy it and paste it into .env.supabase manually.');
      await page.waitForTimeout(120000);
    }

  } catch (err) {
    console.error('Error:', err.message);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, 'svc-error.png') }).catch(() => {});
    await page.waitForTimeout(120000);
  } finally {
    await context.close();
  }
}

main();
