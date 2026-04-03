'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import StatusBadge from '@/components/ui/StatusBadge';
import Link from 'next/link';
import { Activity, ArrowRight } from 'lucide-react';

function formatINR(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function RecentClaimsFeed() {
  const supabase = createClient();
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecent = async () => {
      const { data } = await supabase
        .from('claims')
        .select('id, policy_number, policy_type, claim_type, claimed_amount, status, submitted_at, user_profiles(full_name)')
        .order('submitted_at', { ascending: false })
        .limit(8);
      if (data) setClaims(data);
      setLoading(false);
    };

    fetchRecent();

    const channel = supabase
      .channel('recent_claims_feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'claims' }, (payload) => {
        setClaims(prev => [payload.new as any, ...prev.slice(0, 7)]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'claims' }, () => {
        fetchRecent();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-blue-600" />
          <h3 className="text-sm font-semibold text-slate-800">Recent Claims Feed</h3>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <Link href="/claims-management" className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1">
          View All <ArrowRight size={12} />
        </Link>
      </div>
      <div className="divide-y divide-slate-50">
        {loading ? (
          <div className="py-8 text-center text-slate-400 text-sm">Loading…</div>
        ) : claims.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">No claims yet</div>
        ) : claims.map(claim => (
          <div key={claim.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-xs font-mono font-semibold text-blue-600">{claim.id}</p>
                <p className="text-xs text-slate-500">{claim.user_profiles?.full_name || '—'} · {claim.policy_type}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-700 tabular-nums">{formatINR(claim.claimed_amount)}</span>
              <StatusBadge status={claim.status} />
              <span className="text-[10px] text-slate-400">{timeAgo(claim.submitted_at)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
