import { describe, it, expect, beforeEach } from 'vitest';

import { checkRateLimit, clientKeyFrom, resetRateLimits } from '../rate-limit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it('อนุญาตจนครบเพดาน แล้วปฏิเสธคำขอถัดไป', () => {
    const now = 1_000_000;
    for (let i = 1; i <= 3; i += 1) {
      const result = checkRateLimit('k', 3, 60_000, now);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(3 - i);
    }
    const blocked = checkRateLimit('k', 3, 60_000, now);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBe(60);
  });

  it('รีเซ็ตเมื่อพ้นช่วงเวลาหน้าต่าง', () => {
    const now = 2_000_000;
    checkRateLimit('k', 1, 60_000, now);
    expect(checkRateLimit('k', 1, 60_000, now).allowed).toBe(false);
    // พ้น 60 วินาที → เริ่มนับใหม่
    expect(checkRateLimit('k', 1, 60_000, now + 60_001).allowed).toBe(true);
  });

  it('นับแยกกันต่อ key', () => {
    const now = 3_000_000;
    checkRateLimit('a', 1, 60_000, now);
    expect(checkRateLimit('a', 1, 60_000, now).allowed).toBe(false);
    expect(checkRateLimit('b', 1, 60_000, now).allowed).toBe(true);
  });

  it('retryAfterSeconds ลดลงตามเวลาที่ผ่านไปในหน้าต่างเดียวกัน', () => {
    const now = 4_000_000;
    checkRateLimit('k', 1, 60_000, now);
    const blocked = checkRateLimit('k', 1, 60_000, now + 30_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(30);
  });
});

describe('clientKeyFrom', () => {
  it('ใช้ IP แรกจาก x-forwarded-for (client จริงหลัง proxy)', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1' });
    expect(clientKeyFrom(headers, 'auth')).toBe('auth:203.0.113.9');
  });

  it('ถอยไปใช้ x-real-ip เมื่อไม่มี x-forwarded-for', () => {
    const headers = new Headers({ 'x-real-ip': '198.51.100.4' });
    expect(clientKeyFrom(headers, 'ai')).toBe('ai:198.51.100.4');
  });

  it('คืน unknown เมื่อไม่มี header ระบุ IP', () => {
    expect(clientKeyFrom(new Headers(), 'pptx')).toBe('pptx:unknown');
  });

  it('แยก bucket ต่อ prefix แม้ IP เดียวกัน', () => {
    const headers = new Headers({ 'x-real-ip': '198.51.100.4' });
    expect(clientKeyFrom(headers, 'auth')).not.toBe(clientKeyFrom(headers, 'ai'));
  });
});
