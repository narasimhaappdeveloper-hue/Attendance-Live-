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
import type { DetectAttendanceIntrusionOutput } from '@/ai/flows/detect-attendance-intrusion';
import { LoaderCircle, MapPin, Info, RefreshCw, CheckCircle2, Clock, Calendar as CalendarIcon, Phone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
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
  const [aiResult, setAiResult] = useState<DetectAttendanceIntrusionOutput | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
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
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: 'Your browser does not support geolocation.' 
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setGps({ lat: latitude, lng: longitude });
        setIsLocating(false);
      },
      (error) => {
        let msg = 'Unable to retrieve location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location access denied. Please enable location in browser settings.';
        }
        setIsLocating(false);
        toast({ 
          variant: 'destructive', 
          title: 'Location Error', 
          description: msg 
        });
        setGps({ lat: 14.159487, lng: 77.615092 });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [toast]);

  useEffect(() => {
    if (!hasSubmittedToday) {
      getLocation();
    }
  }, [getLocation, hasSubmittedToday]);

  const handlePhotoCapture = async (dataUri: string | null) => {
    setPhotoDataUri(dataUri);
    // Analysis is triggered but NOT submission
    if(dataUri){
        toast({ title: 'Analyzing photo...', description: 'Checking for facial liveness.'});
        try {
            const result = await detectAttendanceIntrusion({ photoDataUri: dataUri });
            setAiResult(result);
            setIsAiModalOpen(true);
        } catch (error) {
            console.error('AI analysis failed:', error);
            // Non-critical error, we allow the user to proceed
        }
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!currentUser || !photoDataUri || !gps) {
      toast({
        variant: 'destructive',
        title: 'Submission Error',
        description: 'Please capture a photo and ensure location is detected correctly.',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    // Artificial delay for UX
    await new Promise(resolve => setTimeout(resolve, 1500));

    submitAttendance({
      employeeId: currentUser.id,
      shift: values.shift,
      site: values.site,
      dateTime: new Date().toISOString(),
      gpsCoordinates: gps,
      address: address,
      photoDataUri: photoDataUri,
    });

    toast({ title: 'Success', description: 'Your attendance has been submitted.' });
    form.reset();
    setPhotoDataUri(null);
    setAiResult(null);
    setIsSubmitting(false);
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
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Attendance Submission</CardTitle>
          <CardDescription>
            Capture your photo and confirm details to submit.
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
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Location Details</p>
                                    <p className="text-sm font-medium leading-tight">{address}</p>
                                </div>
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={getLocation} 
                                    disabled={isLocating}
                                    className="h-8 w-8 p-0"
                                >
                                    <RefreshCw className={`h-4 w-4 ${isLocating ? 'animate-spin' : ''}`} />
                                </Button>
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
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Name</p>
                                        <p className="text-sm font-medium">{currentUser?.name}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="bg-primary/10 p-2 rounded-full">
                                        <Phone className="h-4 w-4 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Contact</p>
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
                        
                        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-3">
                            <div className="flex items-start gap-3">
                                <Info size={20} className="text-primary flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    ముఖ్య గమనిక: అటెండెన్స్ రోజుకు ఒకసారి మాత్రమే అనుమతించబడుతుంది. ఫోటో తీసిన తర్వాత క్రింది సబ్మిట్ బటన్ నొక్కండి.
                                </p>
                            </div>
                        </div>

                        <Button 
                          type="submit" 
                          className="w-full text-lg py-8 shadow-lg transition-all hover:scale-[1.01]" 
                          disabled={isSubmitting || !photoDataUri || !gps}
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

      {aiResult && (
        <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 font-headline text-xl text-primary">
                        AI Analysis Complete
                    </DialogTitle>
                    <DialogDescription>
                        We've analyzed your photo for facial liveness detection.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="font-medium">Live Face Check</span>
                        <Badge variant={aiResult.isLiveFace ? 'default' : 'destructive'} className={aiResult.isLiveFace ? "bg-green-600" : ""}>
                            {aiResult.isLiveFace ? 'VERIFIED' : 'FAILED'}
                        </Badge>
                    </div>
                    <Separator />
                    <div className="bg-primary/5 p-4 rounded-md border border-primary/10">
                        <p className="text-sm leading-relaxed">{aiResult.explanation}</p>
                    </div>
                </div>
                <Button onClick={() => setIsAiModalOpen(false)} className="w-full h-12">Confirm & Close</Button>
            </DialogContent>
        </Dialog>
      )}
    </>
  );
}
