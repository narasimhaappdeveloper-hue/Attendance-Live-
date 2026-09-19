'use client';

import { useApp } from '@/hooks/use-app';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clock, Save, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ShiftSettings } from '@/lib/types';
import { useState } from 'react';

const HOURS = Array.from({ length: 24 }).map((_, i) => {
  const ampm = i >= 12 ? 'PM' : 'AM';
  const hour = i % 12 || 12;
  return {
    value: i.toString(),
    label: `${hour.toString().padStart(2, '0')}:00 ${ampm}`
  };
});

export default function ShiftManagement() {
  const { shiftSettings, updateShiftSetting } = useApp();
  const { toast } = useToast();
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});

  const handleSave = (shift: keyof ShiftSettings) => {
    const value = localSettings[shift] || shiftSettings[shift].toString();
    const hour = parseInt(value);
    
    updateShiftSetting(shift, hour);
    
    const formattedTime = HOURS.find(h => h.value === hour.toString())?.label;
    
    toast({
      title: 'Shift Updated',
      description: `${shift} స్టార్ట్ టైమ్ ${formattedTime} కు మార్చబడింది.`
    });
  };

  const handleChange = (shift: keyof ShiftSettings, value: string) => {
    setLocalSettings(prev => ({ ...prev, [shift]: value }));
  };

  const getDisplayTime = (shift: keyof ShiftSettings) => {
    const hour = shiftSettings[shift];
    return HOURS.find(h => h.value === hour.toString())?.label || `${hour}:00`;
  };

  return (
    <div className="space-y-6">
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Clock className="h-6 w-6" /> Shift Start Timings (AM/PM)
          </CardTitle>
          <CardDescription className="text-slate-600 font-medium">
            మీ కంపెనీ షిఫ్ట్ ప్రారంభమయ్యే సమయాలను AM/PM ఫార్మాట్‌లో ఇక్కడ సెట్ చేయండి. 
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="p-4 bg-blue-50 text-blue-800 text-xs rounded-xl border border-blue-200 flex items-start gap-2 shadow-sm">
        <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
        <p className="leading-relaxed">
          <b>గమనిక:</b> మీరు ఇక్కడ ఎంచుకున్న సమయం కంటే ఉద్యోగి ఆలస్యంగా అటెండెన్స్ వేస్తే, ఆ వ్యత్యాసం ఆటోమేటిక్‌గా <b>Late-In</b> గా లెక్కించబడుతుంది.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(Object.keys(shiftSettings) as Array<keyof ShiftSettings>).map((shift) => {
          const currentValue = localSettings[shift] || shiftSettings[shift].toString();
          
          return (
            <Card key={shift} className="shadow-md border-slate-100 bg-white hover:border-primary/20 transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex flex-col space-y-5">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg font-black text-slate-800 tracking-tight">{shift}</Label>
                    <div className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-full uppercase">
                      Duty Start Time
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Select 
                        value={currentValue} 
                        onValueChange={(val) => handleChange(shift, val)}
                      >
                        <SelectTrigger className="h-14 text-lg font-bold border-slate-200 rounded-xl focus:ring-primary">
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {HOURS.map((h) => (
                            <SelectItem key={h.value} value={h.value} className="text-base font-medium">
                              {h.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button 
                      className="h-14 w-14 shrink-0 rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-transform"
                      onClick={() => handleSave(shift)}
                    >
                      <Save className="h-6 w-6" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-dashed">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-[11px] font-bold text-muted-foreground uppercase">
                      Current: <span className="text-primary">{getDisplayTime(shift)}</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
