import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

import { prisma } from '@/lib/db';
import { AUDIT_ACTIONS, logAction } from '@/lib/audit';
import type { JWT } from 'next-auth/jwt';

const authRoute = NextAuth({
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
            include: {
              primarySchool: true,
              schoolRoles: {
                where: { isActive: true },
                include: { role: true, school: true },
              },
              areaRoles: {
                where: { isActive: true },
                include: { role: true, area: true },
              },
            },
          });

          if (!user || user.del || !user.password) {
            return null;
          }

          const isValidPassword = await bcrypt.compare(credentials.password as string, user.password);
          if (!isValidPassword) {
            return null;
          }

          const schoolRoleEntries = user.schoolRoles.map((sr) => ({
            role: sr.role.code,
            schoolId: sr.schoolId.toString(),
            schoolName: sr.school.name,
          }));
          const areaRoleEntries = user.areaRoles.map((ar) => ({
            role: ar.role.code,
            schoolId: '', // ระดับเขตไม่มี school เดียว — ขอบเขตใช้ getUserSchools()
            schoolName: ar.area.nameTh,
          }));
          const roles = [...schoolRoleEntries, ...areaRoleEntries];

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.fullName,
            primarySchoolId: user.schoolId ? user.schoolId.toString() : undefined,
            primarySchoolName: user.primarySchool?.name,
            roles,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.primarySchoolId = user.primarySchoolId;
        token.primarySchoolName = user.primarySchoolName;
        token.roles = user.roles;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.primarySchoolId = token.primarySchoolId as string | undefined;
        session.user.primarySchoolName = token.primarySchoolName as string | undefined;
        session.user.roles = token.roles;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      try {
        await logAction(
          user?.id,
          AUDIT_ACTIONS.LOGIN,
          'User',
          user?.id,
          user?.primarySchoolId,
          {
            email: user?.email,
          }
        );
      } catch (error) {
        console.error('Audit sign-in error:', error);
      }
    },
    async signOut(message: { session?: unknown } | { token: JWT | null }) {
      const token = 'token' in message ? message.token : null;
      if (!token?.id) {
        return;
      }
      try {
        await logAction(
          token.id as string,
          AUDIT_ACTIONS.LOGOUT,
          'User',
          token.id as string,
          token.primarySchoolId as string | undefined,
          {
            email: token.email,
          }
        );
      } catch (error) {
        console.error('Audit sign-out error:', error);
      }
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
});

export const handlers = authRoute.handlers;
export const { auth, signIn, signOut } = authRoute;
