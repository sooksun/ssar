'use client';

import React from 'react';
import { DatePicker } from 'antd';
import type { DatePickerProps } from 'antd';
import thTH from 'antd/es/date-picker/locale/th_TH';
import { toInputDateString, parseInputDate } from '@/lib/date-th';

const buddhistLocale: typeof thTH = {
  ...thTH,
  lang: {
    ...thTH.lang,
    fieldDateFormat: 'BBBB-MM-DD',
    fieldDateTimeFormat: 'BBBB-MM-DD HH:mm:ss',
    yearFormat: 'BBBB',
    cellYearFormat: 'BBBB',
  },
};

export interface DatePickerThProps extends Omit<DatePickerProps, 'value' | 'onChange'> {
  /** ค่าวันที่รูปแบบ YYYY-MM-DD (ค.ศ.) */
  value?: string | null;
  /** ส่งคืน YYYY-MM-DD */
  onChange?: (value: string) => void;
}

/**
 * DatePicker แสดงปี พ.ศ. รับ-ส่งค่าเป็นสตริง YYYY-MM-DD
 */
export function DatePickerTh({ value, onChange, ...rest }: DatePickerThProps) {
  const dayjsValue = parseInputDate(value ?? undefined);

  const handleChange: DatePickerProps['onChange'] = (d) => {
    onChange?.(toInputDateString(d ?? null));
  };

  return (
    <DatePicker
      locale={buddhistLocale}
      value={dayjsValue ?? undefined}
      onChange={handleChange}
      format="BBBB-MM-DD"
      className="w-full"
      {...rest}
    />
  );
}
