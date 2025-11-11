'use client';

import { useTransition, useState } from 'react';
import { updateEvidence } from '@/app/actions/evidence';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { evidenceStatusMap, getEvidenceStatusLabel } from '@/lib/status';

type EvidenceForEdit = {
  id: string;
  title: string;
  description: string;
  status: 'MISSING' | 'PENDING' | 'READY' | 'APPROVED' | 'REJECTED';
  privacyLevel: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL';
  ownerUserId: string;
};

export default function EditEvidenceForm({ evidence }: { evidence: EvidenceForEdit }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  async function handleSubmit(formData: FormData) {
    setError('');
    startTransition(() => {
      updateEvidence(formData)
        .then((res) => {
          if (!res.success) {
            setError(res.error || 'เกิดข้อผิดพลาด');
            return;
          }
          if (res.redirectTo) {
            router.push(res.redirectTo);
          }
        })
        .catch((e) => setError(e?.message || 'เกิดข้อผิดพลาด'));
    });
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}
      <input type="hidden" name="id" defaultValue={evidence.id} />
      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium">
          ชื่อหลักฐาน
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={evidence.title}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium">
          รายละเอียด
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={evidence.description}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="status" className="text-sm font-medium">
          สถานะ
        </label>
        <select
          id="status"
          name="status"
          defaultValue={evidence.status}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {(Object.keys(evidenceStatusMap) as EvidenceForEdit['status'][]).map((status) => (
            <option key={status} value={status}>
              {getEvidenceStatusLabel(status)}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <label htmlFor="privacyLevel" className="text-sm font-medium">
          ระดับความลับ
        </label>
        <select
          id="privacyLevel"
          name="privacyLevel"
          defaultValue={evidence.privacyLevel}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="PUBLIC">PUBLIC</option>
          <option value="INTERNAL">INTERNAL</option>
          <option value="CONFIDENTIAL">CONFIDENTIAL</option>
        </select>
      </div>
      <div className="flex gap-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'กำลังบันทึก...' : 'บันทึก'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push(`/evidence/${evidence.id}`)}>
          ยกเลิก
        </Button>
      </div>
    </form>
  );
}


