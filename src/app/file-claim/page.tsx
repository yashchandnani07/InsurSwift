'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import {
  FileText, Car, Heart, Home, ChevronRight, ChevronLeft,
  Upload, X, Check, AlertCircle, Camera, Calendar, MapPin, Info, Loader2,
  Brain, Shield, Zap, CheckCircle2, Clock, Eye,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { PolicyContext } from '@/lib/claimAnalysis';

interface UserPolicy {
  id: string;
  policy_number: string;
  start_date: string;
  end_date: string;
  policies: {
    id: string;
    name: string;
    policy_type: string;
    coverage_amount: number;
    deductible: number;
    max_claims: number;
  };
}

const CLAIM_TYPES: Record<string, string[]> = {
  motor: ['Vehicle Damage', 'Third Party Liability', 'Theft', 'Natural Calamity'],
  health: ['Hospitalization', 'OPD Treatment', 'Surgery', 'Emergency'],
  property: ['Fire Damage', 'Flood Damage', 'Theft/Burglary', 'Natural Disaster'],
};

const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  motor: { icon: Car, color: 'text-blue-600', bg: 'bg-blue-50' },
  health: { icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50' },
  property: { icon: Home, color: 'text-emerald-600', bg: 'bg-emerald-50' },
};

const STEPS = ['Select Policy', 'Incident Details', 'Upload Documents', 'Review & Submit'];

// Pipeline steps — each maps to a real stage in the analysis
const PIPELINE_STEPS = [
  {
    id: 'upload',
    label: 'Uploading claim',
    sublabel: 'Saving to database',
    icon: FileText,
    color: 'indigo',
  },
  {
    id: 'vision',
    label: 'AI Vision Analysis',
    sublabel: 'Gemini reading your documents',
    icon: Eye,
    color: 'violet',
  },
  {
    id: 'policy',
    label: 'Policy Cross-Check',
    sublabel: 'Verifying dates, coverage, limits',
    icon: Shield,
    color: 'blue',
  },
  {
    id: 'fraud',
    label: 'Fraud Detection',
    sublabel: 'ML model + date mismatch check',
    icon: Brain,
    color: 'amber',
  },
  {
    id: 'decision',
    label: 'Final Decision',
    sublabel: 'STP deterministic wrapper',
    icon: Zap,
    color: 'emerald',
  },
];

function formatINR(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

function getPolicyStatus(endDate: string): 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' {
  const end = new Date(endDate);
  const now = new Date();
  const diffDays = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return 'EXPIRED';
  if (diffDays < 30) return 'EXPIRING_SOON';
  return 'ACTIVE';
}

async function fileToBase64DataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
}

// ─────────────────────────────────────────────
// PIPELINE PROGRESS OVERLAY
// ─────────────────────────────────────────────

