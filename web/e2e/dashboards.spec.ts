import { test, expect } from '@playwright/test';

test.describe('Dashboard Functionality', () => {
  test.describe('Vendor Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/auth/login');
      await page.fill('[data-testid="input-email"]', 'vendor@zaldo.no');
      await page.fill('[data-testid="input-password"]', 'vendor123');
      await page.click('[data-testid="button-login"]');
      await expect(page).toHaveURL('/vendor/dashboard');
    });

    test('should display vendor dashboard metrics', async ({ page }) => {
      await expect(page.locator('[data-testid="card-total-licenses"]')).toBeVisible();
      await expect(page.locator('[data-testid="card-total-users"]')).toBeVisible();
      await expect(page.locator('[data-testid="card-total-clients"]')).toBeVisible();
      await expect(page.locator('[data-testid="card-licenses-expiring"]')).toBeVisible();
    });

    test('should display license overview table', async ({ page }) => {
      await expect(page.locator('text=License Overview')).toBeVisible();
      await expect(page.locator('text=Demo Byrå AS')).toBeVisible();
      
      // Should show at least one license row
      const licenseRows = page.locator('[data-testid^="row-license-"]');
      await expect(licenseRows.first()).toBeVisible();
    });

    test('should have manage buttons for licenses', async ({ page }) => {
      const manageButtons = page.locator('[data-testid^="button-manage-"]');
      await expect(manageButtons.first()).toBeVisible();
    });
  });

  test.describe('License Admin Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/auth/login');
      await page.fill('[data-testid="input-email"]', 'admin@demobyraa.no');
      await page.fill('[data-testid="input-password"]', 'admin123');
      await page.click('[data-testid="button-login"]');
      await expect(page).toHaveURL('/tenant/dashboard');
    });

    test('should display license admin dashboard metrics', async ({ page }) => {
      await expect(page.locator('text=License Admin Dashboard')).toBeVisible();
      await expect(page.locator('[data-testid="card-clients-count"]')).toBeVisible();
      await expect(page.locator('[data-testid="card-users-count"]')).toBeVisible();
      await expect(page.locator('[data-testid="card-open-tasks"]')).toBeVisible();
      await expect(page.locator('[data-testid="card-aml-warnings"]')).toBeVisible();
    });

    test('should display AI suggestions', async ({ page }) => {
      await expect(page.locator('text=AI Suggestions')).toBeVisible();
      
      // Should show at least one AI suggestion
      const suggestions = page.locator('[data-testid^="ai-suggestion-"]');
      await expect(suggestions.first()).toBeVisible();
    });

    test('should have management quick actions', async ({ page }) => {
      await expect(page.locator('[data-testid="button-manage-users"]')).toBeVisible();
      await expect(page.locator('[data-testid="button-view-reports"]')).toBeVisible();
      await expect(page.locator('[data-testid="button-audit-logs"]')).toBeVisible();
    });

    test('should have common quick actions', async ({ page }) => {
      await expect(page.locator('[data-testid="button-new-client"]')).toBeVisible();
      await expect(page.locator('[data-testid="button-new-task"]')).toBeVisible();
      await expect(page.locator('[data-testid="button-log-time"]')).toBeVisible();
    });
  });

  test.describe('Employee Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/auth/login');
      await page.fill('[data-testid="input-email"]', 'ansatt1@demobyraa.no');
      await page.fill('[data-testid="input-password"]', 'emp123');
      await page.click('[data-testid="button-login"]');
      await expect(page).toHaveURL('/tenant/dashboard');
    });

    test('should display employee dashboard metrics', async ({ page }) => {
      await expect(page.locator('text=Employee Dashboard')).toBeVisible();
      await expect(page.locator('[data-testid="card-my-clients"]')).toBeVisible();
      await expect(page.locator('[data-testid="card-my-tasks"]')).toBeVisible();
      await expect(page.locator('[data-testid="card-this-week-hours"]')).toBeVisible();
      await expect(page.locator('[data-testid="card-upcoming-deadlines"]')).toBeVisible();
    });

    test('should not show management actions', async ({ page }) => {
      // Employee should not see management-specific buttons
      await expect(page.locator('[data-testid="button-manage-users"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="button-view-reports"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="button-audit-logs"]')).not.toBeVisible();
    });

    test('should show employee-specific quick actions', async ({ page }) => {
      await expect(page.locator('[data-testid="button-new-client"]')).toBeVisible();
      await expect(page.locator('[data-testid="button-new-task"]')).toBeVisible();
      await expect(page.locator('[data-testid="button-log-time"]')).toBeVisible();
    });

    test('should display AI suggestions', async ({ page }) => {
      await expect(page.locator('text=AI Suggestions')).toBeVisible();
      
      // Should show at least one AI suggestion
      const suggestions = page.locator('[data-testid^="ai-suggestion-"]');
      await expect(suggestions.first()).toBeVisible();
    });
  });

  test.describe('Dashboard Security', () => {
    test('should not allow employee to access vendor dashboard', async ({ page }) => {
      // Login as employee
      await page.goto('/auth/login');
      await page.fill('[data-testid="input-email"]', 'ansatt1@demobyraa.no');
      await page.fill('[data-testid="input-password"]', 'emp123');
      await page.click('[data-testid="button-login"]');
      
      // Try to access vendor dashboard directly
      await page.goto('/vendor/dashboard');
      
      // Should be redirected or show error (depending on implementation)
      // For now, we expect it not to show vendor-specific content
      await expect(page.locator('text=Vendor Dashboard')).not.toBeVisible();
    });

    test('should not allow license admin to access vendor dashboard', async ({ page }) => {
      // Login as license admin
      await page.goto('/auth/login');
      await page.fill('[data-testid="input-email"]', 'admin@demobyraa.no');
      await page.fill('[data-testid="input-password"]', 'admin123');
      await page.click('[data-testid="button-login"]');
      
      // Try to access vendor dashboard directly
      await page.goto('/vendor/dashboard');
      
      // Should not show vendor-specific content
      await expect(page.locator('text=Vendor Dashboard')).not.toBeVisible();
    });
  });
});