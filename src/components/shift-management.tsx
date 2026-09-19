
'use client';

import { useApp } from '@/hooks/use-app';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Clock, Save, Sun, Moon, Check, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ShiftSettings } from '@/lib/types';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface ClockPickerProps {
  value: number; // Decimal hours (e.g., 14.5 for 2:30 PM)
  onChange: (newValue: number) => void;
}

function ClockPicker({ value, onChange }: ClockPickerProps) {
  const [mode, setMode] = useState<'hours' | 'minutes'>('hours');
  
  const hourPart = Math.floor(value);
  const minutePart = Math.round((value - hourPart) * 60);
  
  const isPm = hourPart >= 12;
  const displayHour = hourPart % 12 === 0 ? 12 : hourPart % 12;

  const handleHourClick = (h: number) => {
    const newHour = isPm ? (h === 12 ? 12 : h + 12) : (h === 12 ? 0 : h);
    onChange(newHour + minutePart / 60);
    setMode('minutes');
  };

  const handleMinuteClick = (m: number) => {
    onChange(hourPart + m / 60);
  };

  const toggleAmPm = () => {
    if (isPm) {
      onChange(value - 12);
    } else {
      onChange(value + 12);
    }
  };

  const numbers = mode === 'hours' 
    ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const radius = 80;
  const centerX = 100;
  const centerY = 100;

  const rotationDegrees = mode === 'hours' 
    ? (displayHour % 12) * 30 
    : (minutePart % 60) * 6;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex gap-4 mb-2">
        <button 
          onClick={() => setMode('hours')}
          className={cn(
            "text-2xl font-black px-3 py-1 rounded-lg transition-all",
            mode === 'hours' ? "bg-primary text-white shadow-md" : "text-slate-400 hover:bg-slate-100"
          )}
        >
          {displayHour.toString().padStart(2, '0')}
        </button>
        <span className="text-2xl font-black text-slate-300">:</span>
        <button 
          onClick={() => setMode('minutes')}
          className={cn(
            "text-2xl font-black px-3 py-1 rounded-lg transition-all",
            mode === 'minutes' ? "bg-primary text-white shadow-md" : "text-slate-400 hover:bg-slate-100"
          )}
        >
          {minutePart.toString().padStart(2, '0')}
        </button>
      </div>

      <div className="relative w-56 h-56 bg-slate-50 rounded-full border-8 border-white shadow-[inset_0_2px_10px_rgba(0,0,0,0.1),0_10px_20px_rgba(0,0,0,0.05)] flex items-center justify-center">
        {/* Clock Marks */}
        {Array.from({ length: 60 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "absolute w-0.5 rounded-full bg-slate-200",
              i % 5 === 0 ? "h-3" : "h-1"
            )}
            style={{
              left: '50%',
              top: '5px',
              transformOrigin: '50% 103px',
              transform: `rotate(${i * 6}deg)`
            }}
          />
        ))}

        <div className="absolute w-3 h-3 bg-primary rounded-full z-30 shadow-md" />
        
        {/* Clock Hand */}
        <div 
          className="absolute w-1.5 bg-primary origin-bottom z-20 transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1)"
          style={{ 
            height: mode === 'hours' ? '65px' : '75px', 
            bottom: '100px',
            transform: `rotate(${rotationDegrees}deg)` 
          }}
        >
          <div className="absolute -top-3 -left-2.5 w-6 h-6 bg-primary rounded-full border-4 border-white shadow-lg" />
        </div>

        {/* Numbers */}
        {numbers.map((num, i) => {
          const angle = (i * 30 * Math.PI) / 180;
          const x = centerX + radius * Math.sin(angle);
          const y = centerY - radius * Math.cos(angle);
          const isActive = mode === 'hours' ? displayHour === num : minutePart === num;

          return (
            <button
              key={num}
              type="button"
              onClick={() => mode === 'hours' ? handleHourClick(num) : handleMinuteClick(num)}
              className={cn(
                "absolute w-10 h-10 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center font-bold text-sm transition-all z-10",
                isActive 
                  ? "bg-primary text-white shadow-lg scale-125" 
                  : "text-slate-500 hover:bg-slate-200 hover:text-slate-800"
              )}
              style={{ left: `${x}px`, top: `${y}px` }}
            >
              {mode === 'minutes' ? num.toString().padStart(2, '0') : num}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4 bg-slate-100 p-1.5 rounded-full border shadow-inner">
        <Button
          variant={!isPm ? "default" : "ghost"}
          size="sm"
          onClick={() => isPm && toggleAmPm()}
          className={cn("rounded-full px-6 transition-all font-bold", !isPm && "bg-amber-500 hover:bg-amber-600 text-white shadow-md")}
        >
          <Sun className="h-4 w-4 mr-2" /> AM
        </Button>
        <Button
          variant={isPm ? "default" : "ghost"}
          size="sm"
          onClick={() => !isPm && toggleAmPm()}
          className={cn("rounded-full px-6 transition-all font-bold", isPm && "bg-blue-600 hover:bg-blue-700 text-white shadow-md")}
        >
          <Moon className="h-4 w-4 mr-2" /> PM
        </Button>
      </div>

      <Button variant="ghost" size="sm" onClick={() => setMode(mode === 'hours' ? 'minutes' : 'hours')} className="text-muted-foreground text-[10px] uppercase font-bold tracking-widest">
        <RotateCcw className="h-3 w-3 mr-1" /> Switch to {mode === 'hours' ? 'Minutes' : 'Hours'}
      </Button>
    </div>
  );
}

export default function ShiftManagement() {
  const { shiftSettings, updateShiftSetting } = useApp();
  const { toast } = useToast();
  
  const [localSettings, setLocalSettings] = useState<Record<string, number>>({});

  const handleSave = (shift: keyof ShiftSettings) => {
    const value = localSettings[shift] !== undefined ? localSettings[shift] : shiftSettings[shift];
    
    updateShiftSetting(shift, value);
    
    const hour = Math.floor(value);
    const min = Math.round((value - hour) * 60);
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    
    toast({
      title: 'Shift Updated',
      description: `${shift} స్టార్ట్ టైమ్ ${displayHour}:${min.toString().padStart(2, '0')} ${ampm} కు మార్చబడింది.`
    });
    
    const newLocal = { ...localSettings };
    delete newLocal[shift];
    setLocalSettings(newLocal);
  };

  const handleClockChange = (shift: keyof ShiftSettings, newValue: number) => {
    setLocalSettings(prev => ({ ...prev, [shift]: newValue }));
  };

  const getActiveValue = (shift: keyof ShiftSettings) => {
    return localSettings[shift] !== undefined ? localSettings[shift] : shiftSettings[shift];
  };

  const formatTime = (value: number) => {
    const hour = Math.floor(value);
    const min = Math.round((value - hour) * 60);
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${displayHour}:${min.toString().padStart(2, '0')} ${ampm}`;
  };

  return (
    <div className="space-y-6">
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Clock className="h-6 w-6" /> Dynamic Shift Timings
          </CardTitle>
          <CardDescription className="text-slate-600 font-medium">
            వాల్-క్లాక్ ముల్లును తిప్పుతూ Hours మరియు Minutes సెట్ చేయండి. AM/PM ఖచ్చితంగా గమనించగలరు.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {(Object.keys(shiftSettings) as Array<keyof ShiftSettings>).map((shift) => {
          const isModified = localSettings[shift] !== undefined;
          const currentValue = getActiveValue(shift);
          
          return (
            <Card key={shift} className={cn(
              "shadow-lg border-slate-100 bg-white transition-all duration-300 overflow-hidden group",
              isModified ? "ring-2 ring-primary ring-offset-2" : ""
            )}>
              <div className="bg-slate-50 px-6 py-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary text-white p-2 rounded-lg group-hover:scale-110 transition-transform shadow-sm">
                    <Clock className="h-4 w-4" />
                  </div>
                  <Label className="text-lg font-black text-slate-800 tracking-tight">{shift}</Label>
                </div>
                <Button 
                  size="sm"
                  onClick={() => handleSave(shift)}
                  disabled={!isModified}
                  className={cn(
                    "rounded-full px-6 transition-all font-bold",
                    isModified ? "bg-green-600 hover:bg-green-700 shadow-lg scale-105 text-white" : "opacity-30"
                  )}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
              
              <CardContent className="p-8 flex flex-col items-center">
                <ClockPicker 
                  value={currentValue} 
                  onChange={(val) => handleClockChange(shift, val)} 
                />
                
                <div className="mt-8 w-full p-5 bg-slate-50 rounded-2xl flex items-center justify-between border-2 border-slate-100 shadow-inner">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Shift Starts At</span>
                    <span className="text-2xl font-black text-primary tracking-tighter">{formatTime(currentValue)}</span>
                  </div>
                  {isModified ? (
                    <div className="bg-amber-100 text-amber-700 text-[10px] font-bold px-3 py-1.5 rounded-full border border-amber-200 animate-pulse">
                      Pending Save
                    </div>
                  ) : (
                    <div className="bg-green-100 text-green-700 p-2 rounded-full border border-green-200">
                      <Check className="h-4 w-4" />
                    </div>
                  )}
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
