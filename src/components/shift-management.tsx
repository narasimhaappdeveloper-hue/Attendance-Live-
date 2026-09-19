'use client';

import { useApp } from '@/hooks/use-app';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Clock, Hourglass } from 'lucide-react';
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
  const [tempHour, setTempHour] = useState(initialValue.startHour);
  const [dutyHours, setDutyHours] = useState(initialValue.dutyHours);
  const faceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTempHour(initialValue.startHour);
      setDutyHours(initialValue.dutyHours);
      setMode('hours');
    }
  }, [isOpen, initialValue]);

  const displayHour = tempHour % 12 === 0 ? 12 : tempHour % 12;
  const isPm = tempHour >= 12;

  const toggleAmPm = () => {
    if (isPm) {
      setTempHour(tempHour - 12);
    } else {
      setTempHour(tempHour + 12);
    }
  };

  const calculateHourFromAngle = (e: React.MouseEvent | React.TouchEvent) => {
    if (!faceRef.current || mode !== 'hours') return;
    const rect = faceRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = (e as React.TouchEvent).touches[0].clientX;
      clientY = (e as React.TouchEvent).touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const clickX = clientX - rect.left - centerX;
    const clickY = clientY - rect.top - centerY;

    let angle = Math.atan2(clickX, -clickY) * (180 / Math.PI);
    if (angle < 0) angle += 360;

    let hour = Math.round(angle / 30);
    if (hour === 0) hour = 12;
    const finalHour = isPm ? (hour === 12 ? 12 : hour + 12) : (hour === 12 ? 0 : hour);
    setTempHour(finalHour);
  };

  if (!isOpen) return null;

  const hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const rotationDegrees = (displayHour % 12) * 30;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-[320px] rounded-2xl overflow-hidden shadow-2xl border animate-in zoom-in-95 duration-200">
        <div className="bg-[#1976d2] text-white p-5 flex flex-col items-center">
          <p className="text-[10px] uppercase font-bold tracking-widest opacity-80 mb-2">Set {shiftName} Start Time</p>
          <div className="flex items-baseline gap-2">
            <div className="text-4xl font-bold border-b-2 border-white pb-1">
              {displayHour.toString().padStart(2, '0')}:00
            </div>
            
            <button 
              type="button"
              onClick={toggleAmPm}
              className="ml-3 text-sm font-black bg-white/20 border border-white/40 px-3 py-1.5 rounded-lg hover:bg-white/30 transition-colors"
            >
              {isPm ? 'PM' : 'AM'}
            </button>
          </div>
        </div>

        <div className="p-6 flex flex-col items-center bg-slate-50/50 gap-6">
          <div 
            ref={faceRef}
            onClick={calculateHourFromAngle}
            className="w-[200px] h-[200px] bg-[#edeef0] rounded-full relative border-[3px] border-[hsl(var(--primary))] cursor-pointer touch-none select-none shadow-inner"
          >
            {hours.map((num, i) => {
              const angle = (i * 30 * Math.PI) / 180;
              const radius = 78;
              const x = 100 + radius * Math.sin(angle);
              const y = 100 - radius * Math.cos(angle);
              const isSelected = displayHour === num;

              return (
                <button
                  key={num}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const finalHour = isPm ? (num === 12 ? 12 : num + 12) : (num === 12 ? 0 : num);
                    setTempHour(finalHour);
                  }}
                  className={cn(
                    "absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center text-[11px] font-bold transition-all outline-none",
                    isSelected ? "bg-[#1976d2] text-white z-20 scale-110" : "text-[#333] hover:bg-black/10"
                  )}
                  style={{ left: `${x}px`, top: `${y}px` }}
                >
                  {num}
                </button>
              );
            })}

            <div 
              className="absolute bottom-1/2 left-1/2 w-[2px] h-[64px] bg-[#1976d2] origin-bottom pointer-events-none"
              style={{ transform: `translateX(-50%) rotate(${rotationDegrees}deg)` }}
            >
              <div className="w-3 h-3 bg-[#1976d2] rounded-full absolute -top-1.5 -left-[5px] shadow-md" />
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-[#1976d2] rounded-full pointer-events-none" />
          </div>

          <div className="w-full space-y-2 border-t pt-4">
            <Label className="text-xs font-bold text-slate-600 uppercase">Standard Duty Duration (Hours)</Label>
            <div className="flex gap-2">
                {[8, 10, 12].map(h => (
                    <Button 
                        key={h} 
                        variant={dutyHours === h ? 'default' : 'outline'} 
                        className="flex-1 rounded-xl h-12 text-lg font-bold"
                        onClick={() => setDutyHours(h)}
                    >
                        {h}h
                    </Button>
                ))}
                <div className="flex-1">
                    <Input 
                        type="number" 
                        value={dutyHours} 
                        onChange={(e) => setDutyHours(parseInt(e.target.value) || 0)}
                        placeholder="Other"
                        className="h-12 text-center font-bold rounded-xl"
                    />
                </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end p-4 gap-4 border-t bg-white">
          <button onClick={onClose} className="text-[#1976d2] font-bold text-sm uppercase hover:bg-slate-50 px-4 py-2 rounded-lg transition-colors">Cancel</button>
          <button onClick={() => onSave({ startHour: tempHour, dutyHours })} className="text-[#1976d2] font-black text-sm uppercase hover:bg-slate-50 px-4 py-2 rounded-lg transition-colors">OK</button>
        </div>
      </div>
    </div>
  );
}

export default function ShiftManagement() {
  const { shiftSettings, updateShiftSetting } = useApp();
  const { toast } = useToast();
  
  const [openShift, setOpenShift] = useState<keyof ShiftSettings | null>(null);

  const handleSave = (shift: keyof ShiftSettings, config: Partial<ShiftDetail>) => {
    updateShiftSetting(shift, config);
    toast({
      title: 'Shift Updated',
      description: `${shift} settings saved successfully.`
    });
    setOpenShift(null);
  };

  const formatTime = (value: number) => {
    const displayHour = value % 12 === 0 ? 12 : value % 12;
    const ampm = value >= 12 ? 'PM' : 'AM';
    return `${displayHour}:00 ${ampm}`;
  };

  return (
    <div className="space-y-6">
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Clock className="h-6 w-6" /> Shift Management
          </CardTitle>
          <CardDescription className="text-slate-600 font-medium">
            షిఫ్ట్ స్టార్ట్ టైమ్ మరియు డ్యూటీ గంటలను (8, 10, 12h) ఇక్కడ సెట్ చేయండి. ఆటోమేటిక్ OT దీని ఆధారంగా లెక్కించబడుతుంది.
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
              <div className="flex items-center gap-1 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                <Hourglass className="h-3 w-3" />
                {shiftSettings[shift].dutyHours}h Duty
              </div>
            </div>
            <CardContent className="p-6 text-center">
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">Starts At</p>
              <h3 className="text-2xl font-black text-primary">{formatTime(shiftSettings[shift].startHour)}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      <ModernClockModal
        isOpen={!!openShift}
        shiftName={openShift || ''}
        initialValue={openShift ? shiftSettings[openShift] : { startHour: 0, dutyHours: 8 }}
        onClose={() => setOpenShift(null)}
        onSave={(config) => openShift && handleSave(openShift, config)}
      />
    </div>
  );
}
