'use client';

import { createContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import { initialEmployees, hrUser } from '@/lib/initial-data';
import type { Employee, AttendanceRecord, CurrentUser, Site } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { isSameDay } from 'date-fns';

interface AppContextType {
  currentUser: CurrentUser | null;
  employees: Employee[];
  sites: Site[];
  attendanceRecords: AttendanceRecord[];
  hasSubmittedToday: boolean;
  login: (id: string, name: string) => 'employee' | 'hr' | 'not_found' | 'pending';
  logout: () => void;
  addEmployee: (employee: Omit<Employee, 'status'>) => void;
  updateEmployeeStatus: (id: string, status: 'Approved' | 'Pending') => void;
  deleteEmployee: (id: string) => void;
  addSite: (name: string) => void;
  deleteSite: (id: string) => void;
  submitAttendance: (record: Omit<AttendanceRecord, 'id' | 'employeeName'>) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

const defaultSites: Site[] = [
  { id: 'S1', name: 'Main Office' },
  { id: 'S2', name: 'Warehouse' },
  { id: 'S3', name: 'Remote' },
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [sites, setSites] = useState<Site[]>(defaultSites);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        setCurrentUser(JSON.parse(storedUser));
      }
      const storedEmployees = localStorage.getItem('employees');
      if (storedEmployees) {
        setEmployees(JSON.parse(storedEmployees));
      } else {
        setEmployees(initialEmployees);
      }
      const storedSites = localStorage.getItem('sites');
      if (storedSites) {
        setSites(JSON.parse(storedSites));
      }
      const storedAttendance = localStorage.getItem('attendanceRecords');
      if (storedAttendance) {
        setAttendanceRecords(JSON.parse(storedAttendance));
      }
    } catch (error) {
      console.error("Failed to parse from localStorage", error);
      localStorage.clear();
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      localStorage.setItem('employees', JSON.stringify(employees));
      localStorage.setItem('sites', JSON.stringify(sites));
      localStorage.setItem('attendanceRecords', JSON.stringify(attendanceRecords));
    }
  }, [currentUser, employees, sites, attendanceRecords, isLoaded]);

  const hasSubmittedToday = useMemo(() => {
    if (!currentUser || currentUser.role !== 'employee') return false;
    return attendanceRecords.some(record => 
      record.employeeId === currentUser.id && 
      isSameDay(new Date(record.dateTime), new Date())
    );
  }, [currentUser, attendanceRecords]);

  const login = (id: string, name: string): 'employee' | 'hr' | 'not_found' | 'pending' => {
    // HR Login with admin/admin (case insensitive)
    if (id.toUpperCase() === hrUser.id.toUpperCase() && name.toLowerCase() === hrUser.name.toLowerCase()) {
      const user: CurrentUser = { id: hrUser.id, name: 'Admin User', role: 'hr' };
      setCurrentUser(user);
      return 'hr';
    }

    const employee = employees.find(
      (e) => e.id.toUpperCase() === id.toUpperCase() && e.name.toLowerCase() === name.toLowerCase()
    );

    if (employee) {
        if(employee.status === 'Pending') {
            return 'pending';
        }
      const user: CurrentUser = { 
        id: employee.id, 
        name: employee.name, 
        role: 'employee',
        phone: employee.phone 
      };
      setCurrentUser(user);
      return 'employee';
    }

    return 'not_found';
  };

  const logout = () => {
    setCurrentUser(null);
    router.push('/');
  };

  const addEmployee = (employee: Omit<Employee, 'status'>) => {
    const newEmployee: Employee = { ...employee, status: 'Pending' };
    setEmployees((prev) => [...prev, newEmployee]);
  };

  const updateEmployeeStatus = (id: string, status: 'Approved' | 'Pending') => {
    setEmployees((prev) =>
      prev.map((emp) => (emp.id === id ? { ...emp, status } : emp))
    );
  };

  const deleteEmployee = (id: string) => {
    setEmployees((prev) => prev.filter((emp) => emp.id !== id));
    setAttendanceRecords((prev) => prev.filter((rec) => rec.employeeId !== id));
  };

  const addSite = (name: string) => {
    const newSite: Site = { id: `SITE${Date.now()}`, name };
    setSites((prev) => [...prev, newSite]);
  };

  const deleteSite = (id: string) => {
    setSites((prev) => prev.filter((site) => site.id !== id));
  };

  const submitAttendance = (record: Omit<AttendanceRecord, 'id' | 'employeeName'>) => {
    if (!currentUser) return;
    
    const alreadySubmitted = attendanceRecords.some(r => 
      r.employeeId === currentUser.id && 
      isSameDay(new Date(r.dateTime), new Date())
    );
    
    if (alreadySubmitted) {
      console.warn("Attendance already submitted for today.");
      return;
    }

    const newRecord: AttendanceRecord = { 
        ...record, 
        id: `ATT${Date.now()}`,
        employeeName: currentUser.name
    };
    setAttendanceRecords((prev) => [newRecord, ...prev]);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        employees,
        sites,
        attendanceRecords,
        hasSubmittedToday,
        login,
        logout,
        addEmployee,
        updateEmployeeStatus,
        deleteEmployee,
        addSite,
        deleteSite,
        submitAttendance,
      }}
    >
      {isLoaded ? children : <div className="flex h-screen items-center justify-center">Loading...</div>}
    </AppContext.Provider>
  );
}
