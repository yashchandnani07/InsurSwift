'use client';

import React from 'react';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';

interface FraudScoreGaugeProps {
  score: number; // 0.0 – 1.0
  size?: 'sm' | 'md' | 'lg';
}

function getColor(score: number) {
  if (score < 0.3) return '#10b981';
  if (score < 0.6) return '#f59e0b';
  return '#ef4444';
}

function getLabel(score: number) {
  if (score < 0.3) return 'Low Risk';
  if (score < 0.6) return 'Medium Risk';
  return 'High Risk';
}

export default function FraudScoreGauge({ score, size = 'md' }: FraudScoreGaugeProps) {
  const pct = Math.round(score * 100);
  const color = getColor(score);
  const label = getLabel(score);
  const dim = size === 'sm' ? 64 : size === 'lg' ? 120 : 88;
  const fontSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-lg' : 'text-sm';

  const data = [{ value: pct, fill: color }];

  return (
    <div className="flex flex-col items-center gap-1">
      <div style={{ width: dim, height: dim }} className="relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="90%"
            startAngle={180}
            endAngle={0}
            data={data}
            barSize={8}
          >
            <RadialBar dataKey="value" cornerRadius={4} background={{ fill: '#f1f5f9' }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingTop: '12px' }}>
          <span className={`font-bold tabular-nums ${fontSize}`} style={{ color }}>{pct}%</span>
        </div>
      </div>
      <span className="text-xs font-semibold" style={{ color }}>{label}</span>
    </div>
  );
}