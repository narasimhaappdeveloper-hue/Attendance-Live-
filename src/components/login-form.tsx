
'use client';

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
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useApp } from '@/hooks/use-app';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { LoaderCircle, UserPlus, LogIn, AlertCircle, ShieldCheck } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  employeeId: z.string().min(3, { message: 'ID is required.' }),
  securityKey: z.string().optional(),
});

export function LoginForm() {
  const { login, signupHr } = useApp();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      employeeId: '',
      securityKey: '',
    },
  });

  const handleLogin = (role: 'employee' | 'hr') => {
    setIsLoading(true);
    const { name, employeeId } = form.getValues();
    const result = login(employeeId.toUpperCase(), name);

    setTimeout(() => {
        switch (result) {
            case 'employee':
              toast({ title: 'Login Successful', description: `Welcome back, ${name}!` });
              router.push('/employee/dashboard');
              break;
            case 'hr':
              toast({ title: 'HR Login Successful', description: `Welcome, ${name}!` });
              router.push('/hr/dashboard');
              break;
            case 'pending':
                toast({
                    variant: 'destructive',
                    title: 'Login Failed',
                    description: 'Your account is pending approval by HR.',
                  });
                break;
            case 'not_found':
            default:
              toast({
                variant: 'destructive',
                title: 'Login Failed',
                description: 'Invalid credentials. HR users must sign up first with a Security Key.',
              });
              break;
          }
        setIsLoading(false);
    }, 800);
  };

  const handleHrSignup = () => {
    setIsLoading(true);
    const { name, employeeId, securityKey } = form.getValues();
    
    // Check for Security Key (Hardcoded for prototype security)
    if (securityKey !== 'HR2025') {
        toast({ 
            variant: 'destructive', 
            title: 'Unauthorized', 
            description: 'Invalid Security Access Key. హెచ్‌ఆర్ సైన్అప్ చేయడానికి అనుమతి లేదు.' 
        });
        setIsLoading(false);
        return;
    }

    signupHr(employeeId, name);
    
    setTimeout(() => {
        toast({ title: 'HR Signup Successful', description: 'You can now login as HR.' });
        setIsLoading(false);
    }, 800);
  };

  const fillDemo = (id: string, name: string) => {
    form.setValue('employeeId', id);
    form.setValue('name', name);
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="login" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="login">
            <LogIn className="mr-2 h-4 w-4" /> Login
          </TabsTrigger>
          <TabsTrigger value="signup">
            <UserPlus className="mr-2 h-4 w-4" /> HR Signup
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="login">
          <Card>
            <CardContent className="p-6 space-y-6">
              <Form {...form}>
                <form className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="employeeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employee/HR ID</FormLabel>
                        <FormControl>
                          <Input placeholder="EMP001" {...field} onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex flex-col sm:flex-row gap-2">
                      <Button 
                          type="button" 
                          className="w-full h-11" 
                          onClick={() => form.handleSubmit(() => handleLogin('employee'))()}
                          disabled={isLoading}
                      >
                          {isLoading ? <LoaderCircle className="animate-spin" /> : 'Login as Employee'}
                      </Button>
                      <Button 
                          type="button" 
                          variant="secondary" 
                          className="w-full h-11" 
                          onClick={() => form.handleSubmit(() => handleLogin('hr'))()}
                          disabled={isLoading}
                      >
                          {isLoading ? <LoaderCircle className="animate-spin" /> : 'Login as HR'}
                      </Button>
                  </div>
                </form>
              </Form>

              <div className="p-4 bg-muted/60 rounded-lg border text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-muted-foreground mb-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Demo Evaluation Credentials (టెస్టింగ్ కోసం):</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="text-[11px] h-7"
                    onClick={() => fillDemo('EMP001', 'Alice Johnson')}
                  >
                    Employee: EMP001
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="text-[11px] h-7 bg-primary/5 border-primary/20 hover:bg-primary/10 text-primary"
                    onClick={() => fillDemo('ADMIN', 'admin')}
                  >
                    HR Demo: ADMIN
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signup">
          <Card>
            <CardContent className="p-6">
              <Form {...form}>
                <form className="space-y-6">
                   <div className="flex items-center gap-2 text-amber-600 mb-2">
                    <ShieldCheck className="h-5 w-5" />
                    <p className="text-sm font-bold">Restricted Access</p>
                  </div>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Admin Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Admin User" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="employeeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Admin ID (Login ID)</FormLabel>
                        <FormControl>
                          <Input placeholder="ADMIN" {...field} onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="securityKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Security Access Key</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter Security Key" {...field} />
                        </FormControl>
                        <FormDescription>హెచ్‌ఆర్ ఖాతా సృష్టించడానికి సెక్యూరిటీ కీ అవసరం.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                      type="button" 
                      className="w-full h-11 bg-primary" 
                      onClick={() => form.handleSubmit(handleHrSignup)()}
                      disabled={isLoading}
                  >
                      {isLoading ? <LoaderCircle className="animate-spin mr-2" /> : <UserPlus className="mr-2 h-4 w-4" />}
                      Create HR Account
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
