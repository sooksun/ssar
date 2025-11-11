'use client';

import { useEffect, useState, useTransition } from 'react';
import { createReview, updateReview } from '@/app/actions/evidence';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { getReviewStatusLabel, reviewStatusMap } from '@/lib/status';

type ReviewFormProps = {
  evidenceId: string;
  files: Array<{
    id: string;
    name: string;
    info: string;
  }>;
  review?: {
    id: string;
    reviewStatus: 'NEED_MORE' | 'ACCEPTED' | 'REJECTED';
    score?: number | null;
    comment?: string | null;
    evidenceFileId?: string;
  };
  returnTo?: string;
};

export default function ReviewForm({ evidenceId, files, review, returnTo }: ReviewFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [scoreValue, setScoreValue] = useState(
    review?.score !== undefined && review?.score !== null ? Number(review.score).toString() : '0',
  );

  const isEditMode = Boolean(review);

  useEffect(() => {
    setScoreValue(
      review?.score !== undefined && review?.score !== null ? Number(review.score).toString() : '0',
    );
  }, [review?.id, review?.score]);

  async function handleSubmit(formData: FormData) {
    setError('');
    startTransition(() => {
      const action = isEditMode ? updateReview : createReview;
      if (isEditMode && review) {
        formData.set('reviewId', review.id);
      }
      action(formData)
        .then((res) => {
          if (!res.success) {
            setError(res.error || 'เกิดข้อผิดพลาด');
            return;
          }
          if (res.redirectTo) {
            router.push(res.redirectTo);
            return;
          }
          if (returnTo) {
            router.push(returnTo);
          }
        })
        .catch((e) => setError(e?.message || 'เกิดข้อผิดพลาด'));
    });
  }

  return (
    <form
      key={review?.id ?? 'new'}
      action={handleSubmit}
      className="space-y-4 rounded-lg border bg-card p-6"
    >
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}
      <input type="hidden" name="evidenceId" value={evidenceId} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">ไฟล์ที่เกี่ยวข้อง (หากมี)</label>
          <select
            name="evidenceFileId"
            defaultValue={review?.evidenceFileId ?? ''}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">— ไม่ระบุไฟล์เฉพาะ —</option>
            {files.map((file) => (
              <option key={file.id} value={file.id}>
                {file.name} {file.info}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">สถานะรีวิว</label>
          <select
            name="reviewStatus"
            defaultValue={review?.reviewStatus ?? 'NEED_MORE'}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {(Object.keys(reviewStatusMap) as Array<'NEED_MORE' | 'ACCEPTED' | 'REJECTED'>).map((status) => (
              <option key={status} value={status}>
                {getReviewStatusLabel(status)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <div className="flex items-center justify-between text-sm font-medium">
            <label htmlFor="score">ความพร้อมรับการตรวจ (0-100)</label>
            <span className="text-muted-foreground">{scoreValue}</span>
          </div>
          <input
            id="score"
            name="score"
            type="range"
            min={0}
            max={100}
            step={1}
            value={scoreValue}
            onChange={(event) => setScoreValue(event.target.value)}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium">ความเห็น</label>
          <textarea
            name="comment"
            rows={3}
            defaultValue={review?.comment ?? ''}
            placeholder="ระบุความเห็นประกอบ"
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'กำลังบันทึก...' : isEditMode ? 'บันทึกการแก้ไข' : 'เพิ่มรีวิว'}
        </Button>
        {isEditMode && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (returnTo) {
                router.push(returnTo);
              } else {
                router.refresh();
              }
            }}
            disabled={isPending}
          >
            ยกเลิก
          </Button>
        )}
      </div>
    </form>
  );
}

