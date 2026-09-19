
'use client';

import { useState } from 'react';
import { useApp } from '@/hooks/use-app';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { IndianRupee, Save, CheckCircle2, Info, AlertCircle } from 'lucide-react';
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
      description: "మాస్టర్ శాలరీ రేట్లు విజయవంతంగా సేవ్ చేయబడ్డాయి. ఇవి ప్రతి నెలా ఆటోమేటిక్‌గా వర్తిస్తాయి." 
    });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5" /> 
            Master Payroll Configuration
          </CardTitle>
          <CardDescription>
            ప్రతి ఉద్యోగికి ఫిక్స్‌డ్ జీతం మరియు అలవెన్సులను ఇక్కడ సెట్ చేయండి. ఇవి శాశ్వతంగా సేవ్ చేయబడతాయి.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="flex flex-col gap-3">
          <div className="p-4 bg-blue-50 text-blue-800 text-xs font-bold rounded-xl border border-blue-200 flex items-start gap-2">
             <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
             <p>ముఖ్య గమనిక: ఇక్కడ మీరు ఎంటర్ చేసే "Daily Rate", "Incentive" మరియు ఇతర వివరాలు శాశ్వతంగా సేవ్ చేయబడతాయి. వీటిని ప్రతి నెలా ఎంటర్ చేయాల్సిన అవసరం లేదు. ఏదైనా మార్పు ఉంటేనే ఇక్కడ అప్‌డేట్ చేయండి.</p>
          </div>
          
          <div className="p-4 bg-amber-50 text-amber-800 text-[10px] font-semibold rounded-xl border border-amber-200 flex items-start gap-2">
             <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
             <p>PF (12%), ESI (0.75%), PT, మరియు IT/TDS లను ఆన్ చేసినప్పుడు మాత్రమే ప్రభుత్వ నిబంధనల ప్రకారం ఆటోమేటిక్‌గా లెక్కించబడతాయి. Absent/Leave రోజులకు LOP Deduction ఆటోమేటిక్‌గా లెక్కించబడుతుంది.</p>
          </div>
      </div>

      <Card className="border-none shadow-md overflow-hidden">
        <CardContent className="p-0">
          <ScrollArea className="w-full whitespace-nowrap">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 text-[10px] uppercase tracking-wider">
                  <TableHead className="min-w-[150px] sticky left-0 bg-muted/50 z-20 border-r">Employee Details</TableHead>
                  <TableHead>Master Earnings & Rates (Permanent)</TableHead>
                  <TableHead>Statutory (Govt Rules)</TableHead>
                  <TableHead>Regular Deductions</TableHead>
                  <TableHead className="text-right sticky right-0 bg-muted/50 z-20 border-l">Save Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length > 0 ? employees.map(emp => {
                  const isModified = !!editRates[emp.id];
                  const data = editRates[emp.id] || emp;
                  
                  return (
                    <TableRow key={emp.id} className={isModified ? "bg-primary/5 transition-colors" : ""}>
                      <TableCell className="sticky left-0 bg-white z-10 border-r shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                        <div className="font-bold text-sm text-slate-800">{emp.name}</div>
                        <div className="text-[10px] uppercase text-muted-foreground font-mono">{emp.id}</div>
                      </TableCell>

                      <TableCell>
                        <div className="grid grid-cols-3 gap-x-6 gap-y-3 py-4 w-[750px] px-2">
                           <div className="space-y-1">
                             <label className="text-[10px] font-black text-primary uppercase">Daily Rate (₹/Day)</label>
                             <Input 
                                type="number" 
                                className="h-8 text-xs font-black border-primary ring-offset-primary/10 focus:ring-1" 
                                defaultValue={data.dailyRate} 
                                onChange={(e) => handleRateChange(emp.id, 'dailyRate', parseFloat(e.target.value) || 0)} 
                             />
                           </div>
                           <div className="space-y-1">
                             <label className="text-[10px] font-bold text-slate-500 uppercase">Basic Salary (Mo)</label>
                             <Input type="number" className="h-8 text-xs" defaultValue={data.basicSalary} onChange={(e) => handleRateChange(emp.id, 'basicSalary', parseFloat(e.target.value) || 0)} />
                           </div>
                           <div className="space-y-1">
                             <label className="text-[10px] font-bold text-slate-500 uppercase">Monthly HRA</label>
                             <Input type="number" className="h-8 text-xs" defaultValue={data.hra} onChange={(e) => handleRateChange(emp.id, 'hra', parseFloat(e.target.value) || 0)} />
                           </div>
                           <div className="space-y-1">
                             <label className="text-[10px] font-bold text-green-700 uppercase">Fixed Incentive</label>
                             <Input type="number" className="h-8 text-xs border-green-200 bg-green-50/30" defaultValue={data.incentive} onChange={(e) => handleRateChange(emp.id, 'incentive', parseFloat(e.target.value) || 0)} />
                           </div>
                           <div className="space-y-1">
                             <label className="text-[10px] font-bold text-slate-500 uppercase">Food Allowance</label>
                             <Input type="number" className="h-8 text-xs" defaultValue={data.foodAllowance} onChange={(e) => handleRateChange(emp.id, 'foodAllowance', parseFloat(e.target.value) || 0)} />
                           </div>
                           <div className="space-y-1">
                             <label className="text-[10px] font-bold text-slate-500 uppercase">OT Rate (per Hour)</label>
                             <Input type="number" className="h-8 text-xs" defaultValue={data.otRate} onChange={(e) => handleRateChange(emp.id, 'otRate', parseFloat(e.target.value) || 0)} />
                           </div>
                           <div className="space-y-1 col-span-3 pt-1">
                             <label className="text-[10px] text-primary font-black uppercase">Other Master Earnings (Amount & Reason)</label>
                             <div className="flex gap-2">
                               <Input type="number" className="h-8 text-xs w-24 font-bold" placeholder="₹ Amt" defaultValue={data.otherEarnings} onChange={(e) => handleRateChange(emp.id, 'otherEarnings', parseFloat(e.target.value) || 0)} />
                               <Input className="h-8 text-[11px] flex-1 bg-slate-50" placeholder="e.g. Travel Allowance, Mobile Recharge..." defaultValue={data.otherEarningsNote} onChange={(e) => handleRateChange(emp.id, 'otherEarningsNote', e.target.value)} />
                             </div>
                           </div>
                        </div>
                      </TableCell>

                      <TableCell>
                         <div className="grid grid-cols-1 gap-2.5 py-4 w-[240px] px-2">
                           <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                              <span className="text-[10px] font-black text-slate-700">EPF (12%)</span>
                              <Switch 
                                checked={data.isPFEnabled} 
                                onCheckedChange={(checked) => handleRateChange(emp.id, 'isPFEnabled', checked)} 
                              />
                           </div>
                           <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                              <span className="text-[10px] font-black text-slate-700">ESI (0.75%)</span>
                              <Switch 
                                checked={data.isESIEnabled} 
                                onCheckedChange={(checked) => handleRateChange(emp.id, 'isESIEnabled', checked)} 
                              />
                           </div>
                           <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                              <span className="text-[10px] font-black text-slate-700">Prof. Tax (PT)</span>
                              <Switch 
                                checked={data.isPTEnabled} 
                                onCheckedChange={(checked) => handleRateChange(emp.id, 'isPTEnabled', checked)} 
                              />
                           </div>
                           <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                              <span className="text-[10px] font-black text-slate-700">IT / TDS</span>
                              <Switch 
                                checked={data.isITEnabled} 
                                onCheckedChange={(checked) => handleRateChange(emp.id, 'isITEnabled', checked)} 
                              />
                           </div>
                         </div>
                      </TableCell>

                      <TableCell>
                         <div className="grid gap-3 py-4 w-[280px] px-2">
                           <div className="space-y-1">
                             <label className="text-[10px] font-bold text-destructive uppercase">Loan Recovery (Monthly)</label>
                             <Input type="number" className="h-8 text-xs border-destructive/20" defaultValue={data.loanRecovery} onChange={(e) => handleRateChange(emp.id, 'loanRecovery', parseFloat(e.target.value) || 0)} />
                           </div>
                           <div className="space-y-1 pt-1">
                             <label className="text-[10px] text-destructive font-black uppercase">Other Fixed Deductions (Amount & Reason)</label>
                             <div className="flex gap-2">
                               <Input type="number" className="h-8 text-xs w-24 font-bold" placeholder="₹ Amt" defaultValue={data.otherDeductions} onChange={(e) => handleRateChange(emp.id, 'otherDeductions', parseFloat(e.target.value) || 0)} />
                               <Input className="h-8 text-[11px] flex-1 bg-red-50/20" placeholder="e.g. Damage Recovery, Fine..." defaultValue={data.otherDeductionsNote} onChange={(e) => handleRateChange(emp.id, 'otherDeductionsNote', e.target.value)} />
                             </div>
                           </div>
                         </div>
                      </TableCell>

                      <TableCell className="text-right sticky right-0 bg-white z-10 border-l shadow-[-2px_0_5px_rgba(0,0,0,0.02)]">
                        <div className="flex justify-center p-2">
                            <Button 
                            size="lg" 
                            onClick={() => saveRate(emp.id)}
                            disabled={!isModified}
                            variant={isModified ? "default" : "ghost"}
                            className={cn(
                                "w-16 h-12 rounded-2xl shadow-lg transition-all",
                                isModified ? "bg-green-600 hover:bg-green-700 text-white scale-110" : "text-muted-foreground opacity-30"
                            )}
                            >
                            {isModified ? <Save className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
                            </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-48 text-muted-foreground italic">
                      No employees found to configure. Please add employees in 'Employees' tab first.
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

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
