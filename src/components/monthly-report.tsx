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
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, getDay, isSunday, isSaturday } from 'date-fns';
import { Users, CheckCircle2, Clock, Calendar } from 'lucide-react';

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

      return { ...employee, dailyStatus, stats, salary, totalDays: daysInMonth.length };
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
        <Card className="bg-blue-50">
          <CardContent className="pt-6 flex items-center gap-4">
            <Calendar className="h-6 w-6 text-blue-600" />
            <div>
              <p className="text-sm font-medium">Month Days</p>
              <h3 className="text-2xl font-bold">{daysInMonth.length}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0">
          <div>
            <CardTitle>Master Attendance Report</CardTitle>
            <CardDescription>
              Sundays (Red) & Saturdays (Amber) are highlighted. Click cells to edit.
            </CardDescription>
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
          <div className="overflow-x-auto border rounded-xl">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 text-[10px]">
                  <TableHead className="sticky left-0 bg-muted/50 z-30 min-w-[120px] border-r">Employee Name</TableHead>
                  <TableHead className="text-center font-bold px-1 bg-slate-50 border-r">Total Days</TableHead>
                  <TableHead className="text-center font-bold px-1 text-green-600 bg-slate-50 border-r">P</TableHead>
                  <TableHead className="text-center font-bold px-1 text-red-600 bg-slate-50 border-r">A</TableHead>
                  <TableHead className="text-center font-bold px-1 text-blue-600 bg-slate-50 border-r">L</TableHead>
                  <TableHead className="text-center font-bold px-1 text-purple-600 bg-slate-50 border-r">H</TableHead>
                  <TableHead className="text-center font-bold px-1 text-amber-600 bg-slate-50 border-r">W</TableHead>
                  <TableHead className="text-center font-bold px-1 bg-slate-50 border-r">OT(h)</TableHead>
                  <TableHead className="sticky right-0 bg-primary/10 z-30 min-w-[90px] text-primary font-bold text-center border-l">Salary</TableHead>
                  {daysInMonth.map(day => {
                    const isSun = isSunday(day);
                    const isSat = isSaturday(day);
                    return (
                      <TableHead 
                        key={day.toISOString()} 
                        className={`text-center min-w-[40px] border-l p-1 ${
                          isSun ? 'bg-red-50 text-red-600 font-black' : 
                          isSat ? 'bg-amber-50 text-amber-600 font-bold' : ''
                        }`}
                      >
                        <div className="flex flex-col items-center leading-tight">
                          <span>{format(day, 'd')}</span>
                          <span className="text-[8px] uppercase">{format(day, 'EEE')}</span>
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody className="text-[11px]">
                {reportData.map(row => (
                  <TableRow key={row.id} className="hover:bg-slate-50/50">
                    <TableCell className="sticky left-0 bg-white font-bold z-20 border-r shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                      {row.name}
                      <div className="text-[9px] text-muted-foreground font-normal">{row.id}</div>
                    </TableCell>
                    <TableCell className="text-center bg-slate-50/30 border-r">{row.totalDays}</TableCell>
                    <TableCell className="text-center bg-slate-50/30 font-bold text-green-600 border-r">{row.stats.Present}</TableCell>
                    <TableCell className="text-center bg-slate-50/30 font-bold text-red-600 border-r">{row.stats.Absent}</TableCell>
                    <TableCell className="text-center bg-slate-50/30 font-bold text-blue-600 border-r">{row.stats.Leave}</TableCell>
                    <TableCell className="text-center bg-slate-50/30 font-bold text-purple-600 border-r">{row.stats.Holiday}</TableCell>
                    <TableCell className="text-center bg-slate-50/30 font-bold text-amber-600 border-r">{row.stats['Week-off']}</TableCell>
                    <TableCell className="text-center bg-slate-50/30 border-r">{row.stats.totalOT}</TableCell>
                    <TableCell className="sticky right-0 bg-primary/5 z-20 font-black text-primary text-center border-l">
                      ₹{row.salary.toLocaleString()}
                    </TableCell>
                    {row.dailyStatus.map((s, i) => {
                      const isSun = isSunday(s.day);
                      const isSat = isSaturday(s.day);
                      return (
                        <TableCell 
                          key={i} 
                          className={`p-1 text-center cursor-pointer border-l hover:bg-slate-200 transition-colors ${
                            isSun ? 'bg-red-50/30' : isSat ? 'bg-amber-50/30' : ''
                          }`} 
                          onClick={() => handleDayClick(row.id, s.dateStr)}
                        >
                          <div className={`h-6 w-6 rounded-md mx-auto flex items-center justify-center font-bold text-[10px] shadow-sm ${
                            s.status === 'Present' ? 'bg-green-500 text-white' : 
                            s.status === 'Holiday' ? 'bg-purple-500 text-white' :
                            s.status === 'Leave' ? 'bg-blue-500 text-white' :
                            s.status === 'C-off' ? 'bg-indigo-500 text-white' :
                            s.status === 'Week-off' ? 'bg-amber-400 text-amber-900' : 
                            s.status === 'Absent' ? 'bg-red-100 text-red-400' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {s.status === 'Present' ? 'P' : 
                             s.status === 'Holiday' ? 'H' : 
                             s.status === 'Leave' ? 'L' : 
                             s.status === 'C-off' ? 'C' : 
                             s.status === 'Week-off' ? 'W' : 'A'}
                          </div>
                          {s.ot > 0 && <div className="text-[7px] text-amber-600 font-black mt-0.5">+{s.ot}h</div>}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-6 flex flex-wrap gap-4 text-[10px] font-bold">
            <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded bg-green-500"></div> Present (P)</div>
            <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded bg-red-100 border text-red-400 text-center text-[8px]">A</div> Absent (A)</div>
            <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded bg-blue-500"></div> Leave (L)</div>
            <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded bg-purple-500"></div> Holiday (H)</div>
            <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded bg-amber-400"></div> Week-off (W)</div>
            <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded bg-indigo-500"></div> C-off (C)</div>
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
              <Input type="number" step="0.5" value={editForm.ot} onChange={(e) => setEditForm(p => ({ ...p, ot: e.target.value }))} />
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
