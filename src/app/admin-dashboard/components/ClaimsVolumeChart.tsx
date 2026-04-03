'use client';

import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { CLAIMS_VOLUME_DATA } from '@/lib/mockData';

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={`tt-${p.name}`} className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: p.color }} />
          <span className="text-slate-600 capitalize">{p.name}:</span>
          <span className="font-semibold text-slate-900 tabular-nums">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function ClaimsVolumeChart() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Claims Volume — 14 Days</h2>
          <p className="text-xs text-slate-500 mt-0.5">Approved · Escalated · Rejected breakdown</p>
        </div>
        <span className="text-xs text-slate-400 font-mono">Mar 21 – Apr 3</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={CLAIMS_VOLUME_DATA} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="gradApproved" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradEscalated" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradRejected" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => <span className="text-xs text-slate-600 capitalize">{value}</span>}
            iconType="circle"
            iconSize={8}
          />
          <Area type="monotone" dataKey="approved" stroke="#10b981" strokeWidth={2} fill="url(#gradApproved)" name="approved" />
          <Area type="monotone" dataKey="escalated" stroke="#f59e0b" strokeWidth={2} fill="url(#gradEscalated)" name="escalated" />
          <Area type="monotone" dataKey="rejected" stroke="#ef4444" strokeWidth={2} fill="url(#gradRejected)" name="rejected" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}