'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export type ReadinessByStandardDatum = {
  standardCode: string;
  ready: number;
  total: number;
};

export default function BarReadinessByStandard({
  data,
}: {
  data: ReadinessByStandardDatum[];
}) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="standardCode" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey="ready" name="Ready" fill="#c084fc" radius={[4, 4, 0, 0]} />
          <Bar dataKey="total" name="ทั้งหมด" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}


