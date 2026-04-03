import React from 'react';
import AppLayout from '@/components/AppLayout';
import DashboardHeader from './components/DashboardHeader';
import KPIBentoGrid from './components/KPIBentoGrid';
import ClaimsVolumeChart from './components/ClaimsVolumeChart';
import StatusDistributionChart from './components/StatusDistributionChart';
import RecentEscalationsTable from './components/RecentEscalationsTable';
import FraudDistributionChart from './components/FraudDistributionChart';
import RecentClaimsFeed from './components/RecentClaimsFeed';

export default function AdminDashboardPage() {
  return (
    <AppLayout>
      <div className="px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 max-w-screen-2xl mx-auto">
        <DashboardHeader />
        <KPIBentoGrid />
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <ClaimsVolumeChart />
          </div>
          <div className="lg:col-span-1">
            <StatusDistributionChart />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <RecentEscalationsTable />
          </div>
          <div className="lg:col-span-1">
            <FraudDistributionChart />
          </div>
        </div>
        <div className="mt-5">
          <RecentClaimsFeed />
        </div>
      </div>
    </AppLayout>
  );
}