'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import StatusBadge from '@/components/ui/StatusBadge';
import ClaimDetailDrawer from './ClaimDetailDrawer';
import { createClient } from '@/lib/supabase/client';
import { ClipboardList, Search, Filter, Download, Eye, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, CheckSquare, Trash2, RefreshCw } from 'lucide-react';

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function FraudBar({ score }: { score: number }) {
  const color = score < 0.3 ? 'bg-emerald-500' : score < 0.6 ? 'bg-amber-500' : 'bg-red-500';
  const text = score < 0.3 ? 'text-emerald-600' : score < 0.6 ? 'text-amber-600' : 'text-red-600';
  return (
    <div className="flex items-center gap-2">
      <div className="w-14 bg-slate-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${score * 100}%` }} />
      </div>
      <span className={`text-xs font-semibold tabular-nums ${text}`}>{(score * 100).toFixed(0)}%</span>
    </div>
  );
}

type SortField = 'claimed_amount' | 'fraud_score' | 'confidence_score' | 'submitted_at';
type SortDir = 'asc' | 'desc';
const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function ClaimsManagementClient() {
  const supabase = createClient();
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [policyFilter, setPolicyFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('submitted_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailClaim, setDetailClaim] = useState<any | null>(null);

  const fetchClaims = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('claims')
      .select('*, user_profiles(full_name, email)')
      .order('submitted_at', { ascending: false });
    if (!error && data) setClaims(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchClaims();
    const channel = supabase
      .channel('admin_claims')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'claims' }, fetchClaims)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = useMemo(() => {
    let data = [...claims];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(c =>
        c.id?.toLowerCase().includes(q) ||
        c.user_profiles?.full_name?.toLowerCase().includes(q) ||
        c.user_profiles?.email?.toLowerCase().includes(q) ||
        c.policy_number?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') data = data.filter(c => c.status === statusFilter);
    if (policyFilter !== 'all') data = data.filter(c => c.policy_type === policyFilter);
    data.sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return data;
  }, [claims, search, statusFilter, policyFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp size={11} className="text-slate-300" />;
    return sortDir === 'asc' ? <ChevronUp size={11} className="text-blue-600" /> : <ChevronDown size={11} className="text-blue-600" />;
  };

  const allPageSelected = paginated.length > 0 && paginated.every(c => selectedIds.has(c.id));
  const toggleAll = () => {
    if (allPageSelected) setSelectedIds(prev => { const n = new Set(prev); paginated.forEach(c => n.delete(c.id)); return n; });
    else setSelectedIds(prev => { const n = new Set(prev); paginated.forEach(c => n.add(c.id)); return n; });
  };
  const toggleRow = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    claims.forEach(c => { counts[c.status] = (counts[c.status] ?? 0) + 1; });
    return counts;
  }, [claims]);

  return (
    <div className="px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 max-w-screen-2xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <ClipboardList size={18} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Claims Management</h1>
            <p className="text-sm text-slate-500">{claims.length} total claims · AI-processed</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchClaims} className="btn-secondary text-xs py-2"><RefreshCw size={13} />Refresh</button>
          <button onClick={() => toast.success(`Exporting ${filtered.length} claims as CSV`)} className="btn-secondary text-xs py-2"><Download size={13} />Export</button>
        </div>
      </div>

      {/* Status summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        {[
          { key: 'all', label: 'All Claims', color: 'bg-slate-100 text-slate-700 border-slate-200', count: claims.length },
          { key: 'APPROVED', label: 'Approved', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', count: statusCounts['APPROVED'] ?? 0 },
          { key: 'ESCALATED', label: 'Escalated', color: 'bg-amber-50 text-amber-700 border-amber-200', count: statusCounts['ESCALATED'] ?? 0 },
          { key: 'REJECTED', label: 'Rejected', color: 'bg-red-50 text-red-700 border-red-200', count: statusCounts['REJECTED'] ?? 0 },
          { key: 'PROCESSING', label: 'Processing', color: 'bg-blue-50 text-blue-700 border-blue-200', count: statusCounts['PROCESSING'] ?? 0 },
          { key: 'SUBMITTED', label: 'Submitted', color: 'bg-slate-50 text-slate-600 border-slate-200', count: statusCounts['SUBMITTED'] ?? 0 },
        ].map(item => (
          <button key={`status-strip-${item.key}`} onClick={() => { setStatusFilter(item.key); setPage(1); }}
            className={`rounded-xl border px-3 py-2.5 text-left transition-all duration-150 hover:shadow-sm ${item.color} ${statusFilter === item.key ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}>
            <p className="text-xl font-bold tabular-nums">{item.count}</p>
            <p className="text-xs font-medium mt-0.5">{item.label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-52">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search claim ID, claimant name, policy number…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="input-field pl-9" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={13} className="text-slate-400" />
            <select value={policyFilter} onChange={e => { setPolicyFilter(e.target.value); setPage(1); }} className="input-field py-2 pr-8 text-xs">
              <option value="all">All Policy Types</option>
              <option value="motor">Motor</option>
              <option value="health">Health</option>
              <option value="property">Property</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-700 text-white rounded-xl px-4 py-3 mb-4 flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2">
            <CheckSquare size={16} />
            <span className="text-sm font-semibold">{selectedIds.size} claim{selectedIds.size > 1 ? 's' : ''} selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { toast.success(`Exporting ${selectedIds.size} claims`); setSelectedIds(new Set()); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold transition-colors">
              <Download size={12} />Export Selected
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-semibold transition-colors">
              <Trash2 size={12} />Clear
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="table-header-cell w-10">
                  <button onClick={toggleAll} className="flex items-center justify-center">
                    {allPageSelected ? <CheckSquare size={14} className="text-blue-600" /> : <div className="w-3.5 h-3.5 border border-slate-300 rounded" />}
                  </button>
                </th>
                <th className="table-header-cell">Claim ID</th>
                <th className="table-header-cell">Claimant</th>
                <th className="table-header-cell">Policy</th>
                <th className="table-header-cell cursor-pointer hover:text-slate-700" onClick={() => toggleSort('claimed_amount')}>
                  <span className="flex items-center gap-1">Amount <SortIcon field="claimed_amount" /></span>
                </th>
                <th className="table-header-cell">Status</th>
                <th className="table-header-cell cursor-pointer hover:text-slate-700" onClick={() => toggleSort('fraud_score')}>
                  <span className="flex items-center gap-1">Fraud Score <SortIcon field="fraud_score" /></span>
                </th>
                <th className="table-header-cell cursor-pointer hover:text-slate-700" onClick={() => toggleSort('submitted_at')}>
                  <span className="flex items-center gap-1">Submitted <SortIcon field="submitted_at" /></span>
                </th>
                <th className="table-header-cell">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={9} className="py-16 text-center text-slate-400 text-sm">Loading claims…</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={9} className="py-16 text-center">
                  <ClipboardList size={32} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-500">No claims match your filters</p>
                </td></tr>
              ) : paginated.map(claim => (
                <tr key={claim.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.has(claim.id) ? 'bg-blue-50/50' : ''}`}>
                  <td className="table-cell">
                    <button onClick={() => toggleRow(claim.id)} className="flex items-center justify-center">
                      {selectedIds.has(claim.id) ? <CheckSquare size={14} className="text-blue-600" /> : <div className="w-3.5 h-3.5 border border-slate-300 rounded" />}
                    </button>
                  </td>
                  <td className="table-cell"><span className="font-mono text-xs text-blue-600 font-semibold">{claim.id}</span></td>
                  <td className="table-cell">
                    <p className="font-medium text-slate-800 whitespace-nowrap">{claim.user_profiles?.full_name || '—'}</p>
                    <p className="text-xs text-slate-400">{claim.user_profiles?.email || '—'}</p>
                  </td>
                  <td className="table-cell">
                    <p className="font-mono text-xs text-slate-600">{claim.policy_number}</p>
                    <p className="text-xs text-slate-400 capitalize">{claim.policy_type}</p>
                  </td>
                  <td className="table-cell"><span className="font-semibold tabular-nums text-slate-900">{formatINR(claim.claimed_amount)}</span></td>
                  <td className="table-cell"><StatusBadge status={claim.status} /></td>
                  <td className="table-cell">
                    {claim.fraud_score != null ? <FraudBar score={claim.fraud_score} /> : <span className="text-xs text-slate-400">—</span>}
                  </td>
                  <td className="table-cell text-xs text-slate-500">{formatDate(claim.submitted_at)}</td>
                  <td className="table-cell">
                    <button onClick={() => setDetailClaim(claim)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors">
                      <Eye size={13} />View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Rows per page:</span>
              <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="input-field py-1 pr-6 text-xs w-16">
                {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-500 mr-2">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40"><ChevronLeft size={14} /></button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40"><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {detailClaim && <ClaimDetailDrawer claim={detailClaim} onClose={() => setDetailClaim(null)} />}
    </div>
  );
}