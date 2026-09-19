
export type Employee = {
  id: string;
  name: string;
  status: 'Approved' | 'Pending';
  phone?: string;
  weekOffDay?: string;
  dailyRate: number; // Base pay per day
  otRate: number;    // Pay per hour of overtime
  attendanceBonus: number; // Monthly bonus
  foodAllowance: number;   // Monthly food allowance
  deductions: number;      // Monthly standard deductions (PF/Insurance etc)
};

export type Site = {
  id: string;
  name: string;
};

export type DayStatus = 'Present' | 'Absent' | 'Week-off' | 'Leave' | 'Holiday' | 'C-off';

export type AttendanceRecord = {
  id: string;
  employeeId: string;
  employeeName: string;
  shift: 'Shift A' | 'Shift B' | 'Shift C' | 'General';
  site: string;
  dateTime: string;
  gpsCoordinates: { lat: number; lng: number };
  address: string;
  photoDataUri: string;
};

export type ExtraStatus = {
  id: string;
  employeeId: string;
  date: string; // ISO date string (YYYY-MM-DD)
  status: 'Leave' | 'C-off' | 'Holiday';
  otHours: number;
};

export type SalarySlip = {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string; // YYYY-MM
  generatedDate: string;
  daysPresent: number;
  daysLeave: number;
  daysHoliday: number;
  daysWeekOff: number;
  daysCOff: number;
  otHours: number;
  dailyRate: number;
  otRate: number;
  attendanceBonus: number;
  foodAllowance: number;
  deductions: number;
  totalSalary: number;
};

export type CurrentUser = {
  id: string;
  name: string;
  role: 'employee' | 'hr';
  phone?: string;
};
