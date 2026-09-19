
'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/hooks/use-app';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, getDay } from 'date-fns';
import { Users, CheckCircle2, XCircle, Coffee } from 'lucide-react';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function MonthlyReport() {
  const { employees, attendanceRecords } = useApp();
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(selectedMonth),
      end: endOfMonth(selectedMonth),
    });
  }, [selectedMonth]);

  const reportData = useMemo(() => {
    return employees.filter(e => e.status === 'Approved').map(employee => {
      const dailyStatus = daysInMonth.map(day => {
        const hasAttended = attendanceRecords.some(record => 
          record.employeeId.toUpperCase() === employee.id.toUpperCase() &&
          isSameDay(new Date(record.dateTime), day)
        );

        const isWeekOff = employee.weekOffDay === DAYS_OF_WEEK[getDay(day)];

        let status: 'Present' | 'Absent' | 'Week-off' = 'Absent';
        if (hasAttended) status = 'Present';
        else if (isWeekOff) status = 'Week-off';

        return { day, status };
      });

      const stats = dailyStatus.reduce((acc, curr) => {
        acc[curr.status]++;
        return acc;
      }, { Present: 0, Absent: 0, 'Week-off': 0 });

      return { ...employee, dailyStatus, stats };
    });
  }, [employees, attendanceRecords, daysInMonth]);

  const todayStats = useMemo(() => {
    const today = new Date();
    const presentCount = employees.filter(e => 
      attendanceRecords.some(r => r.employeeId.toUpperCase() === e.id.toUpperCase() && isSameDay(new Date(r.dateTime), today))
    ).length;

    return {
      total: employees.length,
      present: presentCount,
      absent: employees.length - presentCount
    };
  }, [employees, attendanceRecords]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Employees</p>
              <h3 className="text-2xl font-bold">{todayStats.total}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-800">Present Today</p>
              <h3 className="text-2xl font-bold text-green-900">{todayStats.present}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="bg-red-100 p-3 rounded-full">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-red-800">Absent Today</p>
              <h3 className="text-2xl font-bold text-red-900">{todayStats.absent}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Monthly Attendance Report</CardTitle>
            <CardDescription>Automatic tracking of Present, Absent, and Week-offs.</CardDescription>
          </div>
          <Select 
            value={format(selectedMonth, 'yyyy-MM')} 
            onValueChange={(val) => setSelectedMonth(new Date(val))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Month" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }).map((_, i) => {
                const date = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
                return (
                  <SelectItem key={i} value={format(date, 'yyyy-MM')}>
                    {format(date, 'MMMM yyyy')}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="sticky left-0 bg-muted/50 z-20">Employee Name</TableHead>
                  <TableHead>P</TableHead>
                  <TableHead>A</TableHead>
                  <TableHead>W</TableHead>
                  {daysInMonth.map(day => (
                    <TableHead key={day.toISOString()} className="text-center min-w-[40px]">
                      {format(day, 'd')}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map(row => (
                  <TableRow key={row.id}>
                    <TableCell className="sticky left-0 bg-white font-medium z-10 border-r">{row.name}</TableCell>
                    <TableCell className="text-green-600 font-bold">{row.stats.Present}</TableCell>
                    <TableCell className="text-red-600 font-bold">{row.stats.Absent}</TableCell>
                    <TableCell className="text-amber-600 font-bold">{row.stats['Week-off']}</TableCell>
                    {row.dailyStatus.map((status, i) => (
                      <TableCell key={i} className="p-1 text-center">
                        <div className={`h-6 w-6 rounded-full mx-auto flex items-center justify-center text-[10px] font-bold ${
                          status.status === 'Present' ? 'bg-green-500 text-white' : 
                          status.status === 'Week-off' ? 'bg-amber-100 text-amber-700' : 
                          'bg-red-100 text-red-700'
                        }`}>
                          {status.status === 'Present' ? 'P' : status.status === 'Week-off' ? 'W' : 'A'}
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1"><Badge className="bg-green-500 h-2 w-2 p-0 rounded-full" /> Present</div>
            <div className="flex items-center gap-1"><Badge className="bg-red-100 text-red-700 h-2 w-2 p-0 rounded-full" /> Absent</div>
            <div className="flex items-center gap-1"><Badge className="bg-amber-100 text-amber-700 h-2 w-2 p-0 rounded-full" /> Week-off</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
