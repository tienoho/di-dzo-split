import { test, expect } from '@playwright/test';

const sizes = [320, 375, 390, 430, 768, 1024];

for (const width of sizes) {
  test(`responsive navigation and no page-level overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    await expect(page.getByText('Dzô!', { exact: false }).first()).toBeVisible();
    if (width < 768) {
      const navigation = page.getByRole('navigation', { name: 'Điều hướng điện thoại' });
      await expect(navigation).toBeVisible();
      await navigation.getByRole('button', { name: 'Thêm' }).click();
      await expect(page.getByRole('menuitem', { name: 'Gợi ý quán AI' })).toBeVisible();
      await page.getByRole('menuitem', { name: 'Quán quen' }).click();
      await expect(navigation.getByRole('button', { name: 'Thêm' })).toBeVisible();
    } else {
      await expect(page.getByRole('navigation', { name: 'Điều hướng máy tính' })).toBeVisible();
    }
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth - window.innerWidth;
    });
    if (overflow > 2) {
      const offenders = await page.evaluate(() => [...document.querySelectorAll('body *')]
        .map(element => ({ element, box: element.getBoundingClientRect() }))
        .filter(({ box }) => box.width > 0 && (box.right > innerWidth + 2 || box.left < -2))
        .slice(0, 20)
        .map(({ element, box }) => ({
          tag: element.tagName.toLowerCase(),
          className: String(element.className).slice(0, 80),
          right: Math.round(box.right),
          left: Math.round(box.left)
        })));
      console.log('MOBILE_OVERFLOW', width, JSON.stringify(offenders));
    }
    expect(overflow).toBeLessThanOrEqual(2);
  });
}

test('dark-mode preference persists across reload and theme CSS applies', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Chuyển sang Giao diện Tối/ }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
});

test('primary mobile navigation switches without full-page navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const navigation = page.getByRole('navigation', { name: 'Điều hướng điện thoại' });
  const original = page.url();
  await navigation.getByRole('button', { name: 'Nhắc nợ' }).click();
  await expect(navigation.getByRole('button', { name: 'Nhắc nợ' })).toHaveAttribute('aria-current', 'page');
  expect(page.url()).toEqual(original);
  await navigation.getByRole('button', { name: 'Chia tiền' }).click();
  await expect(navigation.getByRole('button', { name: 'Chia tiền' })).toHaveAttribute('aria-current', 'page');
});
