'use client';

import { useApp } from '@/hooks/use-app';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Clock, Hourglass, Sun, Moon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ShiftSettings, ShiftDetail } from '@/lib/types';
import { useState, useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface ClockModalProps {
  shiftName: string;
  initialValue: ShiftDetail;
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: Partial<ShiftDetail>) => void;
}

function ModernClockModal({ shiftName, initialValue, isOpen, onClose, onSave }: ClockModalProps) {
  const [mode, setMode] = useState<'hours' | 'minutes'>('hours');
  const [tempHour, setTempHour] = useState(9);
  const [tempMinute, setTempMinute] = useState(0);
  const [isPm, setIsPm] = useState(false);
  const [dutyHours, setDutyHours] = useState(8);
  const faceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const totalHours = initialValue?.startHour ?? 9;
      const h = Math.floor(totalHours);
      const m = Math.round((totalHours - h) * 60);
      
      setTempHour(h % 12 === 0 ? 12 : h % 12);
      setTempMinute(m);
      setIsPm(h >= 12);
      setDutyHours(initialValue?.dutyHours ?? 8);
      setMode('hours');
    }
  }, [isOpen, initialValue]);

  const handleTimeClick = (e: React.MouseEvent) => {
    if (!faceRef.current) return;
    const rect = faceRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const clickX = e.clientX - rect.left - centerX;
    const clickY = e.clientY - rect.top - centerY;

    let angle = Math.atan2(clickX, -clickY) * (180 / Math.PI);
    if (angle < 0) angle += 360;

    if (mode === 'hours') {
      let hour = Math.round(angle / 30);
      if (hour === 0) hour = 12;
      setTempHour(hour);
      // Auto switch to minutes after selecting hour
      setTimeout(() => setMode('minutes'), 300);
    } else {
      let minute = Math.round(angle / 6);
      if (minute === 60) minute = 0;
      setTempMinute(minute);
    }
  };

  const rotationDegrees = mode === 'hours' 
    ? (tempHour % 12) * 30 
    : tempMinute * 6;

  const handleOk = () => {
    let finalHour = tempHour === 12 ? 0 : tempHour;
    if (isPm) finalHour += 12;
    const startHourDecimal = finalHour + (tempMinute / 60);
    onSave({ startHour: startHourDecimal, dutyHours });
  };

  if (!isOpen) return null;

  const hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-[300px] rounded-2xl overflow-hidden shadow-2xl border animate-in zoom-in-95 duration-200">
        {/* Clock Header */}
        <div className="bg-[#1976d2] text-white p-6">
          <p className="text-[10px] uppercase font-bold tracking-widest opacity-70 mb-3 text-center">Set {shiftName} Time</p>
          <div className="flex items-center justify-center gap-2">
            <div className="flex items-baseline font-bold text-4xl">
              <button 
                onClick={() => setMode('hours')}
                className={cn("transition-opacity", mode === 'hours' ? "opacity-100 border-b-2 border-white" : "opacity-50")}
              >
                {tempHour.toString().padStart(2, '0')}
              </button>
              <span className="mx-1">:</span>
              <button 
                onClick={() => setMode('minutes')}
                className={cn("transition-opacity", mode === 'minutes' ? "opacity-100 border-b-2 border-white" : "opacity-50")}
              >
                {tempMinute.toString().padStart(2, '0')}
              </button>
            </div>
            <div className="flex flex-col ml-4 gap-1">
              <button 
                onClick={() => setIsPm(false)}
                className={cn("text-xs font-bold px-2 py-1 rounded", !isPm ? "bg-white text-[#1976d2]" : "opacity-60")}
              >
                AM
              </button>
              <button 
                onClick={() => setIsPm(true)}
                className={cn("text-xs font-bold px-2 py-1 rounded", isPm ? "bg-white text-[#1976d2]" : "opacity-60")}
              >
                PM
              </button>
            </div>
          </div>
        </div>

        {/* Clock Face */}
        <div className="p-6 bg-slate-50 flex flex-col items-center gap-6">
          <div 
            ref={faceRef}
            onClick={handleTimeClick}
            className="w-[220px] h-[220px] bg-[#edeef0] rounded-full relative border-[3px] border-[#1976d2] cursor-pointer touch-none select-none shadow-inner"
          >
            {/* Center Dot */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-[#1976d2] rounded-full z-30" />
            
            {/* Clock Hand */}
            <div 
              className="absolute bottom-1/2 left-1/2 w-[2px] bg-[#1976d2] origin-bottom z-20 transition-transform duration-300 ease-out"
              style={{ 
                height: mode === 'hours' ? '65px' : '85px',
                transform: `translateX(-50%) rotate(${rotationDegrees}deg)` 
              }}
            >
              <div className="w-8 h-8 bg-[#1976d2] rounded-full absolute -top-4 -left-[15px] flex items-center justify-center shadow-lg">
                <div className="w-1 h-1 bg-white rounded-full" />
              </div>
            </div>

            {/* Numbers */}
            {(mode === 'hours' ? hours : minutes).map((num, i) => {
              const angle = (i * 30 * Math.PI) / 180;
              const radius = mode === 'hours' ? 75 : 85;
              const x = 110 + radius * Math.sin(angle);
              const y = 110 - radius * Math.cos(angle);
              const isSelected = mode === 'hours' ? tempHour === num : tempMinute === num;

              return (
                <div
                  key={num}
                  className={cn(
                    "absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors pointer-events-none",
                    isSelected ? "text-white" : "text-slate-600"
                  )}
                  style={{ left: `${x}px`, top: `${y}px` }}
                >
                  {num}
                </div>
              );
            })}
          </div>

          {/* Duty Hours Quick Select */}
          <div className="w-full space-y-2">
            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Duty Duration (Hours)</Label>
            <div className="flex gap-2">
              {[8, 10, 12].map(h => (
                <Button 
                  key={h}
                  type="button"
                  variant={dutyHours === h ? 'default' : 'outline'}
                  className="flex-1 h-10 rounded-xl font-bold"
                  onClick={() => setDutyHours(h)}
                >
                  {h}h
                </Button>
              ))}
              <Input 
                type="number"
                className="w-16 h-10 text-center font-bold rounded-xl"
                value={dutyHours || ''}
                onChange={(e) => setDutyHours(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end p-4 gap-4 border-t bg-white">
          <button 
            onClick={onClose}
            className="text-[#1976d2] font-bold text-sm uppercase px-4 py-2 hover:bg-slate-50 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleOk}
            className="text-[#1976d2] font-black text-sm uppercase px-4 py-2 hover:bg-slate-50 rounded-lg transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ShiftManagement() {
  const { shiftSettings, updateShiftSetting } = useApp();
  const { toast } = useToast();
  const [openShift, setOpenShift] = useState<keyof ShiftSettings | null>(null);

  const formatDisplayTime = (decimalTime: number) => {
    const hours = Math.floor(decimalTime);
    const minutes = Math.round((decimalTime - hours) * 60);
    const displayHour = hours % 12 === 0 ? 12 : hours % 12;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    return `${displayHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const handleSave = (shift: keyof ShiftSettings, config: Partial<ShiftDetail>) => {
    updateShiftSetting(shift, config);
    toast({
      title: 'Success',
      description: `${shift} settings have been updated.`
    });
    setOpenShift(null);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Clock className="h-6 w-6" /> Shift Management
          </CardTitle>
          <CardDescription className="text-slate-600 font-medium">
            షిఫ్ట్ ప్రారంభ సమయం మరియు డ్యూటీ గంటలను ఇక్కడ సెట్ చేయండి. ఆటోమేటిక్ లేట్-ఇన్ మరియు ఓవర్ టైం దీని ఆధారంగానే లెక్కించబడతాయి.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {(Object.keys(shiftSettings) as Array<keyof ShiftSettings>).map((shift) => (
          <Card 
            key={shift} 
            className="cursor-pointer hover:shadow-xl transition-all duration-300 border-slate-100 group relative overflow-hidden"
            onClick={() => setOpenShift(shift)}
          >
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              {shiftSettings[shift].startHour >= 6 && shiftSettings[shift].startHour < 18 ? <Sun className="h-12 w-12" /> : <Moon className="h-12 w-12" />}
            </div>
            <CardHeader className="pb-2 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-800 tracking-tight">{shift}</span>
                <Badge className="bg-primary/10 text-primary border-none text-[10px] font-bold">
                  {shiftSettings[shift].dutyHours}h Duty
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6 pb-8 text-center">
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-2">Shift Starts At</p>
              <h3 className="text-3xl font-black text-primary tracking-tighter">
                {formatDisplayTime(shiftSettings[shift].startHour)}
              </h3>
            </CardContent>
            <div className="h-1 w-full bg-primary/10 group-hover:bg-primary transition-colors" />
          </Card>
        ))}
      </div>

      <ModernClockModal
        isOpen={!!openShift}
        shiftName={openShift || ''}
        initialValue={openShift ? shiftSettings[openShift] : { startHour: 9, dutyHours: 8 }}
        onClose={() => setOpenShift(null)}
        onSave={(config) => openShift && handleSave(openShift, config)}
      />
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs border", className)}>
      {children}
    </span>
  );
}
