"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Sector,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDatePK, formatPKR } from "@/lib/utils";

const COLORS = ["#2563eb", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316"];

function shortDateLabel(value: string) {
  const formatted = formatDatePK(value);
  return formatted.replace(/,?\s?\d{4}$/, "");
}

function LiftedPieSector(props: any) {
  const RADIAN = Math.PI / 180;
  const midAngle = props.startAngle + (props.endAngle - props.startAngle) / 2;
  const offset = 8;
  const x = Math.cos(-midAngle * RADIAN) * offset;
  const y = Math.sin(-midAngle * RADIAN) * offset;

  return (
    <g transform={`translate(${x}, ${y})`}>
      <Sector {...props} outerRadius={props.outerRadius + 3} />
    </g>
  );
}

export function OutstandingByClassChart({ data }: { data: Array<{ className: string; amount: number }> }) {
  if (!data.length || data.every(d => d.amount === 0)) {
    return (
      <EmptyState
        title="No outstanding fees"
        description="All classes have fully paid their tuition."
        className="min-h-[280px]"
      />
    );
  }

  return (
    <div className="h-[300px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 8, left: -2, bottom: 18 }}>
          <CartesianGrid stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="className" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(val) => formatPKR(Number(val))} width={78} />
          <Tooltip formatter={(value) => [formatPKR(Number(value)), "Outstanding"]} />
          <Bar name="Outstanding Balance" dataKey="amount" fill="#ef4444" radius={[8, 8, 0, 0]} maxBarSize={42} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function IncomeTrendChart({ data }: { data: Array<{ date: string; amount: number }> }) {
  if (!data.length || data.every(d => d.amount === 0)) {
    return (
      <EmptyState
        title="No income trend yet"
        description="Income trend will show when income is recorded this month."
        className="min-h-[300px]"
      />
    );
  }

  return (
    <div className="h-[320px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 18, left: 2, bottom: 18 }}>
          <CartesianGrid stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(value) => shortDateLabel(String(value))} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(val) => formatPKR(Number(val))} width={78} />
          <Tooltip labelFormatter={(label) => formatDatePK(String(label))} formatter={(value) => [formatPKR(Number(value)), "Income"]} />
          <Line type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "#ffffff" }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ExpenseDistributionChart({ data }: { data: Array<{ name: string; value: number }> }) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>();
  const totalExpense = data.reduce((sum, item) => sum + Number(item.value), 0);
  const activeItem = activeIndex === undefined ? null : data[activeIndex];
  const activePercent = activeItem && totalExpense > 0 ? (activeItem.value / totalExpense) * 100 : null;

  if (!data.length || data.every(d => d.value === 0)) {
    return (
      <EmptyState
        title="No expenses yet"
        description="Expense distribution will show when expenses are recorded this month."
        className="min-h-[300px]"
      />
    );
  }

  return (
    <div className="h-[320px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" className="fill-ink">
            <tspan x="50%" dy={activeItem ? "-1.05em" : "-0.65em"} className="text-xs font-bold">
              {activeItem ? activeItem.name : "Total Expense"}
            </tspan>
            <tspan x="50%" dy="1.35em" className="text-base font-bold">
              {formatPKR(activeItem ? activeItem.value : totalExpense)}
            </tspan>
            {activePercent !== null ? (
              <tspan x="50%" dy="1.35em" className="fill-muted text-xs font-semibold">
                {activePercent.toFixed(1)}%
              </tspan>
            ) : null}
          </text>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={4}
            dataKey="value"
            nameKey="name"
            activeIndex={activeIndex}
            activeShape={LiftedPieSector}
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(undefined)}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Legend verticalAlign="bottom" height={36} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
