
'use client';

import { useState } from 'react';
import { useApp } from '@/hooks/use-app';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wallet, IndianRupee, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PayrollManagement() {
  const { employees, updateEmployee } = useApp();
  const { toast } = useToast();
  const [editRates, setEditRates] = useState<Record<string, { daily: number, ot: number }>>({});

  const handleRateChange = (id: string, field: 'daily' | 'ot', value: string) => {
    const numValue = parseFloat(value) || 0;
    setEditRates(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || { daily: employees.find(e => e.id === id)?.dailyRate || 0, ot: employees.find(e => e.id === id)?.otRate || 0 }),
        [field]: numValue
      }
    }));
  };

  const saveRate = (id: string) => {
    const rates = editRates[id];
    if (!rates) return;
    updateEmployee(id, { dailyRate: rates.daily, otRate: rates.ot });
    toast({ title: "Rates Updated", description: "Salary structure for this employee has been saved." });
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

      <Card>
        <CardHeader>
          <CardTitle>Salary Structure</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee Name</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Daily Rate (₹)</TableHead>
                <TableHead>OT Rate (₹/Hr)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map(emp => (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium">{emp.name}</TableCell>
                  <TableCell className="text-xs uppercase">{emp.id}</TableCell>
                  <TableCell>
                    <Input 
                      type="number" 
                      className="w-24 h-9" 
                      defaultValue={emp.dailyRate} 
                      onChange={(e) => handleRateChange(emp.id, 'daily', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      type="number" 
                      className="w-24 h-9" 
                      defaultValue={emp.otRate} 
                      onChange={(e) => handleRateChange(emp.id, 'ot', e.target.value)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      size="sm" 
                      onClick={() => saveRate(emp.id)}
                      disabled={!editRates[emp.id]}
                    >
                      <Save className="h-4 w-4 mr-2" /> Save
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
