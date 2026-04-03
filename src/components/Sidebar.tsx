'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, AlertTriangle, ClipboardList, ScrollText, ChevronLeft, ChevronRight, Settings, LogOut, Shield, FileText, Clock, ShieldCheck, Home,  } from 'lucide-react';

const adminNavGroups = [
  {
    label: 'Overview',
    items: [
      { href: '/admin-dashboard', icon: LayoutDashboard, label: 'Dashboard', badge: null },
    ],
  },
  {
    label: 'Claims',
    items: [
      { href: '/claims-management', icon: ClipboardList, label: 'All Claims', badge: null },
      { href: '/escalation-queue', icon: AlertTriangle, label: 'Escalation Queue', badge: null },
    ],
  },
  {
    label: 'Management',
    items: [
      { href: '/policy-manager', icon: ShieldCheck, label: 'Policy Manager', badge: null },
      { href: '/audit-log', icon: ScrollText, label: 'Audit Log', badge: null },
    ],
  },
];

const claimantNavGroups = [
  {
    label: 'Claimant',
    items: [
      { href: '/claimant-dashboard', icon: Home, label: 'My Dashboard', badge: null },
      { href: '/file-claim', icon: FileText, label: 'File a Claim', badge: null },
      { href: '/claim-status', icon: Clock, label: 'Claim Status', badge: null },
    ],
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut, isAdmin } = useAuth();

  const adminMode = isAdmin ? isAdmin() : false;
  const navGroups = adminMode ? adminNavGroups : claimantNavGroups;

  const displayName = profile?.full_name || user?.user_metadata?.full_name || (adminMode ? 'Admin' : 'Claimant');
  const displayInitials = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const displayRole = adminMode ? (profile?.lic_id || 'LIC of India') : 'Policy Holder';

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
      router.refresh();
    } catch {
      router.push('/login');
    }
  };

  return (
    <aside
      className={`
        relative flex flex-col bg-white border-r border-slate-200 h-screen sticky top-0
        transition-all duration-300 ease-in-out shrink-0
        ${collapsed ? 'w-16' : 'w-60'}
      `}
    >
      {/* Logo */}
      <div className={`flex items-center h-16 border-b border-slate-200 px-4 ${collapsed ? 'justify-center' : 'gap-2'}`}>
        <AppLogo size={32} />
        {!collapsed && (
          <span className="font-semibold text-slate-900 text-base tracking-tight">InsureSwift</span>
        )}
      </div>
      {/* Role badge */}
      {!collapsed && (
        <div className="mx-3 mt-3 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-blue-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-blue-700 truncate">{displayName}</p>
              <p className="text-xs text-blue-500">{adminMode ? 'Admin Portal' : 'Claimant Portal'}</p>
            </div>
          </div>
        </div>
      )}
      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 scrollbar-thin">
        {navGroups?.map((group) => (
          <div key={`group-${group?.label}`} className="mb-4">
            {!collapsed && (
              <p className="px-3 mb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                {group?.label}
              </p>
            )}
            {group?.items?.map((item) => {
              const isActive = pathname === item?.href;
              return (
                <Link
                  key={`nav-${item?.href}`}
                  href={item?.href}
                  title={collapsed ? item?.label : undefined}
                  className={`sidebar-nav-item mb-0.5 ${isActive ? 'sidebar-nav-item-active' : 'sidebar-nav-item-inactive'} ${collapsed ? 'justify-center' : ''}`}
                >
                  <item.icon size={18} className="shrink-0" />
                  {!collapsed && (
                    <span className="flex-1 truncate">{item?.label}</span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      {/* Bottom actions */}
      <div className="border-t border-slate-200 p-2 space-y-0.5">
        <button className="sidebar-nav-item sidebar-nav-item-inactive w-full" title={collapsed ? 'Settings' : undefined}>
          <Settings size={18} className="shrink-0" />
          {!collapsed && <span className="flex-1 text-left">Settings</span>}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="sidebar-nav-item w-full text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span className="flex-1 text-left font-medium">Logout</span>}
        </button>

        {/* User */}
        <div className={`flex items-center gap-2.5 px-3 py-2.5 mt-1 rounded-lg hover:bg-slate-50 cursor-pointer group ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">{displayInitials}</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate">{displayName}</p>
              <p className="text-[10px] text-slate-400 truncate">{displayRole}</p>
            </div>
          )}
        </div>
      </div>
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors z-10"
      >
        {collapsed ? <ChevronRight size={12} className="text-slate-600" /> : <ChevronLeft size={12} className="text-slate-600" />}
      </button>
    </aside>
  );
}