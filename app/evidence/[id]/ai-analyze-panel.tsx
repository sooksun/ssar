'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Swal from 'sweetalert2';

interface AIAnalyzePanelProps {
  evidenceId: string;
  existingSummary?: string | null;
  existingKeywords?: string[] | null;
  existingQualityCheck?: string | null;
  existingSuggestions?: string | null;
}

interface AnalysisResult {
  aiSummary: string;
  aiKeywords: string[];
  qaIndicatorsByLevel?: {
    EARLY_CHILDHOOD?: { code: string; reason: string }[];
    BASIC?: { code: string; reason: string }[];
    ASSISTANT_TEACHER?: { code: string; reason: string }[];
  };
  qaIndicators: { code: string; reason: string }[];
  paTeacherIndicators: { code: string; reason: string }[];
  paPrincipalIndicators: { code: string; reason: string }[];
  qualityScore: number;
  suggestions: string[];
  hasGemini: boolean;
}

export default function AIAnalyzePanel({
  evidenceId,
  existingSummary,
  existingKeywords,
  existingQualityCheck,
  existingSuggestions,
}: AIAnalyzePanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = () => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/evidence/${evidenceId}/analyze`, {
          method: 'POST',
        });
        const data = await res.json();
        if (!res.ok) {
          await Swal.fire({
            icon: 'error',
            title: 'วิเคราะห์ไม่สำเร็จ',
            text: data.error || 'เกิดข้อผิดพลาด',
            confirmButtonText: 'ตกลง',
          });
          return;
        }
        setResult(data);
        router.refresh();
        await Swal.fire({
          icon: 'success',
          title: 'วิเคราะห์สำเร็จ',
          text: data.hasGemini
            ? 'AI วิเคราะห์หลักฐานเรียบร้อย'
            : 'สร้างข้อมูลจาก metadata (ไม่ได้ใช้ AI - ตั้งค่า GEMINI_API_KEY เพื่อเปิดใช้)',
          confirmButtonText: 'ตกลง',
        });
      } catch (err) {
        await Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: err instanceof Error ? err.message : 'ไม่สามารถวิเคราะห์ได้',
          confirmButtonText: 'ตกลง',
        });
      }
    });
  };

  const hasExistingData = existingSummary || (existingKeywords && existingKeywords.length > 0);
  const displayResult = result;

  return (
    <div className="rounded-lg border bg-card p-6 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-xl font-semibold">AI วิเคราะห์หลักฐาน</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            ใช้ระบบวิเคราะห์เดียวกันกับหน้าเก็บงาน — อัปเดตตัวชี้วัด QA/PA และเชื่อมหลักฐานกับข้อตกลง PA อัตโนมัติ
          </p>
        </div>
        <Button onClick={handleAnalyze} disabled={isPending} variant={hasExistingData ? 'outline' : 'default'}>
          {isPending ? 'กำลังวิเคราะห์...' : hasExistingData ? 'วิเคราะห์ใหม่' : 'AI วิเคราะห์'}
        </Button>
      </div>

      {/* แสดงผลที่มีอยู่แล้ว */}
      {hasExistingData && !displayResult && (
        <div className="space-y-4">
          {existingSummary && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">สรุปโดย AI</p>
              <p className="text-sm whitespace-pre-wrap">{existingSummary}</p>
            </div>
          )}
          {existingKeywords && existingKeywords.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">คำสำคัญ</p>
              <div className="flex flex-wrap gap-1">
                {existingKeywords.map((kw, i) => (
                  <span key={i} className="rounded-full bg-muted px-2.5 py-0.5 text-xs">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}
          {existingQualityCheck && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">คะแนนคุณภาพ</p>
              <p className="text-sm">{existingQualityCheck}</p>
            </div>
          )}
          {existingSuggestions && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">ข้อเสนอแนะ</p>
              <p className="text-sm whitespace-pre-wrap">{existingSuggestions}</p>
            </div>
          )}
        </div>
      )}

      {/* แสดงผลวิเคราะห์ใหม่ */}
      {displayResult && (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">สรุปโดย AI</p>
            <p className="text-sm whitespace-pre-wrap">{displayResult.aiSummary}</p>
          </div>

          {displayResult.aiKeywords.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">คำสำคัญ</p>
              <div className="flex flex-wrap gap-1">
                {displayResult.aiKeywords.map((kw, i) => (
                  <span key={i} className="rounded-full bg-muted px-2.5 py-0.5 text-xs">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {displayResult.qualityScore > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">คะแนนคุณภาพ</p>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }, (_, i) => (
                  <span
                    key={i}
                    className={`text-lg ${i < displayResult.qualityScore ? 'text-yellow-500' : 'text-muted-foreground/30'}`}
                  >
                    ★
                  </span>
                ))}
                <span className="text-sm ml-1">({displayResult.qualityScore}/5)</span>
              </div>
            </div>
          )}

          {(displayResult.qaIndicatorsByLevel || displayResult.qaIndicators.length > 0) && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                ตัวชี้วัดที่เชื่อมโยง (หลายมุมมอง)
              </p>
              {displayResult.qaIndicatorsByLevel ? (
                <div className="space-y-2">
                  {[
                    { code: 'EARLY_CHILDHOOD', label: 'ปฐมวัย' },
                    { code: 'BASIC', label: 'ขั้นพื้นฐาน' },
                    { code: 'ASSISTANT_TEACHER', label: 'ครูผู้ช่วย' },
                  ].map(({ code, label }) => {
                    const arr = displayResult.qaIndicatorsByLevel![code as keyof typeof displayResult.qaIndicatorsByLevel];
                    if (!arr?.length) return null;
                    return (
                      <div key={code}>
                        <span className="text-xs font-medium text-muted-foreground">{label}:</span>
                        <ul className="mt-0.5 space-y-0.5">
                          {arr.map((ind, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <span className="rounded bg-green-100 text-green-800 px-1.5 py-0.5 text-xs font-medium shrink-0">
                                {ind.code}
                              </span>
                              <span className="text-muted-foreground">{ind.reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <ul className="space-y-1">
                  {displayResult.qaIndicators.map((ind, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="rounded bg-green-100 text-green-800 px-1.5 py-0.5 text-xs font-medium shrink-0">
                        QA {ind.code}
                      </span>
                      <span className="text-muted-foreground">{ind.reason}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {displayResult.paTeacherIndicators.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                ตัวชี้วัด PA ครู ที่เกี่ยวข้อง
              </p>
              <ul className="space-y-1">
                {displayResult.paTeacherIndicators.map((ind, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="rounded bg-blue-100 text-blue-800 px-1.5 py-0.5 text-xs font-medium shrink-0">
                      {ind.code}
                    </span>
                    <span className="text-muted-foreground">{ind.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {displayResult.paPrincipalIndicators.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                ตัวชี้วัด PA ผู้บริหาร ที่เกี่ยวข้อง
              </p>
              <ul className="space-y-1">
                {displayResult.paPrincipalIndicators.map((ind, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="rounded bg-purple-100 text-purple-800 px-1.5 py-0.5 text-xs font-medium shrink-0">
                      {ind.code}
                    </span>
                    <span className="text-muted-foreground">{ind.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {displayResult.suggestions.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">ข้อเสนอแนะ</p>
              <ul className="list-disc list-inside space-y-1">
                {displayResult.suggestions.map((s, i) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {!hasExistingData && !displayResult && (
        <p className="text-muted-foreground text-center py-4 text-sm">
          กดปุ่ม &quot;AI วิเคราะห์&quot; เพื่อให้ AI ช่วยวิเคราะห์หลักฐานและแนะนำตัวชี้วัด QA / PA ที่เกี่ยวข้อง
        </p>
      )}
    </div>
  );
}
