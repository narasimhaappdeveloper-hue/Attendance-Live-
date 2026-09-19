'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { WebcamCapture } from '@/components/webcam-capture';
import { useApp } from '@/hooks/use-app';
import { useToast } from '@/hooks/use-toast';
import { detectAttendanceIntrusion } from '@/ai/flows/detect-attendance-intrusion';
import { LoaderCircle, MapPin, Clock, Calendar as CalendarIcon, Phone, User as UserIcon, RefreshCw, AlertCircle, Check, ClipboardCheck } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';

const formSchema = z.object({
  shift: z.enum(['Shift A', 'Shift B', 'Shift C', 'General']),
  site: z.string().min(1, { message: 'దయచేసి సైట్‌ను ఎంచుకోండి.' }),
});

const LOCATION_PLACEHOLDER = 'చిరునామాను గుర్తిస్తున్నాము...';

export default function EmployeeDashboard() {
  const { currentUser, sites, submitAttendance, todayAttendance } = useApp();
  const { toast } = useToast();
  const [photoDataUri, setPhotoDataUri] = useState<string | null>(null);
  const [isPhotoConfirmed, setIsPhotoConfirmed] = useState(false);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string>(LOCATION_PLACEHOLDER);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      shift: 'General',
      site: '',
    },
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
        headers: { 'Accept-Language': 'te,en' },
        signal: AbortSignal.timeout(4000)
      });
      const data = await response.json();
      if (data && data.display_name) {
        setAddress(data.display_name);
      } else {
        setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }
    } catch (error) {
      setAddress("Duddebanda, Andhra Pradesh");
    }
  }, []);

  const getLocation = useCallback(() => {
    if (isLocating) return;
    setIsLocating(true);
    setLocationError(null);
    setAddress(LOCATION_PLACEHOLDER);
    
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newGps = { lat: position.coords.latitude, lng: position.coords.longitude };
          setGps(newGps);
          reverseGeocode(newGps.lat, newGps.lng);
          setIsLocating(false);
        },
        (error) => {
          const fallbackGps = { lat: 14.159487, lng: 77.615092 };
          setGps(fallbackGps);
          setAddress("Duddebanda, Andhra Pradesh");
          setIsLocating(false);
          setLocationError("Location access denied.");
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
      );
    } else {
      setAddress("GPS Not Supported");
      setIsLocating(false);
    }
  }, [isLocating, reverseGeocode]);

  useEffect(() => {
    getLocation();
  }, []);

  const handlePhotoCapture = useCallback((dataUri: string | null) => {
    setPhotoDataUri(dataUri);
    setIsPhotoConfirmed(!!dataUri); 
  }, []);

  const isLocationReady = useMemo(() => {
    return gps !== null && address !== LOCATION_PLACEHOLDER;
  }, [gps, address]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!currentUser) return;

    if (!photoDataUri || !isPhotoConfirmed) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'దయచేసి ఫోటో తీసి OK నొక్కండి.',
      });
      return;
    }

    if (!isLocationReady) {
      toast({
        variant: 'destructive',
        title: 'Location Required',
        description: 'దయచేసి లొకేషన్ లోడ్ అయ్యే వరకు వేచి ఉండండి.',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
        toast({ title: 'విశ్లేషిస్తోంది...', description: 'ఫోటోను తనిఖీ చేస్తున్నాము.'});
        
        const aiResult = await detectAttendanceIntrusion({ photoDataUri });
        
        if (!aiResult.isLiveFace) {
            toast({
                variant: 'destructive',
                title: 'Security Alert',
                description: 'లైవ్ ఫేస్ గుర్తించబడలేదు.',
            });
            setIsSubmitting(false);
            return;
        }

        submitAttendance({
            employeeId: currentUser.id,
            shift: values.shift,
            site: values.site,
            dateTime: new Date().toISOString(),
            gpsCoordinates: gps!,
            address: address,
            photoDataUri: photoDataUri,
        });

        toast({ title: 'విజయం', description: `${values.shift} అటెండెన్స్ సమర్పించబడింది.` });
        form.reset();
        setPhotoDataUri(null);
        setIsPhotoConfirmed(false);
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'సమర్పణలో లోపం జరిగింది.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const siteOptions = useMemo(() => {
    return sites.map((site) => (
      <SelectItem key={site.id} value={site.name}>{site.name}</SelectItem>
    ));
  }, [sites]);

  return (
    <div className="grid lg:grid-cols-12 gap-8">
      <div className="lg:col-span-7 space-y-6">
        <div className="overflow-hidden rounded-2xl shadow-xl bg-black relative">
            <WebcamCapture onCapture={handlePhotoCapture} />
            {todayAttendance.length > 0 && (
                <div className="absolute top-4 left-4 z-10">
                    <div className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg border border-white/20">
                        <ClipboardCheck className="h-3 w-3" />
                        Today: {todayAttendance.length} Shift(s) Done
                    </div>
                </div>
            )}
        </div>

        {locationError && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-xl border border-destructive/20 flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm font-medium">లొకేషన్ పర్మిషన్ అవసరం. దయచేసి సెట్టింగ్స్‌లో అనుమతించండి.</p>
          </div>
        )}

        <Card className="rounded-2xl shadow-md border-none bg-white">
            <CardContent className="p-6 space-y-5">
                <div className="flex items-start gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                        <MapPin className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Current Location</p>
                            <Button variant="ghost" size="sm" onClick={getLocation} disabled={isLocating} className="h-8 text-primary hover:bg-primary/5">
                                <RefreshCw className={`h-4 w-4 mr-1 ${isLocating ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                        </div>
                        <p className={`text-base font-semibold mt-1 ${address === LOCATION_PLACEHOLDER ? 'text-muted-foreground animate-pulse' : 'text-slate-800'}`}>
                            {address}
                        </p>
                    </div>
                </div>

                <Separator className="opacity-50" />

                <div className="grid grid-cols-2 gap-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-2 rounded-full">
                            <CalendarIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-muted-foreground uppercase">Date</p>
                            <p className="text-sm font-bold text-slate-800">{format(currentTime, 'dd/MM/yyyy')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-2 rounded-full">
                            <Clock className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-muted-foreground uppercase">Time</p>
                            <p className="text-sm font-bold text-slate-800">{format(currentTime, 'hh:mm:ss a')}</p>
                        </div>
                    </div>
                </div>

                <Separator className="opacity-50" />

                <div className="grid grid-cols-2 gap-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-2 rounded-full">
                            <UserIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-muted-foreground uppercase">Employee</p>
                            <p className="text-sm font-bold text-slate-800">{currentUser?.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-2 rounded-full">
                            <Phone className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-muted-foreground uppercase">Mobile</p>
                            <p className="text-sm font-bold text-slate-800">{currentUser?.phone || '----'}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-5 flex flex-col gap-6">
        <Card className="rounded-2xl shadow-xl border-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl text-slate-800">Submit Attendance</CardTitle>
            <CardDescription className="text-slate-500">షిఫ్ట్ మరియు సైట్ వివరాలను ఎంచుకోండి.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="shift"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Select Shift</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-14 rounded-xl border-slate-200">
                            <SelectValue placeholder="Choose shift" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Shift A">Shift A</SelectItem>
                          <SelectItem value="Shift B">Shift B</SelectItem>
                          <SelectItem value="Shift C">Shift C</SelectItem>
                          <SelectItem value="General">General</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="site"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Work Site</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-14 rounded-xl border-slate-200">
                            <SelectValue placeholder="Choose site" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {siteOptions}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 space-y-2">
                  <p className="text-sm text-amber-800 leading-relaxed font-semibold flex gap-2">
                    <Check className={`h-5 w-5 shrink-0 ${isPhotoConfirmed ? 'text-green-600' : 'text-slate-400'}`} />
                    ఫోటో తీసి "OK" నొక్కాలి.
                  </p>
                  <p className="text-sm text-amber-800 leading-relaxed font-semibold flex gap-2">
                    <Check className={`h-5 w-5 shrink-0 ${isLocationReady ? 'text-green-600' : 'text-slate-400'}`} />
                    లొకేషన్ పూర్తిగా లోడ్ అవ్వాలి.
                  </p>
                </div>

                <Button 
                  type="submit" 
                  className={`w-full text-xl py-9 rounded-2xl shadow-lg transition-all duration-300 font-bold ${
                    isPhotoConfirmed && isLocationReady ? 'bg-primary hover:bg-primary/90' : 'bg-slate-300 opacity-50 cursor-not-allowed'
                  }`} 
                  disabled={isSubmitting || !photoDataUri || !isPhotoConfirmed || !isLocationReady}
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <LoaderCircle className="h-6 w-6 animate-spin" />
                      <span>Submitting...</span>
                    </div>
                  ) : 'Submit Attendance'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {todayAttendance.length > 0 && (
            <Card className="rounded-2xl border-none shadow-lg">
                <CardHeader>
                    <CardTitle className="text-lg">Today's History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {todayAttendance.map((rec) => (
                        <div key={rec.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border">
                            <div>
                                <p className="font-bold text-slate-700">{rec.shift}</p>
                                <p className="text-[10px] text-muted-foreground">{format(new Date(rec.dateTime), 'hh:mm a')}</p>
                            </div>
                            <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">Submitted</Badge>
                        </div>
                    ))}
                </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}
