import { test, expect } from '@playwright/test';

test('switching tabs never destroys an in-progress bill draft', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const amount = page.locator('#bill-splitter-section input[placeholder="0"]').first();
  await expect(amount).toBeVisible();
  await amount.fill('123456');
  await page.getByRole('navigation', { name: 'Điều hướng điện thoại' })
    .getByRole('button', { name: 'Lịch sử' }).click();
  await page.getByRole('navigation', { name: 'Điều hướng điện thoại' })
    .getByRole('button', { name: 'Chia tiền' }).click();
  await expect(amount).toHaveValue('123456');
});

test('mobile More menu closes on Escape and outside click', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Điều hướng điện thoại' });
  const more = nav.getByRole('button', { name: 'Thêm phân hệ' });
  await more.click();
  await expect(more).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(more).toHaveAttribute('aria-expanded', 'false');
  await more.click();
  await page.locator('#main-content').click({ position: { x: 15, y: 30 } });
  await expect(more).toHaveAttribute('aria-expanded', 'false');
});

test('scanner can be dismissed by Escape and restores focus', async ({ page }) => {
  await page.goto('/');
  const trigger = page.getByRole('button', { name: /Quét Hóa Đơn AI/ });
  await trigger.click();
  await expect(page.getByRole('dialog', { name: /Quét Hóa Đơn AI/ })).toBeVisible();
  await expect(page.getByRole('dialog', { name: /Quét Hóa Đơn AI/ })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: /Quét Hóa Đơn AI/ })).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('receipt scanner rejects incompatible files before processing', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Quét Hóa Đơn AI/ }).click();
  await page.locator('#receipt-image-uploader').setInputFiles({
    name: 'invoice.gif',
    mimeType: 'image/gif',
    buffer: Buffer.from('GIF89a')
  });
  await expect(page.getByRole('alert')).toContainText('Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP');
});
