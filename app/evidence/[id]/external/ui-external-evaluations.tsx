'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createExternalEvaluation,
  updateExternalEvaluation,
  deleteExternalEvaluation,
} from '@/app/actions/external-evaluation';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { toast } from '@/lib/toast';

type ExternalEvaluationItem = {
  id: string;
  evaluatorName: string;
  evaluatorOrg?: string | null;
  evaluationDate: string;
  score?: number | null;
  strengths?: string | null;
  weaknesses?: string | null;
  recommendations?: string | null;
  attachmentUrl?: string | null;
};

type EvaluationFormState = {
  evaluatorName?: string;
  evaluatorOrg?: string;
  evaluationDate?: string;
  score?: string;
  strengths?: string;
  weaknesses?: string;
  recommendations?: string;
  attachmentFile?: File | null;
  attachmentVersion?: number;
};

function toLocalDateTimeString(value?: string | Date) {
  const date = value
    ? typeof value === 'string'
      ? new Date(value)
      : value
    : new Date();
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function toBEDateTimeInput(value?: string | Date) {
  const local = value ? toLocalDateTimeString(value) : toLocalDateTimeString();
  if (!local) return '';
  const [datePart, timePart = ''] = local.split('T');
  const [yearStr, monthStr, dayStr] = datePart.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!year || !month || !day) return local;
  const beYear = year + 543;
  const dateSection = `${beYear.toString().padStart(4, '0')}-${month
    .toString()
    .padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  return timePart ? `${dateSection}T${timePart}` : dateSection;
}

function fromBEDateTimeInput(value: string) {
  if (!value) return '';
  const [datePart, timePart = ''] = value.split('T');
  const [yearStr, monthStr, dayStr] = datePart.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!year || !month || !day) return '';
  const adYear = year - 543;
  const dateSection = `${adYear.toString().padStart(4, '0')}-${month
    .toString()
    .padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  return `${dateSection}T${(timePart || '00:00').slice(0, 5)}`;
}

function formatThaiDateTimeDisplay(value: string) {
  if (!value) return '-';
  const [datePart, timePart = ''] = value.split('T');
  const [yearStr, monthStr, dayStr] = datePart.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!year || !month || !day) return '-';
  const displayDate = new Date(`${year.toString().padStart(4, '0')}-${month
    .toString()
    .padStart(2, '0')}-${day.toString().padStart(2, '0')}T${(timePart || '00:00')
    .split(':')
    .slice(0, 2)
    .join(':')}`);
  if (Number.isNaN(displayDate.getTime())) return '-';
  const monthName = displayDate.toLocaleDateString('th-TH', { month: 'long' });
  const beYear = year + 543;
  const [hour = '00', minute = '00'] = (timePart || '').split(':');
  return `${day} ${monthName} ${beYear} ${hour}:${minute}`;
}

