'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/hooks/use-app';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, startOfYear, endOfYear, isSameDay, getDay, isSunday, isSaturday } from 'date-fns';
import { Users, CheckCircle2, Clock, Award, BarChart3 } from 'lucide-react';
import type { ShiftSettings } from '@/lib/types';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const isCOffStatus = (st?: string | null) => {
  if (!st) return false;
  const s = st.toLowerCase().trim();
  return s === 'c-off' || s === 'coff' || s === 'c_off' || s === 'comp-off' || s.includes('used');
};

export default function MonthlyReport() {
  const { employees, attendanceRecords, extraStatuses, markExtraStatus, shiftSettings } = useApp();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
  
  const [editingDay, setEditingDay] = useState<{ empId: string, date: string, autoLate: number } | null>(null);
  
  const [editForm, setEditForm] = useState<{ 
    status: string, 
    inTime: string,
    outTime: string,
    ot: string, 
    lateIn: string, 
    earlyOut: string, 
    extraShiftBenefit: 'OT' | 'C-off Earned' | 'None',
    coffCreditQty: string
  }>({ 
    status: 'None', 
    inTime: '09:00',
    outTime: '18:00',
    ot: '0', 
    lateIn: '',
    earlyOut: '0',
    extraShiftBenefit: 'OT',
    coffCreditQty: '1'
  });

  const selectedYear = selectedMonth.getFullYear();

  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(selectedMonth),
      end: endOfMonth(selectedMonth),
    });
  }, [selectedMonth]);

  // 1. నెలవారీ రిపోర్ట్ డేటా & C-off లెక్కింపు
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
      let monthlyCoffsUsed = 0;

      const dailyStatus = daysInMonth.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayRecords = attendanceRecords.filter(r => 
          r.employeeId.toUpperCase() === employee.id.toUpperCase() &&
          isSameDay(new Date(r.dateTime), day)
        );
        const extra = extraStatuses.find(ex => ex.employeeId.toUpperCase() === employee.id.toUpperCase() && ex.date === dateStr);

        const primaryRecord = dayRecords.length > 0 ? dayRecords[dayRecords.length - 1] : null; 
        const shiftType = primaryRecord?.shift || 'General';
        const shiftStartHour = shiftSettings[shiftType as keyof ShiftSettings]?.startHour ?? 9;
        const actualTime = primaryRecord ? new Date(primaryRecord.dateTime) : null;
        let autoLateIn = 0;
        if (actualTime) {
          const actualHours = actualTime.getHours() + actualTime.getMinutes() / 60;
          autoLateIn = Math.max(0, actualHours - shiftStartHour);
        }

        let status: 'Present' | 'Absent' | 'Week-off' | 'Leave' | 'Holiday' | 'C-off' | 'Half-Day' | 'OT' = 'Absent';
        
        if (extra && extra.status && extra.status !== 'None') {
          if (isCOffStatus(extra.status)) {
            status = 'C-off';
          } else {
            status = extra.status as any;
          }
        } else if (dayRecords.length > 0) {
          status = 'Present';
        } else if (employee.weekOffDay === DAYS_OF_WEEK[getDay(day)]) {
          status = 'Week-off';
        }

        // C-off Used లెక్కింపు
        if (status === 'C-off') {
          monthlyCoffsUsed += 1;
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

        const rawBenefit = extra?.extraShiftBenefit as any;
        const isCoffEarned = rawBenefit === 'C-off Earned' || rawBenefit === 'C-off';
        let finalOT = 0;
        let cOffCredit = 0;

        let rawExtraHours = extra?.otHours ?? autoExtraHours;
        if (status === 'OT' && rawExtraHours === 0) {
          rawExtraHours = 8;
        }

        // C-off Earned లెక్కింపు
        if (isCoffEarned) {
          cOffCredit = rawExtraHours > 0 ? Number((rawExtraHours / 8).toFixed(2)) : 1;
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
          extraShiftBenefit: isCoffEarned ? 'C-off Earned' : 'OT', 
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
      }, { Present: 0, Absent: 0, 'Week-off': 0, Leave: 0, Holiday: 0, 'C-off': 0, 'Half-Day': 0, OT: 0, totalOT: 0 });

      const presentsCount = (stats.Present || 0) + (stats.OT || 0);
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
        totalCoffsEarned: monthlyCoffsEarned,
        totalCoffsUsed: monthlyCoffsUsed,
        coffBalance: Number((monthlyCoffsEarned - monthlyCoffsUsed).toFixed(2))
      };
    });
  }, [employees, attendanceRecords, extraStatuses, daysInMonth, selectedMonth, shiftSettings]);

  // 2. ఎంచుకున్న పూర్తి సంవత్సరానికి C-off Earned vs C-off Used ట్రాకింగ్
  const yearlyReportData = useMemo(() => {
    const daysInYear = eachDayOfInterval({
      start: startOfYear(new Date(selectedYear, 0, 1)),
      end: endOfYear(new Date(selectedYear, 0, 1)),
    });

    return employees.filter(e => e.status === 'Approved' || e.status === 'Resigned').map(employee => {
      let pCount = 0;
      let otCount = 0;
      let totalOtHours = 0;
      let aCount = 0;
      let wCount = 0;
      let hCount = 0;
      let cOffUsed = 0;
      let hdCount = 0;
      let totalCoffsEarned = 0;

      daysInYear.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayRecords = attendanceRecords.filter(r => 
          r.employeeId.toUpperCase() === employee.id.toUpperCase() &&
          isSameDay(new Date(r.dateTime), day)
        );
        const extra = extraStatuses.find(ex => ex.employeeId.toUpperCase() === employee.id.toUpperCase() && ex.date === dateStr);

        let status = 'Absent';
        if (extra && extra.status && extra.status !== 'None') {
          if (isCOffStatus(extra.status)) {
            status = 'C-off';
          } else {
            status = extra.status;
          }
        } else if (dayRecords.length > 0) {
          status = 'Present';
        } else if (employee.weekOffDay === DAYS_OF_WEEK[getDay(day)]) {
          status = 'Week-off';
        }

        if (status === 'Present') pCount++;
        else if (status === 'OT') { otCount++; pCount++; }
        else if (status === 'Absent') aCount++;
        else if (status === 'Week-off') wCount++;
        else if (status === 'Holiday') hCount++;
        else if (status === 'C-off') cOffUsed++;
        else if (status === 'Half-Day') hdCount++;

        let autoExtra = 0;
        if (dayRecords.length > 1) {
          dayRecords.slice(0, dayRecords.length - 1).forEach(r => {
            autoExtra += shiftSettings[r.shift as keyof ShiftSettings]?.dutyHours || 8;
          });
        }
        let rawExtra = extra?.otHours ?? autoExtra;
        if (status === 'OT' && rawExtra === 0) rawExtra = 8;

        const rawBenefit = extra?.extraShiftBenefit as any;
        const isCoffEarned = rawBenefit === 'C-off Earned' || rawBenefit === 'C-off';

        if (isCoffEarned) {
          totalCoffsEarned += (rawExtra > 0 ? Number((rawExtra / 8).toFixed(2)) : 1);
        } else {
          totalOtHours += rawExtra;
        }
      });

      const coffPending = Math.max(0, totalCoffsEarned - cOffUsed);

      return {
        id: employee.id,
        name: employee.name,
        p: pCount,
        otHours: totalOtHours,
        a: aCount,
        w: wCount,
        h: hCount,
        hd: hdCount,
        coffEarned: Number(totalCoffsEarned.toFixed(2)),
        coffUsed: cOffUsed,
        coffPending: Number(coffPending.toFixed(2))
      };
    });
  }, [employees, attendanceRecords, extraStatuses, selectedYear, shiftSettings]);

  const yearlyGrandTotals = useMemo(() => {
    return yearlyReportData.reduce((acc, curr) => {
      acc.p += curr.p;
      acc.otHours += curr.otHours;
      acc.a += curr.a;
      acc.w += curr.w;
      acc.h += curr.h;
      acc.coffEarned += curr.coffEarned;
      acc.coffUsed += curr.coffUsed;
      acc.coffPending += curr.coffPending;
      return acc;
    }, { p: 0, otHours: 0, a: 0, w: 0, h: 0, coffEarned: 0, coffUsed: 0, coffPending: 0 });
  }, [yearlyReportData]);

  const grandTotals = useMemo(() => {
    return reportData.reduce((acc, curr) => {
      acc.totalDays += curr.totalDays;
      acc.present += ((curr.stats.Present || 0) + (curr.stats.OT || 0));
      acc.absent += (curr.stats.Absent || 0);
      acc.leave += (curr.stats.Leave || 0);
      acc.holiday += (curr.stats.Holiday || 0);
      acc.coff += (curr.stats['C-off'] || 0);
      acc.halfday += (curr.stats['Half-Day'] || 0);
      acc.weekoff += (curr.stats['Week-off'] || 0);
      acc.ot += curr.stats.totalOT;
      acc.coffsEarned += curr.totalCoffsEarned;
      acc.coffsUsed += curr.totalCoffsUsed;
      acc.paidWorkingDays += curr.paidWorkingDays;
      acc.salary += curr.salary;
      return acc;
    }, { totalDays: 0, present: 0, absent: 0, leave: 0, holiday: 0, coff: 0, halfday: 0, weekoff: 0, ot: 0, coffsEarned: 0, coffsUsed: 0, paidWorkingDays: 0, salary: 0 });
  }, [reportData]);

  const handleDayClick = (empId: string, dateStr: string) => {
    const current = extraStatuses.find(e => e.employeeId.toUpperCase() === empId.toUpperCase() && e.date === dateStr);
    const empData = reportData.find(d => d.id === empId);
    const dayData = empData?.dailyStatus.find(s => s.dateStr === dateStr);
    const autoLate = dayData?.autoLateIn || 0;

    let initialStatus = current?.status || 'None';
    if (isCOffStatus(initialStatus)) initialStatus = 'C-off';

    const rawBenefit = current?.extraShiftBenefit as any;
    const isBenefitCoff = rawBenefit === 'C-off Earned' || rawBenefit === 'C-off';

    setEditForm({ 
      status: initialStatus, 
      inTime: '09:00',
      outTime: (current?.otHours && current.otHours > 0) ? `${18 + Math.floor(current.otHours)}:00` : '18:00',
      ot: (current?.otHours || 0).toString(), 
      lateIn: current?.lateInHours !== undefined ? current.lateInHours.toString() : '', 
      earlyOut: (current?.earlyOutHours || 0).toString(), 
      extraShiftBenefit: isBenefitCoff ? 'C-off Earned' : 'OT',
      coffCreditQty: '1'
    });
    setEditingDay({ empId, date: dateStr, autoLate });
  };

  const handleTimingChange = (inT: string, outT: string) => {
    setEditForm(prev => {
      const [inH, inM] = inT.split(':').map(Number);
      const [outH, outM] = outT.split(':').map(Number);
      
      const inHours = inH + (inM / 60);
      let outHours = outH + (outM / 60);
      if (outHours < inHours) outHours += 24;

      const totalDuty = Math.max(0, outHours - inHours);
      const autoOT = totalDuty > 8 ? Number((totalDuty - 8).toFixed(1)) : 0;
      const autoLate = inHours > 9.25 ? Number((inHours - 9).toFixed(1)) : 0;

      return {
        ...prev,
        inTime: inT,
        outTime: outT,
        ot: autoOT.toString(),
        lateIn: autoLate > 0 ? autoLate.toString() : prev.lateIn
      };
    });
  };

  const saveDayStatus = () => {
    if (!editingDay) return;
    const { empId, date } = editingDay;
    
    let hoursToSave = parseFloat(editForm.ot) || 0;
    // C-off Earned ఎంచుకుంటే 1 C-off = 8 గంటల పని సమానం
    if (editForm.extraShiftBenefit === 'C-off Earned' && hoursToSave === 0) {
      hoursToSave = parseFloat(editForm.coffCreditQty) * 8;
    }

    markExtraStatus(
      empId, 
      date, 
      editForm.status as any, 
      hoursToSave, 
      editForm.lateIn === '' ? 0 : parseFloat(editForm.lateIn), 
      parseFloat(editForm.earlyOut) || 0, 
      (editForm.extraShiftBenefit === 'C-off Earned' ? 'C-off' : 'OT') as any
    );
    setEditingDay(null);
  };

  const currentYear = selectedMonth.getFullYear();
  const currentMonth = selectedMonth.getMonth();

  return (
    <div className="space-y-6">
      {/* టాప్ సమ్మరీ కార్డ్స్ */}
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
              <p className="text-[10px] sm:text-sm font-medium uppercase tracking-wider">{viewMode === 'year' ? `${selectedYear} OT` : 'Month OT'}</p>
              <h3 className="text-lg sm:text-2xl font-bold">{viewMode === 'year' ? `${yearlyGrandTotals.otHours}h` : `${grandTotals.ot}h`}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50">
          <CardContent className="p-3 sm:pt-6 flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4 text-center sm:text-left">
            <Award className="h-5 w-5 sm:h-6 sm:w-6 text-teal-600" />
            <div>
              <p className="text-[10px] sm:text-sm font-medium uppercase tracking-wider">{viewMode === 'year' ? `${selectedYear} C-off Bal` : 'C-offs (Used/Earned)'}</p>
              <h3 className="text-lg sm:text-2xl font-bold">
                {viewMode === 'year' ? `${yearlyGrandTotals.coffPending.toFixed(1)} Bal` : `${grandTotals.coffsUsed} Used / ${grandTotals.coffsEarned.toFixed(1)} Earned`}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/80 shadow-md">
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0 px-4 sm:px-6">
          <div className="w-full">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl sm:text-2xl font-bold">
                {viewMode === 'month' ? 'Master Attendance Report' : `${selectedYear} Full Year Attendance & C-off Ledger`}
              </CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm mt-1">
              {viewMode === 'month' 
                ? '👉 1 నుండి 30/31 వరకు రోజులను చూడండి లేదా "Full Year Summary" బాక్స్ నొక్కి సంవత్సరం మొత్తం లెక్కలు చూడండి.' 
                : `👉 ${selectedYear} సంవత్సరానికి సంబంధించిన మొత్తం P, OT, A, W, H మరియు C-off Earned / Used లెక్కలు.`}
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <Select value={currentYear.toString()} onValueChange={(v) => {
              const d = new Date(selectedMonth);
              d.setFullYear(parseInt(v));
              setSelectedMonth(d);
            }}>
              <SelectTrigger className="w-[100px] h-10 font-bold bg-slate-50 border-slate-300">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 2050 - 2020 + 1 }).map((_, i) => {
                  const year = 2020 + i;
                  return <SelectItem key={year} value={year.toString()}>{year}</SelectItem>;
                })}
              </SelectContent>
            </Select>

            {viewMode === 'month' && (
              <Select value={currentMonth.toString()} onValueChange={(v) => {
                const d = new Date(selectedMonth);
                d.setMonth(parseInt(v));
                setSelectedMonth(d);
              }}>
                <SelectTrigger className="w-[130px] h-10 font-bold bg-slate-50 border-slate-300">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <SelectItem key={i} value={i.toString()}>{format(new Date(2000, i, 1), 'MMMM')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button
              variant={viewMode === 'year' ? "default" : "outline"}
              className={`h-10 px-3.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'year' 
                  ? 'bg-primary text-white shadow-md' 
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
              }`}
              onClick={() => setViewMode(prev => prev === 'month' ? 'year' : 'month')}
            >
              <BarChart3 className="w-4 h-4 text-amber-600" />
              <span>{viewMode === 'year' ? 'Back to Monthly' : `${selectedYear} Full Year Summary`}</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0 sm:p-4">
          {viewMode === 'year' ? (
            <div className="space-y-4">
              <div className="mx-2 sm:mx-0 p-4 bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Award className="w-6 h-6 text-teal-700" />
                  <div>
                    <h4 className="text-sm font-bold text-teal-950">{selectedYear} C-off Balance Overview</h4>
                    <p className="text-xs text-teal-800">C-off Earned (సంపాదించినవి) - C-off Used (వాడినవి) = C-off Pending (మిగిలిన బ్యాలెన్స్)</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="bg-white px-3 py-1.5 rounded-lg border border-teal-200 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Earned</span>
                    <span className="text-sm font-black text-teal-700">{yearlyGrandTotals.coffEarned.toFixed(1)}</span>
                  </div>
                  <div className="bg-white px-3 py-1.5 rounded-lg border border-purple-200 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Used</span>
                    <span className="text-sm font-black text-purple-700">{yearlyGrandTotals.coffUsed}</span>
                  </div>
                  <div className="bg-white px-3 py-1.5 rounded-lg border border-amber-300 text-center shadow-sm">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Balance Pending</span>
                    <span className="text-sm font-black text-amber-600">{yearlyGrandTotals.coffPending.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              <div 
                style={{
                  width: '100%',
                  overflowX: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
              >
                <table 
                  style={{
                    width: '100%',
                    minWidth: '1000px',
                    borderCollapse: 'collapse',
                    textAlign: 'center',
                    backgroundColor: '#ffffff'
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', height: '48px', borderBottom: '2px solid #cbd5e1' }}>
                      <th style={{ width: '220px', padding: '10px 14px', textAlign: 'left', fontWeight: 'bold', fontSize: '13px', borderRight: '2px solid #cbd5e1' }}>Employee Name</th>
                      <th title="Total Present" style={{ width: '80px', fontWeight: 'bold', color: '#15803d', backgroundColor: '#dcfce7', borderRight: '1px solid #cbd5e1' }}>P (Present)</th>
                      <th title="Total OT Hours" style={{ width: '90px', fontWeight: 'bold', color: '#c2410c', backgroundColor: '#ffedd5', borderRight: '1px solid #cbd5e1' }}>OT (Hours)</th>
                      <th title="Total Absent" style={{ width: '80px', fontWeight: 'bold', color: '#b91c1c', backgroundColor: '#fee2e2', borderRight: '1px solid #cbd5e1' }}>A (Absent)</th>
                      <th title="Total Week-off" style={{ width: '85px', fontWeight: 'bold', color: '#b45309', backgroundColor: '#fef3c7', borderRight: '1px solid #cbd5e1' }}>W (Week-off)</th>
                      <th title="Total Company Holiday" style={{ width: '85px', fontWeight: 'bold', color: '#7e22ce', backgroundColor: '#f3e8ff', borderRight: '1px solid #cbd5e1' }}>H (Holiday)</th>
                      <th style={{ width: '105px', fontWeight: 'bold', color: '#0f766e', backgroundColor: '#ccfbf1', borderRight: '1px solid #cbd5e1' }}>C-off Earned</th>
                      <th style={{ width: '95px', fontWeight: 'bold', color: '#6b21a8', backgroundColor: '#fae8ff', borderRight: '1px solid #cbd5e1' }}>C-off Used</th>
                      <th style={{ width: '120px', fontWeight: '900', color: '#b45309', backgroundColor: '#fef3c7' }}>C-off Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearlyReportData.map(emp => (
                      <tr key={emp.id} style={{ borderBottom: '1px solid #e2e8f0', height: '48px' }}>
                        <td style={{ width: '220px', padding: '8px 14px', textAlign: 'left', borderRight: '2px solid #cbd5e1', fontWeight: 'bold' }}>
                          <div style={{ fontSize: '13px', color: '#0f172a' }}>{emp.name}</div>
                          <div style={{ fontSize: '10px', color: '#64748b' }}>{emp.id}</div>
                        </td>
                        <td style={{ fontWeight: 'bold', color: '#15803d', borderRight: '1px solid #cbd5e1' }}>{emp.p}</td>
                        <td style={{ fontWeight: 'bold', color: '#c2410c', borderRight: '1px solid #cbd5e1' }}>{emp.otHours}h</td>
                        <td style={{ fontWeight: 'bold', color: '#dc2626', borderRight: '1px solid #cbd5e1' }}>{emp.a}</td>
                        <td style={{ fontWeight: 'bold', color: '#b45309', borderRight: '1px solid #cbd5e1' }}>{emp.w}</td>
                        <td style={{ fontWeight: 'bold', color: '#7e22ce', borderRight: '1px solid #cbd5e1' }}>{emp.h}</td>
                        <td style={{ fontWeight: 'bold', color: '#0f766e', borderRight: '1px solid #cbd5e1' }}>{emp.coffEarned.toFixed(1)}</td>
                        <td style={{ fontWeight: 'bold', color: '#7e22ce', borderRight: '1px solid #cbd5e1' }}>{emp.coffUsed}</td>
                        <td style={{ fontWeight: '900', color: emp.coffPending > 0 ? '#b45309' : '#64748b', backgroundColor: emp.coffPending > 0 ? '#fffbeb' : '#fff' }}>
                          <span className={`px-2.5 py-1 rounded-md text-xs font-black ${emp.coffPending > 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'text-slate-400'}`}>
                            {emp.coffPending.toFixed(1)} Bal
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: '#f8fafc', height: '48px', fontWeight: '900', borderTop: '2px solid #cbd5e1' }}>
                      <td style={{ padding: '8px 14px', textAlign: 'left', borderRight: '2px solid #cbd5e1' }}>Grand Total ({selectedYear})</td>
                      <td style={{ color: '#15803d', borderRight: '1px solid #cbd5e1', backgroundColor: '#dcfce7' }}>{yearlyGrandTotals.p}</td>
                      <td style={{ color: '#c2410c', borderRight: '1px solid #cbd5e1', backgroundColor: '#ffedd5' }}>{yearlyGrandTotals.otHours}h</td>
                      <td style={{ color: '#b91c1c', borderRight: '1px solid #cbd5e1', backgroundColor: '#fee2e2' }}>{yearlyGrandTotals.a}</td>
                      <td style={{ color: '#b45309', borderRight: '1px solid #cbd5e1', backgroundColor: '#fef3c7' }}>{yearlyGrandTotals.w}</td>
                      <td style={{ color: '#7e22ce', borderRight: '1px solid #cbd5e1', backgroundColor: '#f3e8ff' }}>{yearlyGrandTotals.h}</td>
                      <td style={{ color: '#0f766e', borderRight: '1px solid #cbd5e1', backgroundColor: '#ccfbf1' }}>{yearlyGrandTotals.coffEarned.toFixed(1)}</td>
                      <td style={{ color: '#7e22ce', borderRight: '1px solid #cbd5e1', backgroundColor: '#fae8ff' }}>{yearlyGrandTotals.coffUsed}</td>
                      <td style={{ color: '#b45309', backgroundColor: '#fef3c7' }}>{yearlyGrandTotals.coffPending.toFixed(1)} Pending</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div 
              style={{
                width: '100%',
                maxWidth: '100%',
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
                border: '1px solid #e2e8f0',
                borderRadius: '8px'
              }}
            >
              <table 
                style={{
                  width: '2350px',
                  minWidth: '2350px',
                  borderCollapse: 'collapse',
                  textAlign: 'center',
                  backgroundColor: '#ffffff'
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', height: '50px', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ width: '180px', padding: '10px', textAlign: 'left', fontWeight: 'bold', fontSize: '13px', borderRight: '2px solid #cbd5e1', whiteSpace: 'nowrap' }}>
                      Employee Name
                    </th>
                    
                    {daysInMonth.map(day => {
                      const isSun = isSunday(day);
                      const isSat = isSaturday(day);
                      return (
                        <th 
                          key={day.toISOString()} 
                          style={{
                            width: '46px',
                            minWidth: '46px',
                            padding: '4px',
                            borderRight: '1px solid #e2e8f0',
                            backgroundColor: isSun ? '#fee2e2' : isSat ? '#fef3c7' : '#f8fafc',
                            color: isSun ? '#b91c1c' : isSat ? '#b45309' : '#334155',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{format(day, 'd')}</div>
                          <div style={{ fontSize: '9px', textTransform: 'uppercase', opacity: 0.8 }}>{format(day, 'EEE')}</div>
                        </th>
                      );
                    })}

                    <th title="Present" style={{ width: '48px', fontWeight: 'bold', color: '#15803d', backgroundColor: '#dcfce7', borderRight: '1px solid #cbd5e1' }}>P</th>
                    <th title="Absent" style={{ width: '48px', fontWeight: 'bold', color: '#b91c1c', backgroundColor: '#fee2e2', borderRight: '1px solid #cbd5e1' }}>A</th>
                    <th title="Week-off" style={{ width: '48px', fontWeight: 'bold', color: '#b45309', backgroundColor: '#fef3c7', borderRight: '1px solid #cbd5e1' }}>W</th>
                    <th title="Holiday" style={{ width: '48px', fontWeight: 'bold', color: '#7e22ce', backgroundColor: '#f3e8ff', borderRight: '1px solid #cbd5e1' }}>H</th>
                    <th title="C-off Used" style={{ width: '52px', fontWeight: 'bold', color: '#0f766e', backgroundColor: '#ccfbf1', borderRight: '1px solid #cbd5e1' }}>C-off</th>
                    <th title="OT Hours" style={{ width: '50px', fontWeight: 'bold', color: '#c2410c', backgroundColor: '#ffedd5', borderRight: '1px solid #cbd5e1' }}>OT</th>
                    <th title="Late Hours" style={{ width: '50px', fontWeight: 'bold', color: '#dc2626', backgroundColor: '#f1f5f9', borderRight: '1px solid #cbd5e1' }}>Late</th>
                    <th title="Paid Days" style={{ width: '55px', fontWeight: 'bold', color: '#1d4ed8', backgroundColor: '#eff6ff', borderRight: '1px solid #cbd5e1' }}>Paid</th>
                    <th title="Net Salary" style={{ width: '120px', fontWeight: 'bold', color: '#1e3a8a', backgroundColor: '#dbeafe', whiteSpace: 'nowrap' }}>Net Sal</th>
                  </tr>
                </thead>

                <tbody>
                  {reportData.map(row => (
                    <tr key={row.id} style={{ borderBottom: '1px solid #e2e8f0', height: '48px' }}>
                      <td style={{ width: '180px', padding: '8px 12px', textAlign: 'left', borderRight: '2px solid #cbd5e1', backgroundColor: '#ffffff', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#0f172a' }}>
                          {row.name}
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>{row.id}</div>
                      </td>

                      {row.dailyStatus.map((s, i) => {
                        const isSun = isSunday(s.day);
                        const isSat = isSaturday(s.day);
                        return (
                          <td 
                            key={i} 
                            onClick={() => handleDayClick(row.id, s.dateStr)}
                            style={{
                              width: '46px',
                              minWidth: '46px',
                              padding: '2px',
                              borderRight: '1px solid #f1f5f9',
                              cursor: 'pointer',
                              backgroundColor: isSun ? 'rgba(254, 226, 226, 0.3)' : isSat ? 'rgba(254, 243, 199, 0.3)' : '#ffffff'
                            }}
                          >
                            <div 
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '6px',
                                margin: '0 auto',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                position: 'relative',
                                backgroundColor: 
                                  s.status === 'Present' ? '#16a34a' : 
                                  s.status === 'OT' ? '#ea580c' : 
                                  s.status === 'Half-Day' ? '#f59e0b' : 
                                  s.status === 'Holiday' ? '#9333ea' : 
                                  s.status === 'Leave' ? '#2563eb' : 
                                  s.status === 'C-off' ? '#0d9488' : 
                                  s.status === 'Week-off' ? '#fef08a' : '#fee2e2',
                                color: 
                                  s.status === 'Week-off' ? '#854d0e' : 
                                  s.status === 'Absent' ? '#dc2626' : '#ffffff'
                              }}
                            >
                              {s.status === 'Present' ? 'P' : 
                               s.status === 'OT' ? 'OT' : 
                               s.status === 'Half-Day' ? 'HD' : 
                               s.status === 'Holiday' ? 'H' : 
                               s.status === 'Leave' ? 'L' : 
                               s.status === 'C-off' ? 'C' : 
                               s.status === 'Week-off' ? 'W' : 'A'}
                               
                              {s.punches > 1 && (
                                <div style={{
                                  position: 'absolute',
                                  top: '-3px',
                                  right: '-3px',
                                  backgroundColor: '#1d4ed8',
                                  color: '#ffffff',
                                  fontSize: '8px',
                                  width: '14px',
                                  height: '14px',
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  border: '1px solid #ffffff'
                                }}>
                                  {s.punches}
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      <td style={{ width: '48px', fontWeight: 'bold', color: '#15803d', borderRight: '1px solid #cbd5e1' }}>{row.stats.Present || 0}</td>
                      <td style={{ width: '48px', fontWeight: 'bold', color: '#dc2626', borderRight: '1px solid #cbd5e1' }}>{row.stats.Absent || 0}</td>
                      <td style={{ width: '48px', fontWeight: 'bold', color: '#b45309', borderRight: '1px solid #cbd5e1' }}>{row.stats['Week-off'] || 0}</td>
                      <td style={{ width: '48px', fontWeight: 'bold', color: '#7e22ce', borderRight: '1px solid #cbd5e1' }}>{row.stats.Holiday || 0}</td>
                      <td title="C-off Used" style={{ width: '52px', fontWeight: 'bold', color: '#0f766e', borderRight: '1px solid #cbd5e1' }}>
                        {row.stats['C-off'] || 0}
                      </td>
                      <td style={{ width: '50px', fontWeight: 'bold', color: '#c2410c', borderRight: '1px solid #cbd5e1' }}>{row.stats.totalOT}h</td>
                      <td style={{ width: '50px', fontWeight: 'bold', color: '#ef4444', borderRight: '1px solid #cbd5e1' }}>{row.totalLateHoursCut.toFixed(1)}</td>
                      <td style={{ width: '55px', fontWeight: '900', color: '#1d4ed8', backgroundColor: '#f8fafc', borderRight: '1px solid #cbd5e1' }}>{row.paidWorkingDays}</td>
                      <td style={{ width: '120px', fontWeight: 'bold', color: '#1e3a8a', backgroundColor: '#ffffff', whiteSpace: 'nowrap' }}>
                        ₹{Math.round(row.salary).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>

                <tfoot>
                  <tr style={{ backgroundColor: '#f8fafc', height: '48px', fontWeight: 'bold', borderTop: '2px solid #cbd5e1' }}>
                    <td style={{ width: '180px', padding: '8px 12px', textAlign: 'left', borderRight: '2px solid #cbd5e1', fontWeight: '900', whiteSpace: 'nowrap' }}>Grand Total</td>
                    
                    {daysInMonth.map((_, i) => (
                      <td key={`ft-date-${i}`} style={{ width: '46px', minWidth: '46px', color: '#94a3b8', borderRight: '1px solid #f1f5f9' }}>-</td>
                    ))}

                    <td title="Total Present" style={{ width: '48px', color: '#15803d', borderRight: '1px solid #cbd5e1', backgroundColor: '#dcfce7' }}>{grandTotals.present}</td>
                    <td title="Total Absent" style={{ width: '48px', color: '#b91c1c', borderRight: '1px solid #cbd5e1', backgroundColor: '#fee2e2' }}>{grandTotals.absent}</td>
                    <td title="Total Week-offs" style={{ width: '48px', color: '#b45309', borderRight: '1px solid #cbd5e1', backgroundColor: '#fef3c7' }}>{grandTotals.weekoff}</td>
                    <td title="Total Holidays" style={{ width: '48px', color: '#7e22ce', borderRight: '1px solid #cbd5e1', backgroundColor: '#f3e8ff' }}>{grandTotals.holiday}</td>
                    <td title="Total C-offs Used" style={{ width: '52px', color: '#0f766e', borderRight: '1px solid #cbd5e1', backgroundColor: '#ccfbf1' }}>{grandTotals.coff}</td>
                    <td title="Total Overtime" style={{ width: '50px', color: '#c2410c', borderRight: '1px solid #cbd5e1', backgroundColor: '#ffedd5' }}>{grandTotals.ot}h</td>
                    <td title="Total Late Hours" style={{ width: '50px', color: '#dc2626', borderRight: '1px solid #cbd5e1' }}>{reportData.reduce((acc, r) => acc + r.totalLateHoursCut, 0).toFixed(1)}</td>
                    <td title="Total Paid Days" style={{ width: '55px', color: '#1d4ed8', backgroundColor: '#eff6ff', borderRight: '1px solid #cbd5e1' }}>{grandTotals.paidWorkingDays}</td>
                    <td title="Total Net Salary" style={{ width: '120px', color: '#1e3a8a', backgroundColor: '#dbeafe', whiteSpace: 'nowrap' }}>₹{Math.round(grandTotals.salary).toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* మోడల్ డైలాగ్ - C-off Earned & C-off Used స్పష్టమైన ఆప్షన్లతో */}
      <Dialog open={!!editingDay} onOpenChange={() => setEditingDay(null)}>
        <DialogContent className="w-[95%] max-w-[450px] rounded-2xl sm:rounded-lg overflow-hidden p-0 border-none shadow-2xl">
          <DialogHeader className="p-5 bg-primary text-primary-foreground">
            <DialogTitle className="text-lg">Update Attendance & Benefit - {editingDay?.date}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 p-5 bg-white max-h-[80vh] overflow-y-auto">
            
            {/* 1. డే స్టేటస్ (C-off Used ఇక్కడ ఉంటుంది) */}
            <div className="grid gap-2">
              <Label className="text-xs font-bold text-slate-700">Day Status (హాజరు రకం)</Label>
              <Select value={editForm.status} onValueChange={(v) => {
                setEditForm(p => ({ 
                  ...p, 
                  status: v, 
                  ot: (v === 'OT' && (p.ot === '0' || !p.ot)) ? '8' : p.ot 
                }));
              }}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">Reset (Auto Mode)</SelectItem>
                  <SelectItem value="Present">Present (హాజరు - P)</SelectItem>
                  <SelectItem value="C-off">C-off Used (సెలవు వాడుకున్నారు - C)</SelectItem>
                  <SelectItem value="OT">OT (ఓవర్‌టైమ్ / డబుల్ డ్యూటీ - OT)</SelectItem>
                  <SelectItem value="Half-Day">Half-Day (సగం రోజు - HD)</SelectItem>
                  <SelectItem value="Week-off">Week-off (వారపు సెలవు - W)</SelectItem>
                  <SelectItem value="Holiday">Company Holiday (కంపెనీ సెలవు - H)</SelectItem>
                  <SelectItem value="Leave">Leave (సెలవు / Unpaid - L)</SelectItem>
                  <SelectItem value="Absent">Absent (గైర్హాజరు - A)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 2. అదనపు డ్యూటీ ప్రయోజనం (Benefit Type - C-off Earned ఇక్కడ ఉంటుంది) */}
            <div className="p-3.5 border rounded-xl bg-teal-50/60 border-teal-200 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-teal-700" /> Benefit Type (ప్రయోజనం రకం)
                </Label>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-teal-300 text-teal-800">
                  {editForm.extraShiftBenefit}
                </span>
              </div>

              <Select 
                value={editForm.extraShiftBenefit} 
                onValueChange={(v: 'OT' | 'C-off Earned' | 'None') => setEditForm(p => ({ ...p, extraShiftBenefit: v }))}
              >
                <SelectTrigger className="bg-white h-10 rounded-lg text-xs font-bold border-teal-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OT">Overtime Pay (డబ్బుల రూపంలో OT Pay)</SelectItem>
                  <SelectItem value="C-off Earned">C-off Earned (ఖాతాలో C-off క్రెడిట్ కలపండి)</SelectItem>
                  <SelectItem value="None">No Extra Benefit (సాధారణ డ్యూటీ)</SelectItem>
                </SelectContent>
              </Select>

              {/* ఒకవేళ C-off Earned సెలెక్ట్ చేస్తే ఎన్ని C-off లు క్రెడిట్ అవ్వాలో సులువుగా ఎంచుకోవచ్చు */}
              {editForm.extraShiftBenefit === 'C-off Earned' && (
                <div className="pt-1 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-teal-800 block">ఎన్ని C-off క్రెడిట్ సంపాదించారు?</span>
                  <div className="flex gap-2">
                    {['0.5', '1', '1.5', '2'].map(qty => (
                      <Button 
                        key={qty} 
                        type="button" 
                        variant={editForm.coffCreditQty === qty ? "default" : "outline"}
                        className={`h-8 flex-1 text-xs rounded-lg font-bold ${editForm.coffCreditQty === qty ? 'bg-teal-700 text-white' : 'bg-white text-teal-900 border-teal-300'}`}
                        onClick={() => setEditForm(p => ({ ...p, coffCreditQty: qty, ot: (parseFloat(qty) * 8).toString() }))}
                      >
                        +{qty} C-off
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. డ్యూటీ టైమింగ్స్ */}
            {(editForm.status === 'Present' || editForm.status === 'OT' || editForm.status === 'None') && (
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                <Label className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-700" /> HR Duty Timings
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500">In Time</span>
                    <Input 
                      type="time" 
                      className="h-9 bg-white rounded-lg border-blue-200 text-xs font-semibold"
                      value={editForm.inTime} 
                      onChange={(e) => handleTimingChange(e.target.value, editForm.outTime)} 
                    />
                  </div>
                  <div className="grid gap-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Out Time</span>
                    <Input 
                      type="time" 
                      className="h-9 bg-white rounded-lg border-blue-200 text-xs font-semibold"
                      value={editForm.outTime} 
                      onChange={(e) => handleTimingChange(editForm.inTime, e.target.value)} 
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 4. OT Hours (Overtime Pay ఉన్నప్పుడు) */}
            {editForm.extraShiftBenefit === 'OT' && (
              <div className="p-3 border rounded-xl bg-orange-50/50 border-orange-200 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-orange-950">OT Hours</Label>
                  <span className="text-xs font-black text-orange-600 bg-orange-100 px-2 py-0.5 rounded-md">{editForm.ot}h OT</span>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {['0', '1', '2', '4', '8'].map(hrs => (
                    <Button 
                      key={hrs} 
                      type="button" 
                      variant={editForm.ot === hrs ? "default" : "outline"}
                      className={`h-7 px-2.5 text-xs rounded-md ${editForm.ot === hrs ? 'bg-orange-600 text-white font-bold' : 'bg-white text-slate-700 border-orange-200'}`}
                      onClick={() => setEditForm(p => ({ ...p, ot: hrs }))}
                    >
                      {hrs === '0' ? 'No OT' : hrs === '8' ? 'Full Shift (8h)' : `+${hrs}h`}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* 5. లేట్-ఇన్ & ఎర్లీ-అవుట్ */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Late-In (గంటలు)</Label>
                <Input 
                  type="number" 
                  step="0.1" 
                  className="h-9 rounded-lg text-xs" 
                  placeholder={editingDay?.autoLate.toFixed(2) || "0"} 
                  value={editForm.lateIn} 
                  onChange={(e) => setEditForm(p => ({ ...p, lateIn: e.target.value }))} 
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Early Out (గంటలు)</Label>
                <Input 
                  type="number" 
                  step="0.1" 
                  className="h-9 rounded-lg text-xs" 
                  placeholder="0" 
                  value={editForm.earlyOut} 
                  onChange={(e) => setEditForm(p => ({ ...p, earlyOut: e.target.value }))} 
                />
              </div>
            </div>

          </div>
          
          <DialogFooter className="p-4 bg-slate-50 flex gap-2">
            <Button variant="outline" className="flex-1 h-11 rounded-xl" onClick={() => setEditingDay(null)}>Cancel</Button>
            <Button onClick={saveDayStatus} className="flex-1 h-11 rounded-xl bg-primary text-white font-bold">Save Attendance</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
