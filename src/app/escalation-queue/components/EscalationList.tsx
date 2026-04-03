'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  claims: any[];
  selectedId?: string;
  onSelect: (claim: any) => void;
}

function formatINR(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function EscalationList({ claims, selectedId, onSelect }: Props) {
  return (
    <div className="space-y-2">
      {claims.map(claim => {
        const isSelected = claim.id === selectedId;
        const claimantName = claim.user_profiles?.full_name || claim.claimant || 'Unknown';
        const fraudScore = claim.fraud_score || 0;
        return (
          <button
            key={claim.id}
            onClick={() => onSelect(claim)}
            className={`w-full text-left rounded-xl border p-4 transition-all ${
              isSelected
                ? 'border-amber-400 bg-amber-50 shadow-sm'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="font-mono text-xs font-semibold text-blue-600">{claim.id}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                fraudScore > 0.7 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {(fraudScore * 100).toFixed(0)}% fraud
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-800 truncate">{claimantName}</p>
            <p className="text-xs text-slate-500 mt-0.5 capitalize">{claim.policy_type} · {claim.claim_type?.replace('_', ' ')}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs font-bold text-slate-700">{formatINR(claim.claimed_amount)}</span>
              <span className="text-[10px] text-slate-400">{timeAgo(claim.submitted_at)}</span>
            </div>
            {claim.escalation_reason && (
              <div className="mt-2 flex items-start gap-1.5">
                <AlertTriangle size={10} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[10px] text-amber-700 leading-relaxed line-clamp-2">{claim.escalation_reason}</p>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}