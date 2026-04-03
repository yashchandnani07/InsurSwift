'use client';

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Approved', value: 61, color: '#10b981' },
  { name: 'Escalated', value: 24, color: '#f59e0b' },
  { name: 'Rejected', value: 9, color: '#ef4444' },
  { name: 'Processing', value: 6, color: '#3b82f6' },
];

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { color: string } }[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: payload[0].payload.color }} />
        <span className="font-semibold text-slate-700">{payload[0].name}</span>
        <span className="text-slate-900 font-bold tabular-nums">{payload[0].value}%</span>
      </div>
    </div>
  );
}

export default function StatusDistributionChart() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-full">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">Status Distribution</h2>
        <p className="text-xs text-slate-500 mt-0.5">All-time claim outcomes</p>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={78}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry) => (
              <Cell key={`cell-${entry.name}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-2 space-y-1.5">
        {data.map((item) => (
          <div key={`legend-${item.name}`} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-xs text-slate-600">{item.name}</span>
            </div>
            <span className="text-xs font-semibold tabular-nums text-slate-800">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}