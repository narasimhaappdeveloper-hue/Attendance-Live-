
'use client';

import { useApp } from '@/hooks/use-app';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Clock, Save, Sun, Moon, Check, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ShiftSettings } from '@/lib/types';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface ClockPickerProps {
  value: number; // 0-23
  onChange: (newValue: number) => void;
}

function ClockPicker({ value, onChange }: ClockPickerProps) {
  const isPM = value >= 12;
  const displayHour = value % 12 === 0 ? 12 : value % 12;

  const handleHourClick = (h: number) => {
    // h is 1-12 from the clock face
    const newHour = isPM ? (h === 12 ? 12 : h + 12) : (h === 12 ? 0 : h);
    onChange(newHour);
  };

  const toggleAmPm = () => {
    if (isPM) {
      onChange(value - 12);
    } else {
      onChange(value + 12);
    }
  };

  const clockNumbers = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const radius = 80;
  const centerX = 100;
  const centerY = 100;

  // Calculate rotation for the hand
  // 12 o'clock is 0 degrees, each hour is 30 degrees
  const rotationDegrees = (displayHour % 12) * 30;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-52 h-52 bg-slate-50 rounded-full border-4 border-slate-200 shadow-inner flex items-center justify-center">
        {/* Center point */}
        <div className="absolute w-3 h-3 bg-primary rounded-full z-30" />
        
        {/* Clock Hand */}
        <div 
          className="absolute w-1 bg-primary origin-bottom z-20 transition-transform duration-300 ease-out"
          style={{ 
            height: '70px', 
            bottom: '100px',
            transform: `rotate(${rotationDegrees}deg)` 
          }}
        >
          <div className="absolute -top-2 -left-1.5 w-4 h-4 bg-primary rounded-full border-2 border-white shadow-md" />
        </div>

        {/* Hour Numbers */}
        {clockNumbers.map((num, i) => {
          const angle = (i * 30 * Math.PI) / 180;
          const x = centerX + radius * Math.sin(angle);
          const y = centerY - radius * Math.cos(angle);
          const isActive = displayHour === num;

          return (
            <button
              key={num}
              type="button"
              onClick={() => handleHourClick(num)}
              className={cn(
                "absolute w-10 h-10 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center font-bold text-sm transition-all z-10",
                isActive 
                  ? "bg-primary text-white shadow-lg scale-125" 
                  : "text-slate-400 hover:bg-slate-200 hover:text-slate-600"
              )}
              style={{ left: `${x}px`, top: `${y}px` }}
            >
              {num}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4">
        <Button
          variant={!isPM ? "default" : "outline"}
          size="sm"
          onClick={() => isPM && toggleAmPm()}
          className={cn("rounded-full px-6 transition-all", !isPM && "bg-amber-500 hover:bg-amber-600")}
        >
          <Sun className="h-4 w-4 mr-2" /> AM
        </Button>
        <Button
          variant={isPM ? "default" : "outline"}
          size="sm"
          onClick={() => !isPM && toggleAmPm()}
          className={cn("rounded-full px-6 transition-all", isPM && "bg-blue-600 hover:bg-blue-700")}
        >
          <Moon className="h-4 w-4 mr-2" /> PM
        </Button>
      </div>
    </div>
  );
}

export default function ShiftManagement() {
  const { shiftSettings, updateShiftSetting } = useApp();
  const { toast } = useToast();
  
  // Local state to manage selections for each shift before saving
  const [localSettings, setLocalSettings] = useState<Record<string, number>>({});

  const handleSave = (shift: keyof ShiftSettings) => {
    const hour = localSettings[shift] !== undefined ? localSettings[shift] : shiftSettings[shift];
    
    updateShiftSetting(shift, hour);
    
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    
    toast({
      title: 'Shift Updated',
      description: `${shift} స్టార్ట్ టైమ్ ${displayHour}:00 ${ampm} కు మార్చబడింది.`
    });
    
    const newLocal = { ...localSettings };
    delete newLocal[shift];
    setLocalSettings(newLocal);
  };

  const handleClockChange = (shift: keyof ShiftSettings, newHour: number) => {
    setLocalSettings(prev => ({ ...prev, [shift]: newHour }));
  };

  const getActiveHour = (shift: keyof ShiftSettings) => {
    return localSettings[shift] !== undefined ? localSettings[shift] : shiftSettings[shift];
  };

  return (
    <div className="space-y-6">
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Clock className="h-6 w-6" /> Shift Timings Configuration
          </CardTitle>
          <CardDescription className="text-slate-600 font-medium">
            ముల్లును తిప్పుతూ మీ కంపెనీ షిఫ్ట్ ప్రారంభమయ్యే సమయాలను ఇక్కడ సెట్ చేయండి.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="p-4 bg-blue-50 text-blue-800 text-xs rounded-xl border border-blue-200 flex items-start gap-2 shadow-sm">
        <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
        <p className="leading-relaxed">
          <b>చిట్కా:</b> గడియారంలోని నంబర్ల మీద క్లిక్ చేయండి లేదా క్లాక్ హ్యాండ్‌ని గమనిస్తూ సమయాన్ని ఎంచుకోండి. <b>Late-In</b> ఆటోమేటిక్‌గా ఇక్కడ ఎంచుకున్న సమయం బట్టే లెక్కించబడుతుంది.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {(Object.keys(shiftSettings) as Array<keyof ShiftSettings>).map((shift) => {
          const isModified = localSettings[shift] !== undefined;
          const currentHour = getActiveHour(shift);
          const displayTime = `${currentHour % 12 === 0 ? 12 : currentHour % 12}:00 ${currentHour >= 12 ? 'PM' : 'AM'}`;
          
          return (
            <Card key={shift} className={cn(
              "shadow-lg border-slate-100 bg-white transition-all duration-300 overflow-hidden group",
              isModified ? "ring-2 ring-primary ring-offset-2" : ""
            )}>
              <div className="bg-slate-50 px-6 py-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary text-white p-2 rounded-lg group-hover:scale-110 transition-transform">
                    <Clock className="h-4 w-4" />
                  </div>
                  <Label className="text-lg font-black text-slate-800 tracking-tight">{shift}</Label>
                </div>
                <Button 
                  size="sm"
                  onClick={() => handleSave(shift)}
                  disabled={!isModified}
                  className={cn(
                    "rounded-full px-6 transition-all",
                    isModified ? "bg-green-600 hover:bg-green-700 shadow-lg scale-105" : "opacity-30"
                  )}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
              
              <CardContent className="p-8 flex flex-col items-center">
                <ClockPicker 
                  value={currentHour} 
                  onChange={(val) => handleClockChange(shift, val)} 
                />
                
                <div className="mt-8 w-full p-4 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Selected Time:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-primary tracking-tighter">{displayTime}</span>
                    {isModified && <Check className="h-5 w-5 text-green-600 animate-in zoom-in" />}
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

function Info(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}
