import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      primarySchoolId?: string;
      primarySchoolName?: string;
      roles?: Array<{
        role: string;
        schoolId: string;
        schoolName: string;
      }>;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    primarySchoolId?: string;
    primarySchoolName?: string;
    roles?: Array<{
      role: string;
      schoolId: string;
      schoolName: string;
    }>;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    primarySchoolId?: string;
    primarySchoolName?: string;
    roles?: Array<{
      role: string;
      schoolId: string;
      schoolName: string;
    }>;
  }
}

