
'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { LoaderCircle, MapPin, Clock, Calendar as CalendarIcon, Phone, User as UserIcon, RefreshCw } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';

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

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
        headers: { 'Accept-Language': 'te,en' }
      });
      const data = await response.json();
      if (data && data.display_name) {
        setAddress(data.display_name);
      } else {
        setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }
    } catch (error) {
      console.error("Geocoding failed:", error);
      setAddress("చిరునామాను పొందలేకపోయాము. (GPS Coordinates: " + lat.toFixed(4) + ", " + lng.toFixed(4) + ")");
    }
  };

  const getLocation = useCallback(() => {
    setIsLocating(true);
    setAddress('చిరునామాను గుర్తిస్తున్నాము...');
    
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newGps = { lat: position.coords.latitude, lng: position.coords.longitude };
          setGps(newGps);
          reverseGeocode(newGps.lat, newGps.lng);
          setIsLocating(false);
        },
        (error) => {
          console.error("Location error:", error);
          const fallbackGps = { lat: 14.159487, lng: 77.615092 };
          setGps(fallbackGps);
          setAddress("Duddebanda, Andhra Pradesh (Fallback Location)");
          setIsLocating(false);
          toast({
            variant: "destructive",
            title: "Location Access Required",
            description: "దయచేసి మీ బ్రౌజర్‌లో లొకేషన్ పర్మిషన్ ఇవ్వండి.",
          });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setAddress("GPS Not Supported");
      setIsLocating(false);
    }
  }, [toast]);

  useEffect(() => {
    getLocation();
  }, [getLocation]);

  const handlePhotoCapture = (dataUri: string | null) => {
    setPhotoDataUri(dataUri);
    setIsPhotoConfirmed(!!dataUri); 
  };

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
            shift: values.shift as any,
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
        console.error('Submission failed:', error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'సమర్పణలో లోపం జరిగింది. దయచేసి మళ్ళీ ప్రయత్నించండి.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  if (hasSubmittedToday) {
    return (
      <Card className="border-green-100 bg-green-50/30">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="bg-green-100 p-4 rounded-full mb-6 shadow-sm">
            <Clock className="h-16 w-16 text-green-600" />
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
        <Card className="overflow-hidden border-none shadow-none bg-transparent">
            <WebcamCapture onCapture={handlePhotoCapture} />
        </Card>

        <Card>
            <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2 rounded-full mt-1">
                        <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Present Location</p>
                            <Button variant="ghost" size="sm" onClick={getLocation} disabled={isLocating} className="h-6 text-[10px]">
                                <RefreshCw className={`h-3 w-3 mr-1 ${isLocating ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                        </div>
                        <p className="text-sm font-medium leading-tight mt-1">{address}</p>
                        {gps && (
                            <p className="text-[10px] text-muted-foreground mt-1">
                                Coordinates: {gps.lat.toFixed(6)}, {gps.lng.toFixed(6)}
                            </p>
                        )}
                    </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-full">
                            <CalendarIcon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Date</p>
                            <p className="text-xs font-medium">{format(currentTime, 'dd/MM/yyyy')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-full">
                            <Clock className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Time</p>
                            <p className="text-xs font-medium">{format(currentTime, 'hh:mm:ss a')}</p>
                        </div>
                    </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-full">
                            <UserIcon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Employee</p>
                            <p className="text-xs font-medium">{currentUser?.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-full">
                            <Phone className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Mobile</p>
                            <p className="text-xs font-medium">{currentUser?.phone || 'Not Available'}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-5">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Submission Details</CardTitle>
            <CardDescription>షిఫ్ట్ మరియు సైట్ వివరాలను ఎంచుకుని అటెండెన్స్ పంపండి.</CardDescription>
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
                          <SelectTrigger className="h-12">
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
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Choose site" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sites.length > 0 ? sites.map((site) => (
                            <SelectItem key={site.id} value={site.name}>{site.name}</SelectItem>
                          )) : (
                            <SelectItem value="No Sites" disabled>No sites available</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-xs text-amber-800 leading-relaxed font-medium">
                    గమనిక: ఫోటో తీసిన తర్వాత 'OK' బటన్ నొక్కి కన్ఫర్మ్ చేయండి. ఆ తర్వాతే 'Submit Attendance' బటన్ పనిచేస్తుంది.
                  </p>
                </div>

                <Button 
                  type="submit" 
                  className="w-full text-lg py-8 shadow-lg transition-all" 
                  disabled={isSubmitting || !photoDataUri || !isPhotoConfirmed}
                >
                  {isSubmitting ? (
                    <>
                      <LoaderCircle className="mr-2 h-6 w-6 animate-spin" />
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
