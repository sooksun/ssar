import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { Readable } from 'stream';

import { auth } from '@/lib/auth/nextauth';
import { canAccessUploadPath } from '@/lib/auth/upload-access';
import { getUploadBaseDir, resolveWithinUploadDir } from '@/lib/uploads-path';

export const runtime = 'nodejs';

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
};

/** แปลง [...path] ให้เป็น segment ปกติ (รองรับทั้ง array และ single string จาก rewrite) */
function normalizeSegments(pathSegments: string[]): string[] {
  const raw =
    pathSegments.length === 1 && pathSegments[0].includes('/')
      ? pathSegments[0].split('/')
      : pathSegments;
  return raw.map((s) => decodeURIComponent(s)).filter((s) => s.length > 0);
}

/** แปลง Range header เป็นช่วง byte — คืน null ถ้าไม่มี/รูปแบบไม่ถูกต้อง */
function parseRange(header: string | null, size: number): { start: number; end: number } | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  const [, startRaw, endRaw] = match;
  if (startRaw === '' && endRaw === '') return null;

  let start: number;
  let end: number;
  if (startRaw === '') {
    // suffix range: bytes=-N (N ไบต์สุดท้าย)
    const suffix = Number(endRaw);
    if (!Number.isFinite(suffix) || suffix <= 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(startRaw);
    end = endRaw === '' ? size - 1 : Number(endRaw);
  }
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (start > end || start >= size) return null;
  return { start, end: Math.min(end, size - 1) };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    if (!pathSegments?.length) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // ต้องเข้าสู่ระบบก่อน — ไฟล์หลักฐานเป็นข้อมูลของโรงเรียน ไม่ใช่ไฟล์สาธารณะ
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const segments = normalizeSegments(pathSegments);
    if (segments.length < 2) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // ป้องกัน directory traversal ก่อนแตะ filesystem (คืน null ถ้าหลุดออกนอก baseDir)
    const resolved = resolveWithinUploadDir(segments, getUploadBaseDir());
    if (!resolved) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const allowed = await canAccessUploadPath(BigInt(session.user.id), segments);
    if (!allowed) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึงไฟล์นี้' }, { status: 403 });
    }

    let fileStat;
    try {
      fileStat = await stat(resolved);
    } catch {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (!fileStat.isFile()) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const ext = path.extname(resolved).toLowerCase();
    const contentType = MIME[ext] ?? 'application/octet-stream';
    const size = fileStat.size;

    const baseHeaders: Record<string, string> = {
      'Content-Type': contentType,
      // ไฟล์เป็นข้อมูลรายโรงเรียน — ห้าม proxy/CDN cache ร่วมกันระหว่างผู้ใช้
      'Cache-Control': 'private, max-age=3600',
      'Accept-Ranges': 'bytes',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    };

    const range = parseRange(request.headers.get('range'), size);
    if (range) {
      const stream = createReadStream(resolved, { start: range.start, end: range.end });
      return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
        status: 206,
        headers: {
          ...baseHeaders,
          'Content-Range': `bytes ${range.start}-${range.end}/${size}`,
          'Content-Length': String(range.end - range.start + 1),
        },
      });
    }

    // stream แทนการอ่านทั้งไฟล์เข้า memory — วิดีโอขนาดใหญ่ไม่ทำ heap พุ่ง
    const stream = createReadStream(resolved);
    return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
      headers: { ...baseHeaders, 'Content-Length': String(size) },
    });
  } catch (error) {
    console.error('[api/serve-upload] Error:', error);
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
