"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export function StudentAttendanceChart({
  data,
  colors
}: {
  data: Array<{ name: string; value: number }>;
  colors: string[];
}) {
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="50%" outerRadius="75%" paddingAngle={3}>
            {data.map((item, index) => <Cell key={item.name} fill={colors[index]} />)}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
