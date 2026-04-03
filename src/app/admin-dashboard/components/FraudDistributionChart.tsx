'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { FRAUD_DIST_DATA } from '@/lib/mockData';

const COLORS = ['#10b981', '#84cc16', '#f59e0b', '#f97316', '#ef4444'];

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700">Score: {label}</p>
      <p className="text-slate-900 font-bold tabular-nums mt-1">{payload[0].value} claims</p>
    </div>
  );
}

export default function FraudDistributionChart() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-full">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">Fraud Score Distribution</h2>
        <p className="text-xs text-slate-500 mt-0.5">Count of claims by fraud score band</p>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={FRAUD_DIST_DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {FRAUD_DIST_DATA.map((_, i) => (
              <Cell key={`cell-fraud-${i}`} fill={COLORS[i]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-3 grid grid-cols-5 gap-1">
        {FRAUD_DIST_DATA.map((d, i) => (
          <div key={`band-${d.range}`} className="text-center">
            <div className="w-full h-1.5 rounded-full mb-1" style={{ backgroundColor: COLORS[i] }} />
            <p className="text-[10px] text-slate-400">{d.range}</p>
          </div>
        ))}
      </div>
    </div>
  );
}