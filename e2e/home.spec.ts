import { expect, test } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Bookmarker/);
});

test('shows login and register buttons', async ({ page }) => {
  await page.goto('/');

  // ヘッダーのナビゲーションリンクをテスト
  await expect(page.getByRole('banner').getByRole('link', { name: 'ログイン' })).toBeVisible();
  await expect(page.getByRole('banner').getByRole('link', { name: '新規登録' })).toBeVisible();
});
