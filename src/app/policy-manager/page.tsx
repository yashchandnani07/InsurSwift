'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { ShieldCheck, Plus, Edit2, Power, PowerOff, UserPlus, Search, Car, Heart, Home, X, Check, AlertCircle, Loader2, BookOpen, Save, Eye, EyeOff, FileText, ChevronDown, ChevronUp,  } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { PolicyRules } from '@/lib/types';
import Icon from '@/components/ui/AppIcon';


interface Policy {
  id: string;
  policyNumber: string;
  name: string;
  type: 'motor' | 'health' | 'property';
  coverageAmount: number;
  premiumAnnual: number;
  maxClaims: number;
  deductible: number;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRING_SOON' | 'EXPIRED';
  assignedCount: number;
  createdAt: string;
}

interface Assignment {
  id: string;
  policyId: string;
  policyNumber: string;
  policyName: string;
  userEmail: string;
  userName: string;
  assignedAt: string;
}

const typeConfig = {
  motor: { icon: Car, label: 'Motor', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  health: { icon: Heart, label: 'Health', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
  property: { icon: Home, label: 'Property', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
};

function formatINR(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

type ModalType = 'create' | 'edit' | 'assign' | null;
type ActiveTab = 'policies' | 'assignments' | 'rules';

// ─────────────────────────────────────────────
// DYNAMIC POLICY RULES EDITOR
// ─────────────────────────────────────────────

const DEFAULT_RULES: Record<string, string> = {
  motor: `## Motor Insurance Rules

- All vehicle damage claims require a valid FIR copy for incidents involving third parties or theft.
- Repair estimates must be from an authorized service center or garage.
- Claims for pre-existing damage (visible rust, prior dents) are not eligible.
- Maximum claim frequency: 2 claims per policy year.
- Theft claims require police report filed within 24 hours of incident.
- Total loss threshold: If repair cost exceeds 75% of IDV, declare total loss.`,

  health: `## Health Insurance Rules

- Hospitalization must be for a minimum of 24 hours (except day-care procedures).
- Pre-existing conditions have a 2-year waiting period from policy inception.
- Maternity benefits activate after 9 months of continuous coverage.
- All surgical claims require discharge summary and original hospital bills.
- OPD claims are covered up to ₹5,000 per year with valid prescriptions.
- Network hospital cashless limit: ₹5,00,000 per hospitalization.`,

  property: `## Property Insurance Rules

- Fire damage claims require fire brigade report and FIR.
- Flood claims are valid only in NDMA-notified flood zones.
- Theft/burglary requires FIR filed within 24 hours.
- Inventory claims must be supported by purchase receipts or bank statements.
- Structural damage assessment by licensed civil engineer required for claims above ₹50,000.
- Consequential losses (loss of rent, business interruption) are not covered.`,

  global: `## Global Rules (Apply to All Claim Types)

- All claims must be filed within 30 days of the incident date.
- Fraudulent claims will result in policy cancellation and legal action.
- Claimant must cooperate fully with the investigation process.
- Claims filed during the first 30 days of policy inception are subject to enhanced scrutiny.
- Any document with a date BEFORE the incident date is a critical fraud indicator.
- AI confidence score below 0.5 triggers mandatory human review.`,
};

function PolicyRulesEditor() {
  const { user } = useAuth();
  const supabase = createClient();
  const [rules, setRules] = useState<PolicyRules[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('policy_rules')
      .select('*')
      .order('policy_type');

    if (data && data.length > 0) {
      setRules(data as PolicyRules[]);
      const contentMap: Record<string, string> = {};
      data.forEach((r: PolicyRules) => { contentMap[r.id] = r.markdown_content; });
      setEditContent(contentMap);
    } else {
      // Seed default rules if none exist
      await seedDefaultRules();
    }
    setLoading(false);
  }, []);

  const seedDefaultRules = async () => {
    const types: Array<PolicyRules['policy_type']> = ['motor', 'health', 'property', 'global'];
    const inserts = types.map(t => ({
      policy_type: t,
      title: `${t.charAt(0).toUpperCase() + t.slice(1)} Insurance Rules`,
      markdown_content: DEFAULT_RULES[t] || '',
      is_active: true,
      created_by: user?.id || 'system',
    }));

    const { data } = await supabase.from('policy_rules').insert(inserts).select();
    if (data) {
      setRules(data as PolicyRules[]);
      const contentMap: Record<string, string> = {};
      data.forEach((r: PolicyRules) => { contentMap[r.id] = r.markdown_content; });
      setEditContent(contentMap);
    }
  };

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const handleSave = async (rule: PolicyRules) => {
    setSaving(rule.id);
    const { error } = await supabase
      .from('policy_rules')
      .update({
        markdown_content: editContent[rule.id] || rule.markdown_content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', rule.id);

    if (!error) {
      setSaveSuccess(rule.id);
      setTimeout(() => setSaveSuccess(null), 2000);
      await fetchRules();
    }
    setSaving(null);
  };

  const handleToggle = async (rule: PolicyRules) => {
    const { error } = await supabase
      .from('policy_rules')
      .update({ is_active: !rule.is_active, updated_at: new Date().toISOString() })
      .eq('id', rule.id);
    if (!error) await fetchRules();
  };

  const typeColors: Record<string, string> = {
    motor: 'bg-blue-50 text-blue-700 border-blue-200',
    health: 'bg-rose-50 text-rose-700 border-rose-200',
    property: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    global: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-indigo-600" />
        <span className="ml-3 text-slate-500">Loading policy rules…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start gap-3">
        <BookOpen size={18} className="text-indigo-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-indigo-800">Dynamic Policy Engine</p>
          <p className="text-xs text-indigo-600 mt-0.5">
            Rules written here are injected directly into the Gemini AI prompt as the highest-priority context.
            The AI will reason against these exact rules when analyzing claims — no code changes needed.
          </p>
        </div>
      </div>

      {rules.map((rule) => (
        <div
          key={rule.id}
          className={`bg-white rounded-xl border transition-all duration-200 ${
            rule.is_active ? 'border-slate-200 shadow-sm' : 'border-slate-100 opacity-60'
          }`}
        >
          {/* Rule Header */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${typeColors[rule.policy_type] || typeColors.global}`}>
                {rule.policy_type.toUpperCase()}
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-800">{rule.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {rule.is_active ? '✓ Active — injected into AI prompts' : '✗ Inactive — not used in analysis'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleToggle(rule)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  rule.is_active
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' :'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {rule.is_active ? <Eye size={12} /> : <EyeOff size={12} />}
                {rule.is_active ? 'Active' : 'Inactive'}
              </button>
              <button
                onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all"
              >
                <Edit2 size={12} />
                Edit
                {expandedRule === rule.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>
          </div>

          {/* Markdown Editor */}
          {expandedRule === rule.id && (
            <div className="border-t border-slate-100 p-4 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <FileText size={14} className="text-slate-400" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Markdown Rules — injected verbatim into Gemini system prompt
                </span>
              </div>
              <textarea
                value={editContent[rule.id] ?? rule.markdown_content}
                onChange={(e) => setEditContent(prev => ({ ...prev, [rule.id]: e.target.value }))}
                rows={14}
                className="w-full px-3 py-2.5 text-sm font-mono border border-slate-200 rounded-lg bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y transition-all"
                placeholder="Write policy rules in Markdown format…"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Supports Markdown: ## headings, - bullet points, **bold**
                </p>
                <button
                  onClick={() => handleSave(rule)}
                  disabled={saving === rule.id}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    saveSuccess === rule.id
                      ? 'bg-emerald-600 text-white' :'bg-indigo-600 text-white hover:bg-indigo-700'
                  } disabled:opacity-50`}
                >
                  {saving === rule.id ? (
                    <><Loader2 size={14} className="animate-spin" /> Saving…</>
                  ) : saveSuccess === rule.id ? (
                    <><Check size={14} /> Saved!</>
                  ) : (
                    <><Save size={14} /> Save Rules</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────

export default function PolicyManagerPage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadingPolicies, setLoadingPolicies] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modal, setModal] = useState<ModalType>(null);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('policies');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ name: '', type: 'motor', coverageAmount: '', premiumAnnual: '', maxClaims: '3', deductible: '' });
  const [assignForm, setAssignForm] = useState({ policyId: '', userEmail: '', userName: '' });
  const [formError, setFormError] = useState('');

  const fetchPolicies = useCallback(async () => {
    setLoadingPolicies(true);
    const { data, error } = await supabase
      .from('policies')
      .select('*, user_policies(count)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPolicies(data.map((p: any) => ({
        id: p.id,
        policyNumber: p.policy_number,
        name: p.name,
        type: p.policy_type as Policy['type'],
        coverageAmount: Number(p.coverage_amount),
        premiumAnnual: Number(p.premium_annual),
        maxClaims: p.max_claims,
        deductible: Number(p.deductible),
        status: p.status as Policy['status'],
        assignedCount: p.user_policies?.[0]?.count ?? 0,
        createdAt: p.created_at?.slice(0, 10) ?? '',
      })));
    }
    setLoadingPolicies(false);
  }, []);

  const fetchAssignments = useCallback(async () => {
    setLoadingAssignments(true);
    const { data, error } = await supabase
      .from('user_policies')
      .select('id, policy_id, policy_number, assigned_at, policies(name), user_profiles(email, full_name)')
      .order('assigned_at', { ascending: false });

    if (!error && data) {
      setAssignments(data.map((a: any) => ({
        id: a.id,
        policyId: a.policy_id,
        policyNumber: a.policy_number,
        policyName: a.policies?.name ?? '',
        userEmail: a.user_profiles?.email ?? '',
        userName: a.user_profiles?.full_name ?? '',
        assignedAt: a.assigned_at?.slice(0, 10) ?? '',
      })));
    }
    setLoadingAssignments(false);
  }, []);

  useEffect(() => {
    fetchPolicies();
    fetchAssignments();
  }, [fetchPolicies, fetchAssignments]);

  const filtered = policies.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !search || p.name.toLowerCase().includes(q) || p.policyNumber.toLowerCase().includes(q);
    const matchType = typeFilter === 'all' || p.type === typeFilter;
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const openCreate = () => {
    setForm({ name: '', type: 'motor', coverageAmount: '', premiumAnnual: '', maxClaims: '3', deductible: '' });
    setFormError('');
    setEditingPolicy(null);
    setModal('create');
  };

  const openEdit = (p: Policy) => {
    setForm({ name: p.name, type: p.type, coverageAmount: String(p.coverageAmount), premiumAnnual: String(p.premiumAnnual), maxClaims: String(p.maxClaims), deductible: String(p.deductible) });
    setFormError('');
    setEditingPolicy(p);
    setModal('edit');
  };

  const handleSavePolicy = async () => {
    if (!form.name || !form.coverageAmount || !form.premiumAnnual) {
      setFormError('Please fill all required fields.');
      return;
    }
    setSaving(true);
    setFormError('');

    const policyData = {
      name: form.name,
      policy_type: form.type,
      coverage_amount: Number(form.coverageAmount),
      premium_annual: Number(form.premiumAnnual),
      max_claims: Number(form.maxClaims),
      deductible: Number(form.deductible) || 0,
    };

    if (modal === 'create') {
      const policyNumber = `LIC-${form.type.toUpperCase().slice(0, 3)}-${String(Math.floor(Math.random() * 90000) + 10000)}`;
      const { error } = await supabase
        .from('policies')
        .insert({ ...policyData, policy_number: policyNumber, status: 'ACTIVE', created_by: user?.id });
      if (error) { setFormError(error.message); setSaving(false); return; }
    } else if (modal === 'edit' && editingPolicy) {
      const { error } = await supabase
        .from('policies')
        .update({ ...policyData, updated_at: new Date().toISOString() })
        .eq('id', editingPolicy.id);
      if (error) { setFormError(error.message); setSaving(false); return; }
    }

    await fetchPolicies();
    setSaving(false);
    setModal(null);
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const { error } = await supabase
      .from('policies')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) {
      setPolicies(prev => prev.map(p => p.id === id ? { ...p, status: newStatus as Policy['status'] } : p));
    }
  };

  const handleAssign = async () => {
    if (!assignForm.policyId || !assignForm.userEmail || !assignForm.userName) {
      setFormError('Please fill all fields.');
      return;
    }
    setSaving(true);
    setFormError('');

    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', assignForm.userEmail)
      .maybeSingle();

    if (profileError || !profileData) {
      setFormError('No user found with that email address. They must sign up first.');
      setSaving(false);
      return;
    }

    const policy = policies.find(p => p.id === assignForm.policyId);
    if (!policy) { setSaving(false); return; }

    const today = new Date();
    const endDate = new Date(today);
    endDate.setFullYear(endDate.getFullYear() + 1);

    const { error } = await supabase
      .from('user_policies')
      .insert({
        user_id: profileData.id,
        policy_id: assignForm.policyId,
        policy_number: policy.policyNumber,
        start_date: today.toISOString().slice(0, 10),
        end_date: endDate.toISOString().slice(0, 10),
        assigned_by: user?.id,
      });

    if (error) {
      if (error.code === '23505') {
        setFormError('This user already has this policy assigned.');
      } else {
        setFormError(error.message);
      }
      setSaving(false);
      return;
    }

    await Promise.all([fetchPolicies(), fetchAssignments()]);
    setSaving(false);
    setModal(null);
    setAssignForm({ policyId: '', userEmail: '', userName: '' });
  };

  const tabs: Array<{ id: ActiveTab; label: string; icon: React.ElementType }> = [
    { id: 'policies', label: 'Policies', icon: ShieldCheck },
    { id: 'assignments', label: 'Assignments', icon: UserPlus },
    { id: 'rules', label: 'AI Policy Rules', icon: BookOpen },
  ];

  return (
    <AppLayout>
      <div className="px-6 lg:px-8 xl:px-10 py-6 max-w-screen-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <ShieldCheck size={18} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Policy Manager</h1>
              <p className="text-xs text-slate-500">Manage policies, assignments, and AI rules</p>
            </div>
          </div>
          {activeTab !== 'rules' && (
            <div className="flex items-center gap-2">
              <button onClick={() => { setAssignForm({ policyId: '', userEmail: '', userName: '' }); setFormError(''); setModal('assign'); }} className="btn-secondary text-xs gap-1.5">
                <UserPlus size={14} /> Assign Policy
              </button>
              <button onClick={openCreate} className="btn-primary text-xs gap-1.5">
                <Plus size={14} /> New Policy
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6 w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
              {tab.id === 'rules' && (
                <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full font-bold">AI</span>
              )}
            </button>
          ))}
        </div>

        {/* AI Policy Rules Tab */}
        {activeTab === 'rules' && <PolicyRulesEditor />}

        {/* Policies Tab */}
        {activeTab === 'policies' && (
          <>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-5">
              <div className="relative flex-1 min-w-48">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search policies…"
                  className="input-field pl-9 text-sm"
                />
              </div>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input-field w-auto text-sm">
                <option value="all">All Types</option>
                <option value="motor">Motor</option>
                <option value="health">Health</option>
                <option value="property">Property</option>
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field w-auto text-sm">
                <option value="all">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            {loadingPolicies ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((policy) => {
                  const cfg = typeConfig[policy.type];
                  const Icon = cfg.icon;
                  return (
                    <div key={policy.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-lg ${cfg.bg} flex items-center justify-center`}>
                            <Icon size={16} className={cfg.color} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{policy.name}</p>
                            <p className="text-xs text-slate-400 font-mono">{policy.policyNumber}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          policy.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {policy.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="bg-slate-50 rounded-lg p-2.5">
                          <p className="text-xs text-slate-400">Coverage</p>
                          <p className="text-sm font-bold text-slate-800">{formatINR(policy.coverageAmount)}</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-2.5">
                          <p className="text-xs text-slate-400">Premium</p>
                          <p className="text-sm font-bold text-slate-800">{formatINR(policy.premiumAnnual)}/yr</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-2.5">
                          <p className="text-xs text-slate-400">Deductible</p>
                          <p className="text-sm font-bold text-slate-800">{formatINR(policy.deductible)}</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-2.5">
                          <p className="text-xs text-slate-400">Assigned</p>
                          <p className="text-sm font-bold text-slate-800">{policy.assignedCount} users</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(policy)} className="flex-1 btn-secondary text-sm py-1.5 justify-center gap-1.5">
                          <Edit2 size={12} /> Edit
                        </button>
                        <button
                          onClick={() => toggleStatus(policy.id, policy.status)}
                          className={`flex-1 text-sm py-1.5 rounded-lg font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                            policy.status === 'ACTIVE' ?'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' :'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          {policy.status === 'ACTIVE' ? <><PowerOff size={12} /> Deactivate</> : <><Power size={12} /> Activate</>}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Assignments Tab */}
        {activeTab === 'assignments' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {loadingAssignments ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin text-blue-600" />
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="table-header-cell">User</th>
                    <th className="table-header-cell">Policy</th>
                    <th className="table-header-cell">Policy Number</th>
                    <th className="table-header-cell">Assigned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assignments.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                      <td className="table-cell">
                        <p className="font-medium text-slate-800">{a.userName}</p>
                        <p className="text-xs text-slate-400">{a.userEmail}</p>
                      </td>
                      <td className="table-cell font-medium">{a.policyName}</td>
                      <td className="table-cell font-mono text-xs text-slate-500">{a.policyNumber}</td>
                      <td className="table-cell text-slate-500">{a.assignedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Modals */}
        {(modal === 'create' || modal === 'edit') && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900">{modal === 'create' ? 'Create Policy' : 'Edit Policy'}</h2>
                <button onClick={() => setModal(null)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                  <X size={16} className="text-slate-500" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                {formError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <AlertCircle size={14} /> {formError}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Policy Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder="e.g. Comprehensive Motor Plan" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Type *</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="input-field">
                    <option value="motor">Motor</option>
                    <option value="health">Health</option>
                    <option value="property">Property</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Coverage (₹) *</label>
                    <input type="number" value={form.coverageAmount} onChange={e => setForm(f => ({ ...f, coverageAmount: e.target.value }))} className="input-field" placeholder="500000" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Premium/yr (₹) *</label>
                    <input type="number" value={form.premiumAnnual} onChange={e => setForm(f => ({ ...f, premiumAnnual: e.target.value }))} className="input-field" placeholder="12000" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Deductible (₹)</label>
                    <input type="number" value={form.deductible} onChange={e => setForm(f => ({ ...f, deductible: e.target.value }))} className="input-field" placeholder="5000" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Max Claims</label>
                    <input type="number" value={form.maxClaims} onChange={e => setForm(f => ({ ...f, maxClaims: e.target.value }))} className="input-field" placeholder="3" />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-100">
                <button onClick={() => setModal(null)} className="btn-secondary text-sm">Cancel</button>
                <button onClick={handleSavePolicy} disabled={saving} className="btn-primary text-sm">
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Check size={14} /> Save Policy</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {modal === 'assign' && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900">Assign Policy to User</h2>
                <button onClick={() => setModal(null)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                  <X size={16} className="text-slate-500" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                {formError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <AlertCircle size={14} /> {formError}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Select Policy *</label>
                  <select value={assignForm.policyId} onChange={e => setAssignForm(f => ({ ...f, policyId: e.target.value }))} className="input-field">
                    <option value="">Choose a policy…</option>
                    {policies.filter(p => p.status === 'ACTIVE').map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.policyNumber})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">User Email *</label>
                  <input value={assignForm.userEmail} onChange={e => setAssignForm(f => ({ ...f, userEmail: e.target.value }))} className="input-field" placeholder="user@example.com" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">User Full Name *</label>
                  <input value={assignForm.userName} onChange={e => setAssignForm(f => ({ ...f, userName: e.target.value }))} className="input-field" placeholder="Full name" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-100">
                <button onClick={() => setModal(null)} className="btn-secondary text-sm">Cancel</button>
                <button onClick={handleAssign} disabled={saving} className="btn-primary text-sm">
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Assigning…</> : <><UserPlus size={14} /> Assign</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
