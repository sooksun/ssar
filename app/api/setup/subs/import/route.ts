import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/nextauth';
import { prisma } from '@/lib/db';
import { createSubIndicatorSchema } from '@/lib/validations/setup';
import { revalidatePath } from 'next/cache';
import { AUDIT_ACTIONS, logAction } from '@/lib/audit';

const ALLOWED_ROLES = new Set(['ADMIN', 'QA_LEAD']);

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (inQuotes) {
      current += c;
    } else if (c === ',' || c === '\t') {
      result.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

/** POST: อัปโหลด CSV ตัวชี้วัดย่อย (bulk)
 * รูปแบบ: indicatorId,itemNo,textTh (บรรทัดแรกเป็น header ได้)
 * หรือไม่มี header: แต่ละบรรทัด = indicatorId,itemNo,textTh
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  }
  const roles = session.user.roles ?? [];
  if (!roles.some((r: { role?: string }) => ALLOWED_ROLES.has(r.role ?? ''))) {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    const url = new URL('/setup/subs', request.url);
    url.searchParams.set('error', 'ส่งไฟล์ CSV ผ่าน form field ชื่อ file');
    return NextResponse.redirect(url);
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file || !(file instanceof File)) {
    const url = new URL('/setup/subs', request.url);
    url.searchParams.set('error', 'ไม่พบไฟล์');
    return NextResponse.redirect(url);
  }

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) {
    const url = new URL('/setup/subs', request.url);
    url.searchParams.set('error', 'ไฟล์ว่าง');
    return NextResponse.redirect(url);
  }

  const rows: { indicatorId: string; itemNo: number; textTh: string }[] = [];
  const header = parseCsvLine(lines[0]);
  const isHeader =
    header.length >= 3 &&
    (header[0].toLowerCase().includes('indicator') ||
      header[1].toLowerCase().includes('item') ||
      header[2].toLowerCase().includes('text'));

  const startIndex = isHeader ? 1 : 0;
  for (let i = startIndex; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    if (cells.length < 3) continue;
    const indicatorId = cells[0].trim();
    const itemNo = Number(cells[1].trim());
    const textTh = (cells[2] ?? '').trim();
    if (!indicatorId || Number.isNaN(itemNo) || itemNo < 1 || !textTh) continue;
    rows.push({ indicatorId, itemNo, textTh });
  }

  if (rows.length === 0) {
    const url = new URL('/setup/subs', request.url);
    url.searchParams.set('error', 'ไม่มีแถวที่ถูกต้อง (ต้องมี indicatorId, itemNo, textTh)');
    return NextResponse.redirect(url);
  }

  const created: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    try {
      const data = createSubIndicatorSchema.parse({
        indicatorId: rows[i].indicatorId,
        itemNo: rows[i].itemNo,
        textTh: rows[i].textTh,
      });

      const existing = await prisma.qASubIndicator.findUnique({
        where: {
          indicatorId_itemNo: {
            indicatorId: data.indicatorId,
            itemNo: data.itemNo,
          },
        },
      });

      if (existing) {
        await prisma.qASubIndicator.update({
          where: { id: existing.id },
          data: { textTh: data.textTh },
        });
      } else {
        const rec = await prisma.qASubIndicator.create({
          data: {
            indicatorId: data.indicatorId,
            itemNo: data.itemNo,
            textTh: data.textTh,
          },
        });
        created.push(rec.id.toString());
        await logAction(
          session.user.id,
          AUDIT_ACTIONS.CREATE_SUB_INDICATOR,
          'QASubIndicator',
          rec.id,
          undefined,
          { indicatorId: data.indicatorId.toString(), itemNo: data.itemNo, textTh: data.textTh }
        );
      }
    } catch (e) {
      errors.push(`แถว ${i + (isHeader ? 2 : 1)}: ${e instanceof Error ? e.message : 'ข้อผิดพลาด'}`);
    }
  }

  revalidatePath('/setup/subs');
  const url = new URL('/setup/subs', request.url);
  url.searchParams.set('success', 'csv-imported');
  url.searchParams.set('created', String(created.length));
  if (errors.length > 0) {
    url.searchParams.set('errors', String(errors.length));
  }
  return NextResponse.redirect(url);
}
