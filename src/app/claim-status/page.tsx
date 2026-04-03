'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { CheckCircle2, Clock, Loader2, FileText, ScanSearch, Brain, ShieldCheck, AlertTriangle, Gavel, ChevronRight, RefreshCw, XCircle } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Icon from '@/components/ui/AppIcon';


interface TimelineStep {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  status: 'completed' | 'active' | 'pending' | 'failed';
  timestamp?: string;
  detail?: string;
}

const statusConfig = {
  completed: {
    ring: 'bg-emerald-500 border-emerald-500',
    icon: 'text-white',
    line: 'bg-emerald-400',
    label: 'text-emerald-700',
    card: 'border-emerald-200 bg-emerald-50/40',
  },
  active: {
    ring: 'bg-blue-600 border-blue-600 animate-pulse',
    icon: 'text-white',
    line: 'bg-slate-200',
    label: 'text-blue-700',
    card: 'border-blue-200 bg-blue-50/50 shadow-sm',
  },
  pending: {
    ring: 'bg-white border-slate-300',
    icon: 'text-slate-400',
    line: 'bg-slate-200',
    label: 'text-slate-400',
    card: 'border-slate-100 bg-white',
  },
  failed: {
    ring: 'bg-red-500 border-red-500',
    icon: 'text-white',
    line: 'bg-red-200',
    label: 'text-red-700',
    card: 'border-red-200 bg-red-50/50',
  },
};

function StepIcon({ step }: { step: TimelineStep }) {
  const Icon = step.icon;
  if (step.status === 'completed') return <CheckCircle2 size={16} className="text-white" />;
  if (step.status === 'active') return <Loader2 size={16} className="text-white animate-spin" />;
  if (step.status === 'failed') return <XCircle size={16} className="text-white" />;
  return <Icon size={16} className="text-slate-400" />;
}

