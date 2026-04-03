'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TrendingUp, TrendingDown, AlertTriangle, XCircle, Clock, Zap, BarChart2, Shield } from 'lucide-react';

function TrendBadge({ value, unit, positive }: { value: string; unit?: string; positive: boolean }) {
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${positive ? 'text-emerald-600' : 'text-red-600'}`}>
      {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {value}{unit}
    </span>
  );
}

function SkeletonCard({ wide = false }: { wide?: boolean }) {
  return (
    <div className={`metric-card-glass ${wide ? 'col-span-2' : ''}`}>
      <div className="shimmer h-4 w-24 rounded mb-3" />
      <div className="shimmer h-10 w-20 rounded mb-2" />
      <div className="shimmer h-3 w-32 rounded" />
    </div>
  );
}

export default function KPIBentoGrid() {
  const supabase = createClient();
  const [stats, setStats] = useState({
    stpRate: 0,
    totalToday: 0,
    escalatedPending: 0,
    avgFraudScore: 0,
    rejectionRate: 0,
    avgProcessingSec: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: allClaims } = await supabase
        .from('claims')
        .select('status, fraud_score, processing_time_sec, submitted_at, decided_by');

      if (!allClaims) { setLoading(false); return; }

      const todayClaims = allClaims.filter(c => new Date(c.submitted_at) >= today);
      const totalToday = todayClaims.length;

      const decidedClaims = allClaims.filter(c => ['APPROVED', 'REJECTED'].includes(c.status));
      const stpClaims = decidedClaims.filter(c => c.decided_by?.includes('STP'));
      const stpRate = decidedClaims.length > 0 ? (stpClaims.length / decidedClaims.length) * 100 : 0;

      const escalatedPending = allClaims.filter(c => c.status === 'ESCALATED').length;

      const fraudScores = allClaims.filter(c => c.fraud_score != null).map(c => c.fraud_score);
      const avgFraudScore = fraudScores.length > 0 ? fraudScores.reduce((a: number, b: number) => a + b, 0) / fraudScores.length : 0;

      const rejectedCount = allClaims.filter(c => c.status === 'REJECTED').length;
      const rejectionRate = allClaims.length > 0 ? (rejectedCount / allClaims.length) * 100 : 0;

      const processingTimes = allClaims.filter(c => c.processing_time_sec != null).map(c => c.processing_time_sec);
      const avgProcessingSec = processingTimes.length > 0 ? processingTimes.reduce((a: number, b: number) => a + b, 0) / processingTimes.length : 0;

      setStats({ stpRate, totalToday, escalatedPending, avgFraudScore, rejectionRate, avgProcessingSec });
      setLoading(false);
    };

    fetchStats();

    const channel = supabase
      .channel('kpi_claims')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'claims' }, fetchStats)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const { stpRate, totalToday, escalatedPending, avgFraudScore, rejectionRate, avgProcessingSec } = stats;

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SkeletonCard wide />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Hero: STP Rate — glassmorphic */}
      <div className="col-span-2 relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 shadow-indigo stagger-item">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-16 translate-x-16" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-12 -translate-x-8" />

        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wider">STP Rate</p>
            <p className="font-heading text-5xl font-bold tabular-nums text-white mt-1">
              {stpRate.toFixed(1)}<span className="text-2xl text-indigo-300">%</span>
            </p>
            <p className="text-sm text-indigo-200 mt-1.5">Claims auto-approved without human touch</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
            <Zap size={22} className="text-white" />
          </div>
        </div>
        <div className="relative mt-4 flex items-center gap-3">
          <div className="flex-1 bg-white/20 rounded-full h-2">
            <div
              className="bg-white rounded-full h-2 transition-all duration-700 ease-out"
              style={{ width: `${Math.min(stpRate, 100)}%` }}
            />
          </div>
          <TrendBadge value="Live" positive={true} />
        </div>
        <p className="relative text-xs text-indigo-300 mt-1.5">Deterministic STP wrapper · Gemini AI</p>
      </div>

      {/* Total Claims Today */}
      <div className="metric-card-glass stagger-item">
        <div className="flex items-start justify-between">
          <p className="card-label">Claims Today</p>
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
            <BarChart2 size={15} className="text-slate-600" />
          </div>
        </div>
        <p className="font-heading text-3xl font-bold tabular-nums text-slate-900 mt-2">{totalToday}</p>
        <p className="text-xs text-slate-500 mt-1">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long' })}</p>
      </div>

      {/* Escalated Pending */}
      <div className="metric-card-glass bg-amber-50/80 border-amber-200/60 stagger-item">
        <div className="flex items-start justify-between">
          <p className="card-label text-amber-700">Escalated</p>
          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
            <AlertTriangle size={15} className="text-amber-600" />
          </div>
        </div>
        <p className="font-heading text-3xl font-bold tabular-nums text-amber-800 mt-2">{escalatedPending}</p>
        <p className="text-xs text-amber-600 mt-1">Awaiting human review</p>
      </div>

      {/* Avg Fraud Score */}
      <div className="metric-card-glass stagger-item">
        <div className="flex items-start justify-between">
          <p className="card-label">Avg Fraud Risk</p>
          <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center">
            <Shield size={15} className="text-orange-500" />
          </div>
        </div>
        <p className="font-heading text-3xl font-bold tabular-nums text-slate-900 mt-2">
          {(avgFraudScore * 100).toFixed(0)}<span className="text-lg text-slate-400">%</span>
        </p>
        <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all duration-700 ${
              avgFraudScore > 0.5 ? 'bg-red-500' : avgFraudScore > 0.3 ? 'bg-amber-400' : 'bg-emerald-500'
            }`}
            style={{ width: `${avgFraudScore * 100}%` }}
          />
        </div>
      </div>

      {/* Rejection Rate */}
      <div className="metric-card-glass stagger-item">
        <div className="flex items-start justify-between">
          <p className="card-label">Rejection Rate</p>
          <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
            <XCircle size={15} className="text-red-500" />
          </div>
        </div>
        <p className="font-heading text-3xl font-bold tabular-nums text-slate-900 mt-2">
          {rejectionRate.toFixed(1)}<span className="text-lg text-slate-400">%</span>
        </p>
        <p className="text-xs text-slate-500 mt-1">Hard rejections only</p>
      </div>

      {/* Avg Processing Time */}
      <div className="metric-card-glass stagger-item">
        <div className="flex items-start justify-between">
          <p className="card-label">Avg Processing</p>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Clock size={15} className="text-emerald-600" />
          </div>
        </div>
        <p className="font-heading text-3xl font-bold tabular-nums text-slate-900 mt-2">
          {avgProcessingSec.toFixed(1)}<span className="text-lg text-slate-400">s</span>
        </p>
        <p className="text-xs text-slate-500 mt-1">Per claim, AI pipeline</p>
      </div>
    </div>
  );
}