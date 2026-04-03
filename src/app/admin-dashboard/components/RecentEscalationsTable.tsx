'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { CLAIMS } from '@/lib/mockData';
import FraudScoreGauge from '@/components/ui/FraudScoreGauge';

const escalated = CLAIMS.filter(c => c.status === 'ESCALATED').slice(0, 5);

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function RecentEscalationsTable() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-500" />
          <h2 className="text-base font-semibold text-slate-900">Recent Escalations</h2>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{escalated.length} pending</span>
        </div>
        <Link href="/escalation-queue" className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">
          View All <ArrowRight size={12} />
        </Link>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="table-header-cell">Claimant</th>
              <th className="table-header-cell">Policy</th>
              <th className="table-header-cell">Amount</th>
              <th className="table-header-cell">Fraud Score</th>
              <th className="table-header-cell">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {escalated.map((claim) => (
              <tr key={claim.id} className="hover:bg-slate-50 transition-colors">
                <td className="table-cell">
                  <div>
                    <p className="font-medium text-slate-800">{claim.claimant}</p>
                    <p className="text-xs text-slate-400 font-mono">{claim.id}</p>
                  </div>
                </td>
                <td className="table-cell">
                  <span className="capitalize text-slate-600">{claim.policyType}</span>
                </td>
                <td className="table-cell">
                  <span className="font-semibold tabular-nums text-slate-900">{formatINR(claim.claimedAmount)}</span>
                </td>
                <td className="table-cell">
                  <FraudScoreGauge score={claim.fraudScore} size="sm" />
                </td>
                <td className="table-cell max-w-xs">
                  <p className="text-xs text-slate-500 truncate">{claim.escalationReason}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}