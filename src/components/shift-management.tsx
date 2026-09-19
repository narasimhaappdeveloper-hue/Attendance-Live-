'use client';

import { useApp } from '@/hooks/use-app';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Clock, Sun, Moon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ShiftSettings, ShiftDetail } from '@/lib/types';
import { useState, useRef, useEffect } from 'react';
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

  const handleDialInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    if (!faceRef.current) return;
    
    let clientX, clientY;
    if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    const rect = faceRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const clickX = clientX - rect.left - centerX;
    const clickY = clientY - rect.top - centerY;

    let angle = Math.atan2(clickX, -clickY) * (180 / Math.PI);
    if (angle < 0) angle += 360;

    if (mode === 'hours') {
      let hour = Math.round(angle / 30);
      if (hour === 0) hour = 12;
      setTempHour(hour);
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-[320px] rounded-3xl overflow-hidden shadow-2xl border animate-in zoom-in-95 duration-200">
        {/* Clock Header */}
        <div className="bg-primary text-primary-foreground p-6 text-center">
          <p className="text-[10px] uppercase font-bold tracking-widest opacity-70 mb-3">Set {shiftName} Time</p>
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-baseline font-bold text-4xl tabular-nums">
              <button 
                onClick={() => setMode('hours')}
                className={cn("transition-all px-2 py-1 rounded-lg", mode === 'hours' ? "bg-white/20 ring-1 ring-white/50" : "opacity-40")}
              >
                {tempHour.toString().padStart(2, '0')}
              </button>
              <span className="mx-1 opacity-50">:</span>
              <button 
                onClick={() => setMode('minutes')}
                className={cn("transition-all px-2 py-1 rounded-lg", mode === 'minutes' ? "bg-white/20 ring-1 ring-white/50" : "opacity-40")}
              >
                {tempMinute.toString().padStart(2, '0')}
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              <button 
                onClick={() => setIsPm(false)}
                className={cn("text-[10px] font-black px-2 py-1 rounded-md transition-all", !isPm ? "bg-white text-primary" : "bg-black/10 text-white/50")}
              >
                AM
              </button>
              <button 
                onClick={() => setIsPm(true)}
                className={cn("text-[10px] font-black px-2 py-1 rounded-md transition-all", isPm ? "bg-white text-primary" : "bg-black/10 text-white/50")}
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
            onClick={handleDialInteraction}
            onMouseDown={(e) => e.button === 0 && handleDialInteraction(e)}
            onTouchStart={handleDialInteraction}
            className="w-[230px] h-[230px] bg-white rounded-full relative border-[8px] border-slate-200 cursor-pointer touch-none select-none shadow-xl"
          >
            {/* Center Dot */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-primary rounded-full z-30 shadow-sm" />
            
            {/* Clock Hand */}
            <div 
              className="absolute bottom-1/2 left-1/2 w-[3px] bg-primary origin-bottom z-20 transition-transform duration-300 ease-out"
              style={{ 
                height: mode === 'hours' ? '70px' : '90px',
                transform: `translateX(-50%) rotate(${rotationDegrees}deg)` 
              }}
            >
              <div className="w-10 h-10 bg-primary rounded-full absolute -top-5 -left-[18.5px] flex items-center justify-center shadow-lg border-4 border-white">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>
            </div>

            {/* Numbers */}
            {(mode === 'hours' ? hours : minutes).map((num, i) => {
              const angle = (i * 30 * Math.PI) / 180;
              const radius = mode === 'hours' ? 82 : 92;
              const x = 115 + radius * Math.sin(angle);
              const y = 115 - radius * Math.cos(angle);
              const isSelected = mode === 'hours' ? tempHour === num : tempMinute === num;

              return (
                <button
                  key={num}
                  className={cn(
                    "absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center text-xs font-black transition-all",
                    isSelected ? "text-primary scale-125" : "text-slate-400 hover:text-primary"
                  )}
                  style={{ left: `${x}px`, top: `${y}px` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (mode === 'hours') {
                        setTempHour(num);
                        setTimeout(() => setMode('minutes'), 300);
                    } else {
                        setTempMinute(num);
                    }
                  }}
                >
                  {num}
                </button>
              );
            })}
          </div>

          {/* Duty Hours Quick Select */}
          <div className="w-full space-y-3">
            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center block">Duty Duration (Hours)</Label>
            <div className="flex gap-2">
              {[8, 10, 12].map(h => (
                <Button 
                  key={h}
                  type="button"
                  variant={dutyHours === h ? 'default' : 'outline'}
                  className="flex-1 h-12 rounded-2xl font-black text-base shadow-sm"
                  onClick={() => setDutyHours(h)}
                >
                  {h}h
                </Button>
              ))}
              <Input 
                type="number"
                className="w-16 h-12 text-center font-black rounded-2xl border-slate-200"
                value={dutyHours ?? ''}
                onChange={(e) => setDutyHours(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-between p-4 px-6 border-t bg-white">
          <Button 
            variant="ghost"
            onClick={onClose}
            className="text-slate-400 font-bold uppercase tracking-wider h-12 px-6"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleOk}
            className="bg-primary text-primary-foreground font-black uppercase tracking-wider h-12 px-8 rounded-2xl shadow-lg"
          >
            Save
          </Button>
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
      description: `${shift} settings updated.`
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
            షిఫ్ట్ ప్రారంభ సమయం మరియు డ్యూటీ గంటలను ఇక్కడ సెట్ చేయండి. ఆటోమేటిక్ లేట్-ఇన్ దీని ఆధారంగానే లెక్కించబడుతుంది.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {(Object.keys(shiftSettings) as Array<keyof ShiftSettings>).map((shift) => (
          <Card 
            key={shift} 
            className="cursor-pointer hover:shadow-xl transition-all duration-300 border-slate-100 group relative overflow-hidden active:scale-95 sm:active:scale-100"
            onClick={() => setOpenShift(shift)}
          >
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              {shiftSettings[shift].startHour >= 6 && shiftSettings[shift].startHour < 18 ? <Sun className="h-12 w-12" /> : <Moon className="h-12 w-12" />}
            </div>
            <CardHeader className="pb-2 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-800 tracking-tight">{shift}</span>
                <span className="bg-primary/10 text-primary border-none px-2 py-0.5 rounded-full text-[10px] font-bold">
                  {shiftSettings[shift].dutyHours}h Duty
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-6 pb-8 text-center">
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-2">Starts At</p>
              <h3 className="text-2xl sm:text-3xl font-black text-primary tracking-tighter">
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
