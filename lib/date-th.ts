/**
 * วันที่แบบพุทธศักราช (พ.ศ.) ใช้ dayjs + buddhistEra
 * ใช้ทั้งใน DatePicker และการแสดงผล
 */
import dayjs from 'dayjs';
import buddhistEra from 'dayjs/plugin/buddhistEra';
import th from 'dayjs/locale/th';

dayjs.extend(buddhistEra);
dayjs.locale(th);

/** รูปแบบวันที่สำหรับ input value (YYYY-MM-DD) - เก็บเป็น ค.ศ. ภายใน */
export const DATE_INPUT_FORMAT = 'YYYY-MM-DD';

/** รูปแบบแสดงผล พ.ศ. (เช่น 2568-01-15) */
export const DATE_DISPLAY_BE = 'BBBB-MM-DD';

/** แปลงสตริง YYYY-MM-DD (ค.ศ.) เป็น dayjs */
export function parseInputDate(value: string | null | undefined): dayjs.Dayjs | null {
  if (!value || value.trim() === '') return null;
  const d = dayjs(value, DATE_INPUT_FORMAT);
  return d.isValid() ? d : null;
}

/** แปลง dayjs เป็นสตริง YYYY-MM-DD สำหรับส่ง API/form */
export function toInputDateString(d: dayjs.Dayjs | null): string {
  return d ? d.format(DATE_INPUT_FORMAT) : '';
}

/**
 * แสดงวันที่เป็นภาษาไทย พ.ศ. (สำหรับแสดงใน UI)
 * รับได้ทั้ง Date, string YYYY-MM-DD, dayjs
 */
export function formatThaiDate(
  date: Date | string | dayjs.Dayjs | null | undefined,
  _options?: Intl.DateTimeFormatOptions
): string {
  if (date == null) return '';
  const d = dayjs.isDayjs(date) ? date : dayjs(date);
  if (!d.isValid()) return '';
  return d.locale('th').format('D MMMM BBBB');
}

export { dayjs };
