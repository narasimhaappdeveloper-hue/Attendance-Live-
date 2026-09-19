'use client';

import { useState } from 'react';
import { useApp } from '@/hooks/use-app';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IndianRupee, Save, CheckCircle2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export default function PayrollManagement() {
  const { employees, updateEmployee } = useApp();
  const { toast } = useToast();
  const [editRates, setEditRates] = useState<Record<string, any>>({});

  const handleRateChange = (id: string, field: string, value: string | number) => {
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
          <CardDescription>ప్రతి ఉద్యోగికి జీతం, అలవెన్సులు మరియు డిడక్షన్లను ఇక్కడ సెట్ చేయండి.</CardDescription>
        </CardHeader>
      </Card>

      <div className="p-4 bg-amber-50 text-amber-800 text-xs font-semibold rounded-xl border border-amber-200 flex items-start gap-2">
         <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
         <p>గమనిక: PF (12%) మరియు ESI (0.75%) ప్రభుత్వ నిబంధనల ప్రకారం ఆటోమేటిక్‌గా లెక్కించబడతాయి. Food Allowance మరియు ఇతర అలవెన్సులను మీరు నమోదు చేయవచ్చు.</p>
      </div>

      <Card className="border-none shadow-md overflow-hidden">
        <CardContent className="p-0">
          <ScrollArea className="w-full whitespace-nowrap">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 text-[10px] uppercase tracking-wider">
                  <TableHead className="min-w-[150px] sticky left-0 bg-muted/50 z-20">Employee</TableHead>
                  <TableHead>Basic Details</TableHead>
                  <TableHead>Earnings (Monthly)</TableHead>
                  <TableHead>Deductions (Monthly)</TableHead>
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
                        <div className="space-y-2 py-2">
                          <Input className="w-32 h-7 text-[10px]" placeholder="Designation" defaultValue={data.designation} onChange={(e) => handleRateChange(emp.id, 'designation', e.target.value)} />
                          <Input className="w-32 h-7 text-[10px]" placeholder="PAN" defaultValue={data.panNumber} onChange={(e) => handleRateChange(emp.id, 'panNumber', e.target.value)} />
                          <Input className="w-32 h-7 text-[10px]" placeholder="UAN/PF" defaultValue={data.uanNumber} onChange={(e) => handleRateChange(emp.id, 'uanNumber', e.target.value)} />
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 py-2 w-[550px]">
                           <div className="space-y-1">
                             <label className="text-[9px] text-muted-foreground">Basic</label>
                             <Input type="number" className="h-7 text-xs" defaultValue={data.basicSalary} onChange={(e) => handleRateChange(emp.id, 'basicSalary', parseFloat(e.target.value) || 0)} />
                           </div>
                           <div className="space-y-1">
                             <label className="text-[9px] text-muted-foreground">HRA</label>
                             <Input type="number" className="h-7 text-xs" defaultValue={data.hra} onChange={(e) => handleRateChange(emp.id, 'hra', parseFloat(e.target.value) || 0)} />
                           </div>
                           <div className="space-y-1">
                             <label className="text-[9px] text-muted-foreground">DA</label>
                             <Input type="number" className="h-7 text-xs" defaultValue={data.da} onChange={(e) => handleRateChange(emp.id, 'da', parseFloat(e.target.value) || 0)} />
                           </div>
                           <div className="space-y-1">
                             <label className="text-[9px] text-muted-foreground">Conveyance</label>
                             <Input type="number" className="h-7 text-xs" defaultValue={data.conveyance} onChange={(e) => handleRateChange(emp.id, 'conveyance', parseFloat(e.target.value) || 0)} />
                           </div>
                           <div className="space-y-1">
                             <label className="text-[9px] text-green-600 font-bold">Food Allowance</label>
                             <Input type="number" className="h-7 text-xs" defaultValue={data.foodAllowance} onChange={(e) => handleRateChange(emp.id, 'foodAllowance', parseFloat(e.target.value) || 0)} />
                           </div>
                           <div className="space-y-1">
                             <label className="text-[9px] text-green-600 font-bold">Bonus/Others</label>
                             <Input type="number" className="h-7 text-xs" defaultValue={data.attendanceBonus} onChange={(e) => handleRateChange(emp.id, 'attendanceBonus', parseFloat(e.target.value) || 0)} />
                           </div>
                           <div className="space-y-1">
                             <label className="text-[9px] text-muted-foreground">OT Rate (h)</label>
                             <Input type="number" className="h-7 text-xs" defaultValue={data.otRate} onChange={(e) => handleRateChange(emp.id, 'otRate', parseFloat(e.target.value) || 0)} />
                           </div>
                           <div className="space-y-1">
                             <label className="text-[9px] text-muted-foreground">Manual Other Earnings</label>
                             <Input type="number" className="h-7 text-xs font-bold" defaultValue={data.otherEarnings} onChange={(e) => handleRateChange(emp.id, 'otherEarnings', parseFloat(e.target.value) || 0)} />
                           </div>
                        </div>
                      </TableCell>

                      <TableCell>
                         <div className="grid grid-cols-2 gap-x-4 gap-y-2 py-2 w-[450px]">
                           <div className="space-y-1 opacity-70">
                             <label className="text-[9px] text-blue-600 font-bold">PF (Auto 12%)</label>
                             <div className="h-7 text-xs border rounded bg-slate-50 flex items-center px-2 font-mono font-bold text-slate-500">₹{Math.round((data.basicSalary || 0) * 0.12)}</div>
                           </div>
                           <div className="space-y-1 opacity-70">
                             <label className="text-[9px] text-blue-600 font-bold">ESI (Auto 0.75%)</label>
                             <div className="h-7 text-xs border rounded bg-slate-50 flex items-center px-2 font-mono font-bold text-slate-500">Auto Govt Rule</div>
                           </div>
                           <div className="space-y-1">
                             <label className="text-[9px] text-destructive">Professional Tax</label>
                             <Input type="number" className="h-7 text-xs" defaultValue={data.professionalTax} onChange={(e) => handleRateChange(emp.id, 'professionalTax', parseFloat(e.target.value) || 0)} />
                           </div>
                           <div className="space-y-1">
                             <label className="text-[9px] text-destructive">Income Tax (TDS)</label>
                             <Input type="number" className="h-7 text-xs" defaultValue={data.incomeTax} onChange={(e) => handleRateChange(emp.id, 'incomeTax', parseFloat(e.target.value) || 0)} />
                           </div>
                           <div className="space-y-1 col-span-2">
                             <label className="text-[9px] text-destructive font-bold">Manual Other Deductions</label>
                             <Input type="number" className="h-7 text-xs font-bold" defaultValue={data.otherDeductions} onChange={(e) => handleRateChange(emp.id, 'otherDeductions', parseFloat(e.target.value) || 0)} />
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
