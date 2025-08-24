import { test, expect } from '@playwright/test';

test.describe('Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/');
    await page.fill('[data-testid="input-email"]', 'stian@zaldo.no');
    await page.fill('[data-testid="input-password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await page.waitForURL('/dashboard');
  });

  test('should display dashboard with metrics cards', async ({ page }) => {
    // Check that main sections are visible
    await expect(page.locator('h1')).toContainText('Dashboard');
    
    // Check metrics cards
    await expect(page.locator('text=Aktive oppgaver')).toBeVisible();
    await expect(page.locator('text=Forsinkede')).toBeVisible();
    await expect(page.locator('text=Timer/uke')).toBeVisible();
    await expect(page.locator('text=Bilag')).toBeVisible();
  });

  test('should show client tasks section', async ({ page }) => {
    await expect(page.locator('text=Klient Oppgaver')).toBeVisible();
    
    // Should show clients or "no clients" message
    const hasClients = await page.locator('[data-testid="client-card"]').count() > 0;
    const noClientsMessage = await page.locator('text=Ingen klienter funnet').isVisible();
    
    expect(hasClients || noClientsMessage).toBe(true);
  });

  test('should navigate to clients page', async ({ page }) => {
    // Click on clients link in sidebar
    await page.click('a[href="/clients"]');
    await page.waitForURL('/clients');
    
    await expect(page.locator('h1')).toContainText('Klienter');
    await expect(page.locator('button:has-text("Ny klient")')).toBeVisible();
  });

  test('should navigate to tasks page', async ({ page }) => {
    await page.click('a[href="/tasks"]');
    await page.waitForURL('/tasks');
    
    await expect(page.locator('text=Oppgaver')).toBeVisible();
  });

  test.skip('should show weekly time view (NOT YET IMPLEMENTED)', async ({ page }) => {
    // This test should be implemented when weekly time view is added
    await expect(page.locator('[data-testid="weekly-time-view"]')).toBeVisible();
  });

  test.skip('should show "My Tasks" section (NOT YET IMPLEMENTED)', async ({ page }) => {
    // This test should be implemented when "My Tasks" section is added
    await expect(page.locator('[data-testid="my-tasks-section"]')).toBeVisible();
  });
});

test.describe('Client Cards with KYC/AML/Altinn (PARTIAL IMPLEMENTATION)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-testid="input-email"]', 'stian@zaldo.no');
    await page.fill('[data-testid="input-password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    
    // Navigate to clients
    await page.click('a[href="/clients"]');
    await page.waitForURL('/clients');
  });

  test('should display KYC and AML status badges', async ({ page }) => {
    const clientCards = page.locator('[data-testid="client-card"]');
    const count = await clientCards.count();
    
    if (count > 0) {
      // Check first client card for status badges
      const firstCard = clientCards.first();
      
      // These badges should exist in current implementation
      await expect(firstCard.locator('text=Venter')).toBeVisible(); // AML status
    }
  });

  test.skip('should show Altinn badges (NOT YET IMPLEMENTED)', async ({ page }) => {
    const clientCards = page.locator('[data-testid="client-card"]');
    const count = await clientCards.count();
    
    if (count > 0) {
      const firstCard = clientCards.first();
      await expect(firstCard.locator('[data-testid="altinn-badge"]')).toBeVisible();
    }
  });

  test.skip('should navigate to KYC page from client card (NOT YET IMPLEMENTED)', async ({ page }) => {
    const clientCards = page.locator('[data-testid="client-card"]');
    const count = await clientCards.count();
    
    if (count > 0) {
      const firstCard = clientCards.first();
      await firstCard.locator('[data-testid="kyc-button"]').click();
      
      await expect(page).toHaveURL(/\/clients\/.*\/kyc/);
    }
  });
});