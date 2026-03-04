import { auth } from '@/lib/auth/nextauth';
import { redirect } from 'next/navigation';
import { BackLink } from '@/components/ui/back-link';
import { getUserSchools } from '@/lib/auth/scoping';
import { prisma } from '@/lib/db';
import { thaiAcademicYear } from '@/lib/evidence';
import { TeacherSarSection } from './TeacherSarSection';
import { TeacherIdPlanSection } from './TeacherIdPlanSection';

export default async function ExtraProgramsTeacherPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const schoolIds = await getUserSchools(session.user.id);

  const schools =
    schoolIds.length > 0
      ? await prisma.school.findMany({
          where: { sc_id: { in: schoolIds }, del: false },
          select: { sc_id: true, name: true },
          orderBy: { name: 'asc' },
        })
      : [];

  const roles = (session.user.roles ?? []) as Array<{ role?: string }>;
  const canSelectTeacher = roles.some(
    (r) =>
      r.role === 'ADMIN' || r.role === 'SCHOOL_DIRECTOR' || r.role === 'SCHOOL_ADMIN'
  );

  let teachersBySchool: Record<string, { id: string; name: string }[]> = {};
  if (canSelectTeacher && schoolIds.length > 0) {
    const members = await prisma.userSchoolRole.findMany({
      where: { schoolId: { in: schoolIds }, isActive: true },
      select: { schoolId: true, userId: true, user: { select: { id: true, fullName: true } } },
    });
    const bySchool: Record<string, Map<string, string>> = {};
    for (const m of members) {
      const sid = m.schoolId.toString();
      if (!bySchool[sid]) bySchool[sid] = new Map();
      bySchool[sid].set(m.user.id.toString(), m.user.fullName);
    }
    teachersBySchool = Object.fromEntries(
      Object.entries(bySchool).map(([sid, map]) => [
        sid,
        Array.from(map.entries())
          .map(([id, name]) => ({ id, name }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      ])
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <BackLink href="/extra-programs" label="ย้อนกลับโปรแกรมเสริม" className="mb-4" />

      <div>
        <h1 className="text-3xl font-bold">SAR ครู และ ID plan ของครู</h1>
        <p className="text-muted-foreground mt-1">
          ส่ง SAR ครู และบันทึกรหัสแผน (ID plan) ต่อคน ต่อโรงเรียน ต่อปีการศึกษา
        </p>
      </div>

      <TeacherSarSection
        schools={schools.map((s) => ({ id: s.sc_id.toString(), name: s.name }))}
        currentAcademicYear={thaiAcademicYear()}
        currentUserId={String(session.user.id)}
        currentUserName={session.user.name ?? session.user.email ?? null}
        canSelectTeacher={canSelectTeacher}
        teachersBySchool={teachersBySchool}
      />

      <TeacherIdPlanSection
        schools={schools.map((s) => ({ id: s.sc_id.toString(), name: s.name }))}
        currentAcademicYear={thaiAcademicYear()}
        currentUserId={String(session.user.id)}
        currentUserName={session.user.name ?? session.user.email ?? null}
        canSelectTeacher={canSelectTeacher}
        teachersBySchool={teachersBySchool}
      />

      <BackLink href="/extra-programs" label="ย้อนกลับโปรแกรมเสริม" className="mt-8" />
    </div>
  );
}
