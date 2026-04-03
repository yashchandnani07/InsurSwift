'use client';

import React, { useState } from 'react';
import StatusBadge from '@/components/ui/StatusBadge';

import AppImage from '@/components/ui/AppImage';
import { X, User, Shield, MapPin, Calendar, FileText, Clock, CheckCircle, AlertTriangle, XCircle, ChevronRight, ChevronDown, ChevronUp, Brain, Zap,  } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


interface Props {
  claim: any; // Supabase snake_case row + user_profiles join
  onClose: () => void;
}

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function formatDT(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const TIMELINE_STEPS = [
  { key: 'submitted', label: 'Claim Submitted', icon: FileText },
  { key: 'doc_verification', label: 'Document Verification', icon: CheckCircle },
  { key: 'damage_analysis', label: 'AI Damage Analysis', icon: Shield },
  { key: 'policy_verification', label: 'Policy Verification', icon: CheckCircle },
  { key: 'fraud_check', label: 'Fraud Check', icon: AlertTriangle },
  { key: 'decision', label: 'Decision', icon: ChevronRight },
];

const DOC_LABELS: Record<string, string> = {
  rc_book: 'RC Book',
  fir_copy: 'FIR Copy',
  repair_estimate: 'Repair Estimate',
  driving_license: 'Driving License',
  hospital_bill: 'Hospital Bill',
  discharge_summary: 'Discharge Summary',
  prescription: 'Prescription',
};

function ScoreRing({ score, color }: { score: number; color: string }) {
  const deg = score * 360;
  return (
    <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{
      background: `conic-gradient(${color} ${deg}deg, #e2e8f0 0deg)`,
    }}>
      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
        <span className="text-xs font-bold" style={{ color }}>{(score * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}

export default function ClaimDetailDrawer({ claim, onClose }: Props) {
  const [showAI, setShowAI] = useState(true);
  const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({});

  // Supabase returns snake_case — map correctly
  const claimantName = claim.user_profiles?.full_name || '—';
  const claimantEmail = claim.user_profiles?.email || '—';
  const fraudScore: number = claim.fraud_score ?? 0;
  const confidenceScore: number = claim.confidence_score ?? 0;
  const rulesPassed: string[] = claim.rules_triggered || [];
  const rulesFailed: string[] = claim.rules_failed || [];
  const ocrExtracted: Record<string, Record<string, string>> = typeof claim.ocr_extracted === 'object' ? claim.ocr_extracted ?? {} : {};
  const documentsUploaded: string[] = claim.documents_uploaded || [];

  // Policy compliance derived from rules
  const policyComplianceScore = rulesFailed.length > 0
    ? Math.max(0.2, 1 - rulesFailed.length * 0.2)
    : rulesPassed.length > 0 ? 0.85 : 0.6;

  const isCompleted = (stepIndex: number) => {
    if (claim.status === 'PROCESSING') return stepIndex < 2;
    return true;
  };
  const isActive = (stepIndex: number) => {
    if (claim.status === 'PROCESSING') return stepIndex === 2;
    return stepIndex === TIMELINE_STEPS.length - 1;
  };

  const toggleDoc = (key: string) => setExpandedDocs(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-white shadow-2xl flex flex-col slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-blue-600">{claim.id}</span>
              <StatusBadge status={claim.status} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{claimantName} · {claim.policy_number}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-200 transition-colors">
            <X size={16} className="text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5 space-y-5">

          {/* Key info grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-1">Claimed Amount</p>
              <p className="text-lg font-bold tabular-nums text-slate-900">{formatINR(claim.claimed_amount)}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-1">Claim Type</p>
              <p className="text-sm font-semibold text-slate-800 capitalize">{(claim.claim_type || '').replace(/_/g, ' ')}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><User size={10} />Claimant</p>
              <p className="text-sm font-medium text-slate-800">{claimantName}</p>
              <p className="text-xs text-slate-400 truncate">{claimantEmail}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Shield size={10} />Policy</p>
              <p className="text-sm font-medium text-slate-800 capitalize">{claim.policy_type} Insurance</p>
              <p className="text-xs font-mono text-slate-400">{claim.policy_number}</p>
            </div>
            {claim.location && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><MapPin size={10} />Location</p>
                <p className="text-sm font-medium text-slate-700">{claim.location}</p>
              </div>
            )}
            {claim.incident_date && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Calendar size={10} />Incident Date</p>
                <p className="text-sm font-medium text-slate-700">{claim.incident_date}</p>
              </div>
            )}
          </div>

          {/* Description */}
          {claim.description && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Incident Description</p>
              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-3">{claim.description}</p>
            </div>
          )}

          {/* ── AI Assessment Panel (matches reference image) ── */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              onClick={() => setShowAI(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Brain size={15} className="text-purple-600" />
                <span className="text-sm font-semibold text-slate-800">AI Assessment</span>
                {confidenceScore > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {(confidenceScore * 100).toFixed(0)}% Confidence
                  </span>
                )}
              </div>
              {showAI ? <ChevronUp size={13} className="text-slate-400" /> : <ChevronDown size={13} className="text-slate-400" />}
            </button>

            {showAI && (
              <div className="px-4 pb-4 space-y-4 border-t border-slate-100">
                {/* Summary */}
                {claim.gemini_summary && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">SUMMARY</p>
                    <p className="text-sm text-slate-700 leading-relaxed italic">&ldquo;{claim.gemini_summary}&rdquo;</p>
                  </div>
                )}

                {/* Est. Damage + STP Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                    <p className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wide mb-1">EST. DAMAGE</p>
                    <p className="text-xl font-bold text-indigo-800 tabular-nums">
                      {claim.estimated_cost_inr ? formatINR(claim.estimated_cost_inr) : '—'}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl border ${claim.stp_status === 'STP' ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                    <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${claim.stp_status === 'STP' ? 'text-emerald-600' : 'text-amber-600'}`}>STP STATUS</p>
                    <p className={`text-xl font-bold ${claim.stp_status === 'STP' ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {claim.stp_status || 'Manual'}
                    </p>
                  </div>
                </div>

                {/* Fraud Risk + Policy Fit */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">FRAUD RISK</p>
                      <Shield size={12} className="text-slate-400" />
                    </div>
                    <p className={`text-2xl font-bold tabular-nums ${fraudScore > 0.6 ? 'text-red-600' : fraudScore > 0.3 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {(fraudScore * 100).toFixed(0)}%
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                      {fraudScore < 0.3 ? 'No obvious signs of fraud.' : fraudScore < 0.6 ? 'Some risk indicators present.' : 'High fraud risk detected.'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">POLICY FIT</p>
                      <FileText size={12} className="text-slate-400" />
                    </div>
                    <p className={`text-2xl font-bold tabular-nums ${policyComplianceScore > 0.7 ? 'text-emerald-600' : policyComplianceScore > 0.5 ? 'text-amber-600' : 'text-red-600'}`}>
                      {(policyComplianceScore * 100).toFixed(0)}%
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                      {policyComplianceScore > 0.7 ? 'Claim covered under policy.' : policyComplianceScore > 0.5 ? 'Partial coverage issues.' : 'Policy compliance concerns.'}
                    </p>
                  </div>
                </div>

                {/* Severity + ML Risk Band */}
                {(claim.severity || fraudScore > 0) && (
                  <div className="flex items-center gap-3">
                    {claim.severity && (
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                        claim.severity === 'HIGH' ? 'bg-red-100 text-red-700' :
                        claim.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {claim.severity} Severity
                      </span>
                    )}
                    <span className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 ${
                      fraudScore > 0.65 ? 'bg-red-100 text-red-700' :
                      fraudScore > 0.30 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      <Zap size={10} />
                      {fraudScore > 0.65 ? 'HIGH RISK' : fraudScore > 0.30 ? 'MEDIUM RISK' : 'LOW RISK'}
                    </span>
                    {claim.gemini_recommendation && (
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                        claim.gemini_recommendation === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        AI: {claim.gemini_recommendation}
                      </span>
                    )}
                  </div>
                )}

                {/* Rules */}
                {(rulesPassed.length > 0 || rulesFailed.length > 0) && (
                  <div>
                    <p className="text-xs text-slate-500 mb-2 font-medium">Rules Check</p>
                    <div className="flex flex-wrap gap-1.5">
                      {rulesPassed.map(r => (
                        <span key={`pass-${r}`} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                          ✓ {r.replace(/_/g, ' ')}
                        </span>
                      ))}
                      {rulesFailed.map(r => (
                        <span key={`fail-${r}`} className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100">
                          ✗ {r.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Escalation reason */}
                {claim.escalation_reason && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1">
                      <AlertTriangle size={11} />Escalation Reason
                    </p>
                    <p className="text-xs text-amber-700">{claim.escalation_reason}</p>
                  </div>
                )}

                {/* Adjuster note */}
                {claim.adjuster_note && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs font-semibold text-red-700 mb-1 flex items-center gap-1">
                      <XCircle size={11} />Adjuster Note
                    </p>
                    <p className="text-xs text-red-700">{claim.adjuster_note}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* EVIDENCE PHOTOS section */}
          {claim.damage_photo && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Evidence Photos</p>
              <div className="rounded-xl overflow-hidden border border-slate-200">
                <AppImage
                  src={claim.damage_photo}
                  alt={`Evidence photo for claim ${claim.id} — ${claim.claim_type} at ${claim.location}`}
                  width={480}
                  height={240}
                  className="w-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Processing Timeline */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Processing Timeline</p>
            <div className="space-y-0">
              {TIMELINE_STEPS.map((step, i) => {
                const done = isCompleted(i);
                const active = isActive(i);
                const Icon = step.icon;
                return (
                  <div key={`timeline-${step.key}`} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                        done ? 'bg-emerald-100 text-emerald-600' : active ?'bg-blue-100 text-blue-600 ring-2 ring-blue-300' :'bg-slate-100 text-slate-400'
                      }`}>
                        {active ? <Clock size={13} className="animate-pulse" />
                          : done ? <CheckCircle size={13} />
                          : <Icon size={13} />}
                      </div>
                      {i < TIMELINE_STEPS.length - 1 && (
                        <div className={`w-0.5 h-5 mt-0.5 ${done ? 'bg-emerald-200' : 'bg-slate-100'}`} />
                      )}
                    </div>
                    <div className="pb-4 pt-1">
                      <p className={`text-sm font-medium ${done ? 'text-slate-800' : active ? 'text-blue-700' : 'text-slate-400'}`}>
                        {step.label}
                      </p>
                      {i === TIMELINE_STEPS.length - 1 && done && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {claim.decided_at ? formatDT(claim.decided_at) : 'Pending human review'}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Documents with OCR */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Uploaded Documents ({documentsUploaded.length})
            </p>
            {documentsUploaded.length === 0 ? (
              <p className="text-xs text-slate-400">No documents uploaded</p>
            ) : (
              <div className="space-y-1.5">
                {documentsUploaded.map(docKey => {
                  const extracted = ocrExtracted[docKey];
                  const isExpanded = expandedDocs[docKey];
                  return (
                    <div key={`doc-${docKey}`} className="border border-slate-200 rounded-lg overflow-hidden">
                      <button onClick={() => toggleDoc(docKey)} className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors">
                        <div className="flex items-center gap-2">
                          <FileText size={13} className="text-blue-600" />
                          <span className="text-xs font-medium text-slate-700">{DOC_LABELS[docKey] ?? docKey}</span>
                          {extracted
                            ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">OCR ✓</span>
                            : <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">Uploaded</span>
                          }
                        </div>
                        {isExpanded ? <ChevronUp size={12} className="text-slate-400" /> : <ChevronDown size={12} className="text-slate-400" />}
                      </button>
                      {isExpanded && extracted && (
                        <div className="px-3 py-2 space-y-1.5 bg-white">
                          {Object.entries(extracted).map(([field, value]) => (
                            <div key={`ocr-${docKey}-${field}`} className="flex items-start justify-between gap-2">
                              <span className="text-[10px] text-slate-400 shrink-0">{field.replace(/_/g, ' ')}</span>
                              <span className="text-xs font-mono text-slate-700 text-right">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Timestamps */}
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1"><Clock size={11} />Submitted: {formatDT(claim.submitted_at)}</span>
              {claim.decided_at && (
                <span className="flex items-center gap-1"><CheckCircle size={11} />Decided: {formatDT(claim.decided_at)}</span>
              )}
            </div>
            {claim.decided_by && <p className="text-xs text-slate-400 mt-1">Decided by: {claim.decided_by}</p>}
            {claim.processing_time_sec && <p className="text-xs text-slate-400 mt-0.5">AI pipeline: {claim.processing_time_sec}s</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-4 bg-slate-50">
          <button onClick={onClose} className="btn-secondary w-full justify-center">Close</button>
        </div>
      </div>
    </>
  );
}