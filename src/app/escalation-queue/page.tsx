import React from 'react';
import AppLayout from '@/components/AppLayout';
import EscalationQueueClient from './components/EscalationQueueClient';

export default function EscalationQueuePage() {
  return (
    <AppLayout>
      <EscalationQueueClient />
    </AppLayout>
  );
}