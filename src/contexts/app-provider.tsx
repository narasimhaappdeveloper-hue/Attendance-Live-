'use client';

import { createContext, useState, useEffect, useMemo, type ReactNode, useCallback } from 'react';
import { initialEmployees } from '@/lib/initial-data';
import type { Employee, AttendanceRecord, CurrentUser, Site, ExtraStatus, SalarySlip, ShiftSettings, ShiftDetail } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { isSameDay } from 'date-fns';

interface AppContextType {
  currentUser: CurrentUser | null;
  employees: Employee[];
  sites: Site[];
  attendanceRecords: AttendanceRecord[];
  extraStatuses: ExtraStatus[];
  salarySlips: SalarySlip[];
  shiftSettings: ShiftSettings;
  todayAttendance: AttendanceRecord[];
  login: (id: string, name: string) => 'employee' | 'hr' | 'not_found' | 'pending' | 'resigned';
  signupHr: (id: string, name: string) => void;
  logout: () => void;
  addEmployee: (employee: Omit<Employee, 'status'>) => void;
  updateEmployee: (id: string, data: Partial<Employee>) => void;
  updateEmployeeStatus: (id: string, status: 'Approved' | 'Pending' | 'Resigned') => void;
  deleteEmployee: (id: string) => void;
  addSite: (name: string) => void;
  deleteSite: (id: string) => void;
  submitAttendance: (record: Omit<AttendanceRecord, 'id' | 'employeeName'>) => void;
  markExtraStatus: (employeeId: string, date: string, status: 'Leave' | 'C-off' | 'Holiday' | 'Half-Day' | 'Present' | 'Absent', otHours: number, lateInHours?: number, earlyOutHours?: number) => void;
  saveSalarySlip: (slip: SalarySlip) => void;
  updateShiftSetting: (shift: keyof ShiftSettings, config: Partial<ShiftDetail>) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

const defaultSites: Site[] = [
  { id: 'S1', name: 'Main Office' },
  { id: 'S2', name: 'Warehouse' },
  { id: 'S3', name: 'Remote' },
];

const defaultShiftSettings: ShiftSettings = {
  'General': { startHour: 9, dutyHours: 8 },
  'Shift A': { startHour: 6, dutyHours: 8 },
  'Shift B': { startHour: 14, dutyHours: 8 },
  'Shift C': { startHour: 22, dutyHours: 8 },
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [hrUsers, setHrUsers] = useState<{id: string, name: string}[]>([]);
  const [sites, setSites] = useState<Site[]>(defaultSites);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [extraStatuses, setExtraStatuses] = useState<ExtraStatus[]>([]);
  const [salarySlips, setSalarySlips] = useState<SalarySlip[]>([]);
  const [shiftSettings, setShiftSettings] = useState<ShiftSettings>(defaultShiftSettings);
  const [isLoaded, setIsLoaded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) setCurrentUser(JSON.parse(storedUser));
      
      const storedEmployeesRaw = localStorage.getItem('employees');
      const storedEmployees: Employee[] = storedEmployeesRaw ? JSON.parse(storedEmployeesRaw) : [];
      
      const employeeMap = new Map<string, Employee>();
      initialEmployees.forEach(emp => employeeMap.set(emp.id.toUpperCase(), emp as Employee));
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

      const storedExtra = localStorage.getItem('extraStatuses');
      if (storedExtra) setExtraStatuses(JSON.parse(storedExtra));

      const storedSlips = localStorage.getItem('salarySlips');
      if (storedSlips) setSalarySlips(JSON.parse(storedSlips));

      const storedShiftSettings = localStorage.getItem('shiftSettings');
      if (storedShiftSettings) setShiftSettings(JSON.parse(storedShiftSettings));
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
    localStorage.setItem('extraStatuses', JSON.stringify(extraStatuses));
    localStorage.setItem('salarySlips', JSON.stringify(salarySlips));
    localStorage.setItem('shiftSettings', JSON.stringify(shiftSettings));
  }, [currentUser, employees, hrUsers, sites, attendanceRecords, extraStatuses, salarySlips, shiftSettings, isLoaded]);

  const todayAttendance = useMemo(() => {
    if (!currentUser || currentUser.role !== 'employee') return [];
    return attendanceRecords.filter(record => 
      record.employeeId.toUpperCase() === currentUser.id.toUpperCase() && 
      isSameDay(new Date(record.dateTime), new Date())
    );
  }, [currentUser, attendanceRecords]);

  const login = useCallback((id: string, name: string): 'employee' | 'hr' | 'not_found' | 'pending' | 'resigned' => {
    const uppercaseId = id.toUpperCase();
    const hr = hrUsers.find(h => h.id.toUpperCase() === uppercaseId);
    if (hr) {
      setCurrentUser({ id: hr.id, name: name || hr.name, role: 'hr' });
      return 'hr';
    }
    const employee = employees.find((e) => e.id.toUpperCase() === uppercaseId);
    if (employee) {
      if (employee.status === 'Pending') return 'pending';
      if (employee.status === 'Resigned') return 'resigned';
      setCurrentUser({ id: employee.id, name: name || employee.name, role: 'employee', phone: employee.phone });
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
      return [...prev, { ...employee, id: employee.id.toUpperCase(), status: 'Pending' }];
    });
  }, []);

  const updateEmployee = useCallback((id: string, data: Partial<Employee>) => {
    setEmployees((prev) => prev.map((emp) => (emp.id.toUpperCase() === id.toUpperCase() ? { ...emp, ...data } : emp)));
  }, []);

  const updateEmployeeStatus = useCallback((id: string, status: 'Approved' | 'Pending' | 'Resigned') => {
    setEmployees((prev) => prev.map((emp) => (emp.id.toUpperCase() === id.toUpperCase() ? { ...emp, status } : emp)));
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
    setAttendanceRecords((prev) => [{ ...record, id: `ATT${Date.now()}`, employeeName: currentUser.name }, ...prev]);
  }, [currentUser]);

  const markExtraStatus = useCallback((employeeId: string, date: string, status: 'Leave' | 'C-off' | 'Holiday' | 'Half-Day' | 'Present' | 'Absent', otHours: number, lateInHours?: number, earlyOutHours?: number) => {
    setExtraStatuses(prev => {
      const filtered = prev.filter(e => !(e.employeeId === employeeId && e.date === date));
      return [...filtered, { 
        id: `EX${Date.now()}`, 
        employeeId, 
        date, 
        status, 
        otHours, 
        lateInHours: lateInHours || 0,
        earlyOutHours: earlyOutHours || 0,
        lateHours: (lateInHours || 0) + (earlyOutHours || 0)
      }];
    });
  }, []);

  const saveSalarySlip = useCallback((slip: SalarySlip) => {
    setSalarySlips(prev => {
      const filtered = prev.filter(s => !(s.employeeId === slip.employeeId && s.month === slip.month));
      return [...filtered, slip];
    });
  }, []);

  const updateShiftSetting = useCallback((shift: keyof ShiftSettings, config: Partial<ShiftDetail>) => {
    setShiftSettings(prev => ({
      ...prev,
      [shift]: { ...prev[shift], ...config }
    }));
  }, []);

  const value = useMemo(() => ({
    currentUser, employees, sites, attendanceRecords, extraStatuses, salarySlips, shiftSettings, todayAttendance,
    login, signupHr, logout, addEmployee, updateEmployee, updateEmployeeStatus, deleteEmployee, addSite, deleteSite, submitAttendance, markExtraStatus, saveSalarySlip, updateShiftSetting
  }), [currentUser, employees, sites, attendanceRecords, extraStatuses, salarySlips, shiftSettings, todayAttendance, login, signupHr, logout, addEmployee, updateEmployee, updateEmployeeStatus, deleteEmployee, addSite, deleteSite, submitAttendance, markExtraStatus, saveSalarySlip, updateShiftSetting]);

  return (
    <AppContext.Provider value={value}>
      {isLoaded ? children : <div className="flex h-screen items-center justify-center text-primary font-bold">Initializing Attendance System...</div>}
    </AppContext.Provider>
  );
}
