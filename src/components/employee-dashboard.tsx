
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
import { LoaderCircle, MapPin, Camera, AlertTriangle, ShieldCheck, Info, RefreshCw, Calendar, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';

const formSchema = z.object({
  shift: z.enum(['Morning', 'Afternoon', 'Night']),
  site: z.enum(['Main Office', 'Warehouse', 'Remote']),
});

export default function EmployeeDashboard() {
  const { currentUser, submitAttendance } = useApp();
  const { toast } = useToast();
  const [photoDataUri, setPhotoDataUri] = useState<string | null>(null);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string>('Fetching address...');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [aiResult, setAiResult] = useState<DetectAttendanceIntrusionOutput | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const getLocation = useCallback(() => {
    setIsLocating(true);
    setAddress('Accessing GPS...');
    
    if (!navigator.geolocation) {
      setAddress('Geolocation not supported.');
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
        // Mocking a more "full" looking address for demonstration
        setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}, Plot 42, Tech Park, Hyderabad, TG 500081`);
        setIsLocating(false);
      },
      (error) => {
        let msg = 'Unable to retrieve location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location access denied. Please enable location in browser settings.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Location information is unavailable.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out.';
        }
        setAddress(msg);
        setIsLocating(false);
        toast({ 
          variant: 'destructive', 
          title: 'Location Error', 
          description: msg 
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [toast]);

  useEffect(() => {
    getLocation();
  }, [getLocation]);

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
    
    // Artificial delay for UX
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
                <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <WebcamCapture onCapture={handlePhotoCapture} />
                        <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                            <div className="flex items-start justify-between">
                                <div className="flex gap-3">
                                    <MapPin className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                                    <div>
                                        <p className="font-semibold text-sm">Full Address</p>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{address}</p>
                                    </div>
                                </div>
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={getLocation} 
                                  disabled={isLocating}
                                  className="h-8 w-8"
                                >
                                    <RefreshCw className={`h-4 w-4 ${isLocating ? 'animate-spin' : ''}`} />
                                </Button>
                            </div>
                            
                            <Separator />
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-primary" />
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Date</p>
                                        <p className="text-sm font-medium">{format(currentTime, 'PPP')}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-primary" />
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Time</p>
                                        <p className="text-sm font-medium">{format(currentTime, 'pp')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <FormField
                        control={form.control}
                        name="shift"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Shift</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select your shift" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                <SelectItem value="Morning">Morning</SelectItem>
                                <SelectItem value="Afternoon">Afternoon</SelectItem>
                                <SelectItem value="Night">Night</SelectItem>
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
                            <FormLabel>Site</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select your work site" />
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
                            <p className="text-sm text-muted-foreground flex items-start gap-2">
                                <Info size={20} className="text-primary flex-shrink-0 mt-0.5" />
                                <span>
                                    మీ ఫోటో ఫేషియల్ లైవ్‌నెస్ కోసం విశ్లేషించబడుతుంది. దీనివల్ల తప్పుడు అటెండెన్స్ నిరోధించవచ్చు.
                                </span>
                            </p>
                        </div>
                    </div>
                </div>

              <Button type="submit" className="w-full sm:w-auto text-lg py-6" disabled={isSubmitting || !photoDataUri || !gps}>
                {isSubmitting ? (
                  <>
                    <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
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

      {aiResult && (
        <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 font-headline">
                        <ShieldCheck className="text-primary" />
                        Photo Analysis Complete
                    </DialogTitle>
                    <DialogDescription>
                        Here are the results of the intrusion detection analysis.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="flex items-center justify-between">
                        <span className="font-medium">Live Face Detected</span>
                        <Badge variant={aiResult.isLiveFace ? 'default' : 'destructive'} className={aiResult.isLiveFace ? "bg-green-500 hover:bg-green-600" : ""}>
                            {aiResult.isLiveFace ? 'Yes' : 'No'}
                        </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="font-medium">AI Generated</span>
                        <Badge variant={aiResult.isAiGenerated ? 'destructive' : 'default'} className={aiResult.isAiGenerated ? "bg-red-500 hover:bg-red-600" : ""}>
                            {aiResult.isAiGenerated ? 'Yes' : 'No'}
                        </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="font-medium">Confidence Score</span>
                        <span className="font-mono">{(aiResult.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <Separator />
                    <div>
                        <h4 className="font-semibold mb-2">Explanation</h4>
                        <p className="text-sm text-muted-foreground p-3 bg-muted rounded-md">{aiResult.explanation}</p>
                    </div>
                </div>
                <Button onClick={() => setIsAiModalOpen(false)} className="w-full">Close</Button>
            </DialogContent>
        </Dialog>
      )}
    </>
  );
}
