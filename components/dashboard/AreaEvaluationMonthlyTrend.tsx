'use client';

import {
  Area,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  ComposedChart,
} from 'recharts';

export type EvaluationMonthlyTrendDatum = {
  monthLabel: string;
  evaluationCount: number;
  averageScore: number;
};

export default function AreaEvaluationMonthlyTrend({
  data,
}: {
  data: EvaluationMonthlyTrendDatum[];
}) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="monthLabel" />
          <YAxis
            yAxisId="left"
            label={{ value: 'จำนวน', angle: -90, position: 'insideLeft' }}
            allowDecimals={false}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 5]}
            label={{ value: 'ค่าเฉลี่ย (0-5)', angle: 90, position: 'insideRight' }}
          />
          <Tooltip
            formatter={(value, name) => {
              if (name === 'averageScore') return [(value as number).toFixed(2), 'ค่าเฉลี่ยคะแนน'];
              return [value, 'จำนวนการประเมิน'];
            }}
          />
          <Legend
            formatter={(value) => {
              if (value === 'evaluationCount') return 'จำนวนการประเมิน';
              if (value === 'averageScore') return 'ค่าเฉลี่ยคะแนน';
              return value;
            }}
          />
          <Area
            type="monotone"
            dataKey="evaluationCount"
            name="evaluationCount"
            stroke="#38bdf8"
            fill="#bae6fd"
            yAxisId="left"
            strokeWidth={2}
            dot
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="averageScore"
            name="averageScore"
            stroke="#a855f7"
            strokeWidth={2}
            yAxisId="right"
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}


