'use client';

import { useApp } from '@/hooks/use-app';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Clock, Save, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ShiftSettings } from '@/lib/types';

export default function ShiftManagement() {
  const { shiftSettings, updateShiftSetting } = useApp();
  const { toast } = useToast();

  const handleSave = (shift: keyof ShiftSettings, value: string) => {
    const hour = parseInt(value);
    if (isNaN(hour) || hour < 0 || hour > 23) {
      toast({
        variant: 'destructive',
        title: 'Invalid Input',
        description: 'దయచేసి 0 నుండి 23 మధ్య గంటలను ఎంటర్ చేయండి.'
      });
      return;
    }
    updateShiftSetting(shift, hour);
    toast({
      title: 'Shift Updated',
      description: `${shift} స్టార్ట్ టైమ్ ₹{hour}:00 కు మార్చబడింది.`
    });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" /> Shift Start Timings
          </CardTitle>
          <CardDescription>
            మీ కంపెనీ షిఫ్ట్ ప్రారంభమయ్యే సమయాలను ఇక్కడ సెట్ చేయండి. వీటి ఆధారంగానే ఆటోమేటిక్ లేట్-ఇన్ లెక్కించబడుతుంది.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="p-4 bg-blue-50 text-blue-800 text-xs rounded-xl border border-blue-200 flex items-start gap-2">
        <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
        <p>గమనిక: సమయాన్ని 24-గంటల ఫార్మాట్‌లో ఎంటర్ చేయండి (ఉదాహరణకు: ఉదయం 9 గంటలకు 9, మధ్యాహ్నం 2 గంటలకు 14, రాత్రి 10 గంటలకు 22).</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(Object.keys(shiftSettings) as Array<keyof ShiftSettings>).map((shift) => (
          <Card key={shift} className="shadow-sm border-none bg-white">
            <CardContent className="p-6">
              <div className="flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-bold text-slate-700">{shift}</Label>
                  <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-1 rounded">START HOUR</span>
                </div>
                <div className="flex gap-3">
                  <Input 
                    type="number" 
                    min="0" 
                    max="23" 
                    defaultValue={shiftSettings[shift]} 
                    className="h-12 text-lg font-bold text-center"
                    id={`input-${shift}`}
                  />
                  <Button 
                    className="h-12 w-12 shrink-0 rounded-xl"
                    onClick={() => {
                      const val = (document.getElementById(`input-${shift}`) as HTMLInputElement).value;
                      handleSave(shift, val);
                    }}
                  >
                    <Save className="h-5 w-5" />
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground italic">
                  ప్రస్తుత స్టార్ట్ టైమ్: {shiftSettings[shift]}:00
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
