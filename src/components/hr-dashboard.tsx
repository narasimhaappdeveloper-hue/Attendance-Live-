
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EmployeeManagement from './employee-management';
import AttendanceLog from './attendance-log';
import SiteManagement from './site-management';
import { Users, ClipboardList, MapPin } from 'lucide-react';

export default function HrDashboard() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline">HR Dashboard</h1>
        <p className="text-muted-foreground">Manage employees, sites, and track attendance records.</p>
      </div>
      <Tabs defaultValue="employees" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:w-[600px]">
          <TabsTrigger value="employees">
            <Users className="mr-2 h-4 w-4" />
            Employees
          </TabsTrigger>
          <TabsTrigger value="sites">
            <MapPin className="mr-2 h-4 w-4" />
            Work Sites
          </TabsTrigger>
          <TabsTrigger value="attendance">
            <ClipboardList className="mr-2 h-4 w-4" />
            Attendance Log
          </TabsTrigger>
        </TabsList>
        <TabsContent value="employees">
          <EmployeeManagement />
        </TabsContent>
        <TabsContent value="sites">
          <SiteManagement />
        </TabsContent>
        <TabsContent value="attendance">
          <AttendanceLog />
        </TabsContent>
      </Tabs>
    </div>
  );
}
