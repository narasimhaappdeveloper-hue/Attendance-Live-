'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/hooks/use-app';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
      {/* టాప్ స్టాట్స్ కార్డ్స్ */}
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
              👉 1 నుండి 30/31 వరకు అన్ని తేదీలు చూడటానికి టేబుల్‌ను ఎడమవైపుకి జరపండి (Scroll Horizontally).
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
          {/* గ్యారంటీడ్ హారిజాంటల్ స్క్రోల్ కంటైనర్ */}
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
            {/* కచ్చితమైన వెడల్పు (2200px) - ఏ సెల్ కూడా ఇరుకు అవ్వదు */}
            <table 
              style={{
                width: '2200px',
                minWidth: '2200px',
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
                          width: '48px',
                          minWidth: '48px',
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

                  <th style={{ width: '52px', fontWeight: 'bold', color: '#15803d', backgroundColor: '#dcfce7', borderRight: '1px solid #cbd5e1' }}>P</th>
                  <th style={{ width: '52px', fontWeight: 'bold', color: '#b91c1c', backgroundColor: '#fee2e2', borderRight: '1px solid #cbd5e1' }}>A</th>
                  <th style={{ width: '55px', fontWeight: 'bold', color: '#0f766e', backgroundColor: '#ccfbf1', borderRight: '1px solid #cbd5e1' }}>C-off</th>
                  <th style={{ width: '55px', fontWeight: 'bold', color: '#dc2626', backgroundColor: '#f1f5f9', borderRight: '1px solid #cbd5e1' }}>Late</th>
                  <th style={{ width: '60px', fontWeight: 'bold', color: '#1d4ed8', backgroundColor: '#eff6ff', borderRight: '1px solid #cbd5e1' }}>Paid</th>
                  <th style={{ width: '120px', fontWeight: 'bold', color: '#1e3a8a', backgroundColor: '#dbeafe', whiteSpace: 'nowrap' }}>Net Sal</th>
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
                            width: '48px',
                            minWidth: '48px',
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
                                s.status === 'Half-Day' ? '#f59e0b' : 
                                s.status === 'Holiday' ? '#9333ea' :
                                s.status === 'Leave' ? '#2563eb' :
                                s.status === 'C-off' ? '#0d9488' :
                                s.status === 'Week-off' ? '#e2e8f0' : '#fee2e2',
                              color: 
                                s.status === 'Week-off' ? '#334155' : 
                                s.status === 'Absent' ? '#dc2626' : '#ffffff'
                            }}
                          >
                            {s.status === 'Present' ? 'P' : 
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

                    <td style={{ width: '52px', fontWeight: 'bold', color: '#15803d', borderRight: '1px solid #cbd5e1' }}>{row.stats.Present || 0}</td>
                    <td style={{ width: '52px', fontWeight: 'bold', color: '#dc2626', borderRight: '1px solid #cbd5e1' }}>{row.stats.Absent || 0}</td>
                    <td style={{ width: '55px', fontWeight: 'bold', color: '#0f766e', borderRight: '1px solid #cbd5e1' }}>{row.totalCoffsEarned.toFixed(1)}</td>
                    <td style={{ width: '55px', fontWeight: 'bold', color: '#ef4444', borderRight: '1px solid #cbd5e1' }}>{row.totalLateHoursCut.toFixed(1)}</td>
                    <td style={{ width: '60px', fontWeight: '900', color: '#1d4ed8', backgroundColor: '#f8fafc', borderRight: '1px solid #cbd5e1' }}>{row.paidWorkingDays}</td>
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
                    <td key={`ft-date-${i}`} style={{ width: '48px', minWidth: '48px', color: '#94a3b8', borderRight: '1px solid #f1f5f9' }}>-</td>
                  ))}

                  <td style={{ width: '52px', color: '#15803d', borderRight: '1px solid #cbd5e1', backgroundColor: '#dcfce7' }}>{grandTotals.present}</td>
                  <td style={{ width: '52px', color: '#b91c1c', borderRight: '1px solid #cbd5e1', backgroundColor: '#fee2e2' }}>{grandTotals.absent}</td>
                  <td style={{ width: '55px', color: '#0f766e', borderRight: '1px solid #cbd5e1', backgroundColor: '#ccfbf1' }}>{grandTotals.coffsEarned.toFixed(1)}</td>
                  <td style={{ width: '55px', color: '#dc2626', borderRight: '1px solid #cbd5e1' }}>{reportData.reduce((acc, r) => acc + r.totalLateHoursCut, 0).toFixed(1)}</td>
                  <td style={{ width: '60px', color: '#1d4ed8', backgroundColor: '#eff6ff', borderRight: '1px solid #cbd5e1' }}>{grandTotals.paidWorkingDays}</td>
                  <td style={{ width: '120px', color: '#1e3a8a', backgroundColor: '#dbeafe', whiteSpace: 'nowrap' }}>₹{Math.round(grandTotals.salary).toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
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
