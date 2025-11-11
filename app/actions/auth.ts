'use server';

import { signIn } from '@/lib/auth/nextauth';
import { redirect } from 'next/navigation';

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return {
      error: 'กรุณากรอกอีเมลและรหัสผ่าน',
    };
  }

  try {
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    // NextAuth v5: ถ้า login ไม่สำเร็จจะ return { error: string }
    // ถ้าสำเร็จจะ return undefined หรือ throw redirect
    // ตรวจสอบ type ก่อนใช้ 'in' operator
    if (result && typeof result === 'object' && result !== null) {
      const resultObj = result as Record<string, unknown>;
      if ('error' in resultObj && resultObj.error) {
        const errorMsg = String(resultObj.error);
        return {
          error:
            errorMsg === 'CredentialsSignin'
              ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
              : errorMsg,
        };
      }
    }

    // ถ้า login สำเร็จ redirect
    redirect('/dashboard');
  } catch (error) {
    console.error('Login error:', error);

    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ';
    return {
      error: message,
    };
  }
}

