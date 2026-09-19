'use client';

import { useApp } from '@/hooks/use-app';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ShiftSettings } from '@/lib/types';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ClockModalProps {
  shiftName: string;
  initialValue: number;
  isOpen: boolean;
  onClose: () => void;
  onSave: (newValue: number) => void;
}

function ModernClockModal({ shiftName, initialValue, isOpen, onClose, onSave }: ClockModalProps) {
  const [mode, setMode] = useState<'hours' | 'minutes'>('hours');
  const [tempValue, setTempValue] = useState(initialValue);
  const faceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTempValue(initialValue);
      setMode('hours');
    }
  }, [isOpen, initialValue]);

  const hourPart = Math.floor(tempValue);
  const minutePart = Math.round((tempValue - hourPart) * 60);
  const isPm = hourPart >= 12;
  const displayHour = hourPart % 12 === 0 ? 12 : hourPart % 12;

  const toggleAmPm = () => {
    if (isPm) {
      setTempValue(tempValue - 12);
    } else {
      setTempValue(tempValue + 12);
    }
  };

  const calculateTimeFromAngle = (e: React.MouseEvent | React.TouchEvent) => {
    if (!faceRef.current) return;
    const rect = faceRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const clickX = clientX - rect.left - centerX;
    const clickY = clientY - rect.top - centerY;

    let angle = Math.atan2(clickX, -clickY) * (180 / Math.PI);
    if (angle < 0) angle += 360;

    if (mode === 'hours') {
      let hour = Math.round(angle / 30);
      if (hour === 0) hour = 12;
      const finalHour = isPm ? (hour === 12 ? 12 : hour + 12) : (hour === 12 ? 0 : hour);
      setTempValue(finalHour + minutePart / 60);
    } else {
      let minute = Math.round(angle / 6);
      if (minute === 60) minute = 0;
      minute = Math.round(minute / 5) * 5;
      if (minute === 60) minute = 0;
      setTempValue(hourPart + minute / 60);
    }
  };

  if (!isOpen) return null;

  const hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const numbers = mode === 'hours' ? hours : minutes;
  const rotationDegrees = mode === 'hours' ? (displayHour % 12) * 30 : (minutePart % 60) * 6;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-[280px] rounded-2xl overflow-hidden shadow-2xl border animate-in zoom-in-95 duration-200">
        {/* Clock Header */}
        <div className="bg-[#1976d2] text-white p-5 flex flex-col items-center">
          <p className="text-[10px] uppercase font-bold tracking-widest opacity-80 mb-2">Set {shiftName} Start Time</p>
          <div className="flex items-baseline gap-2">
            <button 
              type="button"
              onClick={() => setMode('hours')}
              className={cn(
                "text-4xl font-bold transition-all border-b-2 pb-1 outline-none",
                mode === 'hours' ? "border-white opacity-100" : "border-transparent opacity-60"
              )}
            >
              {displayHour.toString().padStart(2, '0')}
            </button>
            <span className="text-3xl font-bold opacity-60">:</span>
            <button 
              type="button"
              onClick={() => setMode('minutes')}
              className={cn(
                "text-4xl font-bold transition-all border-b-2 pb-1 outline-none",
                mode === 'minutes' ? "border-white opacity-100" : "border-transparent opacity-60"
              )}
            >
              {minutePart.toString().padStart(2, '0')}
            </button>
            
            <button 
              type="button"
              onClick={toggleAmPm}
              className="ml-3 text-sm font-black bg-white/20 border border-white/40 px-3 py-1.5 rounded-lg hover:bg-white/30 transition-colors"
            >
              {isPm ? 'PM' : 'AM'}
            </button>
          </div>
        </div>

        {/* Clock Face Wrap */}
        <div className="p-6 flex justify-center bg-slate-50/50">
          <div 
            ref={faceRef}
            onClick={calculateTimeFromAngle}
            onMouseDown={(e) => {
              const move = (me: MouseEvent) => calculateTimeFromAngle(me as any);
              const up = () => {
                window.removeEventListener('mousemove', move);
                window.removeEventListener('mouseup', up);
              };
              window.addEventListener('mousemove', move);
              window.addEventListener('mouseup', up);
            }}
            className="w-[220px] h-[220px] bg-[#edeef0] rounded-full relative border-[3px] border-[hsl(var(--primary))] cursor-pointer touch-none select-none shadow-inner"
          >
            {/* Numbers - Made clickable directly */}
            {numbers.map((num, i) => {
              const angle = (i * 30 * Math.PI) / 180;
              const radius = 84;
              const x = 110 + radius * Math.sin(angle);
              const y = 110 - radius * Math.cos(angle);
              const isSelected = mode === 'hours' ? displayHour === num : minutePart === num;

              return (
                <button
                  key={num}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation(); // Face click double calculation ని ఆపుతుంది
                    if (mode === 'hours') {
                      const finalHour = isPm ? (num === 12 ? 12 : num + 12) : (num === 12 ? 0 : num);
                      setTempValue(finalHour + minutePart / 60);
                      setMode('minutes'); // గంట ఎంచుకోగానే నిమిషాల మోడ్‌కి మారుతుంది
                    } else {
                      setTempValue(hourPart + num / 60);
                    }
                  }}
                  className={cn(
                    "absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center text-[11px] font-bold transition-all outline-none",
                    isSelected ? "bg-[#1976d2] text-white z-20 scale-110" : "text-[#333] hover:bg-black/10"
                  )}
                  style={{ left: `${x}px`, top: `${y}px` }}
                >
                  {mode === 'minutes' ? num.toString().padStart(2, '0') : num}
                </button>
              );
            })}

            {/* Hand */}
            <div 
              className="absolute bottom-1/2 left-1/2 w-[2px] bg-[#1976d2] origin-bottom pointer-events-none"
              style={{ 
                height: mode === 'hours' ? '68px' : '82px', 
                transform: `translateX(-50%) rotate(${rotationDegrees}deg)` 
              }}
            >
              <div className="w-3 h-3 bg-[#1976d2] rounded-full absolute -top-1.5 -left-[5px] shadow-md" />
            </div>

            {/* Center Dot */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-[#1976d2] rounded-full pointer-events-none" />
          </div>
        </div>

        {/* Clock Actions */}
        <div className="flex justify-end p-4 gap-4 border-t bg-white">
          <button 
            type="button"
            onClick={onClose}
            className="text-[#1976d2] font-bold text-sm uppercase tracking-wider hover:bg-slate-50 px-4 py-2 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={() => onSave(tempValue)}
            className="text-[#1976d2] font-black text-sm uppercase tracking-wider hover:bg-slate-50 px-4 py-2 rounded-lg transition-colors"
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

  const handleSave = (shift: keyof ShiftSettings, newValue: number) => {
    updateShiftSetting(shift, newValue);
    
    const hour = Math.floor(newValue);
    const min = Math.round((newValue - hour) * 60);
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    
    toast({
      title: 'Shift Updated',
      description: `${shift} స్టార్ట్ టైమ్ ${displayHour}:${min.toString().padStart(2, '0')} ${ampm} కు మార్చబడింది.`
    });
    
    setOpenShift(null);
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
            <Clock className="h-6 w-6" /> Shift Management
          </CardTitle>
          <CardDescription className="text-slate-600 font-medium">
            షిఫ్ట్ టైమింగ్స్ మార్చడానికి కార్డుపై క్లిక్ చేయండి. ఆటోమేటిక్ లేట్-ఇన్ ఈ టైమింగ్స్ బట్టే వస్తుంది.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {(Object.keys(shiftSettings) as Array<keyof ShiftSettings>).map((shift) => (
          <Card 
            key={shift} 
            className="cursor-pointer hover:shadow-lg transition-all duration-300 border-slate-100 group overflow-hidden"
            onClick={() => setOpenShift(shift)}
          >
            <div className="bg-slate-50 p-4 border-b flex items-center justify-between">
              <span className="font-bold text-slate-700">{shift}</span>
              <Clock className="h-4 w-4 text-primary opacity-40 group-hover:opacity-100 transition-opacity" />
            </div>
            <CardContent className="p-6 text-center">
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">Starts At</p>
              <h3 className="text-2xl font-black text-primary">{formatTime(shiftSettings[shift])}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      <ModernClockModal
        isOpen={!!openShift}
        shiftName={openShift || ''}
        initialValue={openShift ? shiftSettings[openShift] : 0}
        onClose={() => setOpenShift(null)}
        onSave={(val) => openShift && handleSave(openShift, val)}
      />
    </div>
  );
}
