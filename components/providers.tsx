'use client';

import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '@/lib/date-th'; // เปิดใช้ dayjs พ.ศ. ทั่วแอป

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AntdRegistry>
      {children}
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        theme="light"
      />
    </AntdRegistry>
  );
}
