import React from 'react';
import AppLayout from '@/components/AppLayout';
import ClaimsManagementClient from './components/ClaimsManagementClient';

export default function ClaimsManagementPage() {
  return (
    <AppLayout>
      <ClaimsManagementClient />
    </AppLayout>
  );
}