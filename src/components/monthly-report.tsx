'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/hooks/use-app';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, getDay, isSunday, isSaturday } from 'date-fns';
import { Users, CheckCircle2, Clock, Calendar, Calculator, Layers, Award } from 'lucide-react';
import type { ShiftSettings } from '@/lib/types';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function MonthlyReport() {
  const { employees, attendanceRecords, extraStatuses, markExtraStatus, shiftSettings } = useApp();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [editingDay, setEditingDay] = useState<{ empId: string, date: string, autoLate: number } | null>(null);
  const [editForm, setEditForm] = useState<{ status: string, ot: string, lateIn: string, earlyOut: string, extraShiftBenefit: 'OT' | 'C-off' }>({ 
    status: 'None', 
    ot: '0', 
    lateIn: '',
    earlyOut: '0',
    extraShiftBenefit: 'OT'
  });

  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(selectedMonth),
      end: endOfMonth(selectedMonth),
    });
  }, [selectedMonth]);

  const reportData = useMemo(() => {
    return employees.filter(e => {
        if (e.status === 'Approved') return true;
        if (e.status === 'Resigned') {
            const hasActivity = attendanceRecords.some(r => 
                r.employeeId.toUpperCase() === e.id.toUpperCase() && 
                format(new Date(r.dateTime), 'yyyy-MM') === format(selectedMonth, 'yyyy-MM')
            ) || extraStatuses.some(ex => 
                ex.employeeId.toUpperCase() === e.id.toUpperCase() &&
                ex.date.startsWith(format(selectedMonth, 'yyyy-MM'))
            );
            return hasActivity;
        }
        return false;
    }).map(employee => {
      let monthlyCustomLateHoursCut = 0;
      let monthlyCoffsEarned = 0;

      const dailyStatus = daysInMonth.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayRecords = attendanceRecords.filter(r => 
          r.employeeId.toUpperCase() === employee.id.toUpperCase() &&
          isSameDay(new Date(r.dateTime), day)
        );
        const extra = extraStatuses.find(ex => ex.employeeId === employee.id && ex.date === dateStr);

        // Auto calculate Late-In using dynamic shiftSettings for the first record of the day
        const primaryRecord = dayRecords.length > 0 ? dayRecords[dayRecords.length - 1] : null; 
        const shiftType = primaryRecord?.shift || 'General';
        const shiftStartHour = shiftSettings[shiftType as keyof ShiftSettings]?.startHour ?? 9;
        const actualTime = primaryRecord ? new Date(primaryRecord.dateTime) : null;
        let autoLateIn = 0;
        if (actualTime) {
          const actualHours = actualTime.getHours() + actualTime.getMinutes() / 60;
          autoLateIn = Math.max(0, actualHours - shiftStartHour);
        }

        let status: 'Present' | 'Absent' | 'Week-off' | 'Leave' | 'Holiday' | 'C-off' | 'Half-Day' = 'Absent';
        
        if (extra && extra.status !== 'None') {
          status = extra.status as any;
        } else if (dayRecords.length > 0) {
          status = 'Present';
        } else if (employee.weekOffDay === DAYS_OF_WEEK[getDay(day)]) {
          status = 'Week-off';
        }

        const effectiveLateIn = (extra && extra.lateInHours !== undefined && extra.lateInHours !== 0) 
          ? extra.lateInHours 
          : (extra?.status === 'Absent' || extra?.status === 'Leave' ? 0 : autoLateIn);
          
        const dailyLate = effectiveLateIn + (extra?.earlyOutHours || 0);
        monthlyCustomLateHoursCut += dailyLate;

        // Auto calculate extra shift hours
        let autoExtraHours = 0;
        if (dayRecords.length > 1) {
            dayRecords.slice(0, dayRecords.length - 1).forEach(r => {
                autoExtraHours += shiftSettings[r.shift as keyof ShiftSettings]?.dutyHours || 8;
            });
        }

        const assignedBenefit = extra?.extraShiftBenefit || 'OT';
        let finalOT = 0;
        let cOffCredit = 0;

        const rawExtraHours = extra?.otHours || autoExtraHours;

        if (assignedBenefit === 'C-off') {
          // Convert extra shift hours to C-off days credit (assuming 8h = 1 day C-off credit)
          cOffCredit = rawExtraHours > 0 ? Number((rawExtraHours / 8).toFixed(2)) : 0;
          monthlyCoffsEarned += cOffCredit;
        } else {
          finalOT = rawExtraHours;
        }

        return { 
          day, 
          dateStr, 
          status, 
          ot: finalOT, 
          cOffCredit,
          extraShiftBenefit: assignedBenefit,
          late: dailyLate,
          lateIn: effectiveLateIn,
          earlyOut: extra?.earlyOutHours || 0,
          autoLateIn,
          punches: dayRecords.length
        };
      });

      const stats = dailyStatus.reduce((acc, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        acc.totalOT += curr.ot;
        return acc;
      }, { Present: 0, Absent: 0, 'Week-off': 0, Leave: 0, Holiday: 0, 'C-off': 0, 'Half-Day': 0, totalOT: 0 });

      const presentsCount = stats.Present || 0;
      const weekOffCount = stats['Week-off'] || 0;
      const holidayCount = stats.Holiday || 0;
      const coffCount = stats['C-off'] || 0;
      const halfDaysCount = stats['Half-Day'] || 0;

      const totalEffectivePaidDays = presentsCount + weekOffCount + holidayCount + coffCount + (halfDaysCount * 0.5);
      const effectiveDailyRate = employee.dailyRate || 0;
      
      const earnedBasicAmount = totalEffectivePaidDays * effectiveDailyRate;
      const otEarnings = stats.totalOT * (employee.otRate || 0);
      const grossEarned = earnedBasicAmount + otEarnings + (employee.incentive || 0) + (employee.foodAllowance || 0) + (employee.otherEarnings || 0);

      const hourlyRate = effectiveDailyRate / 8;
      const lateHoursDeduction = monthlyCustomLateHoursCut * hourlyRate;

      const finalNetSalary = Math.max(0, grossEarned - (employee.loanRecovery || 0) + (employee.otherEarnings || 0) - lateHoursDeduction);

      return { 
        ...employee, 
        dailyStatus, 
        stats, 
        salary: finalNetSalary, 
        paidWorkingDays: totalEffectivePaidDays, 
        totalDays: daysInMonth.length,
        totalLateHoursCut: monthlyCustomLateHoursCut,
        totalCoffsEarned: monthlyCoffsEarned
      };
    });
  }, [employees, attendanceRecords, extraStatuses, daysInMonth, selectedMonth, shiftSettings]);

  const grandTotals = useMemo(() => {
    return reportData.reduce((acc, curr) => {
      acc.totalDays += curr.totalDays;
      acc.present += (curr.stats.Present || 0);
      acc.absent += (curr.stats.Absent || 0);
      acc.leave += (curr.stats.Leave || 0);
      acc.holiday += (curr.stats.Holiday || 0);
      acc.coff += (curr.stats['C-off'] || 0);
      acc.halfday += (curr.stats['Half-Day'] || 0);
      acc.weekoff += (curr.stats['Week-off'] || 0);
      acc.ot += curr.stats.totalOT;
      acc.coffsEarned += curr.totalCoffsEarned;
      acc.paidWorkingDays += curr.paidWorkingDays;
      acc.salary += curr.salary;
      return acc;
    }, { totalDays: 0, present: 0, absent: 0, leave: 0, holiday: 0, coff: 0, halfday: 0, weekoff: 0, ot: 0, coffsEarned: 0, paidWorkingDays: 0, salary: 0 });
  }, [reportData]);

  const handleDayClick = (empId: string, dateStr: string) => {
    const current = extraStatuses.find(e => e.employeeId === empId && e.date === dateStr);
    const empData = reportData.find(d => d.id === empId);
    const dayData = empData?.dailyStatus.find(s => s.dateStr === dateStr);
    const autoLate = dayData?.autoLateIn || 0;

    setEditForm({ 
      status: current?.status || 'None', 
      ot: (current?.otHours || 0).toString(),
      lateIn: current?.lateInHours !== undefined ? current.lateInHours.toString() : '',
      earlyOut: (current?.earlyOutHours || 0).toString(),
      extraShiftBenefit: current?.extraShiftBenefit || 'OT'
    });
    setEditingDay({ empId, date: dateStr, autoLate });
  };

  const saveDayStatus = () => {
    if (!editingDay) return;
    const { empId, date } = editingDay;
    markExtraStatus(
      empId, 
      date, 
      editForm.status as any, 
      parseFloat(editForm.ot) || 0, 
      editForm.lateIn === '' ? 0 : parseFloat(editForm.lateIn),
      parseFloat(editForm.earlyOut) || 0,
      editForm.extraShiftBenefit
    );
    setEditingDay(null);
  };

  const currentYear = selectedMonth.getFullYear();
  const currentMonth = selectedMonth.getMonth();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-primary/5">
          <CardContent className="pt-6 flex items-center gap-4">
            <Users className="h-6 w-6 text-primary" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Staff Displayed</p>
              <h3 className="text-2xl font-bold">{reportData.length}</h3>
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
            <Award className="h-6 w-6 text-teal-600" />
            <div>
              <p className="text-sm font-medium">Total C-offs Earned</p>
              <h3 className="text-2xl font-bold">{grandTotals.coffsEarned.toFixed(1)} Days</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0">
          <div>
            <CardTitle>Master Attendance Report</CardTitle>
            <CardDescription>
                ఒక రోజుపై క్లిక్ చేసి Late-In/Early Permission గంటలను లేదా అదనపు షిఫ్ట్ ప్రయోజనాన్ని (OT లేదా C-off) మార్చుకోవచ్చు.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={currentYear.toString()} onValueChange={(v) => {
              const d = new Date(selectedMonth);
              d.setFullYear(parseInt(v));
              setSelectedMonth(d);
            }}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 2050 - 2020 + 1 }).map((_, i) => {
                  const year = 2020 + i;
                  return <SelectItem key={year} value={year.toString()}>{year}</SelectItem>;
                })}
              </SelectContent>
            </Select>
            <Select value={currentMonth.toString()} onValueChange={(v) => {
              const d = new Date(selectedMonth);
              d.setMonth(parseInt(v));
              setSelectedMonth(d);
            }}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }).map((_, i) => (
                  <SelectItem key={i} value={i.toString()}>{format(new Date(2000, i, 1), 'MMMM')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border rounded-xl">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 text-[10px]">
                  <TableHead className="sticky left-0 bg-muted/50 z-30 min-w-[120px] border-r">Employee Name</TableHead>
                  
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

                  <TableHead className="text-center font-bold px-1 text-green-600 bg-slate-50 border-l border-r">P</TableHead>
                  <TableHead className="text-center font-bold px-1 text-orange-600 bg-slate-50 border-r">HD</TableHead>
                  <TableHead className="text-center font-bold px-1 text-red-600 bg-slate-50 border-r">A</TableHead>
                  <TableHead className="text-center font-bold px-1 text-blue-600 bg-slate-50 border-r">L</TableHead>
                  <TableHead className="text-center font-bold px-1 text-purple-600 bg-slate-50 border-r">H</TableHead>
                  <TableHead className="text-center font-bold px-1 text-indigo-600 bg-slate-50 border-r">C</TableHead>
                  <TableHead className="text-center font-bold px-1 text-amber-600 bg-slate-50 border-r">W</TableHead>
                  <TableHead className="text-center font-bold px-1 text-teal-600 bg-slate-50 border-r">Earned C-off</TableHead>
                  <TableHead className="text-center font-bold px-1 text-red-500 bg-slate-50 border-r">Late(h)</TableHead>
                  <TableHead className="text-center font-bold px-1 bg-primary/10 text-primary border-r">Paid Days</TableHead>
                  <TableHead className="sticky right-0 bg-primary/10 z-30 min-w-[90px] text-primary font-bold text-center border-l">Net Salary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-[11px]">
                {reportData.map(row => (
                  <TableRow key={row.id} className="hover:bg-slate-50/50">
                    <TableCell className="sticky left-0 bg-white font-bold z-20 border-r shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                      <div className="flex items-center gap-1">
                        {row.name}
                        {row.status === 'Resigned' && <span className="text-[7px] bg-amber-100 px-1 border border-amber-500 text-amber-600 rounded">Former</span>}
                      </div>
                      <div className="text-[9px] text-muted-foreground font-normal">{row.id}</div>
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
                          <div className={`h-6 w-6 rounded-md mx-auto flex items-center justify-center font-bold text-[10px] shadow-sm relative ${
                            s.status === 'Present' ? 'bg-green-500 text-white' : 
                            s.status === 'Half-Day' ? 'bg-orange-400 text-white' : 
                            s.status === 'Holiday' ? 'bg-purple-500 text-white' :
                            s.status === 'Leave' ? 'bg-blue-500 text-white' :
                            s.status === 'C-off' ? 'bg-indigo-500 text-white' :
                            s.status === 'Week-off' ? 'bg-amber-400 text-amber-900' : 
                            s.status === 'Absent' ? 'bg-red-100 text-red-400' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {s.status === 'Present' ? 'P' : 
                             s.status === 'Half-Day' ? 'HD' : 
                             s.status === 'Holiday' ? 'H' : 
                             s.status === 'Leave' ? 'L' : 
                             s.status === 'C-off' ? 'C' : 
                             s.status === 'Week-off' ? 'W' : 'A'}
                             
                             {s.punches > 1 && (
                                <div className="absolute -top-1 -right-1 bg-primary text-white text-[7px] w-3 h-3 flex items-center justify-center rounded-full border border-white">
                                    {s.punches}
                                </div>
                             )}
                          </div>
                          {s.ot > 0 && <div className="text-[7px] text-green-600 font-black mt-0.5">+{s.ot}h OT</div>}
                          {s.cOffCredit > 0 && <div className="text-[7px] text-teal-600 font-black mt-0.5">+{s.cOffCredit} C-off</div>}
                          {s.late > 0 && <div className="text-[7px] text-destructive font-black mt-0.5">-{s.late.toFixed(1)}h L</div>}
                        </TableCell>
                      );
                    })}

                    <TableCell className="text-center bg-slate-50/30 font-bold text-green-600 border-l border-r">{row.stats.Present || 0}</TableCell>
                    <TableCell className="text-center bg-slate-50/30 font-bold text-orange-500 border-r">{row.stats['Half-Day'] || 0}</TableCell>
                    <TableCell className="text-center bg-slate-50/30 font-bold text-red-600 border-r">{row.stats.Absent || 0}</TableCell>
                    <TableCell className="text-center bg-slate-50/30 font-bold text-blue-600 border-r">{row.stats.Leave || 0}</TableCell>
                    <TableCell className="text-center bg-slate-50/30 font-bold text-purple-600 border-r">{row.stats.Holiday || 0}</TableCell>
                    <TableCell className="text-center bg-slate-50/30 font-bold text-indigo-600 border-r">{row.stats['C-off'] || 0}</TableCell>
                    <TableCell className="text-center bg-slate-50/30 font-bold text-amber-600 border-r">{row.stats['Week-off'] || 0}</TableCell>
                    <TableCell className="text-center bg-slate-50/30 text-teal-600 font-bold border-r">{row.totalCoffsEarned.toFixed(1)} d</TableCell>
                    <TableCell className="text-center bg-slate-50/30 border-r text-red-500 font-bold">{row.totalLateHoursCut.toFixed(1)}h</TableCell>
                    <TableCell className="text-center bg-primary/5 font-black text-primary border-r">{row.paidWorkingDays}</TableCell>
                    <TableCell className="sticky right-0 bg-primary/5 z-20 font-black text-primary text-center border-l">
                      ₹{Math.round(row.salary).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter className="bg-muted/80 chimneys text-[11px] font-black text-slate-900">
                <TableRow>
                  <TableCell className="sticky left-0 bg-slate-100 font-black z-20 border-r shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Grand Total</TableCell>
                  
                  {daysInMonth.map((_, i) => (
                    <TableCell key={`ft-date-${i}`} className="border-l bg-muted/44"></TableCell>
                  ))}

                  <TableCell className="text-center text-green-700 font-black border-l border-r bg-slate-100">{grandTotals.present}</TableCell>
                  <TableCell className="text-center text-orange-600 font-black border-r bg-slate-100">{grandTotals.halfday || 0}</TableCell>
                  <TableCell className="text-center text-red-600 font-black border-r bg-slate-100">{grandTotals.absent}</TableCell>
                  <TableCell className="text-center text-blue-600 font-black border-r bg-slate-100">{grandTotals.leave}</TableCell>
                  <TableCell className="text-center text-purple-600 font-black border-r bg-slate-100">{grandTotals.holiday}</TableCell>
                  <TableCell className="text-center text-indigo-600 font-black border-r bg-slate-100">{grandTotals.coff}</TableCell>
                  <TableCell className="text-center text-amber-600 font-black border-r bg-slate-100">{grandTotals.weekoff}</TableCell>
                  <TableCell className="text-center text-teal-600 font-black border-r bg-slate-100">{grandTotals.coffsEarned.toFixed(1)} d</TableCell>
                  <TableCell className="text-center border-r bg-slate-100 text-red-500">{reportData.reduce((acc, r) => acc + r.totalLateHoursCut, 0).toFixed(1)}h</TableCell>
                  <TableCell className="text-center text-primary font-black border-r bg-primary/5">{grandTotals.paidWorkingDays}</TableCell>
                  <TableCell className="sticky right-0 bg-primary/20 z-20 font-black text-primary text-center border-l">₹{Math.round(grandTotals.salary).toLocaleString()}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editingDay} onOpenChange={() => setEditingDay(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update Attendance - {editingDay?.date}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Day Status</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm(p => ({ ...p, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">Reset (Auto Mode)</SelectItem>
                  <SelectItem value="Present">Present</SelectItem>
                  <SelectItem value="Half-Day">Half-Day</SelectItem>
                  <SelectItem value="Leave">Leave (Unpaid)</SelectItem>
                  <SelectItem value="Holiday">Company Holiday</SelectItem>
                  <SelectItem value="C-off">C-off</SelectItem>
                  <SelectItem value="Absent">Absent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="p-3 bg-blue-50 text-blue-900 border border-blue-200 text-xs rounded-lg flex items-start gap-2">
              <Calculator className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
              <div>
                <p className="font-bold">Auto Calculation Note:</p>
                <p>ఎక్కువ షిఫ్టులు (Double Shift) చేసినప్పుడు వచ్చే అదనపు డ్యూటీ గంటలను కింద ఉన్న బెనిఫిట్ ఆప్షన్ ద్వారా నియంత్రించవచ్చు.</p>
                <p className="mt-1 opacity-80">లేట్-ఇన్: <b>{editingDay?.autoLate.toFixed(2)} Hrs</b></p>
              </div>
            </div>

            <div className="grid gap-2 border p-3 rounded-xl bg-slate-50/50">
              <Label className="text-xs font-bold text-primary">అదనపు షిఫ్ట్ ప్రయోజనం (Extra Shift Benefit)</Label>
              <Select 
                value={editForm.extraShiftBenefit} 
                onValueChange={(v: 'OT' | 'C-off') => setEditForm(p => ({ ...p, extraShiftBenefit: v }))}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OT">Overtime Pay (OT నగదు రూపంలో)</SelectItem>
                  <SelectItem value="C-off">C-off Credit (సెలవు/Comp Off రూపంలో)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-xs">Manual Late-In (Hrs)</Label>
                <Input 
                  type="number" 
                  step="0.1" 
                  placeholder={editingDay?.autoLate.toFixed(2) || "0"} 
                  value={editForm.lateIn} 
                  onChange={(e) => setEditForm(p => ({ ...p, lateIn: e.target.value }))} 
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs">Early Permission (Hrs)</Label>
                <Input 
                  type="number" 
                  step="0.1" 
                  placeholder="0" 
                  value={editForm.earlyOut} 
                  onChange={(e) => setEditForm(p => ({ ...p, earlyOut: e.target.value }))} 
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Overtime Hours (Override)</Label>
              <Input type="number" step="0.5" value={editForm.ot} onChange={(e) => setEditForm(p => ({ ...p, ot: e.target.value }))} />
              <p className="text-[10px] text-muted-foreground italic">మాన్యువల్‌గా ఇక్కడ OT ఇస్తే ఆటోమేటిక్ లెక్కింపు ఆగిపోతుంది.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDay(null)}>Cancel</Button>
            <Button onClick={saveDayStatus} className="bg-primary text-white">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
