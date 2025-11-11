'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export type EvaluationScoreByStandardDatum = {
  standardCode: string;
  standardName: string;
  averageScore: number;
  evaluationCount: number;
};

export default function BarEvaluationScoreByStandard({
  data,
}: {
  data: EvaluationScoreByStandardDatum[];
}) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="standardCode" />
          <YAxis domain={[0, 5]} tickCount={6} />
          <Tooltip
            formatter={(value: number, name: string) => {
              if (name === 'averageScore') return [value.toFixed(2), 'ค่าเฉลี่ย'];
              return [value, 'จำนวนครั้ง'];
            }}
            labelFormatter={(label) => {
              const found = data.find((item) => item.standardCode === label);
              return found ? `${label} • ${found.standardName}` : label;
            }}
          />
          <Legend
            formatter={(value) => {
              if (value === 'averageScore') return 'ค่าเฉลี่ยคะแนน';
              if (value === 'evaluationCount') return 'จำนวนการประเมิน';
              return value;
            }}
          />
          <Bar
            dataKey="averageScore"
            name="averageScore"
            fill="#a855f7"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="evaluationCount"
            name="evaluationCount"
            fill="#94a3b8"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}


