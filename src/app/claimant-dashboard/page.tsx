'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Shield, Car, Heart, Home, Plus, FileText, Calendar,
  ChevronRight, AlertCircle, CheckCircle2, Clock, LogOut, Loader2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UserPolicy {
  id: string;
  policy_number: string;
  start_date: string;
  end_date: string;
  vehicle_or_asset: string | null;
  policies: {
    name: string;
    policy_type: string;
    coverage_amount: number;
    premium_annual: number;
  };
}

interface RecentClaim {
  id: string;
  policy_number: string;
  claim_type: string;
  claimed_amount: number;
  status: string;
  submitted_at: string;
  decided_at: string | null;
}

const policyTypeConfig: Record<string, { icon: React.ElementType; label: string; color: string; bg: string; border: string }> = {
  motor: { icon: Car, label: 'Motor Insurance', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  health: { icon: Heart, label: 'Health Insurance', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
  property: { icon: Home, label: 'Property Insurance', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
};

const policyStatusConfig = {
  ACTIVE: { label: 'Active', classes: 'bg-emerald-50 text-emerald-700 border border-emerald-200', icon: CheckCircle2 },
  EXPIRING_SOON: { label: 'Expiring Soon', classes: 'bg-amber-50 text-amber-700 border border-amber-200', icon: Clock },
  EXPIRED: { label: 'Expired', classes: 'bg-red-50 text-red-700 border border-red-200', icon: AlertCircle },
};

function getPolicyStatus(endDate: string): 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' {
  const end = new Date(endDate);
  const now = new Date();
  const diffDays = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return 'EXPIRED';
  if (diffDays < 30) return 'EXPIRING_SOON';
  return 'ACTIVE';
}

function formatINR(amount: number) {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export default function ClaimantDashboard() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const supabase = createClient();

  const [userPolicies, setUserPolicies] = useState<UserPolicy[]>([]);
  const [recentClaims, setRecentClaims] = useState<RecentClaim[]>([]);
  const [loadingPolicies, setLoadingPolicies] = useState(true);
  const [loadingClaims, setLoadingClaims] = useState(true);

  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'Claimant';

  useEffect(() => {
    if (!user) return;

    const fetchPolicies = async () => {
      setLoadingPolicies(true);
      const { data, error } = await supabase
        .from('user_policies')
        .select('id, policy_number, start_date, end_date, vehicle_or_asset, policies(name, policy_type, coverage_amount, premium_annual)')
        .eq('user_id', user.id)
        .order('assigned_at', { ascending: false });
      if (!error && data) setUserPolicies(data as any);
      setLoadingPolicies(false);
    };

    const fetchClaims = async () => {
      setLoadingClaims(true);
      const { data, error } = await supabase
        .from('claims')
        .select('id, policy_number, claim_type, claimed_amount, status, submitted_at, decided_at')
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(10);
      if (!error && data) setRecentClaims(data);
      setLoadingClaims(false);
    };

    fetchPolicies();
    fetchClaims();

    // Real-time subscription for claims
    const channel = supabase
      .channel('claimant_claims')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'claims', filter: `user_id=eq.${user.id}` }, () => {
        fetchClaims();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const activePolicies = userPolicies.filter(p => getPolicyStatus(p.end_date) !== 'EXPIRED');
  const totalCoverage = userPolicies.reduce((sum, p) => sum + (p.policies?.coverage_amount || 0), 0);
  const pendingClaims = recentClaims.filter(c => ['PROCESSING', 'SUBMITTED', 'ESCALATED', 'PENDING_REVIEW'].includes(c.status)).length;

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Dashboard</h1>
            <p className="text-sm text-slate-500 mt-0.5">Welcome back, {displayName} · Policy Holder</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/file-claim" className="btn-primary gap-2">
              <Plus size={16} />
              File a Claim
            </Link>
            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors">
              <LogOut size={15} />
              Logout
            </button>
          </div>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-3 gap-4">
          <div className="metric-card flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <Shield size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Active Policies</p>
              <p className="text-2xl font-bold text-slate-900">{loadingPolicies ? '—' : activePolicies.length}</p>
            </div>
          </div>
          <div className="metric-card flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Coverage</p>
              <p className="text-2xl font-bold text-slate-900">{loadingPolicies ? '—' : formatINR(totalCoverage)}</p>
            </div>
          </div>
          <div className="metric-card flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
              <Clock size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Pending Claims</p>
              <p className="text-2xl font-bold text-slate-900">{loadingClaims ? '—' : pendingClaims}</p>
            </div>
          </div>
        </div>

        {/* Active Policies */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-800">My Policies</h2>
            <span className="text-xs text-slate-400">{userPolicies.length} policies</span>
          </div>
          {loadingPolicies ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-blue-500" />
            </div>
          ) : userPolicies.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <Shield size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-500">No policies assigned yet</p>
              <p className="text-xs text-slate-400 mt-1">Contact your insurance provider to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {userPolicies.map(up => {
                const pType = (up.policies?.policy_type || 'motor') as keyof typeof policyTypeConfig;
                const typeConf = policyTypeConfig[pType] || policyTypeConfig.motor;
                const pStatus = getPolicyStatus(up.end_date);
                const statusConf = policyStatusConfig[pStatus];
                const StatusIcon = statusConf.icon;
                const TypeIcon = typeConf.icon;
                return (
                  <div key={up.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className={`w-10 h-10 rounded-lg ${typeConf.bg} flex items-center justify-center shrink-0`}>
                        <TypeIcon size={20} className={typeConf.color} />
                      </div>
                      <span className={`status-badge ${statusConf.classes}`}>
                        <StatusIcon size={11} />
                        {statusConf.label}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{up.policies?.name || typeConf.label}</p>
                      <p className="text-xs font-mono text-slate-400 mt-0.5">{up.policy_number}</p>
                      {up.vehicle_or_asset && <p className="text-xs text-slate-500 mt-1">{up.vehicle_or_asset}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-slate-400 font-medium uppercase tracking-wide text-[10px]">Coverage</p>
                        <p className="font-bold text-slate-800">{formatINR(up.policies?.coverage_amount || 0)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium uppercase tracking-wide text-[10px]">Premium/yr</p>
                        <p className="font-bold text-slate-800">{formatINR(up.policies?.premium_annual || 0)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Calendar size={11} />
                      <span>{formatDate(up.start_date)} – {formatDate(up.end_date)}</span>
                    </div>
                    <Link href="/file-claim" className="btn-primary text-xs py-2 justify-center gap-1.5">
                      <Plus size={13} />
                      File Claim
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent Claims */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-800">Recent Claims</h2>
            <Link href="/claim-status" className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1">
              View Status <ChevronRight size={12} />
            </Link>
          </div>
          {loadingClaims ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-blue-500" />
            </div>
          ) : recentClaims.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <FileText size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-500">No claims filed yet</p>
              <Link href="/file-claim" className="btn-primary mt-4 inline-flex gap-2 text-sm">
                <Plus size={14} /> File Your First Claim
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="table-header-cell">Claim ID</th>
                      <th className="table-header-cell">Policy</th>
                      <th className="table-header-cell">Type</th>
                      <th className="table-header-cell">Amount</th>
                      <th className="table-header-cell">Submitted</th>
                      <th className="table-header-cell">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {recentClaims.map(claim => (
                      <tr key={claim.id} className="hover:bg-slate-50 transition-colors">
                        <td className="table-cell">
                          <Link href="/claim-status" className="font-mono text-xs text-blue-600 font-semibold hover:underline">{claim.id}</Link>
                        </td>
                        <td className="table-cell font-mono text-xs text-slate-500">{claim.policy_number}</td>
                        <td className="table-cell text-xs text-slate-600 capitalize">{claim.claim_type.replace('_', ' ')}</td>
                        <td className="table-cell font-semibold tabular-nums text-slate-900">{formatINR(claim.claimed_amount)}</td>
                        <td className="table-cell text-xs text-slate-500">{formatDate(claim.submitted_at)}</td>
                        <td className="table-cell"><StatusBadge status={claim.status as any} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
