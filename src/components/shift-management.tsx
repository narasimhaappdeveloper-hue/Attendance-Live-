
'use client';

import { useApp } from '@/hooks/use-app';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Clock, Save, Info, Sun, Moon, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ShiftSettings } from '@/lib/types';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const AM_HOURS = Array.from({ length: 12 }).map((_, i) => ({
  value: i,
  label: `${i === 0 ? 12 : i}:00 AM`
}));

const PM_HOURS = Array.from({ length: 12 }).map((_, i) => ({
  value: i + 12,
  label: `${i === 0 ? 12 : i}:00 PM`
}));

export default function ShiftManagement() {
  const { shiftSettings, updateShiftSetting } = useApp();
  const { toast } = useToast();
  // Using a local state to track selection before saving
  const [localSettings, setLocalSettings] = useState<Record<string, number>>({});

  const handleSave = (shift: keyof ShiftSettings) => {
    const hour = localSettings[shift] !== undefined ? localSettings[shift] : shiftSettings[shift];
    
    updateShiftSetting(shift, hour);
    
    const allHours = [...AM_HOURS, ...PM_HOURS];
    const formattedTime = allHours.find(h => h.value === hour)?.label;
    
    toast({
      title: 'Shift Updated',
      description: `${shift} స్టార్ట్ టైమ్ ${formattedTime} కు మార్చబడింది.`
    });
    
    // Clear local state for this shift after saving
    const newLocal = { ...localSettings };
    delete newLocal[shift];
    setLocalSettings(newLocal);
  };

  const handleSelect = (shift: keyof ShiftSettings, hour: number) => {
    setLocalSettings(prev => ({ ...prev, [shift]: hour }));
  };

  const getActiveHour = (shift: keyof ShiftSettings) => {
    return localSettings[shift] !== undefined ? localSettings[shift] : shiftSettings[shift];
  };

  const renderHourGrid = (shift: keyof ShiftSettings, hours: { value: number, label: string }[], type: 'AM' | 'PM') => {
    const activeHour = getActiveHour(shift);
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {type === 'AM' ? <Sun className="h-3 w-3 text-amber-500" /> : <Moon className="h-3 w-3 text-blue-500" />}
          {type} Hours
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {hours.map((h) => {
            const isActive = activeHour === h.value;
            return (
              <button
                key={h.value}
                type="button"
                onClick={() => handleSelect(shift, h.value)}
                className={cn(
                  "h-10 text-[11px] font-bold rounded-lg border transition-all duration-200 flex items-center justify-center relative",
                  isActive 
                    ? "bg-primary text-primary-foreground border-primary shadow-md scale-105 z-10" 
                    : "bg-white text-slate-600 hover:border-primary/50 hover:bg-slate-50"
                )}
              >
                {h.label.split(' ')[0]}
                {isActive && <div className="absolute -top-1 -right-1 bg-white rounded-full border border-primary p-0.5"><Check className="h-2 w-2 text-primary" /></div>}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Clock className="h-6 w-6" /> Shift Timings Configuration
          </CardTitle>
          <CardDescription className="text-slate-600 font-medium">
            మీ కంపెనీ షిఫ్ట్ ప్రారంభమయ్యే సమయాలను ఇక్కడ గ్రిడ్ రూపంలో సులభంగా సెట్ చేయండి.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="p-4 bg-blue-50 text-blue-800 text-xs rounded-xl border border-blue-200 flex items-start gap-2 shadow-sm">
        <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
        <p className="leading-relaxed">
          <b>గమనిక:</b> ఇక్కడ ఎంచుకున్న సమయం ఆధారంగానే ఉద్యోగుల <b>Late-In</b> ఆటోమేటిక్‌గా లెక్కించబడుతుంది. సమయాన్ని ఎంచుకున్న తర్వాత <b>Save</b> బటన్ నొక్కండి.
        </p>
      </div>

      <div className="space-y-8">
        {(Object.keys(shiftSettings) as Array<keyof ShiftSettings>).map((shift) => {
          const isModified = localSettings[shift] !== undefined;
          
          return (
            <Card key={shift} className={cn(
              "shadow-lg border-slate-100 bg-white transition-all duration-300 overflow-hidden",
              isModified ? "ring-2 ring-primary ring-offset-2" : ""
            )}>
              <div className="bg-slate-50 px-6 py-3 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary text-white p-2 rounded-lg">
                    <Clock className="h-4 w-4" />
                  </div>
                  <Label className="text-xl font-black text-slate-800 tracking-tight">{shift}</Label>
                </div>
                <Button 
                  size="sm"
                  onClick={() => handleSave(shift)}
                  disabled={!isModified}
                  className={cn(
                    "rounded-full px-6 transition-all",
                    isModified ? "bg-green-600 hover:bg-green-700 shadow-lg scale-105" : "opacity-50"
                  )}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Shift Time
                </Button>
              </div>
              
              <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {renderHourGrid(shift, AM_HOURS, 'AM')}
                  {renderHourGrid(shift, PM_HOURS, 'PM')}
                </div>
                
                <div className="mt-6 pt-6 border-t flex items-center justify-center gap-4">
                  <div className="text-xs font-bold text-muted-foreground uppercase">Selected Time:</div>
                  <div className="bg-primary/10 text-primary px-6 py-2 rounded-xl text-lg font-black border border-primary/20 shadow-inner">
                    {[...AM_HOURS, ...PM_HOURS].find(h => h.value === getActiveHour(shift))?.label}
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
