'use client';

import { LoginForm } from '@/components/login-form';
import { useApp } from '@/hooks/use-app';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LogIn } from 'lucide-react';

export default function Home() {
  const { currentUser } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'hr') {
        router.replace('/hr/dashboard');
      } else {
        router.replace('/employee/dashboard');
      }
    }
  }, [currentUser, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center justify-center mb-8">
            <div className="bg-primary text-primary-foreground p-3 rounded-full mb-4">
                <LogIn className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold text-center font-headline text-primary">Attendance App</h1>
            <p className="text-muted-foreground text-center mt-2">Please sign in to continue</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
