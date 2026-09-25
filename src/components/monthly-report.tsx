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
import { Users, CheckCircle2, Clock, Calculator, Award } from 'lucide-react';
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-primary/5">
          <CardContent className="p-3 sm:pt-6 flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4 text-center sm:text-left">
            <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            <div>
              <p className="text-[10px] sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Staff</p>
              <h3 className="text-lg sm:text-2xl font-bold">{reportData.length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50">
          <CardContent className="p-3 sm:pt-6 flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4 text-center sm:text-left">
            <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
            <div>
              <p className="text-[10px] sm:text-sm font-medium uppercase tracking-wider">Present</p>
              <h3 className="text-lg sm:text-2xl font-bold">{attendanceRecords.filter(r => isSameDay(new Date(r.dateTime), new Date())).length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50">
          <CardContent className="p-3 sm:pt-6 flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4 text-center sm:text-left">
            <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
            <div>
              <p className="text-[10px] sm:text-sm font-medium uppercase tracking-wider">OT (Hrs)</p>
              <h3 className="text-lg sm:text-2xl font-bold">{reportData.reduce((acc, r) => acc + r.stats.totalOT, 0)}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50">
          <CardContent className="p-3 sm:pt-6 flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4 text-center sm:text-left">
            <Award className="h-5 w-5 sm:h-6 sm:w-6 text-teal-600" />
            <div>
              <p className="text-[10px] sm:text-sm font-medium uppercase tracking-wider">C-offs</p>
              <h3 className="text-lg sm:text-2xl font-bold">{grandTotals.coffsEarned.toFixed(1)}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/80 shadow-md">
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0 px-4 sm:px-6">
          <div className="w-full">
            <CardTitle className="text-xl sm:text-2xl font-bold">Master Attendance Report</CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">
              తేదీ 1 నుండి 30/31 వరకు అన్ని రోజులను చూడటానికి కుడివైపుకి స్క్రోల్ చేయండి.
            </CardDescription>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={currentYear.toString()} onValueChange={(v) => {
              const d = new Date(selectedMonth);
              d.setFullYear(parseInt(v));
              setSelectedMonth(d);
            }}>
              <SelectTrigger className="w-full sm:w-[110px]">
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
              <SelectTrigger className="w-full sm:w-[140px]">
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

        <CardContent className="p-0 sm:p-4">
          {/* హారిజాంటల్ స్క్రోలింగ్ బాక్స్ */}
          <div className="w-full overflow-x-auto border-t sm:border rounded-none sm:rounded-xl shadow-sm" style={{ WebkitOverflowScrolling: 'touch' }}>
            {/* కనీస వెడల్పు 1850px ఇవ్వడం వల్ల 31 రోజులు ఇరుకు కాకుండా చక్కగా వస్తాయి */}
            <Table className="min-w-[1850px] w-full border-collapse">
              <TableHeader>
                <TableRow className="bg-slate-100 text-xs text-slate-800">
                  <TableHead className="min-w-[160px] p-3 font-bold border-r bg-slate-100">
                    Employee Name
                  </TableHead>
                  
                  {daysInMonth.map(day => {
                    const isSun = isSunday(day);
                    const isSat = isSaturday(day);
                    return (
                      <TableHead 
                        key={day.toISOString()} 
                        className={`text-center min-w-[48px] border-l px-1 py-2 ${
                          isSun ? 'bg-red-100/80 text-red-700 font-extrabold' : 
                          isSat ? 'bg-amber-100/80 text-amber-700 font-bold' : 'text-slate-700'
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center leading-tight">
                          <span className="text-xs font-bold">{format(day, 'd')}</span>
                          <span className="text-[9px] uppercase tracking-tighter opacity-80">{format(day, 'EEE')}</span>
                        </div>
                      </TableHead>
                    );
                  })}

                  <TableHead className="text-center font-bold px-3 min-w-[48px] text-green-700 bg-green-50 border-l border-r">P</TableHead>
                  <TableHead className="text-center font-bold px-3 min-w-[48px] text-red-700 bg-red-50 border-r">A</TableHead>
                  <TableHead className="text-center font-bold px-3 min-w-[52px] text-teal-700 bg-teal-50 border-r">C-off</TableHead>
                  <TableHead className="text-center font-bold px-3 min-w-[52px] text-red-600 bg-slate-50 border-r">Late</TableHead>
                  <TableHead className="text-center font-bold px-3 min-w-[55px] bg-primary/10 text-primary border-r">Paid</TableHead>
                  <TableHead className="min-w-[110px] text-primary font-bold text-center border-l bg-primary/10">Net Sal</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody className="text-xs">
                {reportData.map(row => (
                  <TableRow key={row.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="bg-white font-semibold border-r p-3">
                      <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                        <span className="truncate">{row.name}</span>
                        {row.status === 'Resigned' && <span className="text-[8px] bg-amber-100 px-1 border border-amber-500 text-amber-700 font-bold rounded">F</span>}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-normal mt-0.5">{row.id}</div>
                    </TableCell>

                    {row.dailyStatus.map((s, i) => {
                      const isSun = isSunday(s.day);
                      const isSat = isSaturday(s.day);
                      return (
                        <TableCell 
                          key={i} 
                          className={`p-1.5 text-center cursor-pointer border-l hover:bg-blue-50 transition-colors ${
                            isSun ? 'bg-red-50/40' : isSat ? 'bg-amber-50/40' : ''
                          }`} 
                          onClick={() => handleDayClick(row.id, s.dateStr)}
                        >
                          <div className={`h-8 w-8 rounded-lg mx-auto flex items-center justify-center font-bold text-xs shadow-sm relative ${
                            s.status === 'Present' ? 'bg-green-600 text-white' : 
                            s.status === 'Half-Day' ? 'bg-amber-500 text-white' : 
                            s.status === 'Holiday' ? 'bg-purple-600 text-white' :
                            s.status === 'Leave' ? 'bg-blue-600 text-white' :
                            s.status === 'C-off' ? 'bg-teal-600 text-white' :
                            s.status === 'Week-off' ? 'bg-slate-200 text-slate-700 font-semibold border border-slate-300' : 
                            s.status === 'Absent' ? 'bg-red-100 text-red-600 font-bold border border-red-200' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {s.status === 'Present' ? 'P' : 
                             s.status === 'Half-Day' ? 'HD' : 
                             s.status === 'Holiday' ? 'H' : 
                             s.status === 'Leave' ? 'L' : 
                             s.status === 'C-off' ? 'C' : 
                             s.status === 'Week-off' ? 'W' : 'A'}
                             
                            {s.punches > 1 && (
                              <div className="absolute -top-1 -right-1 bg-blue-700 text-white text-[8px] w-3.5 h-3.5 flex items-center justify-center rounded-full border border-white font-bold">
                                {s.punches}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      );
                    })}

                    <TableCell className="text-center font-bold text-green-700 border-l border-r p-2">{row.stats.Present || 0}</TableCell>
                    <TableCell className="text-center font-bold text-red-600 border-r p-2">{row.stats.Absent || 0}</TableCell>
                    <TableCell className="text-center text-teal-700 font-bold border-r p-2">{row.totalCoffsEarned.toFixed(1)}</TableCell>
                    <TableCell className="text-center border-r text-red-500 font-bold p-2">{row.totalLateHoursCut.toFixed(1)}</TableCell>
                    <TableCell className="text-center bg-primary/5 font-extrabold text-primary border-r p-2">{row.paidWorkingDays}</TableCell>
                    <TableCell className="bg-white font-bold text-primary text-center border-l p-2">
                      ₹{Math.round(row.salary).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>

              {/* గ్రాండ్ టోటల్ రో - మెర్జింగ్ లేకుండా ప్రతి కాలమ్ సరిగ్గా ఉండేలా సెట్ చేయబడింది */}
              <TableFooter className="bg-slate-100 text-xs font-bold text-slate-900">
                <TableRow>
                  <TableCell className="bg-slate-200 font-extrabold border-r p-3">Grand Total</TableCell>
                  
                  {daysInMonth.map((_, i) => (
                    <TableCell key={`ft-date-${i}`} className="border-l text-center p-1 text-slate-400 font-normal">
                      -
                    </TableCell>
                  ))}

                  <TableCell className="text-center text-green-700 font-extrabold border-l border-r bg-green-50 p-2">{grandTotals.present}</TableCell>
                  <TableCell className="text-center text-red-600 font-extrabold border-r bg-red-50 p-2">{grandTotals.absent}</TableCell>
                  <TableCell className="text-center text-teal-700 font-extrabold border-r bg-teal-50 p-2">{grandTotals.coffsEarned.toFixed(1)}</TableCell>
                  <TableCell className="text-center border-r bg-slate-50 text-red-600 font-bold p-2">{reportData.reduce((acc, r) => acc + r.totalLateHoursCut, 0).toFixed(1)}</TableCell>
                  <TableCell className="text-center text-primary font-black border-r bg-primary/10 p-2">{grandTotals.paidWorkingDays}</TableCell>
                  <TableCell className="bg-primary/20 font-black text-primary text-center border-l p-2">₹{Math.round(grandTotals.salary).toLocaleString()}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editingDay} onOpenChange={() => setEditingDay(null)}>
        <DialogContent className="w-[95%] max-w-[425px] rounded-2xl sm:rounded-lg overflow-hidden p-0 border-none shadow-2xl">
          <DialogHeader className="p-6 bg-primary text-primary-foreground">
            <DialogTitle>Update Attendance - {editingDay?.date}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 p-6 bg-white">
            <div className="grid gap-2">
              <Label>Day Status</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm(p => ({ ...p, status: v }))}>
                <SelectTrigger className="h-12 rounded-xl">
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
            
            <div className="p-3 bg-blue-50 text-blue-900 border border-blue-200 text-xs rounded-xl flex items-start gap-2">
              <Calculator className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
              <div>
                <p className="font-bold">Note:</p>
                <p>ఎక్కువ షిఫ్టులు (Double Shift) చేసినప్పుడు వచ్చే అదనపు డ్యూటీ గంటలను కింద నియంత్రించవచ్చు.</p>
              </div>
            </div>

            <div className="grid gap-2 border p-3 rounded-xl bg-slate-50/50">
              <Label className="text-xs font-bold text-primary">అదనపు షిఫ్ట్ ప్రయోజనం</Label>
              <Select 
                value={editForm.extraShiftBenefit} 
                onValueChange={(v: 'OT' | 'C-off') => setEditForm(p => ({ ...p, extraShiftBenefit: v }))}
              >
                <SelectTrigger className="bg-white h-10 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OT">Overtime Pay (OT)</SelectItem>
                  <SelectItem value="C-off">C-off Credit (సెలవు)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Late-In (Hrs)</Label>
                <Input 
                  type="number" 
                  step="0.1" 
                  className="h-10 rounded-lg" 
                  placeholder={editingDay?.autoLate.toFixed(2) || "0"} 
                  value={editForm.lateIn} 
                  onChange={(e) => setEditForm(p => ({ ...p, lateIn: e.target.value }))} 
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Early Out (Hrs)</Label>
                <Input 
                  type="number" 
                  step="0.1" 
                  className="h-10 rounded-lg" 
                  placeholder="0" 
                  value={editForm.earlyOut} 
                  onChange={(e) => setEditForm(p => ({ ...p, earlyOut: e.target.value }))} 
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="text-[10px] uppercase font-bold text-slate-500">OT Hours (Manual Override)</Label>
              <Input type="number" step="0.5" className="h-10 rounded-lg" value={editForm.ot} onChange={(e) => setEditForm(p => ({ ...p, ot: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="p-4 bg-slate-50 flex gap-2">
            <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setEditingDay(null)}>Cancel</Button>
            <Button onClick={saveDayStatus} className="flex-1 h-12 rounded-xl bg-primary text-white">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
