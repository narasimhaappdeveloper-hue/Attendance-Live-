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

    return employees.filter(e => e.status === 'Approved').map(employee => {
      let p = 0, l = 0, h = 0, c = 0, w = 0, ot = 0, a = 0;

      daysInMonth.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const record = attendanceRecords.find(r => 
          r.employeeId.toUpperCase() === employee.id.toUpperCase() &&
          isSameDay(new Date(r.dateTime), day)
        );
        const extra = extraStatuses.find(ex => ex.employeeId === employee.id && ex.date === dateStr);

        if (record) p++;
        else if (extra?.status === 'Leave') l++;
        else if (extra?.status === 'Holiday') h++;
        else if (extra?.status === 'C-off') c++;
        else if (employee.weekOffDay === DAYS_OF_WEEK[getDay(day)]) w++;
        else a++;
        
        if (extra?.otHours) ot += extra.otHours;
      });

      // Paid Days = Present + Week-off + Holiday + C-off
      const totalPaidDays = p + w + h + c;
      // Loss of Pay Days = Leave (L) + Absent (A)
      const lopDays = l + a;
      
      const effectiveDailyRate = employee.dailyRate || (employee.basicSalary ? Math.round(employee.basicSalary / daysInMonth.length) : 0);
      const lopDeduction = lopDays * effectiveDailyRate;

      // Real calculated dynamic basic salary fallback if structural components are zeroed out
      const calculatedBasic = employee.basicSalary || (totalPaidDays * effectiveDailyRate);

      const earnings = {
        basic: calculatedBasic,
        hra: employee.hra || 0,
        da: employee.da || 0,
        conveyance: employee.conveyance || 0,
        special: employee.specialAllowance || 0,
        incentive: employee.incentive || 0,
        otPay: ot * (employee.otRate || 0),
        bonus: employee.attendanceBonus || 0,
        food: employee.foodAllowance || 0,
        other: employee.otherEarnings || 0,
      };

      const grossEarnings = Object.values(earnings).reduce((a, b) => a + b, 0);

      const autoPF = Math.round(earnings.basic * 0.12);
      const autoESI = grossEarnings <= 21000 ? Math.round(grossEarnings * 0.0075) : 0;

      const deductions = {
        pf: autoPF,
        esi: autoESI,
        pt: employee.professionalTax || 0,
        it: employee.incomeTax || 0,
        loan: employee.loanRecovery || 0,
        advance: employee.advanceRecovery || 0,
        lop: lopDeduction,
        other: employee.otherDeductions || 0,
      };

      const totalDeductions = Object.values(deductions).reduce((a, b) => a + b, 0);
      const netPay = Math.max(0, grossEarnings - totalDeductions);

      const existingSlip = salarySlips.find(s => s.employeeId === employee.id && s.month === monthStr);

      return {
        employee,
        stats: { p, l, h, c, w, ot, a, totalPaidDays, lopDays },
        earnings,
        deductions,
        grossEarnings,
        totalDeductions,
        netPay,
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
          daysAbsent: item.stats.a + item.stats.l,
          otHours: item.stats.ot,
          dailyRate: item.employee.dailyRate,
          otRate: item.employee.otRate,
          earnings: item.earnings,
          deductions: item.deductions,
          grossEarnings: item.grossEarnings,
          totalDeductions: item.totalDeductions,
          totalSalary: item.netPay
        };
        saveSalarySlip(slip);
      });
      setIsGenerating(false);
      toast({ title: "Slips Finalized", description: `Slips for ${format(selectedMonth, 'MMMM yyyy')} are generated successfully.` });
    }, 1200);
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-primary/5 border rounded-2xl flex items-start gap-3 text-sm text-primary">
         <Info className="h-5 w-5 shrink-0 mt-0.5" />
         <div>
            <p className="font-bold">Govt Rules & Unpaid Leave Update:</p>
            <p className="text-xs text-muted-foreground mt-0.5">
               లీవ్ (Leave) మరియు అబ్సెంట్ (Absent) రోజులు శాలరీ లెక్కింపులో ఆటోమేటిక్‌గా **Loss of Pay (LOP)** కింద జీతం కట్ చేయబడతాయి.
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
            <Select value={monthStr} onValueChange={(v) => setSelectedMonth(new Date(v))}>
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
                  <TableHead>LOP Days</TableHead>
                  <TableHead>Gross</TableHead>
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
                    <TableCell className="text-destructive font-semibold">{item.stats.lopDays} Days</TableCell>
                    <TableCell className="text-muted-foreground">₹{item.grossEarnings.toLocaleString()}</TableCell>
                    <TableCell className="font-bold text-primary">₹{item.netPay.toLocaleString()}</TableCell>
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
                    <span className="text-slate-400 font-bold uppercase text-[9px]">LOP/Absent Days</span>
                    <span className="font-bold text-destructive">: {selectedSlip.daysAbsent}</span>
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
                     <div className="flex justify-between"><span>Basic Salary</span><span className="font-bold">₹{selectedSlip.earnings.basic.toLocaleString()}</span></div>
                     <div className="flex justify-between"><span>HRA</span><span className="font-bold">₹{selectedSlip.earnings.hra.toLocaleString()}</span></div>
                     <div className="flex justify-between"><span>DA</span><span className="font-bold">₹{selectedSlip.earnings.da.toLocaleString()}</span></div>
                     <div className="flex justify-between"><span>Conveyance</span><span className="font-bold">₹{selectedSlip.earnings.conveyance.toLocaleString()}</span></div>
                     <div className="flex justify-between text-green-700 font-medium"><span>Food Allowance</span><span className="font-bold">₹{selectedSlip.earnings.food.toLocaleString()}</span></div>
                     <div className="flex justify-between"><span>Overtime Pay</span><span className="font-bold">₹{selectedSlip.earnings.otPay.toLocaleString()}</span></div>
                     <div className="flex justify-between"><span>Bonus / Incentive</span><span className="font-bold">₹{(selectedSlip.earnings.bonus + selectedSlip.earnings.special + selectedSlip.earnings.incentive).toLocaleString()}</span></div>
                     <div className="flex justify-between text-slate-500"><span>Other Earnings</span><span className="font-bold">₹{selectedSlip.earnings.other.toLocaleString()}</span></div>
                   </div>
                </div>
                <div>
                   <div className="bg-slate-100 p-2 font-black text-[10px] uppercase border-b flex justify-between items-center">
                     <span>Deductions</span>
                     <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">Statutory Rules</span>
                   </div>
                   <div className="p-4 space-y-2">
                     <div className="flex justify-between text-slate-800 font-medium"><span>Employee PF (12%)</span><span className="font-bold">₹{selectedSlip.deductions.pf.toLocaleString()}</span></div>
                     <div className="flex justify-between text-slate-800 font-medium"><span>ESI (0.75%)</span><span className="font-bold">₹{selectedSlip.deductions.esi.toLocaleString()}</span></div>
                     <div className="flex justify-between"><span>Professional Tax</span><span className="font-bold">₹{selectedSlip.deductions.pt.toLocaleString()}</span></div>
                     <div className="flex justify-between"><span>Income Tax (TDS)</span><span className="font-bold">₹{selectedSlip.deductions.it.toLocaleString()}</span></div>
                     <div className="flex justify-between"><span>Loan / Advance</span><span className="font-bold">₹{(selectedSlip.deductions.loan + selectedSlip.deductions.advance).toLocaleString()}</span></div>
                     <div className="flex justify-between text-destructive font-semibold"><span>LOP Deduction (Leaves/Absent)</span><span className="font-bold">₹{selectedSlip.deductions.lop.toLocaleString()}</span></div>
                     <div className="flex justify-between text-destructive"><span>Other Deductions</span><span className="font-bold">₹{selectedSlip.deductions.other.toLocaleString()}</span></div>
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-2 bg-slate-50 font-black text-slate-800 border-b">
                <div className="p-4 border-r flex justify-between uppercase">
                  <span>Gross Earnings</span>
                  <span>₹{selectedSlip.grossEarnings.toLocaleString()}</span>
                </div>
                <div className="p-4 flex justify-between uppercase">
                  <span>Total Deductions</span>
                  <span>₹{selectedSlip.totalDeductions.toLocaleString()}</span>
                </div>
              </div>

              <div className="p-8 flex flex-col items-center sm:flex-row sm:justify-between gap-6 bg-primary/5">
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-primary uppercase tracking-widest">Net Salary Payable</h3>
                  <p className="text-slate-500 font-bold italic">Rupees {selectedSlip.totalSalary.toLocaleString()} Only</p>
                </div>
                <div className="flex items-center gap-3 bg-primary text-white p-6 rounded-2xl shadow-xl">
                  <IndianRupee className="h-8 w-8" />
                  <span className="text-4xl font-black">{selectedSlip.totalSalary.toLocaleString()}</span>
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
