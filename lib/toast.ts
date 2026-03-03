/**
 * ใช้ React-Toastify สำหรับแจ้งเตือน Save / Delete / Update
 */
import { toast as rtToast, ToastOptions } from 'react-toastify';

const defaultOpts: ToastOptions = {
  position: 'top-center',
  autoClose: 3000,
};

export const toast = {
  success(message: string, options?: ToastOptions) {
    rtToast.success(message, { ...defaultOpts, ...options });
  },
  error(message: string, options?: ToastOptions) {
    rtToast.error(message, { ...defaultOpts, autoClose: 5000, ...options });
  },
  info(message: string, options?: ToastOptions) {
    rtToast.info(message, { ...defaultOpts, ...options });
  },
  warning(message: string, options?: ToastOptions) {
    rtToast.warning(message, { ...defaultOpts, ...options });
  },
};
