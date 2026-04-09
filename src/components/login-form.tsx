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
import { LoaderCircle, UserPlus, LogIn } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  employeeId: z.string().min(3, { message: 'ID is required.' }),
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
                description: 'Invalid credentials. HR users must sign up first.',
              });
              break;
          }
        setIsLoading(false);
    }, 800);
  };

  const handleHrSignup = () => {
    setIsLoading(true);
    const { name, employeeId } = form.getValues();
    signupHr(employeeId, name);
    
    setTimeout(() => {
        toast({ title: 'HR Signup Successful', description: 'You can now login as HR.' });
        setIsLoading(false);
    }, 800);
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
            <CardContent className="p-6">
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signup">
          <Card>
            <CardContent className="p-6">
              <Form {...form}>
                <form className="space-y-6">
                   <p className="text-sm text-muted-foreground mb-4">
                    Create a new HR administrator account.
                  </p>
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
