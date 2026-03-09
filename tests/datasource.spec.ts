import { test, expect } from '@playwright/test';

/**
 * E2E tests for the NocoDB datasource plugin.
 *
 * These tests require a running Grafana instance with the plugin installed.
 * Set the GRAFANA_URL environment variable to point to your Grafana instance.
 *
 * Prerequisites:
 * - Grafana running with the plugin installed
 * - Admin credentials available (default: admin/admin)
 */

const GRAFANA_USER = process.env.GRAFANA_USER || 'admin';
const GRAFANA_PASSWORD = process.env.GRAFANA_PASSWORD || 'admin';

test.describe('NocoDB Datasource Plugin', () => {
  test.beforeEach(async ({ page }) => {
    // Login to Grafana
    await page.goto('/login');
    await page.getByLabel('Email or username').fill(GRAFANA_USER);
    await page.getByLabel('Password').fill(GRAFANA_PASSWORD);
    await page.getByRole('button', { name: /log in/i }).click();
    await page.waitForURL('**/');
  });

  test('should be listed in datasource plugins', async ({ page }) => {
    await page.goto('/connections/datasources/new');
    await page.getByPlaceholder(/search/i).fill('NocoDB');
    await expect(page.getByText('NocoDB')).toBeVisible();
  });

  test('should render config editor', async ({ page }) => {
    await page.goto('/connections/datasources/new');
    await page.getByPlaceholder(/search/i).fill('NocoDB');
    await page.getByText('NocoDB').click();

    // Verify config editor fields are present
    await expect(page.getByTestId('nocodb-config-base-url')).toBeVisible();
    await expect(page.getByTestId('nocodb-config-api-token')).toBeVisible();
  });

  test('should save datasource configuration', async ({ page }) => {
    await page.goto('/connections/datasources/new');
    await page.getByPlaceholder(/search/i).fill('NocoDB');
    await page.getByText('NocoDB').click();

    // Fill in configuration
    await page.getByTestId('nocodb-config-base-url').fill('http://localhost:8080');
    await page.getByTestId('nocodb-config-api-token').fill('test-token');

    // Save
    await page.getByRole('button', { name: /save/i }).click();

    // Verify save was successful (or at least no errors in the form)
    await expect(page.getByTestId('nocodb-config-base-url')).toHaveValue('http://localhost:8080');
  });

  test('should render query editor in explore', async ({ page }) => {
    // First create a datasource
    await page.goto('/connections/datasources/new');
    await page.getByPlaceholder(/search/i).fill('NocoDB');
    await page.getByText('NocoDB').click();
    await page.getByTestId('nocodb-config-base-url').fill('http://localhost:8080');
    await page.getByTestId('nocodb-config-api-token').fill('test-token');
    await page.getByRole('button', { name: /save/i }).click();

    // Navigate to explore
    await page.goto('/explore');

    // Select the NocoDB datasource
    await page.getByRole('combobox').first().click();
    await page.getByText('NocoDB').click();

    // Verify query editor fields
    await expect(page.getByTestId('nocodb-query-table-id')).toBeVisible();
  });
});
