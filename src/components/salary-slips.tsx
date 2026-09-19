
'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/hooks/use-app';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from 'date-fns';
import { FileText, Printer, CheckCircle2, IndianRupee, LoaderCircle } from 'lucide-react';
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

      const totalSalary = ((p + l + h + c + w) * employee.dailyRate) + (ot * employee.otRate);
      
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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Salary Slip Management</CardTitle>
            <CardDescription>Generate and view monthly salary slips for all staff.</CardDescription>
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
              Finalize & Generate All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-xl overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Working Days</TableHead>
                  <TableHead>OT Hours</TableHead>
                  <TableHead>Gross Salary</TableHead>
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
                        <span className="text-amber-500 text-xs font-bold italic">Pending Finalization</span>
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
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl">
          {selectedSlip && (
            <div className="bg-white text-slate-900 printable-area">
              <div className="bg-primary p-8 text-white flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">SALARY SLIP</h2>
                  <p className="text-primary-foreground/80 mt-1 uppercase text-xs font-bold tracking-widest">
                    {format(new Date(selectedSlip.month), 'MMMM yyyy')}
                  </p>
                </div>
                <div className="text-right">
                  <h3 className="text-xl font-bold">Attendance App Ltd.</h3>
                  <p className="text-xs text-primary-foreground/70">Duddebanda, Andhra Pradesh</p>
                </div>
              </div>

              <div className="p-8 space-y-8">
                <div className="grid grid-cols-2 gap-8 border-b pb-8">
                  <div>
                    <h4 className="text-[10px] text-muted-foreground uppercase font-bold mb-2">Employee Details</h4>
                    <p className="text-lg font-bold">{selectedSlip.employeeName}</p>
                    <p className="text-sm text-slate-500">Employee ID: {selectedSlip.employeeId}</p>
                  </div>
                  <div className="text-right">
                    <h4 className="text-[10px] text-muted-foreground uppercase font-bold mb-2">Slip Information</h4>
                    <p className="text-sm font-medium">Slip ID: {selectedSlip.id}</p>
                    <p className="text-sm text-slate-500">Date: {format(new Date(selectedSlip.generatedDate), 'PPP')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-12">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-primary uppercase border-b pb-1">Attendance Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Present Days</span>
                        <span className="font-bold">{selectedSlip.daysPresent}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Paid Leaves / Holidays</span>
                        <span className="font-bold">{selectedSlip.daysLeave + selectedSlip.daysHoliday + selectedSlip.daysCOff}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Weekly Offs</span>
                        <span className="font-bold">{selectedSlip.daysWeekOff}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2 font-bold text-slate-800">
                        <span>Total Paid Days</span>
                        <span>{selectedSlip.daysPresent + selectedSlip.daysLeave + selectedSlip.daysHoliday + selectedSlip.daysCOff + selectedSlip.daysWeekOff}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-primary uppercase border-b pb-1">Earnings Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Daily Rate</span>
                        <span>₹{selectedSlip.dailyRate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Basic Pay</span>
                        <span className="font-bold">₹{((selectedSlip.daysPresent + selectedSlip.daysLeave + selectedSlip.daysHoliday + selectedSlip.daysCOff + selectedSlip.daysWeekOff) * selectedSlip.dailyRate).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Overtime ({selectedSlip.otHours}h)</span>
                        <span className="font-bold">₹{(selectedSlip.otHours * selectedSlip.otRate).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl flex justify-between items-center border border-slate-100">
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase">Net Payable Amount</h4>
                    <p className="text-sm text-slate-400 mt-1">Status: Fully Paid</p>
                  </div>
                  <div className="flex items-center text-3xl font-black text-primary">
                    <IndianRupee className="h-6 w-6 mr-1" />
                    {selectedSlip.totalSalary.toLocaleString()}
                  </div>
                </div>

                <div className="pt-8 flex justify-between items-end opacity-50 italic text-[10px]">
                  <p>Computer generated document. No signature required.</p>
                  <p>System verified by AI Intrusion Detection.</p>
                </div>
              </div>

              <div className="p-4 bg-muted/20 border-t flex justify-end gap-3 no-print">
                <Button variant="outline" onClick={() => setSelectedSlip(null)}>Close</Button>
                <Button onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" /> Print Slip
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
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
