'use client';

import { useApp } from '@/hooks/use-app';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, User, Briefcase } from 'lucide-react';
import Loading from '@/app/loading';

interface MainLayoutProps {
  children: ReactNode;
  allowedRoles: ('employee' | 'hr')[];
}

export default function MainLayout({ children, allowedRoles }: MainLayoutProps) {
  const { currentUser, logout } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!currentUser) {
      router.replace('/');
    } else if (!allowedRoles.includes(currentUser.role)) {
        toast({
            title: "Access Denied",
            description: "You do not have permission to view this page.",
            variant: "destructive"
        })
        router.replace('/');
    }
  }, [currentUser, router, allowedRoles]);

  if (!currentUser || !allowedRoles.includes(currentUser.role)) {
    return <Loading />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-sm">
        <div className="container flex h-16 items-center">
          <div className="mr-4 flex items-center">
            <Briefcase className="h-6 w-6 mr-2 text-primary" />
            <span className="font-bold font-headline text-lg">Attendance App</span>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-4">
            <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{currentUser.name}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} aria-label="Log out">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
