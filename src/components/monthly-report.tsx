
'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/hooks/use-app';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, getDay } from 'date-fns';
import { Users, CheckCircle2, XCircle, Clock } from 'lucide-react';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function MonthlyReport() {
  const { employees, attendanceRecords, extraStatuses, markExtraStatus } = useApp();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [editingDay, setEditingDay] = useState<{ empId: string, date: string } | null>(null);
  const [editForm, setEditForm] = useState<{ status: string, ot: string }>({ status: '', ot: '0' });

  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(selectedMonth),
      end: endOfMonth(selectedMonth),
    });
  }, [selectedMonth]);

  const reportData = useMemo(() => {
    return employees.filter(e => e.status === 'Approved').map(employee => {
      const dailyStatus = daysInMonth.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const record = attendanceRecords.find(r => 
          r.employeeId.toUpperCase() === employee.id.toUpperCase() &&
          isSameDay(new Date(r.dateTime), day)
        );
        const extra = extraStatuses.find(ex => ex.employeeId === employee.id && ex.date === dateStr);

        let status: 'Present' | 'Absent' | 'Week-off' | 'Leave' | 'Holiday' | 'C-off' = 'Absent';
        if (record) status = 'Present';
        else if (extra) status = extra.status as any;
        else if (employee.weekOffDay === DAYS_OF_WEEK[getDay(day)]) status = 'Week-off';

        return { day, dateStr, status, ot: extra?.otHours || 0 };
      });

      const stats = dailyStatus.reduce((acc, curr) => {
        acc[curr.status]++;
        acc.totalOT += curr.ot;
        return acc;
      }, { Present: 0, Absent: 0, 'Week-off': 0, Leave: 0, Holiday: 0, 'C-off': 0, totalOT: 0 });

      // Salary Calculation
      const paidDays = stats.Present + stats['Week-off'] + stats.Leave + stats.Holiday + stats['C-off'];
      const salary = (paidDays * employee.dailyRate) + (stats.totalOT * employee.otRate);

      return { ...employee, dailyStatus, stats, salary };
    });
  }, [employees, attendanceRecords, extraStatuses, daysInMonth]);

  const handleDayClick = (empId: string, dateStr: string) => {
    const current = extraStatuses.find(e => e.employeeId === empId && e.date === dateStr);
    setEditForm({ status: current?.status || 'None', ot: (current?.otHours || 0).toString() });
    setEditingDay({ empId, date: dateStr });
  };

  const saveDayStatus = () => {
    if (!editingDay) return;
    const { empId, date } = editingDay;
    markExtraStatus(empId, date, editForm.status as any, parseFloat(editForm.ot));
    setEditingDay(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5">
          <CardContent className="pt-6 flex items-center gap-4">
            <Users className="h-6 w-6 text-primary" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Staff</p>
              <h3 className="text-2xl font-bold">{employees.length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50">
          <CardContent className="pt-6 flex items-center gap-4">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <div>
              <p className="text-sm font-medium">Present Today</p>
              <h3 className="text-2xl font-bold">{attendanceRecords.filter(r => isSameDay(new Date(r.dateTime), new Date())).length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50">
          <CardContent className="pt-6 flex items-center gap-4">
            <Clock className="h-6 w-6 text-amber-600" />
            <div>
              <p className="text-sm font-medium">Total OT (Month)</p>
              <h3 className="text-2xl font-bold">{reportData.reduce((acc, r) => acc + r.stats.totalOT, 0)} Hrs</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Master Attendance Report</CardTitle>
            <CardDescription>Click a cell to mark Leave, Holiday, or OT hours.</CardDescription>
          </div>
          <Select value={format(selectedMonth, 'yyyy-MM')} onValueChange={(v) => setSelectedMonth(new Date(v))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }).map((_, i) => {
                const date = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
                return <SelectItem key={i} value={format(date, 'yyyy-MM')}>{format(date, 'MMMM yyyy')}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 text-[11px]">
                  <TableHead className="sticky left-0 bg-muted/50 z-20 min-w-[120px]">Employee</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>OT</TableHead>
                  <TableHead className="text-primary font-bold">Salary</TableHead>
                  {daysInMonth.map(day => (
                    <TableHead key={day.toISOString()} className="text-center min-w-[35px]">{format(day, 'd')}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="text-[11px]">
                {reportData.map(row => (
                  <TableRow key={row.id}>
                    <TableCell className="sticky left-0 bg-white font-medium z-10 border-r">{row.name}</TableCell>
                    <TableCell>{row.stats.Present + row.stats.Holiday + row.stats.Leave}</TableCell>
                    <TableCell>{row.stats.totalOT}h</TableCell>
                    <TableCell className="font-bold text-primary">₹{row.salary.toLocaleString()}</TableCell>
                    {row.dailyStatus.map((s, i) => (
                      <TableCell key={i} className="p-1 text-center cursor-pointer hover:bg-slate-100" onClick={() => handleDayClick(row.id, s.dateStr)}>
                        <div className={`h-6 w-6 rounded-full mx-auto flex items-center justify-center font-bold ${
                          s.status === 'Present' ? 'bg-green-500 text-white' : 
                          s.status === 'Holiday' ? 'bg-blue-500 text-white' :
                          s.status === 'Leave' ? 'bg-red-400 text-white' :
                          s.status === 'C-off' ? 'bg-purple-500 text-white' :
                          s.status === 'Week-off' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {s.status === 'Present' ? 'P' : s.status === 'Holiday' ? 'H' : s.status === 'Leave' ? 'L' : s.status === 'C-off' ? 'C' : s.status === 'Week-off' ? 'W' : 'A'}
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editingDay} onOpenChange={() => setEditingDay(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update Status - {editingDay?.date}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Special Status</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm(p => ({ ...p, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">Reset (Default)</SelectItem>
                  <SelectItem value="Leave">Paid Leave (L)</SelectItem>
                  <SelectItem value="Holiday">Company Holiday (H)</SelectItem>
                  <SelectItem value="C-off">Compensatory Off (C)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Overtime Hours</Label>
              <Input type="number" value={editForm.ot} onChange={(e) => setEditForm(p => ({ ...p, ot: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDay(null)}>Cancel</Button>
            <Button onClick={saveDayStatus}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
