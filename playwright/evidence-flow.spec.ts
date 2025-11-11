import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.PLAYWRIGHT_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.PLAYWRIGHT_ADMIN_PASSWORD || 'admin123';

test.describe('Evidence Center Flow', () => {
  test('ผู้ดูแลระบบสามารถสร้างหลักฐานใหม่และไปยังหน้าจัดการไฟล์ได้', async ({ page }) => {
    // เข้าสู่ระบบ
    await page.goto('/login');
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);

    await Promise.all([
      page.waitForURL('**/dashboard', { timeout: 30_000 }),
      page.click('button[type="submit"]'),
    ]);

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // ไปหน้าสร้างหลักฐานใหม่
    await page.goto('/evidence/new');

    // เลือกค่าตัวเลือกขั้นต่ำ (เลือก option แรกของแต่ละ dropdown)
    await page.selectOption('#levelId', { index: 1 });

    const standardSelect = page.locator('#standardId');
    await standardSelect.waitFor({ state: 'attached' });
    await standardSelect.selectOption({ index: 1 });

    const indicatorSelect = page.locator('#indicatorId');
    await indicatorSelect.waitFor({ state: 'attached' });
    await indicatorSelect.selectOption({ index: 1 });

    // รอให้รหัสหลักฐานถูกสร้าง
    await page.waitForFunction(() => {
      const codeInput = document.querySelector<HTMLInputElement>('#evidenceCode');
      return Boolean(codeInput && codeInput.value && !codeInput.value.includes('กำลังสร้าง'));
    });

    // กรอกชื่อและรายละเอียดหลักฐาน
    const titleElement = page.locator('#title');
    const titleTag = await titleElement.evaluate((el) => el.tagName);
    const uniqueTitle = `Playwright ทดสอบ ${Date.now()}`;

    if (titleTag === 'SELECT') {
      const optionsCount = await titleElement.locator('option').count();
      if (optionsCount > 1) {
        await titleElement.selectOption({ index: 1 });
      } else {
        await page.fill('#title', uniqueTitle);
      }
    } else {
      await titleElement.fill(uniqueTitle);
    }

    await page.fill('textarea[name="description"]', 'หลักฐานที่สร้างจากการทดสอบ Playwright');

    // บันทึกและไปยังหน้าจัดการไฟล์
    await Promise.all([
      page.waitForURL(/\/evidence\/\d+\/files/, { timeout: 30_000 }),
      page.getByRole('button', { name: 'บันทึกและเพิ่มไฟล์' }).click(),
    ]);

    await expect(page.locator('h1')).toContainText('การ Upload ไฟล์');

    // ยืนยันว่ามีรหัสหลักฐานแสดงบนหน้าจอไฟล์
    await expect(page.locator('p.text-muted-foreground')).toHaveText(/^\d+\.?[\w.-]*/);
  });
});


