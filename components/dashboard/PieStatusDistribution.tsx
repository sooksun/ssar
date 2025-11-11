'use client';

import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from 'recharts';
import { getEvidenceStatusColor } from '@/lib/status';

export type StatusSlice = { status: string; label: string; value: number };

export default function PieStatusDistribution({ data }: { data: StatusSlice[] }) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie dataKey="value" nameKey="label" data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getEvidenceStatusColor(entry.status)} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}


