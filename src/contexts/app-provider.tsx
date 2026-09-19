
'use client';

import { createContext, useState, useEffect, useMemo, type ReactNode, useCallback } from 'react';
import { initialEmployees } from '@/lib/initial-data';
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
  signupHr: (id: string, name: string) => void;
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
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [hrUsers, setHrUsers] = useState<{id: string, name: string}[]>([]);
  const [sites, setSites] = useState<Site[]>(defaultSites);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) setCurrentUser(JSON.parse(storedUser));
      
      const storedEmployeesRaw = localStorage.getItem('employees');
      const storedEmployees: Employee[] = storedEmployeesRaw ? JSON.parse(storedEmployeesRaw) : [];
      
      const employeeMap = new Map<string, Employee>();
      initialEmployees.forEach(emp => employeeMap.set(emp.id.toUpperCase(), emp));
      storedEmployees.forEach(emp => employeeMap.set(emp.id.toUpperCase(), emp));
      setEmployees(Array.from(employeeMap.values()));
      
      const storedHrRaw = localStorage.getItem('hrUsers');
      const storedHr: {id: string, name: string}[] = storedHrRaw ? JSON.parse(storedHrRaw) : [{ id: 'ADMIN', name: 'admin' }];
      const hrMap = new Map<string, {id: string, name: string}>();
      storedHr.forEach(h => hrMap.set(h.id.toUpperCase(), h));
      setHrUsers(Array.from(hrMap.values()));

      const storedSites = localStorage.getItem('sites');
      if (storedSites) setSites(JSON.parse(storedSites));
      
      const storedAttendance = localStorage.getItem('attendanceRecords');
      if (storedAttendance) setAttendanceRecords(JSON.parse(storedAttendance));
    } catch (error) {
      console.warn("Storage initialization warning");
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    localStorage.setItem('employees', JSON.stringify(employees));
    localStorage.setItem('hrUsers', JSON.stringify(hrUsers));
    localStorage.setItem('sites', JSON.stringify(sites));
    localStorage.setItem('attendanceRecords', JSON.stringify(attendanceRecords));
  }, [currentUser, employees, hrUsers, sites, attendanceRecords, isLoaded]);

  const hasSubmittedToday = useMemo(() => {
    if (!currentUser || currentUser.role !== 'employee') return false;
    return attendanceRecords.some(record => 
      record.employeeId.toUpperCase() === currentUser.id.toUpperCase() && 
      isSameDay(new Date(record.dateTime), new Date())
    );
  }, [currentUser, attendanceRecords]);

  const login = useCallback((id: string, name: string): 'employee' | 'hr' | 'not_found' | 'pending' => {
    const uppercaseId = id.toUpperCase();
    
    const hr = hrUsers.find(h => h.id.toUpperCase() === uppercaseId);
    if (hr) {
      setCurrentUser({ id: hr.id, name: name || hr.name, role: 'hr' });
      return 'hr';
    }

    const employee = employees.find((e) => e.id.toUpperCase() === uppercaseId);
    if (employee) {
      if (employee.status === 'Pending') return 'pending';
      setCurrentUser({ 
        id: employee.id, 
        name: name || employee.name, 
        role: 'employee',
        phone: employee.phone 
      });
      return 'employee';
    }

    return 'not_found';
  }, [employees, hrUsers]);

  const signupHr = useCallback((id: string, name: string) => {
    setHrUsers(prev => {
        if (prev.some(h => h.id.toUpperCase() === id.toUpperCase())) return prev;
        return [...prev, { id: id.toUpperCase(), name }];
    });
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    router.push('/');
  }, [router]);

  const addEmployee = useCallback((employee: Omit<Employee, 'status'>) => {
    setEmployees((prev) => {
      if (prev.some(emp => emp.id.toUpperCase() === employee.id.toUpperCase())) return prev;
      const newEmployee: Employee = { 
        ...employee, 
        id: employee.id.toUpperCase(), 
        status: 'Pending',
        weekOffDay: employee.weekOffDay || 'Sunday'
      };
      return [...prev, newEmployee];
    });
  }, []);

  const updateEmployeeStatus = useCallback((id: string, status: 'Approved' | 'Pending') => {
    setEmployees((prev) =>
      prev.map((emp) => (emp.id.toUpperCase() === id.toUpperCase() ? { ...emp, status } : emp))
    );
  }, []);

  const deleteEmployee = useCallback((id: string) => {
    const uppercaseId = id.toUpperCase();
    setEmployees((prev) => prev.filter((emp) => emp.id.toUpperCase() !== uppercaseId));
    setAttendanceRecords((prev) => prev.filter((rec) => rec.employeeId.toUpperCase() !== uppercaseId));
  }, []);

  const addSite = useCallback((name: string) => {
    setSites(prev => {
      if (prev.some(s => s.name.toLowerCase() === name.toLowerCase())) return prev;
      return [...prev, { id: `SITE${Date.now()}`, name }];
    });
  }, []);

  const deleteSite = useCallback((id: string) => {
    setSites((prev) => prev.filter((site) => site.id !== id));
  }, []);

  const submitAttendance = useCallback((record: Omit<AttendanceRecord, 'id' | 'employeeName'>) => {
    if (!currentUser) return;
    
    const newRecord: AttendanceRecord = { 
        ...record, 
        id: `ATT${Date.now()}`,
        employeeName: currentUser.name
    };
    setAttendanceRecords((prev) => [newRecord, ...prev]);
  }, [currentUser]);

  const value = useMemo(() => ({
    currentUser,
    employees,
    sites,
    attendanceRecords,
    hasSubmittedToday,
    login,
    signupHr,
    logout,
    addEmployee,
    updateEmployeeStatus,
    deleteEmployee,
    addSite,
    deleteSite,
    submitAttendance,
  }), [
    currentUser, employees, sites, attendanceRecords, hasSubmittedToday,
    login, signupHr, logout, addEmployee, updateEmployeeStatus,
    deleteEmployee, addSite, deleteSite, submitAttendance
  ]);

  return (
    <AppContext.Provider value={value}>
      {isLoaded ? children : <div className="flex h-screen items-center justify-center text-primary font-bold">Initializing Attendance System...</div>}
    </AppContext.Provider>
  );
}
