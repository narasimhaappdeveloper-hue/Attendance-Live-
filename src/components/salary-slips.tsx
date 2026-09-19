'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/hooks/use-app';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from 'date-fns';
import { FileText, Printer, CheckCircle2, IndianRupee, LoaderCircle, ShieldCheck, Briefcase, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { SalarySlip } from '@/lib/types';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function SalarySlips() {
  const { employees, attendanceRecords, extraStatuses, salarySlips, saveSalarySlip } = useApp();
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedSlip, setSelectedSlip] = useState<SalarySlip | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const monthStr = format(selectedMonth, 'yyyy-MM');

  const calculatedData = useMemo(() => {
    const start = startOfMonth(selectedMonth);
    const end = endOfMonth(selectedMonth);
    const daysInMonth = eachDayOfInterval({ start, end });
    const totalDaysCount = daysInMonth.length;

    return employees.filter(e => e.status === 'Approved').map(employee => {
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
        if (extra?.lateHours) totalLateHoursCut += extra.lateHours;
      });

      // Half day counts as 0.5 paid day
      const totalPaidDays = p + w + h + c + (hd * 0.5);
      const lopDays = totalDaysCount - totalPaidDays;
      
      const effectiveDailyRate = employee.dailyRate || 0;
      const hourlyRate = effectiveDailyRate / 8;
      
      const regularAttendanceEarnings = totalPaidDays * effectiveDailyRate;
      const lateHoursDeductionAmount = totalLateHoursCut * hourlyRate;

      const earnings = {
        basic: regularAttendanceEarnings,
        hra: employee.hra || 0,
        da: employee.da || 0,
        conveyance: employee.conveyance || 0,
        special: employee.specialAllowance || 0,
        incentive: employee.incentive || 0,
        otPay: ot * (employee.otRate || 0),
        bonus: employee.attendanceBonus || 0,
        food: employee.foodAllowance || 0,
        other: employee.otherEarnings || 0,
        otherNote: employee.otherEarningsNote,
      };

      const grossEarnings = Object.values(earnings).reduce((acc, val) => {
        return typeof val === 'number' ? acc + val : acc;
      }, 0);

      const autoPF = employee.isPFEnabled ? Math.round(regularAttendanceEarnings * 0.12) : 0;
      const autoESI = (employee.isESIEnabled && grossEarnings <= 21000) ? Math.round(grossEarnings * 0.0075) : 0;

      let autoPT = 0;
      if (employee.isPTEnabled) {
        if (grossEarnings > 20000) autoPT = 200;
        else if (grossEarnings > 15000) autoPT = 150;
      }

      const totalLopDeduction = (lopDays * effectiveDailyRate) + lateHoursDeductionAmount;

      const deductions = {
        pf: autoPF,
        esi: autoESI,
        pt: autoPT,
        it: employee.isITEnabled ? 200 : 0,
        loan: employee.loanRecovery || 0,
        advance: employee.advanceRecovery || 0,
        lop: totalLopDeduction,
        other: employee.otherDeductions || 0,
        otherNote: employee.otherDeductionsNote ? `${employee.otherDeductionsNote}${totalLateHoursCut > 0 ? ` (Incl. ${totalLateHoursCut}h Late cut)` : ''}` : (totalLateHoursCut > 0 ? `${totalLateHoursCut}h Late/Permission cut` : undefined),
      };

      const totalDeductions = autoPF + autoESI + autoPT + deductions.it + deductions.loan + deductions.advance + totalLopDeduction + deductions.other;
      const netPay = Math.max(0, grossEarnings - totalDeductions + totalLopDeduction); // Adjusting because lop is counted inside deductions

      const existingSlip = salarySlips.find(s => s.employeeId === employee.id && s.month === monthStr);

      return {
        employee,
        stats: { p, l, h, c, w, ot, a: a + l, hd, totalPaidDays, lopDays, totalLateHoursCut },
        earnings,
        deductions: { ...deductions, lop: totalLopDeduction },
        grossEarnings,
        totalDeductions: totalDeductions - totalLopDeduction + totalLopDeduction,
        netPay: Math.max(0, grossEarnings - (totalDeductions - totalLopDeduction) - totalLopDeduction),
        existingSlip
      };
    });
  }, [employees, attendanceRecords, extraStatuses, selectedMonth, salarySlips, monthStr]);

  const handleGenerateSlips = () => {
    setIsGenerating(true);
    setTimeout(() => {
      calculatedData.forEach(item => {
        const slip: SalarySlip = {
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
          totalDeductions: item.deductions.pf + item.deductions.esi + item.deductions.pt + item.deductions.it + item.deductions.loan + item.deductions.advance + item.deductions.lop + item.deductions.other,
          totalSalary: item.netPay
        };
        saveSalarySlip(slip);
      });
      setIsGenerating(false);
      toast({ title: "Slips Finalized", description: `Slips for ${format(selectedMonth, 'MMMM yyyy')} are generated successfully.` });
    }, 1200);
  };

  const currentYear = selectedMonth.getFullYear();
  const currentMonth = selectedMonth.getMonth();

  return (
    <div className="space-y-6">
      <div className="p-4 bg-primary/5 border rounded-2xl flex items-start gap-3 text-sm text-primary">
         <Info className="h-5 w-5 shrink-0 mt-0.5" />
         <div>
            <p className="font-bold">Late Attendance & Fractional LOP Deduction Added:</p>
            <p className="text-xs text-muted-foreground mt-0.5">
               ఉద్యోగులు లేట్ పర్మిషన్ అవర్స్ తీసుకున్నప్పుడు లేదా Half-Day నమోదు చేసినప్పుడు వాటికి సమానమైన గంటల కటింగ్ ఆటోమేటిక్‌గా **LOP Deduction** లో యాడ్ చేయబడుతుంది.
            </p>
         </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0">
          <div>
            <CardTitle>Official Salary Slips</CardTitle>
            <CardDescription>Generate and manage professional employee payslips.</CardDescription>
          </div>
          <div className="flex gap-4">
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
            <Button onClick={handleGenerateSlips} disabled={isGenerating}>
              {isGenerating ? <LoaderCircle className="animate-spin mr-2" /> : <FileText className="mr-2 h-4 w-4" />}
              Generate All Slips
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-xl overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Paid Days</TableHead>
                  <TableHead>Late Hours</TableHead>
                  <TableHead>LOP Amount</TableHead>
                  <TableHead>Net Pay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calculatedData.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <div className="font-bold">{item.employee.name}</div>
                      <div className="text-[10px] text-muted-foreground">{item.employee.designation}</div>
                    </TableCell>
                    <TableCell>{item.stats.totalPaidDays} Days</TableCell>
                    <TableCell className="text-amber-600 font-bold">{item.stats.totalLateHoursCut} hrs</TableCell>
                    <TableCell className="text-destructive font-semibold">₹{Math.round(item.deductions.lop).toLocaleString()}</TableCell>
                    <TableCell className="font-bold text-primary">₹{Math.round(item.netPay).toLocaleString()}</TableCell>
                    <TableCell>
                      {item.existingSlip ? (
                        <div className="flex items-center text-green-600 text-xs font-bold">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Finalized
                        </div>
                      ) : (
                        <span className="text-amber-500 text-xs font-bold italic">Draft</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={!item.existingSlip}
                        onClick={() => setSelectedSlip(item.existingSlip || null)}
                      >
                        View Slip
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedSlip} onOpenChange={() => setSelectedSlip(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogTitle className="sr-only">Salary Slip Preview</DialogTitle>
          <DialogDescription className="sr-only">Detailed professional salary slip with earnings and deductions breakdown.</DialogDescription>
          {selectedSlip && (
            <div className="bg-white text-slate-900 printable-area text-[11px] sm:text-[13px] font-sans">
              <div className="p-8 border-b-4 border-primary flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary text-white p-2 rounded-lg">
                      <Briefcase className="h-6 w-6" />
                    </div>
                    <h1 className="text-2xl font-black text-primary tracking-tighter">PAYSLIP</h1>
                  </div>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                    {format(new Date(selectedSlip.month + "-01"), 'MMMM yyyy')}
                  </p>
                </div>
                <div className="text-right">
                  <h2 className="text-lg font-black uppercase">Attendance App Pvt Ltd</h2>
                  <p className="text-slate-500 max-w-[200px] ml-auto">Industrial Zone, AP - 515001</p>
                </div>
              </div>

              <div className="p-8 grid grid-cols-2 gap-8 bg-slate-50/50">
                <div className="space-y-4">
                  <div className="grid grid-cols-2">
                    <span className="text-slate-400 font-bold uppercase text-[9px]">Employee Name</span>
                    <span className="font-bold">: {selectedSlip.employeeName}</span>
                  </div>
                  <div className="grid grid-cols-2">
                    <span className="text-slate-400 font-bold uppercase text-[9px]">Employee ID</span>
                    <span className="font-bold">: {selectedSlip.employeeId}</span>
                  </div>
                  <div className="grid grid-cols-2">
                    <span className="text-slate-400 font-bold uppercase text-[9px]">Designation</span>
                    <span className="font-bold">: {selectedSlip.designation}</span>
                  </div>
                  <div className="grid grid-cols-2">
                    <span className="text-slate-400 font-bold uppercase text-[9px]">Department</span>
                    <span className="font-bold">: {selectedSlip.department}</span>
                  </div>
                  <div className="grid grid-cols-2">
                    <span className="text-slate-400 font-bold uppercase text-[9px]">PAN Number</span>
                    <span className="font-bold">: {selectedSlip.pan}</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2">
                    <span className="text-slate-400 font-bold uppercase text-[9px]">Bank A/c No</span>
                    <span className="font-bold">: {selectedSlip.bankAccount}</span>
                  </div>
                  <div className="grid grid-cols-2">
                    <span className="text-slate-400 font-bold uppercase text-[9px]">UAN / PF No</span>
                    <span className="font-bold">: {selectedSlip.uan}</span>
                  </div>
                  <div className="grid grid-cols-2">
                    <span className="text-slate-400 font-bold uppercase text-[9px]">Paid Days</span>
                    <span className="font-bold">: {selectedSlip.daysPaid}</span>
                  </div>
                  <div className="grid grid-cols-2">
                    <span className="text-slate-400 font-bold uppercase text-[9px]">OT Hours</span>
                    <span className="font-bold">: {selectedSlip.otHours} h</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 border-y">
                <div className="border-r">
                   <div className="bg-slate-100 p-2 font-black text-[10px] uppercase border-b">Earnings</div>
                   <div className="p-4 space-y-2">
                     <div className="flex justify-between"><span>Basic Earned Salary</span><span className="font-bold">₹{Math.round(selectedSlip.earnings.basic).toLocaleString()}</span></div>
                     <div className="flex justify-between"><span>HRA</span><span className="font-bold">₹{Math.round(selectedSlip.earnings.hra).toLocaleString()}</span></div>
                     <div className="flex justify-between"><span>Dearness Allowance (DA)</span><span className="font-bold">₹{Math.round(selectedSlip.earnings.da).toLocaleString()}</span></div>
                     <div className="flex justify-between"><span>Conveyance/Transport</span><span className="font-bold">₹{Math.round(selectedSlip.earnings.conveyance).toLocaleString()}</span></div>
                     <div className="flex justify-between text-green-700 font-medium"><span>Food Allowance</span><span className="font-bold">₹{Math.round(selectedSlip.earnings.food).toLocaleString()}</span></div>
                     <div className="flex justify-between"><span>Overtime Pay</span><span className="font-bold">₹{Math.round(selectedSlip.earnings.otPay).toLocaleString()}</span></div>
                     <div className="flex justify-between text-primary font-medium"><span>Incentive</span><span className="font-bold">₹{Math.round(selectedSlip.earnings.incentive).toLocaleString()}</span></div>
                     <div className="flex justify-between"><span>Bonus / Special</span><span className="font-bold">₹{Math.round(selectedSlip.earnings.bonus + selectedSlip.earnings.special).toLocaleString()}</span></div>
                     {selectedSlip.earnings.other > 0 && (
                        <div className="flex justify-between text-slate-500">
                            <span>Other Allowance {selectedSlip.earnings.otherNote ? `(${selectedSlip.earnings.otherNote})` : ''}</span>
                            <span className="font-bold">₹{Math.round(selectedSlip.earnings.other).toLocaleString()}</span>
                        </div>
                     )}
                   </div>
                </div>
                <div>
                   <div className="bg-slate-100 p-2 font-black text-[10px] uppercase border-b flex justify-between items-center">
                     <span>Deductions</span>
                   </div>
                   <div className="p-4 space-y-2">
                     {selectedSlip.deductions.pf > 0 && <div className="flex justify-between text-slate-800 font-medium"><span>Employee PF / EPF (12%)</span><span className="font-bold">₹{Math.round(selectedSlip.deductions.pf).toLocaleString()}</span></div>}
                     {selectedSlip.deductions.esi > 0 && <div className="flex justify-between text-slate-800 font-medium"><span>ESI (0.75%)</span><span className="font-bold">₹{Math.round(selectedSlip.deductions.esi).toLocaleString()}</span></div>}
                     {selectedSlip.deductions.pt > 0 && <div className="flex justify-between"><span>Professional Tax (PT)</span><span className="font-bold">₹{Math.round(selectedSlip.deductions.pt).toLocaleString()}</span></div>}
                     {selectedSlip.deductions.it > 0 && <div className="flex justify-between"><span>TDS / Income Tax</span><span className="font-bold">₹{Math.round(selectedSlip.deductions.it).toLocaleString()}</span></div>}
                     <div className="flex justify-between"><span>Loan Recovery</span><span className="font-bold">₹{Math.round(selectedSlip.deductions.loan).toLocaleString()}</span></div>
                     <div className="flex justify-between"><span>Salary Advance Recovery</span><span className="font-bold">₹{Math.round(selectedSlip.deductions.advance).toLocaleString()}</span></div>
                     <div className="flex justify-between text-destructive font-black"><span>Total LOP Deduction (Absent/Late)</span><span className="font-bold">₹{Math.round(selectedSlip.deductions.lop).toLocaleString()}</span></div>
                     {selectedSlip.deductions.other > 0 && (
                        <div className="flex justify-between text-destructive">
                            <span>Other Deductions {selectedSlip.deductions.otherNote ? `(${selectedSlip.deductions.otherNote})` : ''}</span>
                            <span className="font-bold">₹{Math.round(selectedSlip.deductions.other).toLocaleString()}</span>
                        </div>
                     )}
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-2 bg-slate-50 font-black text-slate-800 border-b">
                <div className="p-4 border-r flex justify-between uppercase">
                  <span>Gross Earnings</span>
                  <span>₹{Math.round(selectedSlip.grossEarnings).toLocaleString()}</span>
                </div>
                <div className="p-4 flex justify-between uppercase">
                  <span>Total Deductions</span>
                  <span>₹{Math.round(selectedSlip.grossEarnings - selectedSlip.totalSalary).toLocaleString()}</span>
                </div>
              </div>

              <div className="p-8 flex flex-col items-center sm:flex-row sm:justify-between gap-6 bg-primary/5">
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-primary uppercase tracking-widest">Net Salary Payable (Take Home)</h3>
                  <p className="text-slate-500 font-bold italic">Total Payable Amount</p>
                </div>
                <div className="flex items-center gap-3 bg-primary text-white p-6 rounded-2xl shadow-xl">
                  <IndianRupee className="h-8 w-8" />
                  <span className="text-4xl font-black">{Math.round(selectedSlip.totalSalary).toLocaleString()}</span>
                </div>
              </div>

              <div className="p-10 grid grid-cols-2 gap-20">
                <div className="text-center pt-8 border-t border-slate-200">
                  <p className="font-bold text-slate-600">Employee Signature</p>
                </div>
                <div className="text-center pt-8 border-t border-slate-200">
                  <p className="font-bold text-slate-600">Authorized HR Signatory</p>
                  <div className="flex justify-center mt-2 text-primary opacity-30">
                     <ShieldCheck className="h-10 w-10" />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t bg-slate-100 flex justify-end gap-3 no-print">
                <Button variant="outline" onClick={() => setSelectedSlip(null)}>Close</Button>
                <Button onClick={() => window.print()} className="bg-primary hover:bg-primary/90">
                  <Printer className="mr-2 h-4 w-4" /> Print Payslip
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .printable-area, .printable-area * { visibility: visible; }
          .printable-area {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            padding: 0;
            background: white !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