function buildTimeline(claim: any): TimelineStep[] {
  const status = claim?.status;
  const processingStep = claim?.processing_step;
  const errorStep = claim?.error_step;
  const submittedTime = claim?.submitted_at ? new Date(claim.submitted_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : undefined;
  const decidedTime = claim?.decided_at ? new Date(claim.decided_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : undefined;

  const isDecided = ['APPROVED', 'REJECTED'].includes(status);
  const isEscalated = status === 'ESCALATED';
  const isFailed = processingStep === 'failed';

  // Step order for processing_step field
  const STEP_ORDER = ['doc_verification', 'ai_damage', 'policy_verification', 'fraud_check', 'decision', 'completed'];

  const isStepDone = (stepId: string): boolean => {
    if (isDecided || processingStep === 'completed') return true;
    if (isFailed) {
      // Steps before the failed step are completed
      const failedIdx = STEP_ORDER.indexOf(errorStep ?? '');
      const stepIdx = STEP_ORDER.indexOf(stepId);
      if (failedIdx === -1 || stepIdx === -1) return false;
      return stepIdx < failedIdx;
    }
    const currentIdx = STEP_ORDER.indexOf(processingStep);
    const stepIdx = STEP_ORDER.indexOf(stepId);
    if (currentIdx === -1 || stepIdx === -1) return false;
    return stepIdx < currentIdx;
  };

  const isStepActive = (stepId: string): boolean => {
    if (isDecided || processingStep === 'completed' || isFailed) return false;
    return processingStep === stepId;
  };

  const isStepFailed = (stepId: string): boolean => {
    return isFailed && errorStep === stepId;
  };

  const steps: TimelineStep[] = [
    {
      id: 'submitted',
      label: 'Claim Submitted',
      description: 'Your claim has been received and logged in our system.',
      icon: FileText,
      status: 'completed',
      timestamp: submittedTime,
      detail: `Claim ${claim?.id} registered. All documents received.`,
    },
    {
      id: 'doc_verification',
      label: 'Document Verification',
      description: 'Verifying uploaded documents and signatures.',
      icon: ScanSearch,
      status: isStepFailed('doc_verification') ? 'failed'
        : isStepDone('doc_verification') ? 'completed'
        : isStepActive('doc_verification') ? 'active'
        : (status === 'SUBMITTED' && !processingStep ? 'active' : 'pending'),
      timestamp: submittedTime,
      detail: isStepFailed('doc_verification') ? undefined : `${claim?.documents_uploaded?.length || 0} documents verified.`,
    },
    {
      id: 'ai_damage',
      label: 'AI Damage Analysis',
      description: 'Analysing damage photographs using computer vision.',
      icon: Brain,
      status: isStepFailed('ai_damage') ? 'failed'
        : isStepDone('ai_damage') ? 'completed'
        : isStepActive('ai_damage') ? 'active'
        : 'pending',
      detail: isStepFailed('ai_damage') ? undefined : 'Damage assessment complete.',
    },
    {
      id: 'policy_verification',
      label: 'Policy Verification',
      description: 'Checking policy coverage, validity, and claim eligibility.',
      icon: ShieldCheck,
      status: isStepFailed('policy_verification') ? 'failed'
        : isStepDone('policy_verification') ? 'completed'
        : isStepActive('policy_verification') ? 'active'
        : 'pending',
      detail: isStepFailed('policy_verification') ? undefined : `Policy ${claim?.policy_number} verified.`,
    },
    {
      id: 'fraud_check',
      label: 'Fraud Check',
      description: 'Running fraud detection models and risk scoring.',
      icon: AlertTriangle,
      status: isStepFailed('fraud_check') ? 'failed'
        : isStepDone('fraud_check') ? 'completed'
        : isStepActive('fraud_check') ? 'active'
        : 'pending',
      detail: isStepFailed('fraud_check') ? undefined : (isEscalated ? 'Claim flagged for human review.' : 'Risk assessment complete.'),
    },
    {
      id: 'decision',
      label: 'Decision',
      description: 'Final decision by adjuster or automated pipeline.',
      icon: Gavel,
      status: isStepFailed('decision') ? 'failed'
        : isDecided ? 'completed' : isStepActive('decision') ? 'active'
        : isEscalated ? 'active' :'pending',
      timestamp: decidedTime,
      detail: isStepFailed('decision') ? undefined
        : isDecided ? `Decision: ${status}`
        : isEscalated ? 'Awaiting adjuster review.' :'Pending.',
    },
  ];

  return steps;
}

function getDecisionInfo(claim: any) {
  const status = claim?.status;
  const processingStep = claim?.processing_step;
  const errorMessage = claim?.error_message;
  const errorStep = claim?.error_step;

  // Pipeline failed — show error state
  if (processingStep === 'failed') {
    const stepLabels: Record<string, string> = {
      doc_verification: 'Document Verification',
      ai_damage: 'AI Damage Analysis',
      policy_verification: 'Policy Verification',
      fraud_check: 'Fraud Check',
      decision: 'Decision',
      unknown: 'Processing',
    };
    const stepLabel = stepLabels[errorStep ?? 'unknown'] ?? 'Processing';
    return {
      decision: 'Processing Error',
      plainReason: errorMessage
        ? `The pipeline encountered an error during "${stepLabel}": ${errorMessage}. Please try resubmitting your claim or contact support if the issue persists.`
        : `The pipeline encountered an unexpected error during "${stepLabel}". Please try resubmitting your claim or contact support.`,
      color: 'error' as const,
    };
  }

  if (status === 'APPROVED') {
    return {
      decision: 'Approved',
      plainReason: claim?.adjuster_note || 'Great news! Your claim has been approved. The settlement amount will be processed within 3–5 business days.',
      color: 'emerald' as const,
    };
  }
  if (status === 'REJECTED') {
    return {
      decision: 'Not Approved',
      plainReason: claim?.adjuster_note || 'Your claim could not be approved at this time. Please contact our support team for more information.',
      color: 'red' as const,
    };
  }
  if (status === 'ESCALATED') {
    return {
      decision: 'Under Review',
      plainReason: 'Your claim is being reviewed by our team. We will notify you once a decision has been made. This typically takes 1–2 business days.',
      color: 'amber' as const,
    };
  }
  return {
    decision: 'Processing',
    plainReason: 'Your claim is currently being processed by our AI pipeline. This usually takes a few minutes.',
    color: 'amber' as const,
  };
}

export default function ClaimStatusPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [claim, setClaim] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchLatestClaim = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('claims')
      .select('*')
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setClaim(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    fetchLatestClaim();

    // Real-time subscription for live updates
    const channel = supabase
      .channel('claim_status_live')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'claims', filter: `user_id=eq.${user.id}` }, (payload) => {
        setClaim(payload.new);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const steps = claim ? buildTimeline(claim) : [];
  const isFailed = claim?.processing_step === 'failed';
  const completedCount = steps.filter(s => s.status === 'completed').length;
  const totalSteps = steps.length;
  const progressPct = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
  const currentStep = steps.find(s => s.status === 'active') ?? steps.find(s => s.status === 'failed') ?? steps[steps.length - 1];
  const decisionInfo = claim ? getDecisionInfo(claim) : null;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 size={32} className="animate-spin text-blue-500" />
        </div>
      </AppLayout>
    );
  }

  if (!claim) {
    return (
      <AppLayout>
        <div className="p-6 max-w-3xl mx-auto text-center py-16">
          <FileText size={40} className="text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-700 mb-2">No Claims Found</h2>
          <p className="text-slate-500 text-sm mb-6">You haven&apos;t filed any claims yet.</p>
          <Link href="/file-claim" className="btn-primary inline-flex gap-2">File a Claim</Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/claimant-dashboard" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">My Dashboard</Link>
              <ChevronRight size={12} className="text-slate-300" />
              <span className="text-xs text-slate-600 font-medium">Claim Status</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Claim Status</h1>
            <p className="text-sm text-slate-500 mt-0.5 font-mono">{claim.id}</p>
          </div>
          <button onClick={fetchLatestClaim} className="btn-secondary gap-2 text-xs">
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>

        {/* Error Banner — shown when pipeline failed */}
        {isFailed && (
          <div className="rounded-xl border-2 border-red-300 bg-red-50 p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
              <XCircle size={20} className="text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-red-800 mb-0.5">Pipeline Error</p>
              <p className="text-sm text-red-700 leading-relaxed break-words">
                {claim.error_message ?? 'An unexpected error occurred during processing.'}
              </p>
              {claim.error_step && (
                <p className="text-xs text-red-500 mt-1.5 font-mono">
                  Failed at step: <span className="font-semibold">{claim.error_step}</span>
                </p>
              )}
            </div>
            <Link
              href="/file-claim"
              className="shrink-0 text-xs font-semibold text-red-700 border border-red-300 rounded-lg px-3 py-1.5 hover:bg-red-100 transition-colors"
            >
              Resubmit
            </Link>
          </div>
        )}

        {/* Progress bar */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-700">Processing Progress</p>
            <span className={`text-sm font-bold ${isFailed ? 'text-red-600' : 'text-blue-600'}`}>{completedCount}/{totalSteps} steps</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-700 ${isFailed ? 'bg-gradient-to-r from-red-400 to-red-500' : 'bg-gradient-to-r from-blue-500 to-blue-600'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-slate-500">
              {isFailed ? (
                <span className="flex items-center gap-1.5 text-red-600 font-medium">
                  <XCircle size={11} />
                  Failed at: <span className="font-semibold">{currentStep?.label}</span>
                </span>
              ) : currentStep?.status === 'active' ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 size={11} className="animate-spin text-blue-500" />
                  Currently: <span className="font-medium text-blue-600">{currentStep.label}</span>
                </span>
              ) : (
                <span className="text-emerald-600 font-medium">All steps complete</span>
              )}
            </p>
            <p className="text-xs font-semibold text-slate-600">{progressPct}%</p>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-5">Processing Timeline</h2>
          <div className="space-y-0">
            {steps.map((step, idx) => {
              const conf = statusConfig[step.status];
              const isLast = idx === steps.length - 1;
              return (
                <div key={step.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0 ${conf.ring}`}>
                      <StepIcon step={step} />
                    </div>
                    {!isLast && <div className={`w-0.5 flex-1 my-1 min-h-[24px] ${conf.line}`} />}
                  </div>
                  <div className={`flex-1 mb-4 rounded-xl border p-4 ${conf.card}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className={`text-sm font-semibold ${conf.label}`}>{step.label}</p>
                          {step.status === 'completed' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Done</span>}
                          {step.status === 'active' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 animate-pulse">In Progress</span>}
                          {step.status === 'failed' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">Failed</span>}
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">{step.description}</p>
                        {/* Show error message inline on the failed step */}
                        {step.status === 'failed' && claim?.error_message && (
                          <p className="text-xs text-red-600 mt-1.5 font-medium leading-relaxed break-words">
                            {claim.error_message}
                          </p>
                        )}
                        {step.detail && step.status !== 'pending' && step.status !== 'failed' && (
                          <p className="text-xs text-slate-600 mt-1.5 font-medium">{step.detail}</p>
                        )}
                      </div>
                      {step.timestamp && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Clock size={11} className="text-slate-400" />
                          <span className="text-[11px] text-slate-400 font-mono">{step.timestamp}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Decision / Status Card */}
        {decisionInfo && (
          <div className={`rounded-xl border-2 p-5 ${
            decisionInfo.color === 'error' ? 'border-red-300 bg-red-50'
              : decisionInfo.color === 'amber' ? 'border-amber-200 bg-amber-50'
              : decisionInfo.color === 'emerald'? 'border-emerald-200 bg-emerald-50' :'border-red-200 bg-red-50'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                decisionInfo.color === 'error' ? 'bg-red-100'
                  : decisionInfo.color === 'amber' ? 'bg-amber-100'
                  : decisionInfo.color === 'emerald'? 'bg-emerald-100' :'bg-red-100'
              }`}>
                {decisionInfo.color === 'error' ? <XCircle size={20} className="text-red-600" />
                  : decisionInfo.color === 'amber' ? <Clock size={20} className="text-amber-600" />
                  : decisionInfo.color === 'emerald' ? <CheckCircle2 size={20} className="text-emerald-600" />
                  : <AlertTriangle size={20} className="text-red-600" />}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-bold mb-1 ${
                  decisionInfo.color === 'error' ? 'text-red-800'
                    : decisionInfo.color === 'amber' ? 'text-amber-800'
                    : decisionInfo.color === 'emerald'? 'text-emerald-800' :'text-red-800'
                }`}>
                  {decisionInfo.color === 'error' ? '⚠ ' : ''}{decisionInfo.decision}
                </p>
                <p className={`text-sm leading-relaxed ${
                  decisionInfo.color === 'error' ? 'text-red-700'
                    : decisionInfo.color === 'amber' ? 'text-amber-700'
                    : decisionInfo.color === 'emerald'? 'text-emerald-700' :'text-red-700'
                }`}>
                  {decisionInfo.plainReason}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
