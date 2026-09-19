
'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/hooks/use-app';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IndianRupee, TrendingUp, Users, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function PaymentHistory() {
  const { salarySlips, employees } = useApp();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const years = useMemo(() => {
    const uniqueYears = Array.from(new Set(salarySlips.map(s => s.month.split('-')[0])));
    if (uniqueYears.length === 0) return [new Date().getFullYear().toString()];
    return uniqueYears.sort((a, b) => b.localeCompare(a));
  }, [salarySlips]);

  const yearStats = useMemo(() => {
    const yearSlips = salarySlips.filter(s => s.month.startsWith(selectedYear));
    
    const totalPaid = yearSlips.reduce((acc, curr) => acc + curr.totalSalary, 0);
    const totalOT = yearSlips.reduce((acc, curr) => acc + curr.otHours, 0);
    
    const monthlyBreakdown = Array.from({ length: 12 }).map((_, i) => {
      const mStr = `${selectedYear}-${(i + 1).toString().padStart(2, '0')}`;
      const monthSlips = yearSlips.filter(s => s.month === mStr);
      const amount = monthSlips.reduce((acc, curr) => acc + curr.totalSalary, 0);
      return { month: format(new Date(selectedYear as any, i, 1), 'MMMM'), amount };
    });

    const employeeSummary = employees.map(emp => {
      const empSlips = yearSlips.filter(s => s.employeeId === emp.id);
      const amount = empSlips.reduce((acc, curr) => acc + curr.totalSalary, 0);
      const count = empSlips.length;
      return { name: emp.name, id: emp.id, amount, count };
    }).filter(e => e.amount > 0).sort((a, b) => b.amount - a.amount);

    return { totalPaid, totalOT, monthlyBreakdown, employeeSummary };
  }, [salarySlips, selectedYear, employees]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Annual Payment Tracking</h2>
          <p className="text-muted-foreground">Historical records of all salaries paid.</p>
        </div>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="bg-primary p-3 rounded-2xl">
              <IndianRupee className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase">Total Paid ({selectedYear})</p>
              <h3 className="text-2xl font-black text-primary">₹{yearStats.totalPaid.toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="bg-amber-500 p-3 rounded-2xl">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-600 uppercase">Total OT Hours</p>
              <h3 className="text-2xl font-black text-amber-700">{yearStats.totalOT} Hrs</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="bg-green-600 p-3 rounded-2xl">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-green-600 uppercase">Paid Employees</p>
              <h3 className="text-2xl font-black text-green-700">{yearStats.employeeSummary.length}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" /> Monthly Payouts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {yearStats.monthlyBreakdown.map((m, idx) => (
                <div key={idx} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-slate-200 group-hover:bg-primary transition-colors" />
                    <span className="text-sm font-medium text-slate-600">{m.month}</span>
                  </div>
                  <div className="flex-1 border-b border-dashed mx-4 opacity-20" />
                  <span className="font-bold text-slate-800">₹{m.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Employee Wise Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-xl overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Staff Name</TableHead>
                    <TableHead>Slips</TableHead>
                    <TableHead className="text-right">Total Paid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {yearStats.employeeSummary.length > 0 ? yearStats.employeeSummary.map((e, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <div className="font-bold">{e.name}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">{e.id}</div>
                      </TableCell>
                      <TableCell>{e.count} Months</TableCell>
                      <TableCell className="text-right font-black text-primary">₹{e.amount.toLocaleString()}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={3} className="h-32 text-center text-muted-foreground italic">
                        No payments found for this year.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
