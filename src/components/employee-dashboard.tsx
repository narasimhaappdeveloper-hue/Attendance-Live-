'use client';

import { useState, useEffect } from 'react';
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
import { LoaderCircle, MapPin, Camera, AlertTriangle, ShieldCheck, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiResult, setAiResult] = useState<DetectAttendanceIntrusionOutput | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setGps({ lat: latitude, lng: longitude });
          // Mock reverse geocoding
          setAddress(`Near ${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
        },
        () => {
          setAddress('Unable to retrieve location.');
          toast({ variant: 'destructive', title: 'Could not get location' });
        }
      );
    }
  }, [toast]);

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
        description: 'Please capture a photo and ensure location is enabled.',
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
                        <div className="flex items-start gap-3 rounded-lg border p-4 text-sm">
                            <MapPin className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                            <div>
                                <p className="font-semibold">Location Details</p>
                                <p className="text-muted-foreground">{address}</p>
                                {gps && <p className="text-xs text-muted-foreground/80">({gps.lat.toFixed(4)}, {gps.lng.toFixed(4)})</p>}
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
                        <p className="text-sm text-muted-foreground flex items-start gap-2 pt-4">
                            <Info size={24} className="text-primary flex-shrink-0" />
                            <span>
                                Your photo will be analyzed for liveness and AI-generated enhancements to prevent fraudulent submissions.
                            </span>
                        </p>
                    </div>
                </div>

              <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting || !photoDataUri}>
                {isSubmitting ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
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
                        <Badge variant={aiResult.isLiveFace ? 'default' : 'destructive'} className="bg-green-500 text-white">
                            {aiResult.isLiveFace ? 'Yes' : 'No'}
                        </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="font-medium">AI Generated</span>
                        <Badge variant={aiResult.isAiGenerated ? 'destructive' : 'default'} className="bg-red-500 text-white">
                            {aiResult.isAiGenerated ? 'Yes' : 'No'}
                        </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="font-medium">Confidence Score</span>
                        <span>{(aiResult.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <Separator />
                    <div>
                        <h4 className="font-semibold mb-2">Explanation</h4>
                        <p className="text-sm text-muted-foreground p-3 bg-muted rounded-md">{aiResult.explanation}</p>
                    </div>
                </div>
                <Button onClick={() => setIsAiModalOpen(false)}>Close</Button>
            </DialogContent>
        </Dialog>
      )}
    </>
  );
}