export default function ExternalEvaluationsPanel({
  evidenceId,
  canEdit,
  currentUserName,
  currentUserOrg,
  evaluations,
}: {
  evidenceId: string;
  canEdit: boolean;
  currentUserName: string;
  currentUserOrg: string;
  evaluations: ExternalEvaluationItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<Record<string, EvaluationFormState>>({});
  const initialLocalDateTime = toLocalDateTimeString();
  const [newEvaluationDateAD, setNewEvaluationDateAD] = useState(initialLocalDateTime);
  const [newEvaluationDateInput, setNewEvaluationDateInput] = useState(
    toBEDateTimeInput(initialLocalDateTime),
  );
  const [attachmentInputVersion, setAttachmentInputVersion] = useState(0);
  const newAttachmentKey = `attachment-input-${attachmentInputVersion}`;
  const [newAttachmentName, setNewAttachmentName] = useState('');
  const scoredEvaluations = evaluations.filter(
    (item) => item.score !== null && item.score !== undefined,
  );
  const averageScore =
    scoredEvaluations.length > 0
      ? scoredEvaluations.reduce((sum, item) => sum + (item.score || 0), 0) / scoredEvaluations.length
      : null;
  const reachedLimit = evaluations.length >= 3;
  const { confirm, ConfirmDialog } = useConfirm();

  function resetForm() {
    setFormState({});
    const nextLocal = toLocalDateTimeString();
    setNewEvaluationDateAD(nextLocal);
    setNewEvaluationDateInput(toBEDateTimeInput(nextLocal));
    setNewScore('0');
    setAttachmentInputVersion((prev) => prev + 1);
    setNewAttachmentName('');
  }
  const [newScore, setNewScore] = useState('0');

  async function handleSubmit(formData: FormData) {
    setError('');
    startTransition(() => {
      (async () => {
        try {
          formData.set('evidenceId', evidenceId);
          formData.set('evaluationDate', newEvaluationDateAD);
          formData.set('score', newScore);
          const res = await createExternalEvaluation(formData);
          if (!res.success) {
            const message = res.error || 'ไม่สามารถบันทึกการประเมินภายในได้';
            setError(message);
            toast.error(message);
            return;
          }
          resetForm();
          toast.success('เพิ่มการประเมินภายในเรียบร้อยแล้ว');
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'ไม่สามารถบันทึกการประเมินภายในได้';
          setError(message);
          toast.error(message);
        }
      })();
    });
  }

  async function handleUpdate(item: ExternalEvaluationItem) {
    startTransition(() => {
      (async () => {
        try {
          const fd = new FormData();
          fd.set('id', item.id);
          fd.set('evidenceId', evidenceId);
          const current = formState[item.id] || {};
          const trim = (value?: string | null) =>
            (value ?? '')
              .toString()
              .trim();
          const evaluatorName = trim(current.evaluatorName ?? item.evaluatorName);
          if (!evaluatorName) {
            toast.error('กรุณาระบุชื่อผู้ประเมิน');
            return;
          }
          fd.set('evaluatorName', evaluatorName);
          const evaluatorOrg = trim(current.evaluatorOrg ?? item.evaluatorOrg);
          if (evaluatorOrg) fd.set('evaluatorOrg', evaluatorOrg);
          const evaluationDateValue =
            current.evaluationDate || toLocalDateTimeString(item.evaluationDate);
          if (evaluationDateValue) {
            fd.set('evaluationDate', evaluationDateValue);
          }
          const scoreValue =
            current.score !== undefined
              ? current.score
              : item.score !== null && item.score !== undefined
                ? item.score
                : undefined;
          if (scoreValue !== undefined) {
            fd.set('score', scoreValue.toString());
          }
          const strengthsValue = trim(
            current.strengths !== undefined ? current.strengths : item.strengths ?? '',
          );
          if (strengthsValue) fd.set('strengths', strengthsValue);
          const weaknessesValue = trim(
            current.weaknesses !== undefined ? current.weaknesses : item.weaknesses ?? '',
          );
          if (weaknessesValue) fd.set('weaknesses', weaknessesValue);
          const recommendationsValue = trim(
            current.recommendations !== undefined
              ? current.recommendations
              : item.recommendations ?? '',
          );
          if (recommendationsValue) fd.set('recommendations', recommendationsValue);
          const attachmentFile = current.attachmentFile;
          if (attachmentFile instanceof File) {
            fd.set('attachmentFile', attachmentFile);
          }

          const res = await updateExternalEvaluation(fd);
          if (!res.success) {
            toast.error(res.error || 'ไม่สามารถบันทึกการประเมินภายในได้');
            return;
          }
          setEditingId(null);
          toast.success('อัปเดตการประเมินภายในเรียบร้อยแล้ว');
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : 'ไม่สามารถบันทึกการประเมินภายในได้'
          );
        }
      })();
    });
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: 'ยืนยันการลบ',
      message: 'คุณต้องการลบการประเมินภายในนี้หรือไม่?',
      confirmText: 'ลบ',
      cancelText: 'ยกเลิก',
      variant: 'destructive',
    });
    if (!ok) return;

    startTransition(() => {
      (async () => {
        const res = await deleteExternalEvaluation(id);
        if (!res.success) {
          toast.error(res.error || 'ไม่สามารถลบการประเมินภายในได้');
          return;
        }
        toast.success('ลบการประเมินภายในเรียบร้อยแล้ว');
        router.refresh();
      })();
    });
  }

  return (
    <div className="space-y-6">
      <ConfirmDialog />
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground">
          จำกัดการประเมินภายในไม่เกิน 3 รายการต่อหลักฐาน ผู้ประเมินคนเดิมบันทึกได้ 1 ครั้ง
        </p>
        {averageScore !== null && (
          <div className="text-sm font-medium">
            ค่าเฉลี่ยคะแนน: {averageScore.toFixed(2)} / 5
          </div>
        )}
      </div>

      {canEdit && (
        <form
          action={handleSubmit}
          suppressHydrationWarning
          className="space-y-6 rounded-lg border bg-card p-6 w-full"
        >
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}
          {reachedLimit && (
            <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
              หลักฐานนี้มีการประเมินครบ 3 รายการแล้ว หากต้องการบันทึกเพิ่ม กรุณาลบหรือแก้ไขรายการเดิม
            </div>
          )}
          <input type="hidden" name="evidenceId" value={evidenceId} />
          <input type="hidden" name="evaluatorName" value={currentUserName} />
          <input type="hidden" name="evaluatorOrg" value={currentUserOrg} />
          <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-12">
            <div className="space-y-2 md:col-span-6">
              <label className="text-sm font-medium">ชื่อผู้ประเมิน</label>
              <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 text-sm">
                {currentUserName}
              </div>
            </div>
            <div className="space-y-2 md:col-span-6">
              <label className="text-sm font-medium">สังกัด/หน่วยงาน</label>
              <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 text-sm">
                {currentUserOrg || '-'}
              </div>
            </div>
            <div className="space-y-2 md:col-span-6">
              <label className="text-sm font-medium">วันที่ประเมิน (พ.ศ.)</label>
              <input
                name="evaluationDate"
                type="datetime-local"
                value={newEvaluationDateInput}
                onChange={(e) => {
                  const beValue = e.target.value;
                  setNewEvaluationDateInput(beValue);
                  const adValue = fromBEDateTimeInput(beValue);
                  if (adValue) setNewEvaluationDateAD(adValue);
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {formatThaiDateTimeDisplay(newEvaluationDateAD)}
              </p>
            </div>
            <div className="space-y-2 md:col-span-6">
              <label className="text-sm font-medium">คะแนน (0-5)</label>
              <div className="space-y-1">
                <input
                  name="score"
                  type="range"
                  min={0}
                  max={5}
                  step={0.1}
                  value={newScore}
                  onChange={(e) => setNewScore(e.target.value)}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0</span>
                  <span className="text-sm font-medium text-foreground">{Number(newScore).toFixed(1)}</span>
                  <span>5</span>
                </div>
              </div>
            </div>
            <div className="space-y-2 md:col-span-12">
              <label className="text-sm font-medium">จุดเด่น</label>
              <textarea
                name="strengths"
                rows={2}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2 md:col-span-12">
              <label className="text-sm font-medium">ข้อควรพัฒนา</label>
              <textarea
                name="weaknesses"
                rows={2}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2 md:col-span-12">
              <label className="text-sm font-medium">ข้อเสนอแนะ</label>
              <textarea
                name="recommendations"
                rows={2}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2 md:col-span-12">
              <label className="text-sm font-medium">ไฟล์ข้อเสนอแนะ (ถ้ามี)</label>
              <input
                key={newAttachmentKey}
                name="attachmentFile"
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setNewAttachmentName(file ? file.name : '');
                }}
                className="block w-full rounded-md border border-dashed border-input bg-background px-3 py-4 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground hover:file:bg-primary/90"
              />
              <p className="text-xs text-muted-foreground">รองรับไฟล์ PDF ขนาดไม่เกิน 10MB</p>
              <p className="text-xs text-muted-foreground">
                {newAttachmentName ? `ไฟล์ที่เลือก: ${newAttachmentName}` : 'ยังไม่ได้เลือกไฟล์'}
              </p>
            </div>
          </div>
          <Button type="submit" disabled={isPending || reachedLimit}>
            {isPending ? 'กำลังบันทึก...' : 'บันทึกการประเมินภายใน'}
          </Button>
        </form>
      )}

      {evaluations.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">ยังไม่มีการประเมินภายใน</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-1">
          {evaluations.map((item) => {
            const isEditingItem = editingId === item.id;
            const state = formState[item.id] || {};
            const currentDateAD =
              state.evaluationDate || toLocalDateTimeString(item.evaluationDate);
            const currentDateDisplay = toBEDateTimeInput(currentDateAD);
            const currentScoreValue =
              state.score !== undefined
                ? state.score
                : item.score !== null && item.score !== undefined
                  ? item.score.toString()
                  : '0';

            if (isEditingItem) {
              return (
                <div key={item.id} className="rounded-lg border p-4 space-y-2 h-full">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2 md:flex-1">
                      <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">ชื่อผู้ประเมิน</label>
                          <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted px-3 text-sm">
                            {item.evaluatorName}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">หน่วยงาน</label>
                          <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted px-3 text-sm">
                            {item.evaluatorOrg || '-'}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">วันที่ประเมิน (พ.ศ.)</label>
                          <input
                            type="datetime-local"
                            value={currentDateDisplay}
                            onChange={(e) =>
                              setFormState((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...prev[item.id],
                                  evaluationDate: fromBEDateTimeInput(e.target.value),
                                },
                              }))
                            }
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                          />
                          <p className="text-[10px] text-muted-foreground">
                            {formatThaiDateTimeDisplay(currentDateAD)}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">คะแนน (0-5)</label>
                          <div className="space-y-1">
                            <input
                              type="range"
                              name="score"
                              min={0}
                              max={5}
                              step={0.1}
                              value={currentScoreValue}
                              onChange={(e) =>
                                setFormState((prev) => ({
                                  ...prev,
                                  [item.id]: { ...prev[item.id], score: e.target.value },
                                }))
                              }
                              className="w-full accent-primary"
                            />
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span>0</span>
                              <span className="text-xs font-medium text-foreground">
                                {Number(currentScoreValue).toFixed(1)}
                              </span>
                              <span>5</span>
                            </div>
                          </div>
                          <input
                            type="hidden"
                            value={currentScoreValue}
                            onChange={(e) =>
                              setFormState((prev) => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], score: e.target.value },
                              }))
                            }
                            className="hidden"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">จุดเด่น</label>
                          <textarea
                            rows={2}
                            defaultValue={state.strengths ?? item.strengths ?? ''}
                            onChange={(e) =>
                              setFormState((prev) => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], strengths: e.target.value },
                              }))
                            }
                            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">ข้อควรพัฒนา</label>
                          <textarea
                            rows={2}
                            defaultValue={state.weaknesses ?? item.weaknesses ?? ''}
                            onChange={(e) =>
                              setFormState((prev) => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], weaknesses: e.target.value },
                              }))
                            }
                            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">ข้อเสนอแนะ</label>
                          <textarea
                            rows={2}
                            defaultValue={state.recommendations ?? item.recommendations ?? ''}
                            onChange={(e) =>
                              setFormState((prev) => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], recommendations: e.target.value },
                              }))
                            }
                            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-xs text-muted-foreground">ไฟล์ข้อเสนอแนะ (ถ้ามี)</label>
                          <input
                            key={`edit-attachment-${item.id}-${state.attachmentVersion ?? 0}`}
                            type="file"
                            accept=".pdf,application/pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              setFormState((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...prev[item.id],
                                  attachmentFile: file,
                                  attachmentVersion: (prev[item.id]?.attachmentVersion ?? 0) + 1,
                                },
                              }));
                            }}
                            className="block w-full rounded-md border border-dashed border-input bg-background px-3 py-3 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground hover:file:bg-primary/90"
                          />
                          <p className="text-[11px] text-muted-foreground">
                            รองรับไฟล์ PDF ขนาดไม่เกิน 10MB
                          </p>
                          {state.attachmentFile ? (
                            <p className="text-[11px] text-muted-foreground">
                              ไฟล์ใหม่: {state.attachmentFile.name}
                            </p>
                          ) : item.attachmentUrl ? (
                            <a
                              href={item.attachmentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-primary hover:underline"
                            >
                              ดาวน์โหลดไฟล์เดิม
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 md:flex-none md:self-start">
                      <Button onClick={() => handleUpdate(item)} disabled={isPending}>
                        {isPending ? 'กำลังบันทึก...' : 'บันทึก'}
                      </Button>
                      <Button variant="outline" onClick={() => setEditingId(null)}>
                        ยกเลิก
                      </Button>
                    </div>
                  </div>
                </div>
              );
            } else {
              return (
                <div key={item.id} className="rounded-lg border p-4 space-y-2 h-full">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2 md:flex-1">
                      <div className="grid grid-cols-1 gap-3 text-sm text-muted-foreground md:grid-cols-2">
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">ชื่อผู้ประเมิน</p>
                          <p className="font-medium text-foreground">{item.evaluatorName}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">หน่วยงาน</p>
                          <p className="font-medium text-foreground">{item.evaluatorOrg || '-'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">วันที่ประเมิน</p>
                          <p>{formatThaiDateTimeDisplay(toLocalDateTimeString(item.evaluationDate))}</p>
                        </div>
                        {item.score !== null && item.score !== undefined && (
                          <div className="space-y-1">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">คะแนน</p>
                            <p>{item.score.toString()}</p>
                          </div>
                        )}
                        {item.strengths && (
                          <div className="space-y-1 md:col-span-2">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">จุดเด่น</p>
                            <p className="text-foreground">{item.strengths}</p>
                          </div>
                        )}
                        {item.weaknesses && (
                          <div className="space-y-1 md:col-span-2">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">ข้อควรพัฒนา</p>
                            <p className="text-foreground">{item.weaknesses}</p>
                          </div>
                        )}
                        {item.recommendations && (
                          <div className="space-y-1 md:col-span-2">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">ข้อเสนอแนะ</p>
                            <p className="text-foreground">{item.recommendations}</p>
                          </div>
                        )}
                        {item.attachmentUrl && (
                          <div className="space-y-1 md:col-span-2">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">ไฟล์ข้อเสนอแนะ</p>
                            <a
                              href={item.attachmentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              ดาวน์โหลดไฟล์เดิม
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex gap-2 md:flex-none md:self-start">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditingId(item.id);
                            setFormState((prev) => ({
                              ...prev,
                              [item.id]: {
                                evaluatorName: item.evaluatorName,
                                evaluatorOrg: item.evaluatorOrg ?? '',
                                evaluationDate: toLocalDateTimeString(item.evaluationDate),
                                score:
                                  item.score !== null && item.score !== undefined
                                    ? item.score.toString()
                                    : '0',
                                strengths: item.strengths ?? '',
                                weaknesses: item.weaknesses ?? '',
                                recommendations: item.recommendations ?? '',
                                attachmentFile: null,
                                attachmentVersion: (prev[item.id]?.attachmentVersion ?? 0) + 1,
                              },
                            }));
                          }}
                        >
                          แก้ไข
                        </Button>
                        <Button variant="destructive" onClick={() => handleDelete(item.id)}>
                          ลบ
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            }
          })}
        </div>
      )}
    </div>
  );
}

