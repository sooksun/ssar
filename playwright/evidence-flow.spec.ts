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

  test('Smoke: login → add evidence → attach file → mark READY → review ACCEPTED', async ({ page }) => {
    // เข้าสู่ระบบ
    await page.goto('/login');
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await Promise.all([
      page.waitForURL('**/dashboard', { timeout: 30_000 }),
      page.click('button[type="submit"]'),
    ]);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // สร้างหลักฐานใหม่
    await page.goto('/evidence/new');
    await page.selectOption('#levelId', { index: 1 });
    const standardSelect = page.locator('#standardId');
    await standardSelect.waitFor({ state: 'attached' });
    await standardSelect.selectOption({ index: 1 });
    const indicatorSelect = page.locator('#indicatorId');
    await indicatorSelect.waitFor({ state: 'attached' });
    await indicatorSelect.selectOption({ index: 1 });
    await page.waitForFunction(() => {
      const codeInput = document.querySelector<HTMLInputElement>('#evidenceCode');
      return Boolean(codeInput && codeInput.value && !codeInput.value.includes('กำลังสร้าง'));
    });
    const uniqueTitle = `E2E Smoke ${Date.now()}`;
    await page.fill('#title', uniqueTitle);
    await page.fill('textarea[name="description"]', 'หลักฐานสำหรับ E2E smoke test');
    await Promise.all([
      page.waitForURL(/\/evidence\/\d+\/files/, { timeout: 30_000 }),
      page.getByRole('button', { name: 'บันทึกและเพิ่มไฟล์' }).click(),
    ]);

    const evidenceFilesUrl = page.url();
    const evidenceIdMatch = evidenceFilesUrl.match(/\/evidence\/(\d+)\/files/);
    const evidenceId = evidenceIdMatch ? evidenceIdMatch[1] : null;
    expect(evidenceId).toBeTruthy();

    // แนบไฟล์ (ลิงก์ LINK type)
    await page.selectOption('select[name="storageType"]', { value: 'LINK' });
    await page.fill('input[name="fileName"]', 'E2E ลิงก์ตัวอย่าง');
    await page.fill('input[name="externalUrl"]', 'https://example.com/doc.pdf');
    await page.getByRole('button', { name: 'บันทึกไฟล์' }).click();
    await expect(page.getByText('เพิ่มไฟล์เรียบร้อยแล้ว').or(page.locator('text=ลิงก์'))).toBeVisible({ timeout: 15_000 });

    // เปลี่ยนสถานะเป็น READY (ไปหน้าแก้ไข)
    await page.goto(`/evidence/${evidenceId}/edit`);
    await page.selectOption('select[name="status"]', { value: 'READY' });
    await page.getByRole('button', { name: 'บันทึก' }).click();
    await page.waitForURL(new RegExp(`/evidence/${evidenceId}`), { timeout: 15_000 });

    // สร้างรีวิว ACCEPTED
    await page.goto(`/evidence/${evidenceId}/reviews`);
    await page.selectOption('select[name="reviewStatus"]', { value: 'ACCEPTED' });
    await page.fill('input[name="score"]', '5');
    await page.fill('textarea[name="comment"]', 'E2E review ACCEPTED');
    await page.getByRole('button', { name: 'เพิ่มรีวิว' }).click();
    await page.waitForURL(new RegExp(`/evidence/${evidenceId}/reviews`), { timeout: 15_000 });

    // ตรวจสอบว่าหลักฐานเป็น APPROVED (หลังรีวิว ACCEPTED)
    await page.goto(`/evidence/${evidenceId}`);
    await expect(page.getByText('ผ่านการอนุมัติ')).toBeVisible({ timeout: 10_000 });
  });
});


