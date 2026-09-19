
'use client';

import { useState } from 'react';
import { useApp } from '@/hooks/use-app';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IndianRupee, Save, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PayrollManagement() {
  const { employees, updateEmployee } = useApp();
  const { toast } = useToast();
  // dictionary to track pending changes per employee ID
  const [editRates, setEditRates] = useState<Record<string, { daily: number, ot: number, bonus: number, food: number, deduct: number }>>({});

  const handleRateChange = (id: string, field: 'daily' | 'ot' | 'bonus' | 'food' | 'deduct', value: string) => {
    const numValue = parseFloat(value);
    
    setEditRates(prev => {
      // Find the existing employee to get the base values if not already in editRates
      const currentEmp = employees.find(e => e.id.toUpperCase() === id.toUpperCase());
      const base = prev[id] || { 
        daily: currentEmp?.dailyRate ?? 0, 
        ot: currentEmp?.otRate ?? 0,
        bonus: currentEmp?.attendanceBonus ?? 0,
        food: currentEmp?.foodAllowance ?? 0,
        deduct: currentEmp?.deductions ?? 0
      };
      
      return {
        ...prev,
        [id]: {
          ...base,
          [field]: isNaN(numValue) ? 0 : numValue
        }
      };
    });
  };

  const saveRate = (id: string) => {
    const rates = editRates[id];
    if (!rates) return;

    // Trigger the update in global state
    updateEmployee(id, { 
      dailyRate: rates.daily, 
      otRate: rates.ot,
      attendanceBonus: rates.bonus,
      foodAllowance: rates.food,
      deductions: rates.deduct
    });

    // Clear the pending edits for this employee after saving to disable button
    setEditRates(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    toast({ 
      title: "Payroll Updated", 
      description: "Salary structure and allowances for this employee have been saved." 
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5" /> 
              Payroll Configuration
            </CardTitle>
            <CardDescription>ప్రతి ఉద్యోగికి జీతం, బోనస్ మరియు ఇతర అలవెన్సులను ఇక్కడ సెట్ చేయవచ్చు.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            ఈ వివరాలు ఆటోమేటిక్‌గా మంత్లీ శాలరీ స్లిప్పులలో ప్రతిబింబిస్తాయి.
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-md overflow-hidden">
        <CardHeader>
          <CardTitle>Professional Salary Structure</CardTitle>
          <CardDescription>Update wage rates, bonuses and deductions for your staff.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border/60 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 text-[10px] uppercase tracking-wider">
                  <TableHead className="min-w-[150px]">Employee</TableHead>
                  <TableHead>Daily Rate (₹)</TableHead>
                  <TableHead>OT Rate (₹/h)</TableHead>
                  <TableHead>Bonus (₹)</TableHead>
                  <TableHead>Food (₹)</TableHead>
                  <TableHead>Deduct (₹)</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length > 0 ? employees.map(emp => {
                  const isModified = !!editRates[emp.id];
                  
                  return (
                    <TableRow key={emp.id} className={isModified ? "bg-primary/5" : ""}>
                      <TableCell>
                        <div className="font-semibold text-sm">{emp.name}</div>
                        <div className="text-[10px] font-mono uppercase text-muted-foreground">{emp.id}</div>
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          className="w-20 h-8 text-xs rounded-md" 
                          defaultValue={emp.dailyRate} 
                          onChange={(e) => handleRateChange(emp.id, 'daily', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          className="w-20 h-8 text-xs rounded-md" 
                          defaultValue={emp.otRate} 
                          onChange={(e) => handleRateChange(emp.id, 'ot', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          className="w-20 h-8 text-xs rounded-md" 
                          defaultValue={emp.attendanceBonus} 
                          onChange={(e) => handleRateChange(emp.id, 'bonus', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          className="w-20 h-8 text-xs rounded-md" 
                          defaultValue={emp.foodAllowance} 
                          onChange={(e) => handleRateChange(emp.id, 'food', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          className="w-20 h-8 text-xs rounded-md" 
                          defaultValue={emp.deductions} 
                          onChange={(e) => handleRateChange(emp.id, 'deduct', e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          onClick={() => saveRate(emp.id)}
                          disabled={!isModified}
                          variant={isModified ? "default" : "ghost"}
                          className={isModified ? "bg-green-600 hover:bg-green-700 text-white rounded-md h-8" : "text-muted-foreground h-8"}
                        >
                          {isModified ? <Save className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">
                      No employees found to manage payroll.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
