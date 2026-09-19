'use client';

import { useState } from 'react';
import { useApp } from '@/hooks/use-app';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { IndianRupee, Save, CheckCircle2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export default function PayrollManagement() {
  const { employees, updateEmployee } = useApp();
  const { toast } = useToast();
  const [editRates, setEditRates] = useState<Record<string, any>>({});

  const handleRateChange = (id: string, field: string, value: any) => {
    setEditRates(prev => {
      const currentEmp = employees.find(e => e.id.toUpperCase() === id.toUpperCase());
      const base = prev[id] || { ...currentEmp };
      
      return {
        ...prev,
        [id]: {
          ...base,
          [field]: value
        }
      };
    });
  };

  const saveRate = (id: string) => {
    const rates = editRates[id];
    if (!rates) return;

    updateEmployee(id, rates);

    setEditRates(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    toast({ 
      title: "Payroll Updated", 
      description: "Employee salary structure saved successfully." 
    });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5" /> 
            Professional Payroll Configuration
          </CardTitle>
          <CardDescription>ప్రతి ఉద్యోగికి రోజువారీ రేటు, జీతం, అలవెన్సులు మరియు డిడక్షన్లను ఇక్కడ సెట్ చేయండి.</CardDescription>
        </CardHeader>
      </Card>

      <div className="p-4 bg-amber-50 text-amber-800 text-xs font-semibold rounded-xl border border-amber-200 flex items-start gap-2">
         <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
         <p>గమనిక: PF (12%), ESI (0.75%), PT, మరియు IT/TDS లను ఆన్ చేసినప్పుడు మాత్రమే ప్రభుత్వ నిబంధనల ప్రకారం ఆటోమేటిక్‌గా లెక్కించబడతాయి. లీవ్ మరియు అబ్సెంట్ రోజులకు LOP Deduction ఆటోమేటిక్‌గా లెక్కించబడుతుంది.</p>
      </div>

      <Card className="border-none shadow-md overflow-hidden">
        <CardContent className="p-0">
          <ScrollArea className="w-full whitespace-nowrap">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 text-[10px] uppercase tracking-wider">
                  <TableHead className="min-w-[150px] sticky left-0 bg-muted/50 z-20">Employee</TableHead>
                  <TableHead>Earnings & Rates (Monthly)</TableHead>
                  <TableHead>Statutory (Toggle On/Off)</TableHead>
                  <TableHead>Manual Deductions</TableHead>
                  <TableHead className="text-right sticky right-0 bg-muted/50 z-20">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length > 0 ? employees.map(emp => {
                  const isModified = !!editRates[emp.id];
                  const data = editRates[emp.id] || emp;
                  
                  return (
                    <TableRow key={emp.id} className={isModified ? "bg-primary/5" : ""}>
                      <TableCell className="sticky left-0 bg-white z-10 border-r">
                        <div className="font-semibold text-sm">{emp.name}</div>
                        <div className="text-[10px] uppercase text-muted-foreground">{emp.id}</div>
                      </TableCell>

                      <TableCell>
                        <div className="grid grid-cols-3 gap-x-4 gap-y-2 py-2 w-[650px]">
                           <div className="space-y-1">
                             <label className="text-[9px] font-bold text-primary">Daily Rate (₹/Day)</label>
                             <Input type="number" className="h-7 text-xs font-bold border-primary" defaultValue={data.dailyRate} onChange={(e) => handleRateChange(emp.id, 'dailyRate', parseFloat(e.target.value) || 0)} />
                           </div>
                           <div className="space-y-1">
                             <label className="text-[9px] text-muted-foreground">Basic Salary</label>
                             <Input type="number" className="h-7 text-xs" defaultValue={data.basicSalary} onChange={(e) => handleRateChange(emp.id, 'basicSalary', parseFloat(e.target.value) || 0)} />
                           </div>
                           <div className="space-y-1">
                             <label className="text-[9px] text-muted-foreground">HRA</label>
                             <Input type="number" className="h-7 text-xs" defaultValue={data.hra} onChange={(e) => handleRateChange(emp.id, 'hra', parseFloat(e.target.value) || 0)} />
                           </div>
                           <div className="space-y-1">
                             <label className="text-[9px] text-muted-foreground">Food Allowance</label>
                             <Input type="number" className="h-7 text-xs" defaultValue={data.foodAllowance} onChange={(e) => handleRateChange(emp.id, 'foodAllowance', parseFloat(e.target.value) || 0)} />
                           </div>
                           <div className="space-y-1">
                             <label className="text-[9px] text-green-700 font-bold">Incentive</label>
                             <Input type="number" className="h-7 text-xs border-green-200" defaultValue={data.incentive} onChange={(e) => handleRateChange(emp.id, 'incentive', parseFloat(e.target.value) || 0)} />
                           </div>
                           <div className="space-y-1">
                             <label className="text-[9px] text-muted-foreground">OT Rate (h)</label>
                             <Input type="number" className="h-7 text-xs" defaultValue={data.otRate} onChange={(e) => handleRateChange(emp.id, 'otRate', parseFloat(e.target.value) || 0)} />
                           </div>
                           <div className="space-y-1 col-span-3">
                             <label className="text-[9px] text-primary font-bold">Manual Other Earnings (Amt & Reason)</label>
                             <div className="flex gap-1">
                               <Input type="number" className="h-7 text-xs w-20" placeholder="Amt" defaultValue={data.otherEarnings} onChange={(e) => handleRateChange(emp.id, 'otherEarnings', parseFloat(e.target.value) || 0)} />
                               <Input className="h-7 text-[10px] flex-1" placeholder="Reason" defaultValue={data.otherEarningsNote} onChange={(e) => handleRateChange(emp.id, 'otherEarningsNote', e.target.value)} />
                             </div>
                           </div>
                        </div>
                      </TableCell>

                      <TableCell>
                         <div className="grid grid-cols-1 gap-3 py-2 w-[220px]">
                           <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg border border-slate-200">
                              <span className="text-[10px] font-bold">EPF (12%)</span>
                              <Switch 
                                checked={data.isPFEnabled} 
                                onCheckedChange={(checked) => handleRateChange(emp.id, 'isPFEnabled', checked)} 
                              />
                           </div>
                           <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg border border-slate-200">
                              <span className="text-[10px] font-bold">ESI (0.75%)</span>
                              <Switch 
                                checked={data.isESIEnabled} 
                                onCheckedChange={(checked) => handleRateChange(emp.id, 'isESIEnabled', checked)} 
                              />
                           </div>
                           <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg border border-slate-200">
                              <span className="text-[10px] font-bold">Prof. Tax (PT)</span>
                              <Switch 
                                checked={data.isPTEnabled} 
                                onCheckedChange={(checked) => handleRateChange(emp.id, 'isPTEnabled', checked)} 
                              />
                           </div>
                           <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg border border-slate-200">
                              <span className="text-[10px] font-bold">IT / TDS</span>
                              <Switch 
                                checked={data.isITEnabled} 
                                onCheckedChange={(checked) => handleRateChange(emp.id, 'isITEnabled', checked)} 
                              />
                           </div>
                         </div>
                      </TableCell>

                      <TableCell>
                         <div className="grid gap-2 py-2 w-[250px]">
                           <div className="space-y-1">
                             <label className="text-[9px] text-destructive">Loan Recovery</label>
                             <Input type="number" className="h-7 text-xs" defaultValue={data.loanRecovery} onChange={(e) => handleRateChange(emp.id, 'loanRecovery', parseFloat(e.target.value) || 0)} />
                           </div>
                           <div className="space-y-1">
                             <label className="text-[9px] text-destructive font-bold">Manual Other Deductions (Amt & Reason)</label>
                             <div className="flex gap-1">
                               <Input type="number" className="h-7 text-xs w-20" placeholder="Amt" defaultValue={data.otherDeductions} onChange={(e) => handleRateChange(emp.id, 'otherDeductions', parseFloat(e.target.value) || 0)} />
                               <Input className="h-7 text-[10px] flex-1" placeholder="Reason" defaultValue={data.otherDeductionsNote} onChange={(e) => handleRateChange(emp.id, 'otherDeductionsNote', e.target.value)} />
                             </div>
                           </div>
                         </div>
                      </TableCell>

                      <TableCell className="text-right sticky right-0 bg-white z-10 border-l">
                        <Button 
                          size="sm" 
                          onClick={() => saveRate(emp.id)}
                          disabled={!isModified}
                          variant={isModified ? "default" : "ghost"}
                          className={isModified ? "bg-green-600 hover:bg-green-700 text-white" : "text-muted-foreground"}
                        >
                          {isModified ? <Save className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-32">
                      No employees to configure.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}