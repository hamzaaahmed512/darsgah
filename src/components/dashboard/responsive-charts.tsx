"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCompactNumber } from "@/lib/utils";

export function AttendanceTrendChart({ data }: { data: Array<{ date: string; attendance: number }> }) {
  if (!data.length) {
    return <EmptyState title="No attendance yet" description="Attendance trends will appear after teachers submit daily records." className="min-h-[280px]" />;
  }

  return (
    <div className="h-[320px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 16, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="attendanceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} tickMargin={12} minTickGap={22} />
          <YAxis tick={{ fontSize: 12 }} width={42} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
          <Tooltip formatter={(value) => [`${value}%`, "Attendance"]} />
          <Area type="monotone" dataKey="attendance" stroke="#2563eb" strokeWidth={2.5} fill="url(#attendanceFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ClassDistributionChart({ data }: { data: Array<{ class_name: string; student_count: number }> }) {
  if (!data.length) {
    return <EmptyState title="No class data" description="Class distribution appears after enrollments are created." className="min-h-[260px]" />;
  }

  return (
    <div className="h-[300px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 8, left: -12, bottom: 18 }}>
          <CartesianGrid stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="class_name" tick={{ fontSize: 12 }} interval={0} angle={-20} textAnchor="end" height={54} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => formatCompactNumber(Number(value))} width={42} allowDecimals={false} />
          <Tooltip formatter={(value) => [value, "Students"]} />
          <Legend verticalAlign="top" height={24} />
          <Bar name="Students" dataKey="student_count" fill="#2563eb" radius={[8, 8, 0, 0]} maxBarSize={42} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
