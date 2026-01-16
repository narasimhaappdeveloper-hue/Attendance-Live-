'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EmployeeManagement from './employee-management';
import AttendanceLog from './attendance-log';
import { Users, ClipboardList } from 'lucide-react';

export default function HrDashboard() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline">HR Dashboard</h1>
        <p className="text-muted-foreground">Manage employees and track attendance records.</p>
      </div>
      <Tabs defaultValue="employees" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="employees">
            <Users className="mr-2 h-4 w-4" />
            Employees
          </TabsTrigger>
          <TabsTrigger value="attendance">
            <ClipboardList className="mr-2 h-4 w-4" />
            Attendance Log
          </TabsTrigger>
        </TabsList>
        <TabsContent value="employees">
          <EmployeeManagement />
        </TabsContent>
        <TabsContent value="attendance">
          <AttendanceLog />
        </TabsContent>
      </Tabs>
    </div>
  );
}
