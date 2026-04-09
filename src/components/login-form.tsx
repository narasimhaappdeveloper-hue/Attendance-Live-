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
import { LoaderCircle } from 'lucide-react';

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
      </Card>
    </div>
  );
}
