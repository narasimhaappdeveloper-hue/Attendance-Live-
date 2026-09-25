'use client';

import { useState } from 'react';
import EmployeeManagement from './employee-management';
import AttendanceLog from './attendance-log';
import SiteManagement from './site-management';
import MonthlyReport from './monthly-report';
import PayrollManagement from './payroll-management';
import SalarySlips from './salary-slips';
import PaymentHistory from './payment-history';
import ShiftManagement from './shift-management';
import { Users, ClipboardList, MapPin, BarChart3, ChevronRight, Wallet, FileText, History, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type DashboardTab = 'employees' | 'sites' | 'reports' | 'attendance' | 'payroll' | 'slips' | 'history' | 'shifts';

export default function HrDashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('employees');

  const navItems = [
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'sites', label: 'Work Sites', icon: MapPin },
    { id: 'reports', label: 'Attendance Master', icon: BarChart3 },
    { id: 'attendance', label: 'Daily Logs', icon: ClipboardList },
    { id: 'payroll', label: 'Salary Rates', icon: Wallet },
    { id: 'slips', label: 'Salary Slips', icon: FileText },
    { id: 'history', label: 'Payment History', icon: History },
    { id: 'shifts', label: 'Shift Settings', icon: Clock },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'employees':
        return <EmployeeManagement />;
      case 'sites':
        return <SiteManagement />;
      case 'reports':
        return <MonthlyReport />;
      case 'attendance':
        return <AttendanceLog />;
      case 'payroll':
        return <PayrollManagement />;
      case 'slips':
        return <SalarySlips />;
      case 'history':
        return <PaymentHistory />;
      case 'shifts':
        return <ShiftManagement />;
      default:
        return <EmployeeManagement />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 min-h-[calc(100vh-120px)] w-full">
      {/* నావిగేషన్ మెనూ - మొబైల్‌లో హారిజాంటల్ బటన్ల రూపంలో స్పష్టంగా కనిపిస్తుంది */}
      <aside className="w-full md:w-64 shrink-0">
        <div className="md:sticky md:top-20 space-y-2">
          <div className="px-3 py-3 mb-2 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-between md:block">
            <div>
              <h2 className="text-lg md:text-xl font-bold font-headline text-primary px-1">HR Menu</h2>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest px-1">Management Console</p>
            </div>
            <span className="text-xs font-semibold px-2 py-1 bg-primary/10 text-primary rounded-md md:hidden">
              {navItems.find(i => i.id === activeTab)?.label}
            </span>
          </div>
          
          {/* మొబైల్ యూజర్ల కోసం హారిజాంటల్ స్క్రోలింగ్ టాబ్స్ */}
          <nav className="flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <Button
                  key={item.id}
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "shrink-0 md:w-full justify-start h-11 px-3.5 rounded-xl transition-all duration-200 text-xs sm:text-sm font-semibold",
                    isActive 
                      ? "shadow-md bg-primary text-white" 
                      : "text-muted-foreground hover:bg-primary/5 hover:text-primary bg-slate-50 md:bg-transparent border border-slate-200 md:border-transparent"
                  )}
                  onClick={() => setActiveTab(item.id as DashboardTab)}
                >
                  <Icon className={cn("mr-2 h-4 w-4 shrink-0", isActive ? "text-white" : "text-primary")} />
                  <span>{item.label}</span>
                  {isActive && <ChevronRight className="hidden md:block ml-auto h-4 w-4 opacity-50" />}
                </Button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* మెయిన్ కంటెంట్ ఏరియా */}
      <main className="flex-1 min-w-0 w-full overflow-hidden">
        <div className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden">
          <div className="p-4 sm:p-6 border-b bg-muted/20">
            <h1 className="text-xl sm:text-2xl font-bold font-headline capitalize">
              {navItems.find(i => i.id === activeTab)?.label}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Manage your {activeTab} data and financial reports.
            </p>
          </div>
          <div className="p-2 sm:p-6">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
}
