import { test, expect } from '@playwright/test';

test.describe('Login and MFA Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
  });

  test('should display login form', async ({ page }) => {
    await expect(page.locator('[data-testid="input-email"]')).toBeVisible();
    await expect(page.locator('[data-testid="input-password"]')).toBeVisible();
    await expect(page.locator('[data-testid="button-login"]')).toBeVisible();
  });

  test('should show demo credentials', async ({ page }) => {
    await expect(page.locator('text=Demo Credentials:')).toBeVisible();
    await expect(page.locator('text=vendor@zaldo.no')).toBeVisible();
    await expect(page.locator('text=admin@demobyraa.no')).toBeVisible();
  });

  test('should login as vendor and redirect to vendor dashboard', async ({ page }) => {
    await page.fill('[data-testid="input-email"]', 'vendor@zaldo.no');
    await page.fill('[data-testid="input-password"]', 'vendor123');
    await page.click('[data-testid="button-login"]');

    // Should redirect to vendor dashboard
    await expect(page).toHaveURL('/vendor/dashboard');
    await expect(page.locator('text=Vendor Dashboard')).toBeVisible();
  });

  test('should login as license admin and redirect to tenant dashboard', async ({ page }) => {
    await page.fill('[data-testid="input-email"]', 'admin@demobyraa.no');
    await page.fill('[data-testid="input-password"]', 'admin123');
    await page.click('[data-testid="button-login"]');

    // Should redirect to tenant dashboard
    await expect(page).toHaveURL('/tenant/dashboard');
    await expect(page.locator('text=License Admin Dashboard')).toBeVisible();
  });

  test('should login as employee and redirect to tenant dashboard', async ({ page }) => {
    await page.fill('[data-testid="input-email"]', 'ansatt1@demobyraa.no');
    await page.fill('[data-testid="input-password"]', 'emp123');
    await page.click('[data-testid="button-login"]');

    // Should redirect to tenant dashboard
    await expect(page).toHaveURL('/tenant/dashboard');
    await expect(page.locator('text=Employee Dashboard')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('[data-testid="input-email"]', 'invalid@test.com');
    await page.fill('[data-testid="input-password"]', 'wrongpassword');
    await page.click('[data-testid="button-login"]');

    // Should show error message
    await expect(page.locator('text=Login Failed')).toBeVisible();
  });

  test('should handle MFA requirement', async ({ page }) => {
    // Employee 2 has MFA enabled
    await page.fill('[data-testid="input-email"]', 'ansatt2@demobyraa.no');
    await page.fill('[data-testid="input-password"]', 'emp456');
    await page.click('[data-testid="button-login"]');

    // Should show MFA input
    await expect(page.locator('[data-testid="input-mfa-token"]')).toBeVisible();
    await expect(page.locator('text=MFA Required')).toBeVisible();
  });

  test('should reject invalid MFA token', async ({ page }) => {
    // Employee 2 has MFA enabled
    await page.fill('[data-testid="input-email"]', 'ansatt2@demobyraa.no');
    await page.fill('[data-testid="input-password"]', 'emp456');
    await page.click('[data-testid="button-login"]');

    // Enter invalid MFA token
    await page.fill('[data-testid="input-mfa-token"]', '123456');
    await page.click('[data-testid="button-login"]');

    // Should show error
    await expect(page.locator('text=Invalid MFA token')).toBeVisible();
  });
});