
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
  const [editRates, setEditRates] = useState<Record<string, { daily: number, ot: number }>>({});

  const handleRateChange = (id: string, field: 'daily' | 'ot', value: string) => {
    const numValue = parseFloat(value);
    
    setEditRates(prev => {
      // Find the existing employee to get the base values if not already in editRates
      const currentEmp = employees.find(e => e.id.toUpperCase() === id.toUpperCase());
      const base = prev[id] || { 
        daily: currentEmp?.dailyRate ?? 0, 
        ot: currentEmp?.otRate ?? 0 
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
      otRate: rates.ot 
    });

    // Clear the pending edits for this employee after saving to disable button
    setEditRates(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    toast({ 
      title: "Rates Updated", 
      description: "Salary structure for this employee has been saved successfully." 
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
            <CardDescription>ప్రతి ఉద్యోగికి డైలీ రేట్ మరియు ఓవర్‌టైమ్ రేట్‌ను ఇక్కడ సెట్ చేయవచ్చు.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            ఈ వివరాల ఆధారంగా మంత్లీ రిపోర్ట్స్‌లో జీతం ఆటోమేటిక్‌గా లెక్కించబడుతుంది.
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-md overflow-hidden">
        <CardHeader>
          <CardTitle>Salary Structure</CardTitle>
          <CardDescription>Update wage rates for your approved staff.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border/60 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Employee Name</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Daily Rate (₹)</TableHead>
                  <TableHead>OT Rate (₹/Hr)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length > 0 ? employees.map(emp => {
                  const isModified = !!editRates[emp.id];
                  
                  return (
                    <TableRow key={emp.id} className={isModified ? "bg-primary/5" : ""}>
                      <TableCell className="font-semibold">{emp.name}</TableCell>
                      <TableCell className="text-xs font-mono uppercase text-muted-foreground">{emp.id}</TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          className="w-28 h-9 rounded-lg" 
                          defaultValue={emp.dailyRate} 
                          onChange={(e) => handleRateChange(emp.id, 'daily', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          className="w-28 h-9 rounded-lg" 
                          defaultValue={emp.otRate} 
                          onChange={(e) => handleRateChange(emp.id, 'ot', e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          onClick={() => saveRate(emp.id)}
                          disabled={!isModified}
                          variant={isModified ? "default" : "ghost"}
                          className={isModified ? "bg-green-600 hover:bg-green-700 text-white rounded-lg px-4" : "text-muted-foreground"}
                        >
                          {isModified ? <Save className="h-4 w-4 mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                          {isModified ? "Save" : "Saved"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-32 text-muted-foreground">
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
