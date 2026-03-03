import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { getUploadBaseDir } from '@/lib/uploads-path';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    if (!pathSegments?.length) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const baseDir = getUploadBaseDir();
    // รองรับทั้ง [...path] = ['evidence','8','images','x.png'] และ ['evidence/8/images/x.png'] (จาก rewrite)
    const joined =
      pathSegments.length === 1 && pathSegments[0].includes('/')
        ? pathSegments[0]
        : path.join(...pathSegments);
    // ป้องกัน directory traversal
    const resolved = path.resolve(baseDir, joined);
    if (!resolved.startsWith(baseDir)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!existsSync(resolved)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const buffer = await readFile(resolved);
    const ext = path.extname(resolved).toLowerCase();
    const contentType = MIME[ext] ?? 'application/octet-stream';
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
