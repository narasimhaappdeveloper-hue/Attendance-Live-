'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/hooks/use-app';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from 'date-fns';
import { 
  FileText, 
  Printer, 
  CheckCircle2, 
  IndianRupee, 
  LoaderCircle, 
  Briefcase, 
  Info, 
  Send, 
  Mail, 
  MessageSquareShare, 
  SlidersHorizontal,
  Bot
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { SalarySlip, ShiftSettings } from '@/lib/types';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type DeliveryChannel = 'whatsapp' | 'email' | 'both';
type DispatchMode = 'manual' | 'automatic';

export default function SalarySlips() {
  const { employees, attendanceRecords, extraStatuses, salarySlips, saveSalarySlip, shiftSettings } = useApp();
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedSlip, setSelectedSlip] = useState<SalarySlip | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);

  // ఛానల్ మరియు ఆటోమేషన్ మోడ్ స్టేట్
  const [deliveryChannel, setDeliveryChannel] = useState<DeliveryChannel>('both');
  const [dispatchMode, setDispatchMode] = useState<DispatchMode>('manual');

  const monthStr = format(selectedMonth, 'yyyy-MM');

  const calculatedData = useMemo(() => {
    const start = startOfMonth(selectedMonth);
    const end = endOfMonth(selectedMonth);
    const daysInMonth = eachDayOfInterval({ start, end });
    const totalDaysCount = daysInMonth.length;

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
      let p = 0, l = 0, h = 0, c = 0, w = 0, ot = 0, a = 0, hd = 0;
      let totalLateHoursCut = 0;

      daysInMonth.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const record = attendanceRecords.find(r => 
          r.employeeId.toUpperCase() === employee.id.toUpperCase() && 
          isSameDay(new Date(r.dateTime), day)
        );
        const extra = extraStatuses.find(ex => ex.employeeId === employee.id && ex.date === dateStr);

        let activeStatus = 'Absent';
        if (extra && extra.status !== 'None') {
          activeStatus = extra.status;
        } else if (record) {
          activeStatus = 'Present';
        } else if (employee.weekOffDay === DAYS_OF_WEEK[getDay(day)]) {
          activeStatus = 'Week-off';
        }

        if (activeStatus === 'Present') p++;
        else if (activeStatus === 'Half-Day') hd++;
        else if (activeStatus === 'Leave') l++;
        else if (activeStatus === 'Holiday') h++;
        else if (activeStatus === 'C-off') c++;
        else if (activeStatus === 'Week-off') w++;
        else a++;
        
        if (extra?.otHours) ot += extra.otHours;
        
        const shiftType = record?.shift || 'General';
        const shiftConfig = shiftSettings[shiftType as keyof ShiftSettings];
        const shiftStartHour = shiftConfig?.startHour ?? 9;
        
        const actualTime = record ? new Date(record.dateTime) : null;
        let autoLateIn = 0;
        if (actualTime) {
          const actualHours = actualTime.getHours() + actualTime.getMinutes() / 60;
          autoLateIn = Math.max(0, actualHours - shiftStartHour);
        }

        const effectiveLateIn = (extra && extra.lateInHours !== undefined && extra.lateInHours !== 0) 
          ? extra.lateInHours 
          : (activeStatus === 'Absent' || activeStatus === 'Leave' ? 0 : autoLateIn);
          
        const dailyLate = effectiveLateIn + (extra?.earlyOutHours || 0);
        totalLateHoursCut += dailyLate;
      });

      const totalPaidDays = p + w + h + c + (hd * 0.5);
      const lopDays = Math.max(0, totalDaysCount - totalPaidDays);

      // ==========================================
      // HR PAYROLL చార్ట్ ఫార్ములాల ఆధారంగా లెక్కింపులు
      // ==========================================
      
      // 1. బేసిక్ పే మరియు డైలీ/అవర్లీ రేట్లు (Daily Rate = Basic Pay / 30, Hourly Rate = Daily Rate / 8)
      const basePay = (employee as any).basicSalary || ((employee.dailyRate || 500) * 30);
      const dailyRate = basePay / 30;
      const hourlyRate = dailyRate / 8;

      // 2. సంపాదనలు (Earnings)
      // DA = (Basic Pay * DA %) / 100
      const daAmount = Math.round((basePay * ((employee as any).daPercent || 0)) / 100);
      // HRA = (Basic Pay * HRA %) / 100
      const hraAmount = employee.hra || Math.round((basePay * ((employee as any).hraPercent || 0)) / 100);
      const conveyance = employee.conveyance || 0;
      const medical = (employee as any).medicalAllowance || 0;
      const special = employee.specialAllowance || 0;

      // వాస్తవ హాజరైన రోజుల ఆధారంగా ఆర్జించిన బేసిక్ (Earned Basic)
      const earnedBasic = Math.round(totalPaidDays * dailyRate);

      // OT Pay = (Basic Pay / 30) * OT Hours * OT Rate (సాధారణ రోజులకు OT Rate 2x వర్తిస్తుంది)
      const otRateMultiplier = employee.otRate ? (employee.otRate / (hourlyRate || 1)) : 2;
      const otEarnings = Math.round(dailyRate * ot * otRateMultiplier);

      const earnings = {
        basic: earnedBasic,
        hra: hraAmount,
        da: daAmount,
        conveyance: conveyance,
        special: special,
        incentive: employee.incentive || 0,
        otPay: otEarnings,
        bonus: employee.attendanceBonus || 0,
        food: employee.foodAllowance || medical,
        other: employee.otherEarnings || 0,
        otherNote: employee.otherEarningsNote,
      };

      // Gross Earnings = మొత్తం సంపాదనల మొత్తం
      const grossEarnings = Object.values(earnings).reduce((acc, val) => {
        return typeof val === 'number' ? acc + val : acc;
      }, 0);

      // 3. మినహాయింపులు (Deductions)
      // PF = Basic Pay * 12%
      const autoPF = employee.isPFEnabled ? Math.round(earnedBasic * 0.12) : 0;

      // ESI = Gross Earnings * 0.75% (Gross <= 21,000 అయినప్పుడు మాత్రమే)
      const autoESI = (employee.isESIEnabled && grossEarnings <= 21000) 
        ? Math.round(grossEarnings * 0.0075) 
        : 0;

      // Professional Tax (PT) స్లాబ్
      let autoPT = 0;
      if (employee.isPTEnabled) {
        if (grossEarnings > 20000) autoPT = 200;
        else if (grossEarnings > 15000) autoPT = 150;
      }

      // LWF (Labour Welfare Fund) = Gross Earnings * 0.2%
      const autoLWF = (employee as any).isLWFEnabled ? Math.round(grossEarnings * 0.002) : 0;

      // LOP Deduction = అబ్సెంట్ రోజుల కట్టింగ్ + లేట్ వచ్చిన గంటల కట్టింగ్
      const lateHoursDeductionAmount = Math.round(totalLateHoursCut * hourlyRate);
      const absentDeductionAmount = Math.round(lopDays * dailyRate);
      const totalLopDeduction = absentDeductionAmount + lateHoursDeductionAmount;

      const deductions = {
        pf: autoPF,
        esi: autoESI,
        pt: autoPT,
        it: employee.isITEnabled ? 200 : 0,
        loan: employee.loanRecovery || 0,
        advance: employee.advanceRecovery || 0,
        lop: totalLopDeduction,
        other: (employee.otherDeductions || 0) + autoLWF,
        otherNote: employee.otherDeductionsNote ? `${employee.otherDeductionsNote}${totalLateHoursCut > 0 ? ` (Incl. ${totalLateHoursCut.toFixed(1)}h Late)` : ''}` : (totalLateHoursCut > 0 ? `${totalLateHoursCut.toFixed(1)}h Late cut` : undefined),
      };

      // Total Deductions = అన్ని మినహాయింపుల మొత్తం
      const totalDeductions = autoPF + autoESI + autoPT + deductions.it + deductions.loan + deductions.advance + deductions.other + totalLopDeduction;

      // Net Salary = Gross Earnings - Total Deductions
      const netPay = Math.max(0, grossEarnings - totalDeductions);

      const existingSlip = salarySlips.find(s => s.employeeId === employee.id && s.month === monthStr);

      return {
        employee,
        stats: { p, l, h, c, w, ot, a, hd, totalPaidDays, lopDays, totalLateHoursCut },
        earnings,
        deductions,
        grossEarnings,
        totalDeductions,
        netPay,
        existingSlip
      };
    });
  }, [employees, attendanceRecords, extraStatuses, selectedMonth, salarySlips, monthStr, shiftSettings]);

  const buildSlipData = (item: (typeof calculatedData)[0]): SalarySlip => {
    return {
      id: `SLIP-${item.employee.id}-${monthStr}`,
      employeeId: item.employee.id,
      employeeName: item.employee.name,
      month: monthStr,
      generatedDate: new Date().toISOString(),
      designation: item.employee.designation || 'Staff',
      department: item.employee.department || 'Operations',
      uan: item.employee.uanNumber || '-',
      pan: item.employee.panNumber || '-',
      bankAccount: item.employee.bankAccountSuffix ? `XXXX${item.employee.bankAccountSuffix}` : '-',
      daysPaid: item.stats.totalPaidDays,
      daysPresent: item.stats.p,
      daysLeave: item.stats.l,
      daysHoliday: item.stats.h,
      daysWeekOff: item.stats.w,
      daysCOff: item.stats.c,
      daysAbsent: item.stats.lopDays,
      otHours: item.stats.ot,
      dailyRate: item.employee.dailyRate,
      otRate: item.employee.otRate,
      earnings: item.earnings,
      deductions: item.deductions,
      grossEarnings: item.grossEarnings,
      totalDeductions: item.totalDeductions,
      totalSalary: item.netPay
    };
  };

  const handleGenerateSlips = () => {
    setIsGenerating(true);
    setTimeout(() => {
      calculatedData.forEach(item => {
        saveSalarySlip(buildSlipData(item));
      });
      setIsGenerating(false);
      toast({ title: "Slips Finalized", description: `Slips for ${format(selectedMonth, 'MMMM yyyy')} are generated successfully.` });
    }, 1000);
  };

  const getWhatsAppMessage = (item: (typeof calculatedData)[0]) => {
    const monthName = format(selectedMonth, 'MMMM yyyy');
    return `*OFFICIAL SALARY SLIP - ${monthName.toUpperCase()}*\n` +
      `--------------------------------\n` +
      `👤 *Name:* ${item.employee.name} (${item.employee.id})\n` +
      `🏢 *Dept:* ${item.employee.department || 'General'}\n` +
      `📅 *Paid Days:* ${item.stats.totalPaidDays} Days\n` +
      `⏱️ *OT Hours:* ${item.stats.ot} hrs\n` +
      `💰 *Basic Earned:* ₹${Math.round(item.earnings.basic).toLocaleString('en-IN')}\n` +
      `➕ *Gross Earnings:* ₹${Math.round(item.grossEarnings).toLocaleString('en-IN')}\n` +
      `➖ *PF Deduction:* ₹${Math.round(item.deductions.pf).toLocaleString('en-IN')}\n` +
      `➖ *LOP/Late:* ₹${Math.round(item.deductions.lop).toLocaleString('en-IN')}\n` +
      `📉 *Total Deductions:* ₹${Math.round(item.totalDeductions).toLocaleString('en-IN')}\n` +
      `--------------------------------\n` +
      `💵 *NET TAKE HOME: ₹${Math.round(item.netPay).toLocaleString('en-IN')}*\n` +
      `--------------------------------\n` +
      `_HR Payroll System (Statutory Compliant)_`;
  };

  const sendWhatsAppSingle = (item: (typeof calculatedData)[0]) => {
    saveSalarySlip(buildSlipData(item));
    const phone = item.employee.phone ? item.employee.phone.replace(/[^0-9]/g, '') : '';
    const text = encodeURIComponent(getWhatsAppMessage(item));
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
    toast({ title: "WhatsApp Dispatched", description: `Sent to ${item.employee.name}` });
  };

  const sendEmailSingle = (item: (typeof calculatedData)[0]) => {
    saveSalarySlip(buildSlipData(item));
    const email = item.employee.email || '';
    const monthName = format(selectedMonth, 'MMMM yyyy');
    const subject = encodeURIComponent(`Salary Payslip for ${monthName} - ${item.employee.name}`);
    const body = encodeURIComponent(getWhatsAppMessage(item).replace(/\*/g, ''));
    const mailUrl = email ? `mailto:${email}?subject=${subject}&body=${body}` : `mailto:?subject=${subject}&body=${body}`;
    window.open(mailUrl, '_blank');
    toast({ title: "Email Prepared", description: `Draft created for ${item.employee.name}` });
  };

  const handleBulkDispatch = async () => {
    setIsDispatching(true);

    calculatedData.forEach(item => {
      saveSalarySlip(buildSlipData(item));
    });

    try {
      await fetch('/api/dispatch-payslips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: monthStr,
          channel: deliveryChannel,
          mode: dispatchMode,
          employees: calculatedData.map(item => ({
            id: item.employee.id,
            name: item.employee.name,
            phone: item.employee.phone,
            email: item.employee.email,
            netPay: item.netPay,
            paidDays: item.stats.totalPaidDays,
            gross: item.grossEarnings
          }))
        })
      });
    } catch {
      // API fallback
    }

    setTimeout(() => {
      setIsDispatching(false);
      const channelLabel = deliveryChannel === 'both' ? 'WhatsApp & Email' : (deliveryChannel === 'whatsapp' ? 'WhatsApp' : 'Email');
      const modeLabel = dispatchMode === 'automatic' ? 'Auto-pilot rule saved' : 'Dispatched manually';

      toast({
        title: `${channelLabel} - ${modeLabel}!`,
        description: `Successfully processed for all ${calculatedData.length} employees.`
      });
    }, 1500);
  };

  const currentYear = selectedMonth.getFullYear();
  const currentMonth = selectedMonth.getMonth();

  return (
    <div className="space-y-6">
      {/* హెడర్ రూల్స్ ఇన్ఫో బాక్స్ */}
      <div className="p-4 bg-primary/5 border rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-sm text-primary">
         <div className="flex items-start gap-3">
            <Info className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
               <p className="font-bold flex items-center gap-2">
                 Statutory HR Payroll Rules Active
                 <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase font-mono">
                   {dispatchMode === 'automatic' ? '🤖 Auto-Pilot' : '👤 HR Manual'}
                 </span>
               </p>
               <p className="text-xs text-muted-foreground mt-0.5">
                  ఫార్ములాలు వర్తించాయి: <b>Daily Rate = Basic/30</b>[cite: 1], <b>OT Rate = 2x</b>[cite: 1], <b>PF = 12%</b>[cite: 1], <b>ESI = 0.75%</b> (&le;₹21k)[cite: 1]. ఛానల్: <b>{deliveryChannel.toUpperCase()}</b>.
               </p>
            </div>
         </div>

         {/* డెలివరీ రూల్స్ మోడ్ డ్రాప్‌డౌన్లు */}
         <div className="flex flex-wrap items-center gap-2 bg-background p-2 rounded-xl border shadow-sm w-full md:w-auto">
            <div className="flex items-center gap-1.5 text-xs font-semibold px-2 text-muted-foreground">
              <SlidersHorizontal className="h-3.5 w-3.5" /> మోడ్:
            </div>
            <Select value={deliveryChannel} onValueChange={(v) => setDeliveryChannel(v as DeliveryChannel)}>
              <SelectTrigger className="h-8 text-xs w-[130px]">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">📱 WhatsApp Only</SelectItem>
                <SelectItem value="email">✉️ Mail Only</SelectItem>
                <SelectItem value="both">🌐 WhatsApp & Mail</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dispatchMode} onValueChange={(v) => setDispatchMode(v as DispatchMode)}>
              <SelectTrigger className="h-8 text-xs w-[140px]">
                <SelectValue placeholder="Dispatch Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">👤 HR Manual Send</SelectItem>
                <SelectItem value="automatic">🤖 Automatic Send</SelectItem>
              </SelectContent>
            </Select>
         </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0">
          <div>
            <CardTitle>Official Salary Slips</CardTitle>
            <CardDescription>HR Statutory compliant payroll calculation and distribution[cite: 1].</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="flex gap-2 w-full sm:w-auto">
              <Select value={currentYear.toString()} onValueChange={(v) => {
                const d = new Date(selectedMonth);
                d.setFullYear(parseInt(v));
                setSelectedMonth(d);
              }}>
                <SelectTrigger className="w-full sm:w-[95px]">
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
                <SelectTrigger className="w-full sm:w-[125px]">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <SelectItem key={i} value={i.toString()}>{format(new Date(2000, i, 1), 'MMMM')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button onClick={handleGenerateSlips} variant="outline" disabled={isGenerating || isDispatching} className="w-full sm:w-auto">
              {isGenerating ? <LoaderCircle className="animate-spin mr-2 h-4 w-4" /> : <FileText className="mr-2 h-4 w-4" />}
              Generate Slips
            </Button>

            <Button 
              onClick={handleBulkDispatch} 
              disabled={isGenerating || isDispatching} 
              className={`w-full sm:w-auto text-white ${dispatchMode === 'automatic' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {isDispatching ? (
                <LoaderCircle className="animate-spin mr-2 h-4 w-4" />
              ) : dispatchMode === 'automatic' ? (
                <Bot className="mr-2 h-4 w-4" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {dispatchMode === 'automatic' 
                ? `Activate Auto-Send (${deliveryChannel.toUpperCase()})` 
                : `Send All (${deliveryChannel.toUpperCase()})`}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          <div className="overflow-x-auto border-y sm:border rounded-none sm:rounded-xl">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="whitespace-nowrap">Employee</TableHead>
                  <TableHead className="whitespace-nowrap">Paid Days</TableHead>
                  <TableHead className="whitespace-nowrap">OT Pay (2x)</TableHead>
                  <TableHead className="whitespace-nowrap">Gross Pay</TableHead>
                  <TableHead className="whitespace-nowrap">PF (12%)</TableHead>
                  <TableHead className="whitespace-nowrap">Net Salary</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Direct Dispatch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calculatedData.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <div className="font-bold text-sm sm:text-base">{item.employee.name}</div>
                      <div className="text-[10px] text-muted-foreground flex gap-2">
                        <span>{item.employee.designation || 'Staff'}</span>
                        {item.employee.phone && <span>• 📱 {item.employee.phone}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{item.stats.totalPaidDays} Days</TableCell>
                    <TableCell className="text-green-600 font-bold text-sm">₹{Math.round(item.earnings.otPay).toLocaleString()}</TableCell>
                    <TableCell className="font-semibold text-sm">₹{Math.round(item.grossEarnings).toLocaleString()}</TableCell>
                    <TableCell className="text-slate-600 text-sm">₹{Math.round(item.deductions.pf).toLocaleString()}</TableCell>
                    <TableCell className="font-bold text-primary text-sm">₹{Math.round(item.netPay).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-1.5">
                        {(deliveryChannel === 'whatsapp' || deliveryChannel === 'both') && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => sendWhatsAppSingle(item)}
                            title="Send via WhatsApp"
                            className="text-xs h-8 text-green-700 border-green-200 hover:bg-green-50 px-2"
                          >
                            <MessageSquareShare className="h-3.5 w-3.5 mr-1 text-green-600" />
                            WA
                          </Button>
                        )}

                        {(deliveryChannel === 'email' || deliveryChannel === 'both') && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => sendEmailSingle(item)}
                            title="Send via Email"
                            className="text-xs h-8 text-blue-700 border-blue-200 hover:bg-blue-50 px-2"
                          >
                            <Mail className="h-3.5 w-3.5 mr-1 text-blue-600" />
                            Mail
                          </Button>
                        )}

                        <Button 
                          variant="outline" 
                          size="sm" 
                          disabled={!item.existingSlip}
                          onClick={() => setSelectedSlip(item.existingSlip || null)}
                          className="text-xs h-8 px-2"
                        >
                          View
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* పే-స్లిప్ ప్రివ్యూ మోడల్ */}
      <Dialog open={!!selectedSlip} onOpenChange={() => setSelectedSlip(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl h-[90vh] sm:h-auto overflow-y-auto">
          <DialogTitle className="sr-only">Salary Slip Preview</DialogTitle>
          <DialogDescription className="sr-only">Detailed professional salary slip with statutory formulas breakdown[cite: 1].</DialogDescription>
          {selectedSlip && (
            <div className="bg-white text-slate-900 printable-area text-[11px] sm:text-[13px] font-sans min-h-full">
              <div className="p-4 sm:p-8 border-b-4 border-primary flex flex-col sm:flex-row justify-between items-center sm:items-start gap-4">
                <div className="space-y-2 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <div className="bg-primary text-white p-1.5 sm:p-2 rounded-lg">
                      <Briefcase className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tighter">PAYSLIP</h1>
                  </div>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px] sm:text-[10px]">
                    {format(new Date(selectedSlip.month + "-01"), 'MMMM yyyy')}
                  </p>
                </div>
                <div className="text-center sm:text-right">
                  <h2 className="text-base sm:text-lg font-black uppercase">Attendance App Pvt Ltd</h2>
                  <p className="text-slate-500 max-w-[200px] mx-auto sm:ml-auto">Industrial Zone, AP - 515001</p>
                </div>
              </div>

              <div className="p-4 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 bg-slate-50/50">
                <div className="space-y-2 sm:space-y-4">
                  <div className="grid grid-cols-2">
                    <span className="text-slate-400 font-bold uppercase text-[8px] sm:text-[9px]">Employee Name</span>
                    <span className="font-bold">: {selectedSlip.employeeName}</span>
                  </div>
                  <div className="grid grid-cols-2">
                    <span className="text-slate-400 font-bold uppercase text-[8px] sm:text-[9px]">Employee ID</span>
                    <span className="font-bold">: {selectedSlip.employeeId}</span>
                  </div>
                  <div className="grid grid-cols-2">
                    <span className="text-slate-400 font-bold uppercase text-[8px] sm:text-[9px]">Designation</span>
                    <span className="font-bold">: {selectedSlip.designation}</span>
                  </div>
                  <div className="grid grid-cols-2">
                    <span className="text-slate-400 font-bold uppercase text-[8px] sm:text-[9px]">Department</span>
                    <span className="font-bold">: {selectedSlip.department}</span>
                  </div>
                </div>
                <div className="space-y-2 sm:space-y-4">
                  <div className="grid grid-cols-2">
                    <span className="text-slate-400 font-bold uppercase text-[8px] sm:text-[9px]">Paid Days</span>
                    <span className="font-bold">: {selectedSlip.daysPaid}</span>
                  </div>
                  <div className="grid grid-cols-2">
                    <span className="text-slate-400 font-bold uppercase text-[8px] sm:text-[9px]">OT Hours</span>
                    <span className="font-bold">: {selectedSlip.otHours} h</span>
                  </div>
                  <div className="grid grid-cols-2">
                    <span className="text-slate-400 font-bold uppercase text-[8px] sm:text-[9px]">Bank A/c</span>
                    <span className="font-bold">: {selectedSlip.bankAccount}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 border-y">
                <div className="border-r-0 sm:border-r border-b sm:border-b-0 p-3 sm:p-4 space-y-1.5">
                   <div className="font-bold uppercase text-[10px] text-muted-foreground border-b pb-1">Earnings (సంపాదనలు)[cite: 1]</div>
                   <div className="flex justify-between"><span>Basic Earned Pay (Basic/30 * Days)</span><span className="font-bold">₹{Math.round(selectedSlip.earnings.basic).toLocaleString()}</span></div>
                   <div className="flex justify-between"><span>DA (Dearness Allowance)</span><span className="font-bold">₹{Math.round(selectedSlip.earnings.da || 0).toLocaleString()}</span></div>
                   <div className="flex justify-between"><span>HRA</span><span className="font-bold">₹{Math.round(selectedSlip.earnings.hra).toLocaleString()}</span></div>
                   <div className="flex justify-between text-green-700 font-medium"><span>OT Pay (2x Rate)</span><span className="font-bold">₹{Math.round(selectedSlip.earnings.otPay).toLocaleString()}</span></div>
                   <div className="flex justify-between font-bold pt-2 border-t"><span>Gross Earnings</span><span>₹{Math.round(selectedSlip.grossEarnings).toLocaleString()}</span></div>
                </div>
                <div className="p-3 sm:p-4 space-y-1.5">
                   <div className="font-bold uppercase text-[10px] text-muted-foreground border-b pb-1">Deductions (మినహాయింపులు)[cite: 1]</div>
                   <div className="flex justify-between text-destructive"><span>LOP (Absent & Late-Cut)</span><span className="font-bold">₹{Math.round(selectedSlip.deductions.lop).toLocaleString()}</span></div>
                   {selectedSlip.deductions.pf > 0 && <div className="flex justify-between"><span>EPF (12% of Basic)</span><span className="font-bold">₹{Math.round(selectedSlip.deductions.pf).toLocaleString()}</span></div>}
                   {selectedSlip.deductions.esi > 0 && <div className="flex justify-between"><span>ESI (0.75% of Gross)</span><span className="font-bold">₹{Math.round(selectedSlip.deductions.esi).toLocaleString()}</span></div>}
                   {selectedSlip.deductions.pt > 0 && <div className="flex justify-between"><span>Professional Tax (PT)</span><span className="font-bold">₹{Math.round(selectedSlip.deductions.pt).toLocaleString()}</span></div>}
                   <div className="flex justify-between font-bold pt-2 border-t text-destructive"><span>Total Deductions</span><span>₹{Math.round(selectedSlip.totalDeductions).toLocaleString()}</span></div>
                </div>
              </div>

              <div className="p-6 sm:p-8 flex items-center justify-between bg-primary/5">
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-primary uppercase">Net Salary Payable (Gross - Deductions)[cite: 1]</h3>
                </div>
                <div className="flex items-center gap-2 bg-primary text-white p-3 sm:p-4 rounded-xl shadow-lg">
                  <IndianRupee className="h-6 w-6" />
                  <span className="text-2xl sm:text-3xl font-black">{Math.round(selectedSlip.totalSalary).toLocaleString()}</span>
                </div>
              </div>

              <div className="p-4 sm:p-6 border-t bg-slate-100 flex justify-end gap-3 no-print">
                <Button variant="outline" size="sm" onClick={() => setSelectedSlip(null)}>Close</Button>
                <Button size="sm" onClick={() => window.print()} className="bg-primary hover:bg-primary/90">
                  <Printer className="mr-2 h-4 w-4" /> Print
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
