'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import FraudScoreGauge from '@/components/ui/FraudScoreGauge';
import AppImage from '@/components/ui/AppImage';
import { useAuth } from '@/contexts/AuthContext';
import {
  CheckCircle, XCircle, AlertTriangle, FileText, MapPin,
  Calendar, User, Shield, ChevronDown, ChevronUp, Loader2,
  Brain, TrendingUp, AlertOctagon, CheckSquare, Info, Zap,
} from 'lucide-react';

interface Props {
  claim: any;
  onDecision: (claimId: string, decision: 'APPROVED' | 'REJECTED') => void;
}

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

const DOC_LABELS: Record<string, string> = {
  rc_book: 'RC Book', fir_copy: 'FIR Copy', repair_estimate: 'Repair Estimate',
  driving_license: 'Driving License', hospital_bill: 'Hospital Bill',
  discharge_summary: 'Discharge Summary', prescription: 'Prescription',
};

function ScoreBar({ label, score, colorClass }: { label: string; score: number; colorClass: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-500">{label}</span>
        <span className={`text-xs font-bold tabular-nums ${colorClass}`}>{(score * 100).toFixed(0)}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full transition-all ${colorClass.replace('text-', 'bg-')}`} style={{ width: `${score * 100}%` }} />
      </div>
    </div>
  );
}

export default function EscalationDetail({ claim, onDecision }: Props) {
  const { user, profile } = useAuth();
  const supabase = createClient();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({});
  const [showGeminiDetails, setShowGeminiDetails] = useState(true);

  const adjusterName = profile?.full_name || user?.user_metadata?.full_name || 'Adjuster';
  const claimantName = claim.user_profiles?.full_name || claim.claimant || 'Unknown';
  const claimantEmail = claim.user_profiles?.email || claim.claimantEmail || '';
  const ocrExtracted = typeof claim.ocr_extracted === 'object' ? claim.ocr_extracted : {};
  const documentsUploaded: string[] = claim.documents_uploaded || [];
  const rulesPassed: string[] = claim.rules_triggered || [];
  const rulesFailed: string[] = claim.rules_failed || [];

  // Derive Gemini-specific scores from claim fields
  const fraudScore = claim.fraud_score || 0;
  const confidenceScore = claim.confidence_score || 0;
  // Policy compliance is inferred: if rules_failed has items, compliance is lower
  const policyComplianceScore = rulesFailed.length > 0
    ? Math.max(0.3, 1 - rulesFailed.length * 0.2)
    : rulesPassed.length > 0 ? 0.85 : 0.6;

  // STP status
  const stpStatus = claim.stp_status || (fraudScore < 0.3 && policyComplianceScore > 0.7 ? 'STP' : 'Manual');

  const handleApprove = async () => {
    setApproving(true);
    const { error } = await supabase
      .from('claims')
      .update({
        status: 'APPROVED',
        decided_at: new Date().toISOString(),
        decided_by: adjusterName,
        adjuster_id: user?.id,
      })
      .eq('id', claim.id);

    if (!error) {
      await supabase.from('audit_log').insert({
        claim_id: claim.id,
        claimant_name: claimantName,
        claimant_email: claimantEmail,
        policy_type: claim.policy_type,
        claim_type: claim.claim_type,
        claimed_amount: claim.claimed_amount,
        decision: 'APPROVED',
        decided_by: adjusterName,
        adjuster_id: user?.id,
        fraud_score: claim.fraud_score,
        confidence_score: claim.confidence_score,
        rules_triggered: claim.rules_triggered || [],
        rules_failed: claim.rules_failed || [],
        processing_time_sec: claim.processing_time_sec,
        rejection_reason: null,
        timestamp: new Date().toISOString(),
      });

      if (claimantEmail) {
        supabase.functions.invoke('send-claim-notification', {
          body: {
            claimId: claim.id, claimantName, claimantEmail,
            status: 'APPROVED', policyNumber: claim.policy_number,
            claimedAmount: claim.claimed_amount,
          },
        }).catch(() => {});
      }

      toast.success(`Claim ${claim.id} approved`, { description: `Payout: ${formatINR(claim.claimed_amount)}` });
      onDecision(claim.id, 'APPROVED');
    } else {
      toast.error('Failed to approve claim');
    }
    setApproving(false);
  };

  const handleReject = async () => {
    if (rejectReason.trim().length < 10) {
      toast.error('Rejection reason must be at least 10 characters');
      return;
    }
    setRejecting(true);
    const { error } = await supabase
      .from('claims')
      .update({
        status: 'REJECTED',
        decided_at: new Date().toISOString(),
        decided_by: adjusterName,
        adjuster_id: user?.id,
        adjuster_note: rejectReason.trim(),
      })
      .eq('id', claim.id);

    if (!error) {
      await supabase.from('audit_log').insert({
        claim_id: claim.id,
        claimant_name: claimantName,
        claimant_email: claimantEmail,
        policy_type: claim.policy_type,
        claim_type: claim.claim_type,
        claimed_amount: claim.claimed_amount,
        decision: 'REJECTED',
        decided_by: adjusterName,
        adjuster_id: user?.id,
        fraud_score: claim.fraud_score,
        confidence_score: claim.confidence_score,
        rules_triggered: claim.rules_triggered || [],
        rules_failed: claim.rules_failed || [],
        processing_time_sec: claim.processing_time_sec,
        rejection_reason: rejectReason.trim(),
        timestamp: new Date().toISOString(),
      });

      if (claimantEmail) {
        supabase.functions.invoke('send-claim-notification', {
          body: {
            claimId: claim.id, claimantName, claimantEmail,
            status: 'REJECTED', policyNumber: claim.policy_number,
            claimedAmount: claim.claimed_amount, reason: rejectReason.trim(),
          },
        }).catch(() => {});
      }

      toast.error(`Claim ${claim.id} rejected`, { description: `Reason: "${rejectReason.trim().slice(0, 60)}"` });
      setShowRejectModal(false);
      setRejectReason('');
      onDecision(claim.id, 'REJECTED');
    } else {
      toast.error('Failed to reject claim');
    }
    setRejecting(false);
  };

  const toggleDoc = (docKey: string) => setExpandedDocs(prev => ({ ...prev, [docKey]: !prev[docKey] }));

  return (
    <div className="slide-in-right space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-semibold text-slate-900">{claimantName}</h2>
              <span className="status-badge bg-amber-50 text-amber-700 border border-amber-200">
                <AlertTriangle size={10} />Escalated
              </span>
            </div>
            <p className="text-sm font-mono text-slate-400">{claim.id} · {claim.policy_number}</p>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
              <span className="flex items-center gap-1"><User size={12} />{claimantEmail}</span>
              <span className="flex items-center gap-1"><Shield size={12} />{claim.policy_type} Insurance</span>
              {claim.location && <span className="flex items-center gap-1"><MapPin size={12} />{claim.location}</span>}
              {claim.incident_date && <span className="flex items-center gap-1"><Calendar size={12} />Incident: {claim.incident_date}</span>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums text-slate-900">{formatINR(claim.claimed_amount)}</p>
            <p className="text-xs text-slate-400 capitalize">{claim.claim_type?.replace('_', ' ')} claim</p>
          </div>
        </div>
        {claim.escalation_reason && (
          <div className="mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-amber-800 mb-1">AI Escalation Reason</p>
                <p className="text-sm text-amber-700">{claim.escalation_reason}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── ADMIN-ONLY: Full Gemini AI Analysis Panel ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowGeminiDetails(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Brain size={16} className="text-purple-600" />
            <span className="text-sm font-semibold text-slate-800">Gemini AI Analysis Report</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">Admin Only</span>
          </div>
          {showGeminiDetails ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </button>

        {showGeminiDetails && (
          <div className="px-5 pb-5 space-y-5 border-t border-slate-100">
            {/* Score grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              {/* Fraud Score */}
              <div className="flex flex-col items-center p-4 rounded-xl bg-slate-50 border border-slate-200">
                <FraudScoreGauge score={fraudScore} size="lg" />
                <p className="text-xs font-semibold text-slate-600 mt-2">Fraud Score</p>
                <p className={`text-lg font-bold tabular-nums ${fraudScore > 0.7 ? 'text-red-600' : fraudScore > 0.4 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {(fraudScore * 100).toFixed(0)}%
                </p>
              </div>

              {/* Policy Compliance */}
              <div className="flex flex-col items-center p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-2" style={{
                  background: `conic-gradient(${policyComplianceScore > 0.7 ? '#10b981' : policyComplianceScore > 0.5 ? '#f59e0b' : '#ef4444'} ${policyComplianceScore * 360}deg, #e2e8f0 0deg)`
                }}>
                  <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center">
                    <Shield size={18} className={policyComplianceScore > 0.7 ? 'text-emerald-600' : policyComplianceScore > 0.5 ? 'text-amber-600' : 'text-red-600'} />
                  </div>
                </div>
                <p className="text-xs font-semibold text-slate-600">Policy Compliance</p>
                <p className={`text-lg font-bold tabular-nums ${policyComplianceScore > 0.7 ? 'text-emerald-600' : policyComplianceScore > 0.5 ? 'text-amber-600' : 'text-red-600'}`}>
                  {(policyComplianceScore * 100).toFixed(0)}%
                </p>
              </div>

              {/* Confidence */}
              <div className="flex flex-col items-center p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-2" style={{
                  background: `conic-gradient(#6366f1 ${confidenceScore * 360}deg, #e2e8f0 0deg)`
                }}>
                  <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center">
                    <TrendingUp size={18} className="text-indigo-600" />
                  </div>
                </div>
                <p className="text-xs font-semibold text-slate-600">AI Confidence</p>
                <p className="text-lg font-bold tabular-nums text-indigo-600">{(confidenceScore * 100).toFixed(0)}%</p>
              </div>
            </div>

            {/* Score bars */}
            <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-semibold text-slate-600 mb-3">Score Breakdown</p>
              <ScoreBar label="Combined Fraud Score" score={fraudScore} colorClass={fraudScore > 0.7 ? 'text-red-600' : fraudScore > 0.4 ? 'text-amber-600' : 'text-emerald-600'} />
              <ScoreBar label="Policy Compliance" score={policyComplianceScore} colorClass={policyComplianceScore > 0.7 ? 'text-emerald-600' : policyComplianceScore > 0.5 ? 'text-amber-600' : 'text-red-600'} />
              <ScoreBar label="AI Confidence" score={confidenceScore} colorClass="text-indigo-600" />
            </div>

            {/* ML Model Risk Band */}
            {claim.fraud_score !== null && (
              <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white">
                <Zap size={16} className="text-amber-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-slate-700">ML Fraud Model Risk Band</p>
                  <p className="text-[10px] text-slate-400">Random Forest heuristic model (fraudModel.ts)</p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  fraudScore > 0.65 ? 'bg-red-100 text-red-700' :
                  fraudScore > 0.30 ? 'bg-amber-100 text-amber-700': 'bg-emerald-100 text-emerald-700'
                }`}>
                  {fraudScore > 0.65 ? 'HIGH RISK' : fraudScore > 0.30 ? 'MEDIUM RISK' : 'LOW RISK'}
                </span>
              </div>
            )}

            {/* Fraud Flags */}
            {rulesFailed.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <AlertOctagon size={14} className="text-red-600" />
                  <p className="text-xs font-semibold text-red-800">Fraud / Compliance Flags</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {rulesFailed.map((flag: string) => (
                    <span key={`flag-${flag}`} className="text-[10px] px-2 py-1 rounded-full bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                      <XCircle size={9} />
                      {flag.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Rules Passed */}
            {rulesPassed.length > 0 && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <CheckSquare size={14} className="text-emerald-600" />
                  <p className="text-xs font-semibold text-emerald-800">Rules Passed</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {rulesPassed.map((rule: string) => (
                    <span key={`rule-${rule}`} className="text-[10px] px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle size={9} />
                      {rule.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Processing metadata */}
            {claim.processing_time_sec && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Info size={12} />
                <span>AI pipeline completed in {claim.processing_time_sec}s</span>
              </div>
            )}

            {/* ── AI Assessment card (matches reference image) ── */}
            {(claim.gemini_summary || claim.estimated_cost_inr) && (
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-800">AI Assessment</p>
                  {confidenceScore > 0 && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                      {(confidenceScore * 100).toFixed(0)}% Confidence
                    </span>
                  )}
                </div>
                <div className="p-4 space-y-4">
                  {/* Summary */}
                  {claim.gemini_summary && (
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">SUMMARY</p>
                      <p className="text-sm text-slate-700 leading-relaxed italic">&ldquo;{claim.gemini_summary}&rdquo;</p>
                    </div>
                  )}

                  {/* Est. Damage + STP Status */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                      <p className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wide mb-1">EST. DAMAGE</p>
                      <p className="text-xl font-bold text-indigo-800 tabular-nums">
                        {claim.estimated_cost_inr
                          ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(claim.estimated_cost_inr)
                          : '—'}
                      </p>
                    </div>
                    <div className={`p-3 rounded-xl border ${stpStatus === 'STP' ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                      <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${stpStatus === 'STP' ? 'text-emerald-600' : 'text-amber-600'}`}>STP STATUS</p>
                      <p className={`text-xl font-bold ${stpStatus === 'STP' ? 'text-emerald-700' : 'text-amber-700'}`}>{stpStatus}</p>
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
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Damage Photo */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Damage / Evidence Photo</h3>
          {claim.damage_photo ? (
            <div className="rounded-lg overflow-hidden border border-slate-100">
              <AppImage src={claim.damage_photo} alt={`Damage evidence for claim ${claim.id}`} width={400} height={240} className="w-full object-cover" />
            </div>
          ) : (
            <div className="h-40 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center">
              <p className="text-xs text-slate-400">No damage photo uploaded</p>
            </div>
          )}
          {claim.description && (
            <div className="mt-3 p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 font-medium mb-1">Incident Description</p>
              <p className="text-sm text-slate-700 leading-relaxed">{claim.description}</p>
            </div>
          )}
        </div>

        {/* Documents with OCR */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            Uploaded Documents
            <span className="ml-2 text-xs font-normal text-slate-400">{documentsUploaded.length} files</span>
          </h3>
          {documentsUploaded.length === 0 ? (
            <p className="text-xs text-slate-400">No documents uploaded</p>
          ) : (
            <div className="space-y-2">
              {documentsUploaded.map((docKey: string) => {
                const extracted = ocrExtracted[docKey];
                const isExpanded = expandedDocs[docKey];
                return (
                  <div key={`doc-${docKey}`} className="border border-slate-200 rounded-lg overflow-hidden">
                    <button onClick={() => toggleDoc(docKey)} className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-2">
                        <FileText size={13} className="text-blue-600" />
                        <span className="text-xs font-semibold text-slate-700">{DOC_LABELS[docKey] ?? docKey}</span>
                        {extracted
                          ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">OCR ✓</span>
                          : <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">No OCR</span>
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
      </div>

      {/* Action Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-700">Adjuster Decision Required</p>
            <p className="text-xs text-slate-400 mt-0.5">Your decision will be logged in the audit trail with your name and timestamp.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowRejectModal(true)} className="btn-danger" disabled={approving}>
              <XCircle size={16} />Reject
            </button>
            <button onClick={handleApprove} disabled={approving || rejecting} className="btn-success">
              {approving ? <><Loader2 size={16} className="animate-spin" />Approving…</> : <><CheckCircle size={16} />Approve</>}
            </button>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Reject Claim</h3>
            <p className="text-sm text-slate-500 mb-4">Provide a clear reason for rejection. This will be recorded in the audit log.</p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason (min 10 characters)…"
              className="input-field min-h-[100px] resize-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => { setShowRejectModal(false); setRejectReason(''); }} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleReject} disabled={rejecting} className="btn-danger flex-1">
                {rejecting ? <><Loader2 size={14} className="animate-spin" />Rejecting…</> : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}