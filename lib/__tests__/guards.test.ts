import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockAuth, mockRedirect } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockRedirect: vi.fn((url: string) => {
    // next/navigation's redirect() interrupts rendering by throwing —
    // mimic that so requireRoles() never returns past a redirect call.
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));

vi.mock('@/lib/auth/nextauth', () => ({
  auth: mockAuth,
}));

import { requireRoles } from '../auth/guards';

describe('requireRoles', () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockRedirect.mockClear();
  });

  it('redirect ไป /login เมื่อไม่มี session', async () => {
    mockAuth.mockResolvedValue(null);
    await expect(requireRoles(['ADMIN'])).rejects.toThrow('REDIRECT:/login');
  });

  it('redirect ไป /dashboard?error=forbidden เมื่อ role ไม่ตรงที่อนุญาต', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', email: 'teacher@example.com', name: 'ครู', roles: [{ role: 'TEACHER', schoolId: '1', schoolName: 'ร.ร.ทดสอบ' }] },
    });
    await expect(requireRoles(['ADMIN'])).rejects.toThrow(/^REDIRECT:\/dashboard\?error=forbidden/);
  });

  it('ผ่านและคืน session เมื่อมี role ที่อนุญาต', async () => {
    const session = {
      user: { id: '1', email: 'admin@example.com', name: 'แอดมิน', roles: [{ role: 'ADMIN', schoolId: '', schoolName: '' }] },
    };
    mockAuth.mockResolvedValue(session);
    await expect(requireRoles(['ADMIN'])).resolves.toBe(session);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('ผ่านเมื่อมี role ใดๆ ตรงกับรายการที่อนุญาตหลายตัว (setup: ADMIN หรือ QA_LEAD)', async () => {
    const session = {
      user: { id: '2', email: 'qalead@example.com', name: 'QA', roles: [{ role: 'QA_LEAD', schoolId: '1', schoolName: 'ร.ร.ทดสอบ' }] },
    };
    mockAuth.mockResolvedValue(session);
    await expect(requireRoles(['ADMIN', 'QA_LEAD'])).resolves.toBe(session);
  });

  it('redirect ไป /login เมื่อไม่มี user ใน session แม้ session จะไม่เป็น null', async () => {
    mockAuth.mockResolvedValue({ user: undefined });
    await expect(requireRoles(['ADMIN'])).rejects.toThrow('REDIRECT:/login');
  });
});