function PipelineProgress({ currentStep }: { currentStep: number }) {
  const progress = Math.round(((currentStep + 1) / PIPELINE_STEPS.length) * 100);

  return (
    <AppLayout>
      <div className="p-6 max-w-lg mx-auto flex flex-col items-center justify-center min-h-[70vh]">
        {/* Animated brain icon */}
        <div className="relative w-20 h-20 mb-6">
          <div className="absolute inset-0 rounded-full bg-indigo-100 animate-ping opacity-30" />
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-indigo">
            <Brain size={32} className="text-white" />
          </div>
        </div>

        <h2 className="font-heading text-2xl font-bold text-slate-900 mb-2">AI Analysis in Progress</h2>
        <p className="text-sm text-slate-500 mb-6 text-center max-w-xs">
          Gemini is analysing your documents with multimodal vision and cross-checking policy rules.
        </p>

        {/* Overall progress bar */}
        <div className="w-full max-w-sm mb-6">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-500">Pipeline Progress</span>
            <span className="text-xs font-bold text-indigo-600 tabular-nums">{progress}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="h-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step-by-step pipeline */}
        <div className="w-full max-w-sm space-y-2">
          {PIPELINE_STEPS.map((step, idx) => {
            const StepIcon = step.icon;
            const isDone = idx < currentStep;
            const isActive = idx === currentStep;
            const isPending = idx > currentStep;

            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-500 ${
                  isDone
                    ? 'border-emerald-200 bg-emerald-50/80'
                    : isActive
                    ? 'border-indigo-200 bg-indigo-50/80 shadow-sm'
                    : 'border-slate-100 bg-white/60'
                }`}
              >
                {/* Step icon */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500 ${
                    isDone
                      ? 'bg-emerald-500 shadow-emerald'
                      : isActive
                      ? 'bg-indigo-600 shadow-indigo'
                      : 'bg-slate-100'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 size={16} className="text-white state-transition" />
                  ) : isActive ? (
                    <Loader2 size={16} className="text-white animate-spin" />
                  ) : (
                    <StepIcon size={16} className="text-slate-400" />
                  )}
                </div>

                {/* Step text */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-semibold transition-colors duration-300 ${
                      isDone ? 'text-emerald-700' : isActive ? 'text-indigo-700' : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </p>
                  <p
                    className={`text-xs transition-colors duration-300 ${
                      isDone ? 'text-emerald-500' : isActive ? 'text-indigo-500' : 'text-slate-300'
                    }`}
                  >
                    {step.sublabel}
                  </p>
                </div>

                {/* Status indicator */}
                {isDone && (
                  <span className="text-xs font-semibold text-emerald-600 state-transition">Done</span>
                )}
                {isActive && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-indigo-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 pulse-dot" />
                    Active
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-xs text-slate-400 mt-6 text-center">
          This typically takes 15–30 seconds · Do not close this page
        </p>
      </div>
    </AppLayout>
  );
}

// ─────────────────────────────────────────────
// RESULT SCREEN
// ─────────────────────────────────────────────

function ResultScreen({ analysisResult }: { analysisResult: any }) {
  const finalStatus = analysisResult?.finalStatus;
  const claimantMsg = analysisResult?.gemini?.claimantMessage;
  const stpDecision = analysisResult?.combined?.stpDecision;
  const isApproved = finalStatus === 'APPROVED';
  const isEscalated = finalStatus === 'ESCALATED';

  return (
    <AppLayout>
      <div className="p-6 max-w-xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
        {/* Status icon with micro-animation */}
        <div
          className={`w-24 h-24 rounded-full flex items-center justify-center mb-5 state-transition ${
            isApproved
              ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald'
              : isEscalated
              ? 'bg-gradient-to-br from-amber-400 to-amber-600' :'bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-indigo'
          }`}
        >
          {isApproved ? (
            <CheckCircle2 size={40} className="text-white" />
          ) : isEscalated ? (
            <Shield size={40} className="text-white" />
          ) : (
            <Clock size={40} className="text-white" />
          )}
        </div>

        <h2 className="font-heading text-2xl font-bold text-slate-900 mb-2">
          {isApproved ? 'Claim Approved!' : isEscalated ? 'Claim Under Review' : 'Claim Submitted!'}
        </h2>

        <p className="text-slate-600 text-sm mb-4 leading-relaxed max-w-sm">
          {claimantMsg || 'Your claim has been received and is being processed by our AI system.'}
        </p>

        {/* STP badge */}
        {stpDecision && (
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-4 state-transition ${
              stpDecision.isEligible
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :'bg-slate-50 text-slate-600 border border-slate-200'
            }`}
          >
            <Zap size={12} />
            {stpDecision.isEligible ? 'Auto-approved via STP' : 'Routed for manual review'}
          </div>
        )}

        <p className="text-slate-400 text-xs">Redirecting to claim status…</p>
      </div>
    </AppLayout>
  );
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────

export default function FileClaimPage() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();

  const [userPolicies, setUserPolicies] = useState<UserPolicy[]>([]);
  const [loadingPolicies, setLoadingPolicies] = useState(true);
  const [step, setStep] = useState(0);
  const [selectedPolicy, setSelectedPolicy] = useState<UserPolicy | null>(null);
  const [claimType, setClaimType] = useState('');
  const [incidentDate, setIncidentDate] = useState('');
  const [incidentLocation, setIncidentLocation] = useState('');
  const [description, setDescription] = useState('');
  const [claimedAmount, setClaimedAmount] = useState('');
  const [docFiles, setDocFiles] = useState<File[]>([]);
  const [damagePhotoFile, setDamagePhotoFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [pipelineStep, setPipelineStep] = useState(-1);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    const fetchPolicies = async () => {
      setLoadingPolicies(true);
      const { data } = await supabase
        .from('user_policies')
        .select('id, policy_number, start_date, end_date, policies(id, name, policy_type, coverage_amount, deductible, max_claims)')
        .eq('user_id', user.id);
      if (data) setUserPolicies(data as any);
      setLoadingPolicies(false);
    };
    fetchPolicies();
  }, [user]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (step === 0 && !selectedPolicy) e.policy = 'Please select a policy.';
    if (step === 1) {
      if (!claimType) e.claimType = 'Select a claim type.';
      if (!incidentDate) e.incidentDate = 'Enter the incident date.';
      if (!incidentLocation) e.incidentLocation = 'Enter the incident location.';
      if (!description || description.length < 20) e.description = 'Describe the incident (min 20 characters).';
      if (!claimedAmount || isNaN(Number(claimedAmount))) e.claimedAmount = 'Enter a valid claim amount.';
    }
    if (step === 2 && docFiles.length === 0) e.docs = 'Upload at least one document.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (!validate()) return; setStep(s => Math.min(s + 1, 3)); };
  const back = () => setStep(s => Math.max(s - 1, 0));

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setDocFiles(prev => [...prev, ...files]);
    setErrors(prev => ({ ...prev, docs: '' }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setDamagePhotoFile(file);
  };

  const handleSubmit = async () => {
    if (!user || !selectedPolicy) return;
    setSubmitting(true);
    setSubmitError('');
    setPipelineStep(0); // Step 0: Uploading

    const claimId = `CLM-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const policyData = selectedPolicy.policies as any;

    // ── Step 0: Insert claim as SUBMITTED ──────────────────────────────────
    const { error: insertError } = await supabase.from('claims').insert({
      id: claimId,
      user_id: user.id,
      policy_id: policyData?.id || null,
      policy_number: selectedPolicy.policy_number,
      policy_type: policyData?.policy_type || 'motor',
      claim_type: claimType.toLowerCase().replace(/ /g, '_'),
      claimed_amount: Number(claimedAmount),
      status: 'SUBMITTED',
      incident_date: incidentDate,
      location: incidentLocation,
      description,
      documents_uploaded: docFiles.map(f => f.name),
      damage_photo: damagePhotoFile?.name || null,
      submitted_at: new Date().toISOString(),
    });

    if (insertError) {
      setSubmitError('Failed to submit claim. Please try again.');
      setSubmitting(false);
      setPipelineStep(-1);
      return;
    }

    setPipelineStep(1); // Step 1: AI Vision Analysis

    // ── Step 1: Convert files to base64 for Gemini vision ─────────────────
    const documentFiles: Array<{ name: string; base64: string; mimeType: string }> = [];
    for (const file of docFiles) {
      try {
        const base64 = await fileToBase64DataUri(file);
        documentFiles.push({ name: file.name, base64, mimeType: file.type });
      } catch { /* skip */ }
    }

    let damagePhotoBase64: string | undefined;
    let damageMimeType: string | undefined;
    if (damagePhotoFile) {
      try {
        damagePhotoBase64 = await fileToBase64DataUri(damagePhotoFile);
        damageMimeType = damagePhotoFile.type;
      } catch { /* skip */ }
    }

    setPipelineStep(2); // Step 2: Policy Cross-Check

    // ── Step 2: Build policy context ──────────────────────────────────────
    const policyContext: PolicyContext = {
      policyNumber: selectedPolicy.policy_number,
      policyType: (policyData?.policy_type || 'motor') as 'motor' | 'health' | 'property',
      coverageAmount: policyData?.coverage_amount || 0,
      startDate: selectedPolicy.start_date,
      endDate: selectedPolicy.end_date,
      deductible: policyData?.deductible || 0,
      maxClaims: policyData?.max_claims || 3,
      policyName: policyData?.name || 'Insurance Policy',
    };

    setPipelineStep(3); // Step 3: Fraud Detection

    // ── Step 3: Call the AI analysis pipeline ─────────────────────────────
    try {
      const analysisRes = await fetch('/api/analyze-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimId,
          policyContext,
          incidentDate,
          description,
          claimType,
          claimedAmount: Number(claimedAmount),
          location: incidentLocation,
          documentFiles,
          damagePhotoBase64,
          damageMimeType,
        }),
      });

      const result = await analysisRes.json();
      setPipelineStep(4); // Step 4: Final Decision
      setAnalysisResult(result);
    } catch (analysisErr) {
      console.error('Analysis pipeline error:', analysisErr);
      setPipelineStep(4);
    }

    setSubmitted(true);
    setTimeout(() => router.push('/claim-status'), 3500);
  };

  // Show result screen
  if (submitted && analysisResult) {
    return <ResultScreen analysisResult={analysisResult} />;
  }

  // Show pipeline progress overlay
  if (submitting && pipelineStep >= 0) {
    return <PipelineProgress currentStep={pipelineStep} />;
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => router.push('/claimant-dashboard')} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">My Dashboard</button>
            <ChevronRight size={12} className="text-slate-300" />
            <span className="text-xs text-slate-600 font-medium">File a Claim</span>
          </div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">File a Claim</h1>
          <p className="text-sm text-slate-500 mt-0.5">Complete all steps to submit your insurance claim.</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0">
          {STEPS.map((label, idx) => (
            <React.Fragment key={label}>
              <div className="flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
                  idx < step ? 'bg-emerald-500 border-emerald-500 text-white' :
                  idx === step ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300 text-slate-400'
                }`}>
                  {idx < step ? <Check size={14} /> : idx + 1}
                </div>
                <span className={`text-[10px] font-medium whitespace-nowrap ${idx === step ? 'text-indigo-600' : idx < step ? 'text-emerald-600' : 'text-slate-400'}`}>{label}</span>
              </div>
              {idx < STEPS.length - 1 && <div className={`flex-1 h-0.5 mb-4 mx-1 transition-all duration-500 ${idx < step ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Step 0: Select Policy */}
        {step === 0 && (
          <div className="space-y-3 fade-in">
            <h2 className="font-heading text-base font-semibold text-slate-800">Select a Policy</h2>
            {errors.policy && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle size={12} />{errors.policy}</p>}
            {loadingPolicies ? (
              <div className="flex items-center justify-center py-8"><Loader2 size={24} className="animate-spin text-indigo-500" /></div>
            ) : userPolicies.length === 0 ? (
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-8 text-center">
                <p className="text-sm text-slate-500">No active policies found. Contact your insurer.</p>
              </div>
            ) : (
              userPolicies.map((up, i) => {
                const pType = ((up.policies as any)?.policy_type || 'motor') as string;
                const tc = typeConfig[pType] || typeConfig.motor;
                const TypeIcon = tc.icon;
                const isSelected = selectedPolicy?.id === up.id;
                const pStatus = getPolicyStatus(up.end_date);
                return (
                  <button
                    key={up.id}
                    onClick={() => { setSelectedPolicy(up); setClaimType(''); setErrors({}); }}
                    className={`w-full text-left rounded-2xl border-2 p-4 flex items-center gap-4 transition-all duration-200 stagger-item ${
                      isSelected ? 'border-indigo-500 bg-indigo-50 shadow-indigo' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                    }`}
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className={`w-10 h-10 rounded-xl ${tc.bg} flex items-center justify-center shrink-0`}>
                      <TypeIcon size={20} className={tc.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{(up.policies as any)?.name || 'Policy'}</p>
                      <p className="text-xs font-mono text-slate-400">{up.policy_number}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Coverage: {formatINR((up.policies as any)?.coverage_amount || 0)}</p>
                    </div>
                    <span className={`status-badge shrink-0 ${pStatus === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                      {pStatus === 'ACTIVE' ? 'Active' : 'Expiring Soon'}
                    </span>
                    {isSelected && <Check size={18} className="text-indigo-600 shrink-0 state-transition" />}
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Step 1: Incident Details */}
        {step === 1 && selectedPolicy && (
          <div className="space-y-4 fade-in">
            <h2 className="font-heading text-base font-semibold text-slate-800">Incident Details</h2>
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center gap-2">
              <Info size={14} className="text-indigo-600 shrink-0" />
              <p className="text-xs text-indigo-700">Filing for: <span className="font-semibold">{(selectedPolicy.policies as any)?.name}</span> ({selectedPolicy.policy_number})</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Claim Type *</label>
              <div className="grid grid-cols-2 gap-2">
                {(CLAIM_TYPES[(selectedPolicy.policies as any)?.policy_type] || CLAIM_TYPES.motor).map(ct => (
                  <button key={ct} onClick={() => { setClaimType(ct); setErrors(e => ({ ...e, claimType: '' })); }}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium text-left transition-all duration-150 ${claimType === ct ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                  >
                    {ct}
                  </button>
                ))}
              </div>
              {errors.claimType && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle size={11} />{errors.claimType}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Incident Date *</label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="date" value={incidentDate} onChange={e => { setIncidentDate(e.target.value); setErrors(er => ({ ...er, incidentDate: '' })); }} className="input-field pl-9" />
                </div>
                {errors.incidentDate && <p className="text-xs text-red-600 mt-1">{errors.incidentDate}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Claimed Amount (₹) *</label>
                <input type="number" value={claimedAmount} onChange={e => { setClaimedAmount(e.target.value); setErrors(er => ({ ...er, claimedAmount: '' })); }} className="input-field" placeholder="e.g. 150000" />
                {errors.claimedAmount && <p className="text-xs text-red-600 mt-1">{errors.claimedAmount}</p>}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Incident Location *</label>
              <div className="relative">
                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" value={incidentLocation} onChange={e => { setIncidentLocation(e.target.value); setErrors(er => ({ ...er, incidentLocation: '' })); }} className="input-field pl-9" placeholder="e.g. NH-48, Gurgaon" />
              </div>
              {errors.incidentLocation && <p className="text-xs text-red-600 mt-1">{errors.incidentLocation}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Incident Description *</label>
              <textarea value={description} onChange={e => { setDescription(e.target.value); setErrors(er => ({ ...er, description: '' })); }} className="input-field min-h-[100px] resize-none" placeholder="Describe what happened in detail (min 20 characters)…" />
              {errors.description && <p className="text-xs text-red-600 mt-1">{errors.description}</p>}
            </div>
          </div>
        )}

        {/* Step 2: Upload Documents */}
        {step === 2 && (
          <div className="space-y-4 fade-in">
            <h2 className="font-heading text-base font-semibold text-slate-800">Upload Documents</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
              <Brain size={14} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                <strong>AI Date Verification:</strong> Gemini will extract dates from every document and compare them against your incident date to detect fraud.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">Supporting Documents *</label>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all">
                <Upload size={20} className="text-slate-400 mb-2" />
                <p className="text-xs text-slate-500 font-medium">Click to upload documents</p>
                <p className="text-[10px] text-slate-400 mt-0.5">RC Book, FIR, Hospital Bills, etc. (PDF, JPG, PNG)</p>
                <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={handleDocUpload} className="hidden" />
              </label>
              {errors.docs && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle size={11} />{errors.docs}</p>}
              {docFiles.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {docFiles.map((doc, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 stagger-item">
                      <div className="flex items-center gap-2">
                        <FileText size={13} className="text-indigo-600" />
                        <span className="text-xs text-slate-700 truncate max-w-[200px]">{doc.name}</span>
                        <span className="text-[10px] text-slate-400">{(doc.size / 1024).toFixed(0)} KB</span>
                      </div>
                      <button onClick={() => setDocFiles(prev => prev.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500 transition-colors">
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">Damage / Evidence Photo (optional)</label>
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all">
                <Camera size={18} className="text-slate-400 mb-1" />
                <p className="text-xs text-slate-500">Upload damage photo</p>
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
              {damagePhotoFile && (
                <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
                  <Camera size={13} className="text-emerald-600" />
                  <span className="text-xs text-slate-700 truncate">{damagePhotoFile.name}</span>
                  <button onClick={() => setDamagePhotoFile(null)} className="ml-auto text-slate-400 hover:text-red-500"><X size={13} /></button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Review & Submit */}
        {step === 3 && selectedPolicy && (
          <div className="space-y-4 fade-in">
            <h2 className="font-heading text-base font-semibold text-slate-800">Review & Submit</h2>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-sm">
              <div className="flex justify-between text-sm"><span className="text-slate-500">Policy</span><span className="font-semibold text-slate-800">{selectedPolicy.policy_number}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Claim Type</span><span className="font-semibold text-slate-800">{claimType}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Incident Date</span><span className="font-semibold text-slate-800">{incidentDate}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Location</span><span className="font-semibold text-slate-800">{incidentLocation}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Claimed Amount</span><span className="font-bold text-indigo-700">{formatINR(Number(claimedAmount))}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Documents</span><span className="font-semibold text-slate-800">{docFiles.length} file(s)</span></div>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-start gap-2">
              <Brain size={14} className="text-indigo-600 shrink-0 mt-0.5" />
              <p className="text-xs text-indigo-700">
                After submission, our 5-step AI pipeline will analyse your documents, verify policy compliance, run fraud detection with date-mismatch checking, and apply the STP deterministic wrapper. This takes 15–30 seconds.
              </p>
            </div>
            {submitError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle size={14} className="text-red-600" />
                <p className="text-xs text-red-700">{submitError}</p>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <button onClick={back} disabled={step === 0 || submitting} className="btn-secondary gap-2 disabled:opacity-40">
            <ChevronLeft size={15} />
            Back
          </button>
          {step < 3 ? (
            <button onClick={next} className="btn-primary gap-2">
              Next
              <ChevronRight size={15} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting} className="btn-primary gap-2 disabled:opacity-70">
              {submitting ? <><Loader2 size={15} className="animate-spin" />Analysing…</> : <><Zap size={15} />Submit & Analyse</>}
            </button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
