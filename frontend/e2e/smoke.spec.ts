import { expect, test } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const screenshotsDir = path.resolve(__dirname, '../../docs/screenshots');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function signIn(page: import('@playwright/test').Page, role: 'admin' | 'operator' | 'viewer' = 'admin') {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  if (role === 'admin') {
    await page.getByRole('button', { name: /^Admin/i }).click();
  } else if (role === 'operator') {
    await page.getByRole('button', { name: /^Operator/i }).click();
  } else {
    await page.getByRole('button', { name: /^Viewer/i }).click();
  }

  await expect(page.getByRole('heading', { name: /network overview/i })).toBeVisible({ timeout: 15000 });
}

test('1. Login opens the live dashboard with live telemetry', async ({ page }) => {
  // Capture clean Login page first
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  await expect(page.getByRole('heading', { name: /staff & administrator sign in/i })).toBeVisible();
  await page.screenshot({ path: path.join(screenshotsDir, '00-login.png'), fullPage: true });

  // Sign in as Admin
  await signIn(page, 'admin');

  // Verify dashboard KPI and metrics
  await expect(page.getByText(/40 infrastructure devices across 3 sites/i)).toBeVisible();
  await expect(page.getByText(/aggregate network throughput/i)).toBeVisible();
  await expect(page.getByText(/top busiest interfaces/i)).toBeVisible();

  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screenshotsDir, '01-dashboard.png'), fullPage: true });

  // Visit Topology Map for screenshot
  await page.getByRole('link', { name: /topology map/i }).click();
  await expect(page.getByRole('heading', { name: /interactive topology map/i })).toBeVisible();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(screenshotsDir, '04-topology.png'), fullPage: true });

  // Visit IPAM & VLANs for screenshot
  await page.getByRole('link', { name: /ipam & vlans/i }).click();
  await expect(page.getByRole('heading', { name: /ipam & vlan/i })).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(screenshotsDir, '06-ipam.png'), fullPage: true });

  // Visit Reports & SLA for screenshot
  await page.getByRole('link', { name: /reports & sla/i }).click();
  await expect(page.getByRole('heading', { name: /sla & performance reports/i })).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(screenshotsDir, '07-reports.png'), fullPage: true });
});

test('2. Operator can add a network device', async ({ page }) => {
  await signIn(page, 'operator');

  // Navigate to Devices inventory
  await page.getByRole('link', { name: /device inventory/i }).click();
  await expect(page.getByRole('heading', { name: /device inventory/i })).toBeVisible();

  // Open Add Device modal
  await page.getByRole('button', { name: /add device/i }).click();
  await expect(page.getByRole('heading', { name: /add network device/i })).toBeVisible();

  const suffix = Math.floor(100 + Math.random() * 899);
  const deviceName = `smoke-edge-rtr-${suffix}`;
  const deviceIp = `10.99.1.${suffix % 250}`;

  await page.locator('input[placeholder="nyc-core-rtr-02"]').fill(deviceName);
  await page.locator('input[placeholder="10.10.1.15"]').fill(deviceIp);
  await page.locator('input[placeholder="Catalyst 9300"]').fill('ASR 9000');

  // Submit device creation
  await page.getByRole('button', { name: /create device/i }).click();

  // Device Detail should open for created device
  await expect(page.getByRole('heading', { name: deviceName })).toBeVisible({ timeout: 12000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(screenshotsDir, '03-device-detail.png'), fullPage: true });

  // Navigate back to devices table and verify present
  await page.getByRole('link', { name: /device inventory/i }).click();
  await expect(page.getByRole('heading', { name: /device inventory/i })).toBeVisible();
  await page.locator('input[placeholder*="Search"]').fill(deviceName);
  await expect(page.getByText(deviceName)).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: path.join(screenshotsDir, '02-devices.png'), fullPage: true });
});

test('3. Operator can acknowledge an active alert', async ({ page }) => {
  await signIn(page, 'operator');

  // Navigate to Alerts
  await page.getByRole('link', { name: /alerts/i }).first().click();
  await expect(page.getByRole('heading', { name: /alerts & incidents/i })).toBeVisible();

  // Capture Alerts page screenshot
  await page.screenshot({ path: path.join(screenshotsDir, '05-alerts.png'), fullPage: true });

  // Locate the first acknowledge button
  const ackButton = page.getByRole('button', { name: /^acknowledge$/i }).first();
  await expect(ackButton).toBeVisible();
  await ackButton.click();

  // Switch to Acknowledged tab and verify
  await page.getByRole('button', { name: /acknowledged/i }).click();
  await expect(page.getByRole('button', { name: /^resolve$/i }).first()).toBeVisible({ timeout: 8000 });
  await page.screenshot({ path: path.join(screenshotsDir, '05-alerts-acknowledged.png'), fullPage: true });
});
