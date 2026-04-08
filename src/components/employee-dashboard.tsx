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
import { LoaderCircle, MapPin, Info, RefreshCw, CheckCircle2, Phone, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import Image from 'next/image';

const formSchema = z.object({
  shift: z.enum(['Shift A', 'Shift B', 'Shift C', 'General']),
  site: z.enum(['Main Office', 'Warehouse', 'Remote']),
});

export default function EmployeeDashboard() {
  const { currentUser, submitAttendance, hasSubmittedToday } = useApp();
  const { toast } = useToast();
  const [photoDataUri, setPhotoDataUri] = useState<string | null>(null);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string>('5j9f+gm3, Duddebanda, Andhra Pradesh 515164, India');
  const [area, setArea] = useState<string>('Duddebanda');
  const [state, setState] = useState<string>('Andhra Pradesh');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [aiResult, setAiResult] = useState<DetectAttendanceIntrusionOutput | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      shift: 'General',
      site: 'Main Office',
    },
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
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
    if(dataUri){
        toast({ title: 'Analyzing photo...', description: 'Please wait while we check the image.'});
        try {
            const result = await detectAttendanceIntrusion({ photoDataUri: dataUri });
            setAiResult(result);
            setIsAiModalOpen(true);
        } catch (error) {
            console.error('AI analysis failed:', error);
            toast({ variant: 'destructive', title: 'AI Analysis Failed', description: 'Could not analyze the photo.'});
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
    await new Promise(resolve => setTimeout(resolve, 1000));

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
          <div className="mt-8 p-4 bg-white rounded-lg shadow-sm border border-green-100 w-full max-w-sm">
             <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                <span>Date: {format(new Date(), 'PPP')}</span>
             </div>
             <p className="text-xs text-muted-foreground text-center">మీరు మళ్ళీ అటెండెన్స్ వేయవలసిన అవసరం లేదు.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Submit Attendance</CardTitle>
          <CardDescription>
            Fill in the details below and capture your photo to mark your attendance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-7 space-y-6">
                        <WebcamCapture onCapture={handlePhotoCapture} />
                        
                        {/* GPS Map Camera Overlay */}
                        <div className="bg-neutral-900 text-white p-4 rounded-lg flex gap-4 overflow-hidden relative border border-white/10 shadow-2xl">
                          <div className="absolute top-2 right-2 bg-black/40 px-2 py-0.5 rounded text-[8px] flex items-center gap-1 border border-white/5 z-10">
                             <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_5px_rgba(59,130,246,0.8)]"></div>
                             GPS Map Camera
                          </div>

                          {/* Left Section: Map & Badge */}
                          <div className="flex flex-col gap-2 w-24 flex-shrink-0">
                             <div className="bg-green-600 text-[10px] font-bold py-1 px-1 rounded text-center leading-tight">
                                Time & Attendance
                             </div>
                             <div className="relative aspect-square w-full rounded overflow-hidden border border-white/20">
                                <Image 
                                  src="https://picsum.photos/seed/map/200/200" 
                                  alt="Map" 
                                  fill 
                                  className="object-cover opacity-80" 
                                  data-ai-hint="map satellite"
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                   <MapPin className="text-red-600 h-6 w-6 drop-shadow-md fill-red-600" />
                                </div>
                             </div>
                             <div className="mt-auto opacity-70 grayscale contrast-125">
                                <Image src="https://picsum.photos/seed/googlelogo/100/40" alt="Google" width={40} height={16} />
                             </div>
                          </div>

                          {/* Middle Section: Location Details */}
                          <div className="flex-1 space-y-1.5 overflow-hidden">
                             <h3 className="text-base md:text-xl font-bold leading-tight">
                                {area}, {state}, India 🇮🇳
                             </h3>
                             <div className="space-y-1">
                                <p className="text-[10px] md:text-xs opacity-90 leading-tight font-medium">
                                   {address}
                                </p>
                                <div className="flex flex-col gap-0.5 text-[9px] md:text-[10px] opacity-80 font-mono">
                                   <p className="flex items-center gap-1">
                                      <span>Lat {gps?.lat?.toFixed(6) || '14.159487'}°</span>
                                      <span>Long {gps?.lng?.toFixed(6) || '77.615092'}°</span>
                                   </p>
                                   <p className="font-semibold uppercase">
                                      {format(currentTime, "EEEE, MM/dd/yyyy hh:mm a 'GMT +05:30'")}
                                   </p>
                                   <p className="flex items-center gap-1">
                                      Person Name : -{currentUser?.name}
                                   </p>
                                   <div className="flex items-center gap-1.5 mt-0.5">
                                      <div className="bg-blue-500/20 p-0.5 rounded">
                                        <Phone className="h-3 w-3 text-blue-400" />
                                      </div>
                                      <span className="font-bold">8050166319</span>
                                   </div>
                                </div>
                             </div>
                          </div>

                          {/* Right Section: Selfie Preview */}
                          <div className="flex items-center flex-shrink-0">
                             <div className="w-14 h-14 md:w-16 md:h-16 rounded border border-white/30 overflow-hidden bg-neutral-800 shadow-inner">
                                {photoDataUri ? (
                                   <Image src={photoDataUri} alt="User" width={64} height={64} className="object-cover" />
                                ) : (
                                   <div className="w-full h-full flex items-center justify-center opacity-30">
                                      <User className="h-8 w-8" />
                                   </div>
                                )}
                             </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md border border-dashed border-muted-foreground/30">
                           <p className="text-[10px] text-muted-foreground italic">Location is automatically captured using GPS Map Camera mode.</p>
                           <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              onClick={getLocation} 
                              disabled={isLocating}
                              className="h-8 gap-2 text-xs"
                            >
                                <RefreshCw className={`h-3 w-3 ${isLocating ? 'animate-spin' : ''}`} />
                                {isLocating ? 'Locating...' : 'Refresh GPS'}
                            </Button>
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
                                <div className="text-sm text-muted-foreground space-y-2">
                                    <p>మీ ఫోటో ఫేషియల్ లైవ్‌నెస్ మరియు ఏఐ ఎన్‌హాన్స్‌మెంట్స్ కోసం విశ్లేషించబడుతుంది.</p>
                                    <p className="text-xs font-semibold text-primary">ముఖ్య గమనిక: అటెండెన్స్ రోజుకు ఒకసారి మాత్రమే అనుమతించబడుతుంది.</p>
                                </div>
                            </div>
                        </div>

                        <Button 
                          type="submit" 
                          className="w-full text-lg py-8 shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99]" 
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
                    <DialogTitle className="flex items-center gap-2 font-headline text-xl">
                        <LoaderCircle className="text-primary h-6 w-6 animate-spin" />
                        AI Analysis Result
                    </DialogTitle>
                    <DialogDescription>
                        Intrusion detection analysis has been completed for your submission.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="font-medium">Live Face Detected</span>
                        <Badge variant={aiResult.isLiveFace ? 'default' : 'destructive'} className={aiResult.isLiveFace ? "bg-green-500 hover:bg-green-600 px-3" : "px-3"}>
                            {aiResult.isLiveFace ? 'PASSED' : 'FAILED'}
                        </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="font-medium">AI Generated Check</span>
                        <Badge variant={aiResult.isAiGenerated ? 'destructive' : 'default'} className={aiResult.isAiGenerated ? "px-3" : "bg-green-500 hover:bg-green-600 px-3"}>
                            {aiResult.isAiGenerated ? 'DETECTED' : 'CLEAR'}
                        </Badge>
                    </div>
                    <div className="flex items-center justify-between px-3">
                        <span className="text-sm font-medium text-muted-foreground">Confidence Score</span>
                        <span className="font-mono font-bold text-lg text-primary">{(aiResult.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <Separator />
                    <div className="bg-primary/5 p-4 rounded-md border border-primary/10">
                        <h4 className="font-bold text-sm mb-2 uppercase tracking-tight text-primary">Analysis Explanation</h4>
                        <p className="text-sm leading-relaxed">{aiResult.explanation}</p>
                    </div>
                </div>
                <Button onClick={() => setIsAiModalOpen(false)} className="w-full h-12">Close & Continue</Button>
            </DialogContent>
        </Dialog>
      )}
    </>
  );
}
