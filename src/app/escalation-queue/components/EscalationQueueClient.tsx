'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import EscalationList from './EscalationList';
import EscalationDetail from './EscalationDetail';
import { AlertTriangle } from 'lucide-react';

export default function EscalationQueueClient() {
  const supabase = createClient();
  const [claims, setClaims] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchEscalated = async () => {
    const { data, error } = await supabase
      .from('claims')
      .select('*, user_profiles(full_name, email)')
      .eq('status', 'ESCALATED')
      .order('submitted_at', { ascending: true });
    if (!error && data) {
      setClaims(data);
      if (data.length > 0 && !selected) setSelected(data[0]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEscalated();
    const channel = supabase
      .channel('escalation_queue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'claims' }, fetchEscalated)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleDecision = (claimId: string, decision: 'APPROVED' | 'REJECTED') => {
    const remaining = claims.filter(c => c.id !== claimId);
    setClaims(remaining);
    if (remaining.length > 0) setSelected(remaining[0]);
    else setSelected(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 lg:px-8 py-5 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
              <AlertTriangle size={18} className="text-amber-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Escalation Queue</h1>
              <p className="text-sm text-slate-500">{loading ? '…' : claims.length} claims awaiting human review</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">SLA: Review within 24 hours</span>
            <span className={`status-badge ${claims.length > 5 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
              <AlertTriangle size={10} />
              {claims.length} Pending
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-400 text-sm">Loading escalated claims…</p>
        </div>
      ) : claims.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={28} className="text-emerald-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">Queue cleared</h3>
            <p className="text-sm text-slate-500 mt-1">All escalated claims have been reviewed. Great work!</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden max-w-screen-2xl mx-auto w-full px-6 lg:px-8 py-5 gap-5">
          <div className="w-80 shrink-0 overflow-y-auto scrollbar-thin">
            <EscalationList claims={claims} selectedId={selected?.id} onSelect={setSelected} />
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {selected && <EscalationDetail key={selected.id} claim={selected} onDecision={handleDecision} />}
          </div>
        </div>
      )}
    </div>
  );
}