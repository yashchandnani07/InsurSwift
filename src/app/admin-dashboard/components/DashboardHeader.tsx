'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { LogOut, RefreshCw, Wifi, AlertTriangle } from 'lucide-react';

// ─────────────────────────────────────────────
// SYSTEM STATUS TICKER
// ─────────────────────────────────────────────

const TICKER_ITEMS = [
  { icon: '🟢', text: 'Gemini AI Vision — Operational' },
  { icon: '🟢', text: 'Fraud Detection Model — Active' },
  { icon: '🟢', text: 'STP Engine — Running' },
  { icon: '🟢', text: 'Supabase Realtime — Connected' },
  { icon: '🟢', text: 'OCR Pipeline — Ready' },
  { icon: '⚡', text: 'Dynamic Policy Rules — Injected' },
  { icon: '🔒', text: 'Date Mismatch Detection — Enabled' },
  { icon: '🤖', text: 'Multimodal Analysis — Online' },
  { icon: '📊', text: 'Risk Scoring — Calibrated' },
  { icon: '✅', text: 'JSON Schema Enforcement — Active' },
];

function SystemStatusTicker() {
  const doubled = [...TICKER_ITEMS, ...TICKER_ITEMS]; // duplicate for seamless loop

  return (
    <div className="w-full bg-slate-900 border-b border-slate-800 overflow-hidden py-2">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 flex items-center gap-1.5 px-3 border-r border-slate-700">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">System</span>
        </div>
        <div className="ticker-wrap flex-1">
          <div className="ticker-content">
            {doubled?.map((item, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 mr-8 text-xs text-slate-400">
                <span>{item?.icon}</span>
                <span>{item?.text}</span>
                <span className="text-slate-700 mx-2">·</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN HEADER
// ─────────────────────────────────────────────

export default function DashboardHeader() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [claimsCount, setClaimsCount] = useState<number | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'Admin';
  const now = new Date();
  const hour = now?.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    const fetchCount = async () => {
      const [{ count: total }, { count: pending }] = await Promise.all([
        supabase?.from('claims')?.select('*', { count: 'exact', head: true }),
        supabase?.from('claims')?.select('*', { count: 'exact', head: true })?.eq('status', 'ESCALATED'),
      ]);
      setClaimsCount(total);
      setPendingCount(pending);
    };
    fetchCount();
  }, []);

  const handleLogout = async () => {
    await signOut();
    router?.push('/login');
    router?.refresh();
  };

  return (
    <div className="mb-6">
      {/* System Status Ticker */}
      <div className="-mx-6 lg:-mx-8 xl:-mx-10 2xl:-mx-12 -mt-6 mb-6">
        <SystemStatusTicker />
      </div>

      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900 tracking-tight">
            {greeting}, <span className="gradient-text">{displayName}</span>
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-slate-500">
              {claimsCount != null ? `${claimsCount} total claims` : 'Loading…'}
            </p>
            {pendingCount != null && pendingCount > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-full text-xs font-semibold text-amber-700">
                <AlertTriangle size={10} />
                {pendingCount} pending review
              </span>
            )}
            <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-semibold text-emerald-700">
              <Wifi size={10} />
              Live
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router?.refresh()}
            className="btn-secondary gap-2 text-xs"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl border border-red-200 transition-colors"
          >
            <LogOut size={15} />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}