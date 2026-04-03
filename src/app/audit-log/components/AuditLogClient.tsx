'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  ScrollText, Download, Search, Filter, ChevronUp, ChevronDown,
  CheckCircle, XCircle, AlertTriangle, ChevronLeft, ChevronRight
} from 'lucide-react';

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function formatDT(iso: string) {
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const month = months[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  const hours = d.getUTCHours();
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  const hour12 = String(hours % 12 || 12).padStart(2, '0');
  return `${day} ${month} ${year}, ${hour12}:${minutes} ${ampm}`;
}

function DecisionBadge({ decision }: { decision: string }) {
  if (decision === 'APPROVED') return (
    <span className="status-badge bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle size={10} />Approved</span>
  );
  if (decision === 'REJECTED') return (
    <span className="status-badge bg-red-50 text-red-700 border border-red-200"><XCircle size={10} />Rejected</span>
  );
  return (
    <span className="status-badge bg-amber-50 text-amber-700 border border-amber-200"><AlertTriangle size={10} />Escalated</span>
  );
}

type SortField = 'timestamp' | 'claimed_amount' | 'fraud_score' | 'confidence_score' | 'processing_time_sec';
type SortDir = 'asc' | 'desc';
const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function AuditLogClient() {
  const supabase = createClient();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [decisionFilter, setDecisionFilter] = useState<string>('all');
  const [policyFilter, setPolicyFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const fetchAuditLog = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .order('timestamp', { ascending: false });
      if (!error && data) setEntries(data);
      setLoading(false);
    };
    fetchAuditLog();

    const channel = supabase
      .channel('audit_log_live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_log' }, (payload) => {
        setEntries(prev => [payload.new as any, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = useMemo(() => {
    let data = [...entries];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(e =>
        e.claim_id?.toLowerCase().includes(q) ||
        e.claimant_name?.toLowerCase().includes(q) ||
        e.claim_type?.toLowerCase().includes(q)
      );
    }
    if (decisionFilter !== 'all') data = data.filter(e => e.decision === decisionFilter);
    if (policyFilter !== 'all') data = data.filter(e => e.policy_type === policyFilter);
    data.sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return data;
  }, [entries, search, decisionFilter, policyFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp size={12} className="text-slate-300" />;
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-blue-600" /> : <ChevronDown size={12} className="text-blue-600" />;
  };

  const handleExport = () => {
    toast.success('Export started', { description: `Exporting ${filtered.length} audit entries as CSV` });
  };

  return (
    <div className="px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 max-w-screen-2xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
            <ScrollText size={18} className="text-slate-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Audit Log</h1>
            <p className="text-sm text-slate-500">{filtered.length} entries · Full compliance trail</p>
          </div>
        </div>
        <button onClick={handleExport} className="btn-secondary"><Download size={14} />Export CSV</button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search claim ID, claimant, claim type…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="input-field pl-9" />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-slate-400" />
            <select value={decisionFilter} onChange={e => { setDecisionFilter(e.target.value); setPage(1); }} className="input-field py-2 pr-8 text-xs">
              <option value="all">All Decisions</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="ESCALATED">Escalated</option>
            </select>
            <select value={policyFilter} onChange={e => { setPolicyFilter(e.target.value); setPage(1); }} className="input-field py-2 pr-8 text-xs">
              <option value="all">All Policy Types</option>
              <option value="motor">Motor</option>
              <option value="health">Health</option>
              <option value="property">Property</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="table-header-cell">Claim ID</th>
                <th className="table-header-cell">Claimant</th>
                <th className="table-header-cell">Policy</th>
                <th className="table-header-cell">Claim Type</th>
                <th className="table-header-cell cursor-pointer hover:text-slate-700" onClick={() => toggleSort('claimed_amount')}>
                  <span className="flex items-center gap-1">Amount <SortIcon field="claimed_amount" /></span>
                </th>
                <th className="table-header-cell">Decision</th>
                <th className="table-header-cell">Decided By</th>
                <th className="table-header-cell cursor-pointer hover:text-slate-700" onClick={() => toggleSort('fraud_score')}>
                  <span className="flex items-center gap-1">Fraud Score <SortIcon field="fraud_score" /></span>
                </th>
                <th className="table-header-cell cursor-pointer hover:text-slate-700" onClick={() => toggleSort('timestamp')}>
                  <span className="flex items-center gap-1">Timestamp <SortIcon field="timestamp" /></span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={9} className="py-16 text-center text-slate-400 text-sm">Loading audit log…</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={9} className="py-16 text-center">
                  <ScrollText size={32} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-500">No audit entries match your filters</p>
                </td></tr>
              ) : paginated.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                  <td className="table-cell"><span className="font-mono text-xs text-blue-600 font-semibold">{entry.claim_id}</span></td>
                  <td className="table-cell"><p className="font-medium text-slate-800 whitespace-nowrap">{entry.claimant_name}</p></td>
                  <td className="table-cell"><span className="capitalize text-slate-600">{entry.policy_type}</span></td>
                  <td className="table-cell"><span className="capitalize text-slate-600">{entry.claim_type?.replace('_', ' ')}</span></td>
                  <td className="table-cell"><span className="font-semibold tabular-nums text-slate-900">{formatINR(entry.claimed_amount)}</span></td>
                  <td className="table-cell"><DecisionBadge decision={entry.decision} /></td>
                  <td className="table-cell max-w-[120px]"><span className="text-xs text-slate-600 truncate block" title={entry.decided_by}>{entry.decided_by}</span></td>
                  <td className="table-cell">
                    {entry.fraud_score != null ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${entry.fraud_score > 0.7 ? 'bg-red-500' : entry.fraud_score > 0.4 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${entry.fraud_score * 100}%` }} />
                        </div>
                        <span className={`text-xs font-semibold tabular-nums ${entry.fraud_score > 0.7 ? 'text-red-600' : entry.fraud_score > 0.4 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {(entry.fraud_score * 100).toFixed(0)}%
                        </span>
                      </div>
                    ) : <span className="text-xs text-slate-400">—</span>}
                  </td>
                  <td className="table-cell text-xs text-slate-500 whitespace-nowrap">{formatDT(entry.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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
    </div>
  );
}