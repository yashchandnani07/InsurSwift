import React from 'react';
import { CheckCircle, Clock, XCircle, AlertTriangle, Loader2, FileCheck } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


type ClaimStatus = 'APPROVED' | 'REJECTED' | 'ESCALATED' | 'PROCESSING' | 'SUBMITTED' | 'PENDING_REVIEW';

const config: Record<ClaimStatus, { label: string; classes: string; icon: React.ElementType }> = {
  APPROVED: { label: 'Approved', classes: 'bg-emerald-50 text-emerald-700 border border-emerald-200', icon: CheckCircle },
  REJECTED: { label: 'Rejected', classes: 'bg-red-50 text-red-700 border border-red-200', icon: XCircle },
  ESCALATED: { label: 'Escalated', classes: 'bg-amber-50 text-amber-700 border border-amber-200', icon: AlertTriangle },
  PROCESSING: { label: 'Processing', classes: 'bg-blue-50 text-blue-700 border border-blue-200', icon: Loader2 },
  SUBMITTED: { label: 'Submitted', classes: 'bg-slate-100 text-slate-600 border border-slate-200', icon: FileCheck },
  PENDING_REVIEW: { label: 'Pending Review', classes: 'bg-purple-50 text-purple-700 border border-purple-200', icon: Clock },
};

export default function StatusBadge({ status }: { status: ClaimStatus }) {
  const { label, classes, icon: Icon } = config[status] ?? config.SUBMITTED;
  return (
    <span className={`status-badge ${classes}`}>
      <Icon size={11} className={status === 'PROCESSING' ? 'animate-spin' : ''} />
      {label}
    </span>
  );
}