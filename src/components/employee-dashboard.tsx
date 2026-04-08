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
import { LoaderCircle, MapPin, Info, RefreshCw, CheckCircle2, Clock, Calendar as CalendarIcon, Phone } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';

const formSchema = z.object({
  shift: z.enum(['Shift A', 'Shift B', 'Shift C', 'General']),
  site: z.enum(['Main Office', 'Warehouse', 'Remote']),
});

export default function EmployeeDashboard() {
  const { currentUser, submitAttendance, hasSubmittedToday } = useApp();
  const { toast } = useToast();
  const [photoDataUri, setPhotoDataUri] = useState<string | null>(null);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string>('Duddebanda, Andhra Pradesh, India 🇮🇳');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      shift: 'General',
      site: 'Main Office',
    },
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getLocation = useCallback(() => {
    setIsLocating(true);
    
    if (!navigator.geolocation) {
      setIsLocating(false);
      setGps({ lat: 14.159487, lng: 77.615092 });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setGps({ lat: latitude, lng: longitude });
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        setGps({ lat: 14.159487, lng: 77.615092 });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    if (!hasSubmittedToday) {
      getLocation();
    }
  }, [getLocation, hasSubmittedToday]);

  const handlePhotoCapture = (dataUri: string | null) => {
    setPhotoDataUri(dataUri);
    // Automatic submission is REMOVED. 
    // User must click "Submit Attendance" button below.
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!currentUser || !photoDataUri) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'దయచేసి ఫోటో తీయండి.',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
        // AI analysis happens during submission to ensure liveness
        toast({ title: 'విశ్లేషిస్తోంది...', description: 'ఫోటోను తనిఖీ చేస్తున్నాము.'});
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

        toast({ title: 'విజయం', description: 'మీ అటెండెన్స్ సమర్పించబడింది.' });
        form.reset();
        setPhotoDataUri(null);
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
          <div className="bg-green-100 p-4 rounded-full mb-6">
            <CheckCircle2 className="h-16 w-16 text-green-600" />
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
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Attendance Submission</CardTitle>
        <CardDescription>
          ఫోటో తీసి వివరాలను నిర్ధారించండి.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-6">
                <WebcamCapture onCapture={handlePhotoCapture} />
                
                <div className="p-5 bg-muted/40 rounded-xl border space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Location</p>
                      <p className="text-sm font-medium leading-tight">{address}</p>
                    </div>
                  </div>
                  
                  <Separator className="opacity-50" />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <CalendarIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Date</p>
                        <p className="text-sm font-medium">{format(currentTime, 'dd/MM/yyyy')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <Clock className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Time</p>
                        <p className="text-sm font-medium">{format(currentTime, 'hh:mm:ss a')}</p>
                      </div>
                    </div>
                  </div>

                  <Separator className="opacity-50" />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <Info className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Employee</p>
                        <p className="text-sm font-medium">{currentUser?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <Phone className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Mobile</p>
                        <p className="text-sm font-medium">{currentUser?.phone || 'Not Available'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 space-y-6">
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
                          <SelectItem value="Main Office">Main Office</SelectItem>
                          <SelectItem value="Warehouse">Warehouse</SelectItem>
                          <SelectItem value="Remote">Remote</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    ముఖ్య గమనిక: అటెండెన్స్ రోజుకు ఒకసారి మాత్రమే అనుమతించబడుతుంది. ఫోటో తీసిన తర్వాత కింద ఉన్న బటన్ నొక్కండి.
                  </p>
                </div>

                <Button 
                  type="submit" 
                  className="w-full text-lg py-8 shadow-lg" 
                  disabled={isSubmitting || !photoDataUri}
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
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
