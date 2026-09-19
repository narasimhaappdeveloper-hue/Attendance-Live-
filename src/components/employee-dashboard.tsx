
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
import { LoaderCircle, MapPin, Clock, Calendar as CalendarIcon, Phone, User as UserIcon, RefreshCw, AlertCircle, Check } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const formSchema = z.object({
  shift: z.enum(['Shift A', 'Shift B', 'Shift C', 'General']),
  site: z.string().min(1, { message: 'దయచేసి సైట్‌ను ఎంచుకోండి.' }),
});

export default function EmployeeDashboard() {
  const { currentUser, sites, submitAttendance, hasSubmittedToday } = useApp();
  const { toast } = useToast();
  const [photoDataUri, setPhotoDataUri] = useState<string | null>(null);
  const [isPhotoConfirmed, setIsPhotoConfirmed] = useState(false);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string>('చిరునామాను గుర్తిస్తున్నాము...');
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
        signal: AbortSignal.timeout(5000)
      });
      const data = await response.json();
      if (data && data.display_name) {
        setAddress(data.display_name);
      } else {
        setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }
    } catch (error) {
      setAddress("Duddebanda, Andhra Pradesh (Location detected)");
    }
  }, []);

  const getLocation = useCallback(() => {
    if (isLocating) return;
    setIsLocating(true);
    setLocationError(null);
    
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
          setAddress("Duddebanda, Andhra Pradesh (Default Location)");
          setIsLocating(false);
          setLocationError("Location access denied. Using default.");
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

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!currentUser || !photoDataUri || !isPhotoConfirmed) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'దయచేసి ఫోటో తీసి కన్ఫర్మ్ (OK) చేయండి.',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
        toast({ title: 'విశ్లేషిస్తోంది...', description: 'ఫోటోను మరియు లొకేషన్‌ను తనిఖీ చేస్తున్నాము.'});
        
        // Call the AI flow (Server Action)
        const aiResult = await detectAttendanceIntrusion({ photoDataUri });
        
        if (!aiResult.isLiveFace) {
            toast({
                variant: 'destructive',
                title: 'Security Alert',
                description: 'లైవ్ ఫేస్ గుర్తించబడలేదు. దయచేసి మళ్ళీ ప్రయత్నించండి.',
            });
            setIsSubmitting(false);
            return;
        }

        submitAttendance({
            employeeId: currentUser.id,
            shift: values.shift,
            site: values.site,
            dateTime: new Date().toISOString(),
            gpsCoordinates: gps || { lat: 14.159487, lng: 77.615092 },
            address: address,
            photoDataUri: photoDataUri,
        });

        toast({ title: 'విజయం', description: 'మీ అటెండెన్స్ విజయవంతంగా సమర్పించబడింది.' });
        form.reset();
        setPhotoDataUri(null);
        setIsPhotoConfirmed(false);
    } catch (error) {
        console.error("Submission error:", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'సమర్పణలో లోపం జరిగింది. దయచేసి మళ్ళీ ప్రయత్నించండి.',
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

  if (hasSubmittedToday) {
    return (
      <Card className="border-green-100 bg-green-50/30">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="bg-green-100 p-4 rounded-full mb-6 shadow-sm">
            <Check className="h-16 w-16 text-green-600" />
          </div>
          <CardTitle className="text-3xl font-headline text-green-800 mb-2">Attendance Completed!</CardTitle>
          <CardDescription className="text-lg text-green-700 max-w-md">
            ఈ రోజుకు మీ అటెండెన్స్ విజయవంతంగా సమర్పించబడింది. రేపు మళ్ళీ కలవండి.
          </CardDescription>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid lg:grid-cols-12 gap-8">
      <div className="lg:col-span-7 space-y-6">
        <div className="overflow-hidden rounded-2xl shadow-xl">
            <WebcamCapture onCapture={handlePhotoCapture} />
        </div>

        {locationError && (
          <Alert variant="destructive" className="rounded-xl shadow-md">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Location Access Needed</AlertTitle>
            <AlertDescription>
              దయచేసి బ్రౌజర్‌లో లొకేషన్ పర్మిషన్ ఇవ్వండి.
            </AlertDescription>
          </Alert>
        )}

        <Card className="rounded-2xl shadow-md border-none bg-white">
            <CardContent className="p-6 space-y-5">
                <div className="flex items-start gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                        <MapPin className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Current Location</p>
                            <Button variant="ghost" size="sm" onClick={getLocation} disabled={isLocating} className="h-8 text-primary font-bold">
                                <RefreshCw className={`h-4 w-4 mr-1 ${isLocating ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                        </div>
                        <p className="text-base font-semibold leading-snug mt-1 text-slate-800">{address}</p>
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

      <div className="lg:col-span-5">
        <Card className="h-full rounded-2xl shadow-xl border-none">
          <CardHeader className="pb-4">
            <CardTitle className="font-headline text-2xl text-slate-800">Submit Attendance</CardTitle>
            <CardDescription className="text-slate-500 font-medium">షిఫ్ట్ మరియు సైట్ వివరాలను ఎంచుకోండి.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="shift"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-slate-700">Select Shift</FormLabel>
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
                      <FormLabel className="font-bold text-slate-700">Work Site</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-14 rounded-xl border-slate-200">
                            <SelectValue placeholder="Choose site" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sites.length > 0 ? siteOptions : (
                            <SelectItem value="No Sites" disabled>No sites available</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <p className="text-sm text-amber-800 leading-relaxed font-semibold flex gap-2">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    ఫోటో తీసిన తర్వాత 'OK' నొక్కి కన్ఫర్మ్ చేయాలి. ఆ తర్వాతే సబ్మిట్ బటన్ పనిచేస్తుంది.
                  </p>
                </div>

                <Button 
                  type="submit" 
                  className={`w-full text-xl py-9 rounded-2xl shadow-2xl transition-all duration-300 font-bold ${
                    isPhotoConfirmed ? 'bg-primary scale-100' : 'bg-slate-300 scale-95 opacity-50 cursor-not-allowed'
                  }`} 
                  disabled={isSubmitting || !photoDataUri || !isPhotoConfirmed}
                >
                  {isSubmitting ? (
                    <>
                      <LoaderCircle className="mr-3 h-6 w-6 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Attendance'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
