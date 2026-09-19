
'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/hooks/use-app';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from 'date-fns';
import { FileText, Printer, CheckCircle2, IndianRupee, LoaderCircle, ShieldCheck } from 'lucide-react';
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
    const days = eachDayOfInterval({ start, end });

    return employees.filter(e => e.status === 'Approved').map(employee => {
      let p = 0, l = 0, h = 0, c = 0, w = 0, ot = 0;

      days.forEach(day => {
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
        
        if (extra?.otHours) ot += extra.otHours;
      });

      const totalEarnings = ((p + l + h + c + w) * employee.dailyRate) + (ot * employee.otRate) + (employee.attendanceBonus || 0) + (employee.foodAllowance || 0);
      const totalSalary = totalEarnings - (employee.deductions || 0);
      
      const existingSlip = salarySlips.find(s => s.employeeId === employee.id && s.month === monthStr);

      return {
        employee,
        stats: { p, l, h, c, w, ot },
        totalSalary,
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
          daysPresent: item.stats.p,
          daysLeave: item.stats.l,
          daysHoliday: item.stats.h,
          daysWeekOff: item.stats.w,
          daysCOff: item.stats.c,
          otHours: item.stats.ot,
          dailyRate: item.employee.dailyRate,
          otRate: item.employee.otRate,
          attendanceBonus: item.employee.attendanceBonus || 0,
          foodAllowance: item.employee.foodAllowance || 0,
          deductions: item.employee.deductions || 0,
          totalSalary: item.totalSalary
        };
        saveSalarySlip(slip);
      });
      setIsGenerating(false);
      toast({ title: "Slips Generated", description: `Successfully finalized slips for ${format(selectedMonth, 'MMMM yyyy')}` });
    }, 1000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0">
          <div>
            <CardTitle>Professional Salary Slips</CardTitle>
            <CardDescription>Generate official salary slips with allowances and deductions.</CardDescription>
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
              Finalize Slips
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-xl overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Pay Days</TableHead>
                  <TableHead>OT Hours</TableHead>
                  <TableHead>Net Salary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calculatedData.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{item.employee.name}</TableCell>
                    <TableCell>{item.stats.p + item.stats.l + item.stats.h + item.stats.c + item.stats.w} Days</TableCell>
                    <TableCell>{item.stats.ot} Hrs</TableCell>
                    <TableCell className="font-bold text-primary">₹{item.totalSalary.toLocaleString()}</TableCell>
                    <TableCell>
                      {item.existingSlip ? (
                        <div className="flex items-center text-green-600 text-xs font-bold">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Generated
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
        <DialogContent className="max-w-3xl p-0 overflow-hidden border-none shadow-2xl">
          {selectedSlip && (
            <div className="bg-white text-slate-900 printable-area text-xs sm:text-sm">
              <div className="bg-primary p-6 text-white flex justify-between items-center">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black tracking-tighter">SALARY SLIP</h2>
                  <p className="bg-white/20 text-[10px] inline-block px-2 py-0.5 rounded font-bold uppercase tracking-widest">
                    {format(new Date(selectedSlip.month + "-01"), 'MMMM yyyy')}
                  </p>
                </div>
                <div className="text-right">
                  <h3 className="text-lg font-bold">Attendance App Pvt Ltd</h3>
                  <p className="text-[10px] opacity-70">Main Office Site, Anantapur, AP</p>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4 border p-4 rounded-xl bg-slate-50/50">
                  <div className="space-y-2">
                    <div>
                      <span className="text-muted-foreground font-semibold text-[9px] uppercase block">Employee Name</span>
                      <span className="font-bold text-base">{selectedSlip.employeeName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground font-semibold text-[9px] uppercase block">Employee ID</span>
                      <span className="font-bold">{selectedSlip.employeeId}</span>
                    </div>
                  </div>
                  <div className="space-y-2 text-right">
                    <div>
                      <span className="text-muted-foreground font-semibold text-[9px] uppercase block">Slip Number</span>
                      <span className="font-bold">{selectedSlip.id}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground font-semibold text-[9px] uppercase block">Generation Date</span>
                      <span className="font-bold">{format(new Date(selectedSlip.generatedDate), 'PPP')}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Earnings Column */}
                  <div className="space-y-3">
                    <h4 className="font-black text-primary border-b pb-1 uppercase text-[10px]">Earnings Details</h4>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span>Basic Pay ({selectedSlip.daysPresent + selectedSlip.daysWeekOff + selectedSlip.daysLeave + selectedSlip.daysHoliday + selectedSlip.daysCOff} Days)</span>
                        <span className="font-bold">₹{((selectedSlip.daysPresent + selectedSlip.daysWeekOff + selectedSlip.daysLeave + selectedSlip.daysHoliday + selectedSlip.daysCOff) * selectedSlip.dailyRate).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>OT Pay ({selectedSlip.otHours} Hours)</span>
                        <span className="font-bold">₹{(selectedSlip.otHours * selectedSlip.otRate).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Attendance Bonus</span>
                        <span className="font-bold text-green-600">₹{selectedSlip.attendanceBonus.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Food Allowance</span>
                        <span className="font-bold text-green-600">₹{selectedSlip.foodAllowance.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2 font-black text-slate-800 bg-slate-100/50 px-2 rounded">
                        <span>Gross Earnings</span>
                        <span>₹{( 
                          ((selectedSlip.daysPresent + selectedSlip.daysWeekOff + selectedSlip.daysLeave + selectedSlip.daysHoliday + selectedSlip.daysCOff) * selectedSlip.dailyRate) +
                          (selectedSlip.otHours * selectedSlip.otRate) +
                          selectedSlip.attendanceBonus +
                          selectedSlip.foodAllowance
                        ).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Deductions Column */}
                  <div className="space-y-3">
                    <h4 className="font-black text-destructive border-b pb-1 uppercase text-[10px]">Deductions</h4>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span>Standard Deductions</span>
                        <span className="font-bold text-destructive">₹{selectedSlip.deductions.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Other / Taxes</span>
                        <span className="font-bold">₹0</span>
                      </div>
                      <div className="flex justify-between border-t pt-2 font-black text-slate-800 bg-slate-100/50 px-2 rounded">
                        <span>Total Deductions</span>
                        <span>₹{selectedSlip.deductions.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 bg-primary/5 border-2 border-primary/20 p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="text-center sm:text-left">
                    <h4 className="text-xs font-black text-slate-600 uppercase tracking-widest">Net Payable Salary</h4>
                    <p className="text-[10px] text-primary font-bold mt-1">Payment Method: Bank Transfer / Cash</p>
                  </div>
                  <div className="flex items-center text-4xl font-black text-primary drop-shadow-sm">
                    <IndianRupee className="h-8 w-8 mr-1" />
                    {selectedSlip.totalSalary.toLocaleString()}
                  </div>
                </div>

                <div className="pt-6 grid grid-cols-2 gap-8 text-[9px] uppercase font-bold text-muted-foreground italic">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary opacity-50" />
                    System Verified & Secured
                  </div>
                  <div className="text-right">
                    Authorized By HR Management
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted/20 border-t flex justify-end gap-3 no-print">
                <Button variant="outline" onClick={() => setSelectedSlip(null)}>Close</Button>
                <Button onClick={handlePrint} className="bg-primary hover:bg-primary/90">
                  <Printer className="mr-2 h-4 w-4" /> Print Payslip
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-area, .printable-area * {
            visibility: visible;
          }
          .printable-area {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            padding: 40px;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
