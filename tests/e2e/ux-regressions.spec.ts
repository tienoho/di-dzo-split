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
  await expect(amount).toHaveValue('123.456'); // locale-formatted VND after blur and tab switch
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
  const navCovered = await page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="Điều hướng điện thoại"]');
    const more = nav?.querySelector('button[aria-label="Thêm phân hệ"]');
    if (!nav || !more) return true;
    const rect = more.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return !nav.contains(hit);
  });
  expect(navCovered).toBeTruthy();
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


test('contact form rejects invalid phone numbers without a false saved state', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Điều hướng điện thoại' })
    .getByRole('button', { name: 'Bạn bè' }).click();
  await page.locator('#contact-new-name').fill('Minh Quân');
  await page.locator('#contact-new-phone').fill('abc123');
  await page.getByRole('button', { name: 'Lưu vào danh bạ' }).click();
  await expect(page.getByRole('alert')).toContainText('Số điện thoại phải có');
});

test('history pages large datasets without losing total reports', async ({ page }) => {
  const bills = Array.from({ length: 23 }, (_, i) => ({
    id: `bill-${i}`,
    venueId: 'test',
    venueName: `Quán thử ${i}`,
    date: new Date(Date.UTC(2026, 10, i + 1)).toISOString(),
    rawAmount: 200000,
    tipPercent: 0,
    tipAmount: 0,
    additionalFee: 0,
    discountAmount: 0,
    totalAmount: 200000,
    splitType: 'equal',
    members: [{ name: 'An', initialPaid: 200000, finalShare: 200000, hasPaidDebt: true }]
  }));
  await page.addInitScript((initialBills) => {
    localStorage.setItem('nhau_bills_guest', JSON.stringify(initialBills));
  }, bills);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Điều hướng điện thoại' })
    .getByRole('button', { name: 'Lịch sử' }).click();
  await expect(page.getByRole('navigation', { name: 'Phân trang hóa đơn' })).toContainText('Trang 1/2');
  await page.getByRole('navigation', { name: 'Phân trang hóa đơn' })
    .getByRole('button', { name: 'Tiếp' }).click();
  await expect(page.getByRole('navigation', { name: 'Phân trang hóa đơn' })).toContainText('Trang 2/2');
});
