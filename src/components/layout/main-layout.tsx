'use client';

import { useApp } from '@/hooks/use-app';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, User, Briefcase } from 'lucide-react';
import Loading from '@/app/loading';
import { toast } from '@/hooks/use-toast';

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
        <div className="max-w-[1800px] mx-auto px-4 md:px-8 flex h-16 items-center w-full">
          <div className="mr-4 flex items-center">
            <div className="bg-primary p-1.5 rounded-lg mr-2">
                <Briefcase className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold font-headline text-lg hidden sm:inline-block">Attendance App</span>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-4">
            <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full border">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold">{currentUser.name}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} aria-label="Log out" className="rounded-full hover:bg-destructive/10 hover:text-destructive">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 w-full">{children}</main>
    </div>
  );
}
