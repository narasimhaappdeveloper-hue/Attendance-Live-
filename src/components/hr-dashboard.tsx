
'use client';

import { useState } from 'react';
import EmployeeManagement from './employee-management';
import AttendanceLog from './attendance-log';
import SiteManagement from './site-management';
import MonthlyReport from './monthly-report';
import { Users, ClipboardList, MapPin, BarChart3, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type DashboardTab = 'employees' | 'sites' | 'reports' | 'attendance';

export default function HrDashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('employees');

  const navItems = [
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'sites', label: 'Work Sites', icon: MapPin },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'attendance', label: 'Attendance Log', icon: ClipboardList },
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
      default:
        return <EmployeeManagement />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 min-h-[calc(100vh-120px)]">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 shrink-0">
        <div className="sticky top-20 space-y-1">
          <div className="px-3 py-4 mb-4 bg-primary/5 rounded-2xl border border-primary/10">
            <h2 className="text-xl font-bold font-headline text-primary px-2">HR Menu</h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest px-2 mt-1">Management Console</p>
          </div>
          
          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <Button
                  key={item.id}
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start h-12 px-4 rounded-xl transition-all duration-200",
                    isActive 
                      ? "shadow-md scale-[1.02]" 
                      : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                  )}
                  onClick={() => setActiveTab(item.id as DashboardTab)}
                >
                  <Icon className={cn("mr-3 h-5 w-5", isActive ? "text-primary-foreground" : "text-primary")} />
                  <span className="font-semibold">{item.label}</span>
                  {isActive && <ChevronRight className="ml-auto h-4 w-4 opacity-50" />}
                </Button>
              );
            })}
          </nav>
          
          <div className="mt-8 p-4 bg-muted/40 rounded-2xl border border-dashed text-center">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              సిస్టమ్ ఆటోమేటిక్‌గా అటెండెన్స్ మరియు రిపోర్ట్స్ మేనేజ్ చేస్తుంది.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0">
        <div className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden">
          <div className="p-6 border-b bg-muted/20">
            <h1 className="text-2xl font-bold font-headline capitalize">
              {navItems.find(i => i.id === activeTab)?.label}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your {activeTab} data and monitoring tools.
            </p>
          </div>
          <div className="p-6">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
}
