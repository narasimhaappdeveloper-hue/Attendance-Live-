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
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useApp } from '@/hooks/use-app';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { LoaderCircle, Info } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  employeeId: z.string().min(3, { message: 'Employee ID is required.' }),
});

export function LoginForm() {
  const { login } = useApp();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState<'employee' | 'hr' | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      employeeId: '',
    },
  });

  const handleLogin = (role: 'employee' | 'hr') => {
    setLoading(role);
    const { name, employeeId } = form.getValues();
    const result = login(employeeId.toUpperCase(), name);

    setTimeout(() => {
        switch (result) {
            case 'employee':
              toast({ title: 'Login Successful', description: `Welcome back, ${name}!` });
              router.push('/employee/dashboard');
              break;
            case 'hr':
              toast({ title: 'Admin Login Successful', description: `Welcome, ${name}!` });
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
                description: 'Invalid name or employee ID.',
              });
              break;
          }
        setLoading(null);
    }, 1000)
  };

  const fillDemo = (name: string, id: string) => {
    form.setValue('name', name);
    form.setValue('employeeId', id);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
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
                    <FormLabel>Employee ID</FormLabel>
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
                      className="w-full" 
                      onClick={() => form.handleSubmit(() => handleLogin('employee'))()}
                      disabled={!!loading}
                  >
                      {loading === 'employee' ? <LoaderCircle className="animate-spin" /> : 'Login as Employee'}
                  </Button>
                  <Button 
                      type="button" 
                      variant="secondary" 
                      className="w-full" 
                      onClick={() => form.handleSubmit(() => handleLogin('hr'))()}
                      disabled={!!loading}
                  >
                      {loading === 'hr' ? <LoaderCircle className="animate-spin" /> : 'Login as HR'}
                  </Button>
              </div>
            </form>
          </Form>
        </CardContent>
        <Separator />
        <CardFooter className="flex flex-col items-start p-6 gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Info className="h-4 w-4" />
            <span>Demo Credentials</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
            <Button 
              variant="outline" 
              size="sm" 
              className="justify-start font-normal text-xs h-auto py-2"
              onClick={() => fillDemo('Admin', 'HR-001')}
            >
              <span className="font-bold mr-2">HR:</span> Admin / HR-001
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="justify-start font-normal text-xs h-auto py-2"
              onClick={() => fillDemo('Alice Johnson', 'EMP001')}
            >
              <span className="font-bold mr-2">Alice:</span> EMP001
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="justify-start font-normal text-xs h-auto py-2"
              onClick={() => fillDemo('Bob Williams', 'EMP002')}
            >
              <span className="font-bold mr-2">Bob:</span> EMP002
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="justify-start font-normal text-xs h-auto py-2"
              onClick={() => fillDemo('Diana Miller', 'EMP004')}
            >
              <span className="font-bold mr-2">Diana:</span> EMP004
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
